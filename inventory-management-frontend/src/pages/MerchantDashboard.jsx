import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";
import { INVENTORY_CATEGORIES, formatCategory, formatLocation, getImageUrl, buildDefaultSubcategoriesMap, getSubcategoriesForCategory } from "../constants/categories";
import CategoryPicker from "../components/CategoryPicker";

const emptyProduct = {
  name: "",
  description: "",
  price: "",
  quantity: "",
  category: "electronics",
  subcategory: "ac",
};

function MerchantDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") || "products");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [profileForm, setProfileForm] = useState({
    storeName: "",
    description: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    inventoryTypes: [],
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState(INVENTORY_CATEGORIES);
  const [subcategoriesMap, setSubcategoriesMap] = useState(buildDefaultSubcategoriesMap());
  const [orderTypeFilter, setOrderTypeFilter] = useState("");
  const [orderSubFilter, setOrderSubFilter] = useState("");
  const [productTypeFilter, setProductTypeFilter] = useState("");
  const [productSubFilter, setProductSubFilter] = useState("");
  const [newProfileCategory, setNewProfileCategory] = useState("");

  useEffect(() => {
    const nextTab = searchParams.get("tab") || "products";
    setTab(nextTab);
  }, [searchParams]);

  const switchTab = (nextTab) => {
    setTab(nextTab);
    if (nextTab === "products") {
      setSearchParams({});
    } else {
      setSearchParams({ tab: nextTab });
    }
  };

  const loadProducts = async () => {
    try {
      const params = {};
      if (productTypeFilter) params.category = productTypeFilter;
      if (productSubFilter) params.subcategory = productSubFilter;
      const response = await api.get("/products/my", { params });
      setProducts(response.data.products);
    } catch {
      setProducts([]);
    }
  };

  const loadOrders = async () => {
    try {
      const params = {};
      if (orderTypeFilter) params.category = orderTypeFilter;
      if (orderSubFilter) params.subcategory = orderSubFilter;
      const response = await api.get("/orders/incoming", { params });
      setOrders(response.data.orders);
    } catch {
      setOrders([]);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get("/products/categories/my");
      setCategories(response.data.categories);
      setSubcategoriesMap(response.data.subcategories || buildDefaultSubcategoriesMap());
    } catch {
      setCategories(INVENTORY_CATEGORIES);
      setSubcategoriesMap(buildDefaultSubcategoriesMap());
    }
  };

  const loadProfile = async () => {
    try {
      const response = await api.get("/merchants/profile/me");
      setProfile(response.data.profile);
      setProfileForm({
        storeName: response.data.profile.storeName || "",
        description: response.data.profile.description || "",
        address: response.data.profile.address || "",
        city: response.data.profile.city || "",
        state: response.data.profile.state || "",
        pincode: response.data.profile.pincode || "",
        inventoryTypes: response.data.profile.inventoryTypes || [],
      });
    } catch {
      setProfile(null);
    }
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      await Promise.allSettled([
        loadCategories(),
        loadProfile(),
        loadProducts(),
        loadOrders(),
      ]);
      if (active) setLoading(false);
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    loadProducts();
  }, [productTypeFilter, productSubFilter]);

  useEffect(() => {
    if (loading) return;
    loadOrders();
  }, [orderTypeFilter, orderSubFilter]);

  const addCategory = async (name) => {
    const response = await api.post("/products/categories/my", { name });
    setCategories(response.data.categories);
    setSubcategoriesMap(response.data.subcategories || subcategoriesMap);
    await loadProfile();
    return response.data.category;
  };

  const addSubcategory = async (category, name) => {
    const response = await api.post("/products/categories/my/subcategory", { category, name });
    setSubcategoriesMap(response.data.subcategories || subcategoriesMap);
    return response.data.subcategory;
  };

  const handleCategoryChange = (category) => {
    const subs = getSubcategoriesForCategory(category, subcategoriesMap);
    setForm({
      ...form,
      category,
      subcategory: subs[0]?.value || "",
    });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleProfileChange = (e) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  const toggleInventoryType = (value) => {
    setProfileForm((prev) => ({
      ...prev,
      inventoryTypes: prev.inventoryTypes.includes(value)
        ? prev.inventoryTypes.filter((item) => item !== value)
        : [...prev.inventoryTypes, value],
    }));
  };

  const resetForm = () => {
    setForm(emptyProduct);
    setEditingId(null);
    setImageFile(null);
    setImagePreview("");
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = new FormData();
    payload.append("name", form.name);
    payload.append("description", form.description);
    payload.append("price", form.price);
    payload.append("quantity", form.quantity);
    payload.append("category", form.category);
    payload.append("subcategory", form.subcategory);
    if (imageFile) payload.append("image", imageFile);

    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/products", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      resetForm();
      await loadProducts();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save product");
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.put("/merchants/profile/me", profileForm);
      await loadProfile();
      alert("Store profile updated");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update profile");
    }
  };

  const handleEdit = (product) => {
    setEditingId(product._id);
    setForm({
      name: product.name,
      description: product.description || "",
      price: product.price,
      quantity: product.quantity,
      category: product.category || "electronics",
      subcategory: product.subcategory || "",
    });
    setImagePreview(getImageUrl(product.imageUrl) || "");
    setImageFile(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;

    try {
      await api.delete(`/products/${id}`);
      await loadProducts();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete product");
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      await loadOrders();
      await loadProducts();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update order");
    }
  };

  if (loading) {
    return (
      <Layout role="merchant">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading dashboard...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="merchant">
      <div className="page-header">
        <div>
          <h1>Merchant Dashboard</h1>
          <p className="muted">
            {profile?.storeName}
            {profile && formatLocation(profile) && ` · ${formatLocation(profile)}`}
          </p>
        </div>
      </div>

      <div className="tabs">
        <button
          type="button"
          className={tab === "products" ? "tab active" : "tab"}
          onClick={() => switchTab("products")}
        >
          Products ({products.length})
        </button>
        <button
          type="button"
          className={tab === "orders" ? "tab active" : "tab"}
          onClick={() => switchTab("orders")}
        >
          Orders ({orders.length})
        </button>
        <button
          type="button"
          className={tab === "profile" ? "tab active" : "tab"}
          onClick={() => switchTab("profile")}
        >
          Store Profile
        </button>
      </div>

      {tab === "products" && (
        <div className="split-layout">
          <section className="card">
            <h2>{editingId ? "Edit product" : "Add product"}</h2>
            <form onSubmit={handleSubmit} className="form">
              <label>
                Name
                <input name="name" value={form.name} onChange={handleChange} required />
              </label>
              <CategoryPicker
                category={form.category}
                subcategory={form.subcategory}
                onCategoryChange={handleCategoryChange}
                onSubcategoryChange={(subcategory) => setForm({ ...form, subcategory })}
                categories={categories}
                subcategoriesMap={subcategoriesMap}
                onAddCategory={addCategory}
                onAddSubcategory={addSubcategory}
              />
              <label>
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                />
              </label>
              <label>
                Price
                <input
                  type="number"
                  name="price"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  required
                />
              </label>
              <label>
                Quantity
                <input
                  type="number"
                  name="quantity"
                  min="0"
                  value={form.quantity}
                  onChange={handleChange}
                  required
                />
              </label>
              <label>
                Product image
                <input type="file" accept="image/*" onChange={handleImageChange} />
              </label>
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="product-image-preview" />
              )}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingId ? "Update" : "Add product"}
                </button>
                {editingId && (
                  <button type="button" className="btn btn-secondary" onClick={resetForm}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="card">
            <div className="section-header-row">
              <h2>Your inventory</h2>
              <div className="filter-group">
                <label className="inline-filter">
                  Type
                  <select
                    value={productTypeFilter}
                    onChange={(e) => {
                      setProductTypeFilter(e.target.value);
                      setProductSubFilter("");
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
                <label className="inline-filter">
                  Sub-type
                  <select
                    value={productSubFilter}
                    onChange={(e) => setProductSubFilter(e.target.value)}
                    disabled={!productTypeFilter}
                  >
                    <option value="">All sub-types</option>
                    {getSubcategoriesForCategory(productTypeFilter, subcategoriesMap).map((sub) => (
                      <option key={sub.value} value={sub.value}>
                        {sub.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            {products.length === 0 ? (
              <p className="muted">No products yet. Add your first item.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Sub-type</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product._id}>
                        <td>
                          <div className="product-cell">
                            {product.imageUrl && (
                              <img
                                src={getImageUrl(product.imageUrl)}
                                alt={product.name}
                                className="product-thumb"
                              />
                            )}
                            <div>
                              <strong>{product.name}</strong>
                              {product.description && (
                                <p className="muted small">{product.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>{formatCategory(product.category)}</td>
                        <td>{product.subcategory ? formatCategory(product.subcategory) : "—"}</td>
                        <td>${product.price.toFixed(2)}</td>
                        <td>{product.quantity}</td>
                        <td className="actions">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleEdit(product)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(product._id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "orders" && (
        <section className="card">
          <div className="section-header-row">
            <h2>Incoming orders</h2>
            <div className="filter-group">
              <label className="inline-filter">
                Type
                <select
                  value={orderTypeFilter}
                  onChange={(e) => {
                    setOrderTypeFilter(e.target.value);
                    setOrderSubFilter("");
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
              <label className="inline-filter">
                Sub-type
                <select
                  value={orderSubFilter}
                  onChange={(e) => setOrderSubFilter(e.target.value)}
                  disabled={!orderTypeFilter}
                >
                  <option value="">All sub-types</option>
                  {getSubcategoriesForCategory(orderTypeFilter, subcategoriesMap).map((sub) => (
                    <option key={sub.value} value={sub.value}>
                      {sub.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          {orders.length === 0 ? (
            <p className="muted">No orders yet.</p>
          ) : (
            <div className="order-list">
              {orders.map((order) => (
                <article key={order._id} className="order-card">
                  <div className="order-header">
                    <div>
                      <strong>{order.customer?.name}</strong>
                      <p className="muted small">{order.customer?.email}</p>
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
                          {item.name} x {item.quantity} — ${(item.price * item.quantity).toFixed(2)}
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
                    <strong>Total: ${order.total.toFixed(2)}</strong>
                    <div className="form-actions">
                      {order.status === "pending" && (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => updateOrderStatus(order._id, "confirmed")}
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => updateOrderStatus(order._id, "cancelled")}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {order.status === "confirmed" && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => updateOrderStatus(order._id, "shipped")}
                        >
                          Mark shipped
                        </button>
                      )}
                      {order.status === "shipped" && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => updateOrderStatus(order._id, "delivered")}
                        >
                          Mark delivered
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "profile" && (
        <section className="card profile-card">
          <h2>Edit store profile</h2>
          <form onSubmit={handleProfileSubmit} className="form">
            <label>
              Store name
              <input
                name="storeName"
                value={profileForm.storeName}
                onChange={handleProfileChange}
                required
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                value={profileForm.description}
                onChange={handleProfileChange}
                rows={3}
              />
            </label>
            <label>
              Address
              <input name="address" value={profileForm.address} onChange={handleProfileChange} />
            </label>
            <div className="form-row">
              <label>
                City
                <input name="city" value={profileForm.city} onChange={handleProfileChange} />
              </label>
              <label>
                State
                <input name="state" value={profileForm.state} onChange={handleProfileChange} />
              </label>
              <label>
                Pincode
                <input name="pincode" value={profileForm.pincode} onChange={handleProfileChange} />
              </label>
            </div>

            <div>
              <p className="small section-label">Store inventory types</p>
              <div className="chip-group">
                {categories.map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    className={
                      profileForm.inventoryTypes.includes(category.value)
                        ? "chip active"
                        : "chip"
                    }
                    onClick={() => toggleInventoryType(category.value)}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
              <div className="add-category-row" style={{ marginTop: 12 }}>
                <input
                  value={newProfileCategory}
                  onChange={(e) => setNewProfileCategory(e.target.value)}
                  placeholder="Add new store category..."
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    if (!newProfileCategory.trim()) return;
                    await addCategory(newProfileCategory.trim());
                    setNewProfileCategory("");
                  }}
                >
                  + Add category
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary">
              Save profile
            </button>
          </form>
        </section>
      )}
    </Layout>
  );
}

export default MerchantDashboard;
