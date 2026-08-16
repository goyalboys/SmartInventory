const MerchantProfile = require("../models/MerchantProfile");
const {
  slugify,
  toCategoryOptions,
  getMergedCategoryValues,
  buildSubcategoriesMap,
  mapToObject,
  INVENTORY_CATEGORIES,
} = require("../utils/categoryHelpers");

const buildCategoryResponse = (profile) => {
  const customSubs = mapToObject(profile?.customSubcategories);
  const categories = getMergedCategoryValues(profile?.customCategories || []);

  return {
    categories: toCategoryOptions(categories),
    subcategories: buildSubcategoriesMap(categories, customSubs),
    customCategories: profile?.customCategories || [],
  };
};

const getPublicCategories = (_req, res) => {
  res.json(buildCategoryResponse(null));
};

const getMerchantCategories = async (req, res) => {
  try {
    const profile = await MerchantProfile.findOne({ user: req.params.merchantId });
    res.json(buildCategoryResponse(profile));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getMyCategories = async (req, res) => {
  try {
    const profile = await MerchantProfile.findOne({ user: req.userId });
    res.json(buildCategoryResponse(profile));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addCustomCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const slug = slugify(name);

    if (!slug) {
      return res.status(400).json({ message: "Invalid category name" });
    }

    if (INVENTORY_CATEGORIES.includes(slug)) {
      return res.status(400).json({ message: "This category already exists" });
    }

    const profile = await MerchantProfile.findOneAndUpdate(
      { user: req.userId },
      {
        $addToSet: {
          customCategories: slug,
          inventoryTypes: slug,
        },
      },
      { new: true, upsert: false }
    );

    if (!profile) {
      return res.status(404).json({ message: "Merchant profile not found" });
    }

    const payload = buildCategoryResponse(profile);

    res.status(201).json({
      message: "Category added",
      category: { value: slug, label: name.trim() },
      ...payload,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addCustomSubcategory = async (req, res) => {
  try {
    const { category, name } = req.body;

    if (!category?.trim() || !name?.trim()) {
      return res.status(400).json({ message: "Category and subcategory name are required" });
    }

    const categorySlug = slugify(category);
    const subSlug = slugify(name);

    if (!categorySlug || !subSlug) {
      return res.status(400).json({ message: "Invalid category or subcategory name" });
    }

    const profile = await MerchantProfile.findOne({ user: req.userId });

    if (!profile) {
      return res.status(404).json({ message: "Merchant profile not found" });
    }

    const mergedCategories = getMergedCategoryValues(profile.customCategories);

    if (!mergedCategories.includes(categorySlug)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    const existing = profile.customSubcategories.get(categorySlug) || [];
    profile.customSubcategories.set(categorySlug, [...new Set([...existing, subSlug])]);
    await profile.save();

    const payload = buildCategoryResponse(profile);

    res.status(201).json({
      message: "Subcategory added",
      subcategory: { value: subSlug, label: name.trim() },
      ...payload,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getPublicCategories,
  getMerchantCategories,
  getMyCategories,
  addCustomCategory,
  addCustomSubcategory,
};
