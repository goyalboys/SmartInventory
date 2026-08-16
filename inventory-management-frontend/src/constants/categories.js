export const API_BASE = "http://localhost:5000";

export const DEFAULT_SUBCATEGORIES = {
  electronics: ["ac", "fridge", "tv", "mobile", "laptop", "washing-machine", "microwave"],
  clothing: ["shirts", "pants", "shoes", "accessories", "ethnic-wear"],
  groceries: ["vegetables", "fruits", "dairy", "snacks", "beverages"],
  furniture: ["sofa", "bed", "table", "chair", "wardrobe"],
  books: ["fiction", "non-fiction", "academic", "comics"],
  beauty: ["skincare", "makeup", "haircare", "fragrance"],
  sports: ["cricket", "football", "gym", "outdoor"],
  other: ["general"],
};

export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
};

export const DEFAULT_CATEGORIES = [
  { value: "electronics", label: "Electronics" },
  { value: "clothing", label: "Clothing" },
  { value: "groceries", label: "Groceries" },
  { value: "furniture", label: "Furniture" },
  { value: "books", label: "Books" },
  { value: "beauty", label: "Beauty" },
  { value: "sports", label: "Sports" },
  { value: "other", label: "Other" },
];

export const INVENTORY_CATEGORIES = DEFAULT_CATEGORIES;

export const formatCategory = (value) => {
  if (!value) return "Other";

  const match = DEFAULT_CATEGORIES.find((item) => item.value === value);
  if (match) return match.label;

  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const formatLocation = (profile) => {
  const parts = [profile.address, profile.city, profile.state, profile.pincode].filter(Boolean);
  return parts.join(", ");
};

export const mergeCategoryLists = (...lists) => {
  const map = new Map();

  lists.flat().forEach((item) => {
    if (item?.value) map.set(item.value, item);
  });

  return Array.from(map.values());
};

export const buildDefaultSubcategoriesMap = () => {
  const map = {};

  Object.entries(DEFAULT_SUBCATEGORIES).forEach(([category, subs]) => {
    map[category] = subs.map((value) => ({
      value,
      label: formatCategory(value),
    }));
  });

  return map;
};

export const getSubcategoriesForCategory = (category, subcategoriesMap = {}) => {
  return subcategoriesMap[category] || buildDefaultSubcategoriesMap()[category] || [];
};
