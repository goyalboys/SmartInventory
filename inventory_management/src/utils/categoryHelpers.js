const { INVENTORY_CATEGORIES, DEFAULT_SUBCATEGORIES } = require("../constants/categories");

const slugify = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
};

const formatCategoryLabel = (value) => {
  if (!value) return "Other";

  const defaults = {
    electronics: "Electronics",
    clothing: "Clothing",
    groceries: "Groceries",
    furniture: "Furniture",
    books: "Books",
    beauty: "Beauty",
    sports: "Sports",
    other: "Other",
  };

  if (defaults[value]) return defaults[value];

  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const toCategoryOptions = (values) => {
  const unique = [...new Set(values.filter(Boolean))];

  return unique.map((value) => ({
    value,
    label: formatCategoryLabel(value),
  }));
};

const toSubcategoryOptions = (values) => {
  const unique = [...new Set(values.filter(Boolean))];

  return unique.map((value) => ({
    value,
    label: formatCategoryLabel(value),
  }));
};

const getMergedCategoryValues = (customCategories = []) => {
  return [...new Set([...INVENTORY_CATEGORIES, ...customCategories])];
};

const mapToObject = (mapValue) => {
  if (!mapValue) return {};
  if (mapValue instanceof Map) return Object.fromEntries(mapValue);
  return mapValue;
};

const getSubcategoriesForCategory = (category, customSubcategories = {}) => {
  const defaults = DEFAULT_SUBCATEGORIES[category] || DEFAULT_SUBCATEGORIES.other;
  const custom = customSubcategories[category] || [];
  return [...new Set([...defaults, ...custom])];
};

const buildSubcategoriesMap = (categories, customSubcategories = {}) => {
  const map = {};

  categories.forEach((category) => {
    map[category] = toSubcategoryOptions(
      getSubcategoriesForCategory(category, customSubcategories)
    );
  });

  return map;
};

module.exports = {
  slugify,
  formatCategoryLabel,
  toCategoryOptions,
  toSubcategoryOptions,
  getMergedCategoryValues,
  getSubcategoriesForCategory,
  buildSubcategoriesMap,
  mapToObject,
  INVENTORY_CATEGORIES,
  DEFAULT_SUBCATEGORIES,
};
