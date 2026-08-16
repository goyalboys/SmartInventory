const Product = require("../models/Product");
const MerchantProfile = require("../models/MerchantProfile");
const { slugify, getSubcategoriesForCategory, mapToObject } = require("../utils/categoryHelpers");

const applyProductFilters = (filter, query) => {
  if (query.category) filter.category = query.category;
  if (query.subcategory) filter.subcategory = query.subcategory;
  return filter;
};

const getMyProducts = async (req, res) => {
  try {
    const filter = applyProductFilters({ merchant: req.userId }, req.query);
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json({ products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getMerchantProducts = async (req, res) => {
  try {
    const filter = applyProductFilters(
      { merchant: req.params.merchantId, quantity: { $gt: 0 } },
      req.query
    );
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json({ products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const ensureCategoryForMerchant = async (merchantId, category) => {
  const slug = slugify(category || "other") || "other";

  const profile = await MerchantProfile.findOne({ user: merchantId });
  if (!profile) return slug;

  const { INVENTORY_CATEGORIES } = require("../constants/categories");

  if (!INVENTORY_CATEGORIES.includes(slug) && !profile.customCategories.includes(slug)) {
    profile.customCategories.push(slug);
    if (!profile.inventoryTypes.includes(slug)) {
      profile.inventoryTypes.push(slug);
    }
    await profile.save();
  }

  return slug;
};

const ensureSubcategoryForMerchant = async (merchantId, category, subcategory) => {
  if (!subcategory?.trim()) return "";

  const subSlug = slugify(subcategory);
  if (!subSlug) return "";

  const profile = await MerchantProfile.findOne({ user: merchantId });
  if (!profile) return subSlug;

  const customSubs = mapToObject(profile.customSubcategories);
  const allowed = getSubcategoriesForCategory(category, customSubs);

  if (!allowed.includes(subSlug)) {
    const existing = profile.customSubcategories.get(category) || [];
    profile.customSubcategories.set(category, [...new Set([...existing, subSlug])]);
    await profile.save();
  }

  return subSlug;
};

const createProduct = async (req, res) => {
  try {
    const { name, description, price, quantity, category, subcategory } = req.body;

    if (!name || price === undefined || quantity === undefined) {
      return res.status(400).json({ message: "Name, price, and quantity are required" });
    }

    const normalizedCategory = await ensureCategoryForMerchant(req.userId, category);
    const normalizedSubcategory = await ensureSubcategoryForMerchant(
      req.userId,
      normalizedCategory,
      subcategory
    );

    const product = await Product.create({
      merchant: req.userId,
      name,
      description: description || "",
      price: Number(price),
      quantity: Number(quantity),
      category: normalizedCategory,
      subcategory: normalizedSubcategory,
      imageUrl: req.file ? `/uploads/${req.file.filename}` : "",
    });

    res.status(201).json({ product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, merchant: req.userId });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const { name, description, price, quantity, category, subcategory } = req.body;

    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = Number(price);
    if (quantity !== undefined) product.quantity = Number(quantity);

    if (category !== undefined) {
      product.category = await ensureCategoryForMerchant(req.userId, category);
    }

    if (subcategory !== undefined) {
      product.subcategory = await ensureSubcategoryForMerchant(
        req.userId,
        product.category,
        subcategory
      );
    }

    if (req.file) product.imageUrl = `/uploads/${req.file.filename}`;

    await product.save();

    res.json({ product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, merchant: req.userId });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getMyProducts,
  getMerchantProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};
