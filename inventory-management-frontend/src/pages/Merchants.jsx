import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";
import { INVENTORY_CATEGORIES, formatCategory, formatLocation } from "../constants/categories";

function Merchants() {
  const [merchants, setMerchants] = useState([]);
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = {};
        if (city) params.city = city;
        if (category) params.category = category;

        const response = await api.get("/merchants", { params });
        setMerchants(response.data.merchants);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [city, category]);

  return (
    <Layout role="customer">
      <div className="page-header">
        <div>
          <h1>Browse stores</h1>
          <p className="muted">Discover local merchants and shop their inventory</p>
        </div>
      </div>

      <div className="filter-bar">
        <label>
          City
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Search by city..."
          />
        </label>
        <label>
          Store type
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All types</option>
            {INVENTORY_CATEGORIES.map((item) => (
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
          <p>Loading stores...</p>
        </div>
      ) : merchants.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">🏪</div>
          <p className="muted">No stores found. Try changing your filters.</p>
        </div>
      ) : (
        <div className="grid">
          {merchants.map((merchant) => (
            <Link
              key={merchant._id}
              to={`/merchants/${merchant.user._id}`}
              className="card store-card"
            >
              <div className="store-card-header">
                <div className="store-avatar">
                  {merchant.storeName.charAt(0).toUpperCase()}
                </div>
                <h2>{merchant.storeName}</h2>
              </div>
              <div className="store-card-body">
                <p className="muted">{merchant.description || "No description yet."}</p>
                {formatLocation(merchant) && (
                  <p className="small location-text">📍 {formatLocation(merchant)}</p>
                )}
                {merchant.inventoryTypes?.length > 0 && (
                  <div className="chip-group readonly">
                    {merchant.inventoryTypes.slice(0, 3).map((type) => (
                      <span key={type} className="chip active">
                        {formatCategory(type)}
                      </span>
                    ))}
                  </div>
                )}
                <p className="store-owner">Owner: {merchant.user.name}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}

export default Merchants;
