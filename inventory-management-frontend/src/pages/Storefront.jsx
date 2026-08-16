import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";
import { useCart } from "../context/CartContext";
import {
  INVENTORY_CATEGORIES,
  formatCategory,
  formatLocation,
  getImageUrl,
  getSubcategoriesForCategory,
  buildDefaultSubcategoriesMap,
} from "../constants/categories";

function Storefront() {
  const { id } = useParams();
  const { addToCart, isInCart } = useCart();
  const [merchant, setMerchant] = useState(null);
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [subcategoriesMap, setSubcategoriesMap] = useState(buildDefaultSubcategoriesMap());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMerchant = async () => {
      const response = await api.get(`/merchants/${id}`);
      setMerchant(response.data.merchant);
    };

    const loadCategories = async () => {
      try {
        const response = await api.get(`/products/categories/merchant/${id}`);
        setCategories(response.data.categories);
        setSubcategoriesMap(response.data.subcategories || buildDefaultSubcategoriesMap());
      } catch {
        setCategories([]);
      }
    };

    loadMerchant();
    loadCategories();
  }, [id]);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const params = {};
        if (category) params.category = category;
        if (subcategory) params.subcategory = subcategory;
        const response = await api.get(`/products/merchant/${id}`, { params });
        setProducts(response.data.products);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [id, category, subcategory]);

  const handleAdd = (product) => {
    if (isInCart(product._id)) return;
    addToCart(id, product, 1);
  };

  if (!merchant && !loading) {
    return (
      <Layout role="customer">
        <div className="card empty-state">
          <div className="empty-state-icon">❌</div>
          <p className="muted">Merchant not found.</p>
          <Link to="/merchants" className="btn btn-primary">Back to stores</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="customer">
      <div className="storefront-hero">
        <Link to="/merchants" className="back-link">← Back to stores</Link>
        <h1>{merchant?.storeName}</h1>
        <p className="muted">{merchant?.description || "Welcome to our store."}</p>
        {merchant && formatLocation(merchant) && (
          <p className="small location-text">📍 {formatLocation(merchant)}</p>
        )}
        {merchant?.inventoryTypes?.length > 0 && (
          <div className="chip-group readonly">
            {merchant.inventoryTypes.map((type) => (
              <span key={type} className="chip active">
                {formatCategory(type)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="filter-bar">
        <label>
          Type
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setSubcategory("");
            }}
          >
            <option value="">All types</option>
            {(categories.length ? categories : INVENTORY_CATEGORIES).map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sub-type
          <select
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            disabled={!category}
          >
            <option value="">All sub-types</option>
            {getSubcategoriesForCategory(category, subcategoriesMap).map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📦</div>
          <p className="muted">This store has no products in stock.</p>
        </div>
      ) : (
        <div className="grid">
          {products.map((product) => {
            const inCart = isInCart(product._id);

            return (
              <article key={product._id} className="card product-card">
                <div className="product-image-wrap">
                  {product.imageUrl ? (
                    <img
                      src={getImageUrl(product.imageUrl)}
                      alt={product.name}
                      className="product-image"
                    />
                  ) : (
                    <div className="product-image placeholder">No image</div>
                  )}
                  <span className="category-badge">
                    {formatCategory(product.category)}
                    {product.subcategory ? ` · ${formatCategory(product.subcategory)}` : ""}
                  </span>
                </div>
                <div className="product-card-body">
                  <h2>{product.name}</h2>
                  {product.description && (
                    <p className="muted small">{product.description}</p>
                  )}
                  <p className="price-label">Price</p>
                  <p className="price">₹{product.price.toFixed(2)}</p>
                  <p className="stock-badge">● {product.quantity} in stock</p>
                  <button
                    type="button"
                    className={inCart ? "btn btn-in-cart" : "btn btn-primary"}
                    onClick={() => handleAdd(product)}
                    disabled={inCart}
                  >
                    {inCart ? "✓ In cart" : "Add to cart"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Layout>
  );
}

export default Storefront;
