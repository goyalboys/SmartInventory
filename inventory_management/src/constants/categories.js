const INVENTORY_CATEGORIES = [
  "electronics",
  "clothing",
  "groceries",
  "furniture",
  "books",
  "beauty",
  "sports",
  "other",
];

const DEFAULT_SUBCATEGORIES = {
  electronics: ["ac", "fridge", "tv", "mobile", "laptop", "washing-machine", "microwave"],
  clothing: ["shirts", "pants", "shoes", "accessories", "ethnic-wear"],
  groceries: ["vegetables", "fruits", "dairy", "snacks", "beverages"],
  furniture: ["sofa", "bed", "table", "chair", "wardrobe"],
  books: ["fiction", "non-fiction", "academic", "comics"],
  beauty: ["skincare", "makeup", "haircare", "fragrance"],
  sports: ["cricket", "football", "gym", "outdoor"],
  other: ["general"],
};

module.exports = { INVENTORY_CATEGORIES, DEFAULT_SUBCATEGORIES };
