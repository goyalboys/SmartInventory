import { useState } from "react";
import { formatCategory } from "../constants/categories";

function CategoryPicker({
  category,
  subcategory,
  onCategoryChange,
  onSubcategoryChange,
  categories,
  subcategoriesMap = {},
  onAddCategory,
  onAddSubcategory,
  allowAdd = true,
}) {
  const [newCategory, setNewCategory] = useState("");
  const [newSubcategory, setNewSubcategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingSubcategory, setAddingSubcategory] = useState(false);

  const subcategories = subcategoriesMap[category] || [];

  const handleAddCategory = async () => {
    if (!newCategory.trim() || !onAddCategory) return;

    setAddingCategory(true);
    try {
      const added = await onAddCategory(newCategory.trim());
      if (added?.value) onCategoryChange(added.value);
      setNewCategory("");
    } finally {
      setAddingCategory(false);
    }
  };

  const handleAddSubcategory = async () => {
    if (!newSubcategory.trim() || !onAddSubcategory) return;

    setAddingSubcategory(true);
    try {
      const added = await onAddSubcategory(category, newSubcategory.trim());
      if (added?.value) onSubcategoryChange(added.value);
      setNewSubcategory("");
    } finally {
      setAddingSubcategory(false);
    }
  };

  return (
    <div className="category-picker">
      <label>
        Category / Type
        <select value={category} onChange={(e) => onCategoryChange(e.target.value)}>
          {categories.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label || formatCategory(item.value)}
            </option>
          ))}
        </select>
      </label>

      <label>
        Sub-type
        <select
          value={subcategory}
          onChange={(e) => onSubcategoryChange(e.target.value)}
          disabled={!subcategories.length}
        >
          {subcategories.length === 0 ? (
            <option value="">No sub-types</option>
          ) : (
            subcategories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label || formatCategory(item.value)}
              </option>
            ))
          )}
        </select>
      </label>

      {allowAdd && onAddCategory && (
        <div className="add-category-row">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Add new category e.g. Pharmacy..."
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleAddCategory}
            disabled={addingCategory || !newCategory.trim()}
          >
            {addingCategory ? "Adding..." : "+ Category"}
          </button>
        </div>
      )}

      {allowAdd && onAddSubcategory && (
        <div className="add-category-row">
          <input
            value={newSubcategory}
            onChange={(e) => setNewSubcategory(e.target.value)}
            placeholder={`Add sub-type under ${formatCategory(category)} e.g. AC, Fridge...`}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleAddSubcategory}
            disabled={addingSubcategory || !newSubcategory.trim()}
          >
            {addingSubcategory ? "Adding..." : "+ Sub-type"}
          </button>
        </div>
      )}
    </div>
  );
}

export default CategoryPicker;
