import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../services/api";
import {
  DEFAULT_CATEGORIES,
  formatCategory,
  mergeCategoryLists,
  buildDefaultSubcategoriesMap,
  getSubcategoriesForCategory,
} from "../constants/categories";

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [subcategoriesMap, setSubcategoriesMap] = useState(buildDefaultSubcategoriesMap());
  const [typeFilter, setTypeFilter] = useState("");
  const [subFilter, setSubFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await api.get("/products/categories");
        setCategories(response.data.categories);
        setSubcategoriesMap(response.data.subcategories || buildDefaultSubcategoriesMap());
      } catch {
        setCategories(DEFAULT_CATEGORIES);
        setSubcategoriesMap(buildDefaultSubcategoriesMap());
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = {};
        if (typeFilter) params.category = typeFilter;
        if (subFilter) params.subcategory = subFilter;

        const response = await api.get("/orders/my", { params });
        setOrders(response.data.orders);

        const fromOrders = response.data.orders.flatMap((order) =>
          order.items.flatMap((item) => [
            { value: item.category, label: formatCategory(item.category) },
            item.subcategory
              ? { value: item.subcategory, label: formatCategory(item.subcategory) }
              : null,
          ]).filter(Boolean)
        );

        setCategories((prev) => mergeCategoryLists(prev, fromOrders));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [typeFilter, subFilter]);

  return (
    <Layout role="customer">
      <div className="page-header">
        <div>
          <h1>My orders</h1>
          <p className="muted">Track your order history and payment status</p>
        </div>
      </div>

      <div className="filter-bar">
        <label>
          Type
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setSubFilter("");
            }}
          >
            <option value="">All types</option>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sub-type
          <select
            value={subFilter}
            onChange={(e) => setSubFilter(e.target.value)}
            disabled={!typeFilter}
          >
            <option value="">All sub-types</option>
            {getSubcategoriesForCategory(typeFilter, subcategoriesMap).map((sub) => (
              <option key={sub.value} value={sub.value}>
                {sub.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📋</div>
          <p className="muted">No orders found for this filter.</p>
        </div>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <article key={order._id} className="card order-card">
              <div className="order-header">
                <div>
                  <strong>{order.merchant?.name}</strong>
                  <p className="muted small">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                  <p className="small muted">Deliver to: {order.deliveryAddress}</p>
                </div>
                <div className="order-badges">
                  <span className={`status status-${order.status}`}>{order.status}</span>
                  <span className={`status status-${order.paymentStatus}`}>
                    {order.paymentMethod} · {order.paymentStatus}
                  </span>
                </div>
              </div>

              <ul className="order-items">
                {order.items.map((item) => (
                  <li key={`${order._id}-${item.product}`}>
                    <span className="order-item-main">
                      {item.name} x {item.quantity} — ₹{(item.price * item.quantity).toFixed(2)}
                    </span>
                    {item.category && (
                      <span className="chip active order-type-chip">
                        {formatCategory(item.category)}
                        {item.subcategory ? ` · ${formatCategory(item.subcategory)}` : ""}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="order-footer">
                <strong>Total: ₹{order.total.toFixed(2)}</strong>
              </div>
            </article>
          ))}
        </div>
      )}
    </Layout>
  );
}

export default MyOrders;
