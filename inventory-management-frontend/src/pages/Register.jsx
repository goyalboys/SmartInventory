import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { INVENTORY_CATEGORIES } from "../constants/categories";
import AuthHero from "../components/AuthHero";

function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "customer",
    storeName: "",
    city: "",
    state: "",
    pincode: "",
    inventoryTypes: [],
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleInventoryType = (value) => {
    setForm((prev) => ({
      ...prev,
      inventoryTypes: prev.inventoryTypes.includes(value)
        ? prev.inventoryTypes.filter((item) => item !== value)
        : [...prev.inventoryTypes, value],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/auth/register", form);
      navigate("/login");
    } catch (error) {
      alert(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthHero
        title="Join InventoryHub"
        description="Create your merchant store or sign up as a customer to discover local inventory and order online."
      />

      <div className="auth-panel">
        <div className="auth-card auth-card-wide">
          <h1>Create account</h1>
          <p className="subtitle">Join as a merchant or customer</p>

          <form onSubmit={handleSubmit} className="form">
            <label>
              Full name
              <input name="name" value={form.name} onChange={handleChange} placeholder="John Doe" required />
            </label>

            <label>
              Email address
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min. 6 characters"
                minLength={6}
                required
              />
            </label>

            <label>
              I am a
              <select name="role" value={form.role} onChange={handleChange}>
                <option value="customer">Customer — browse & order</option>
                <option value="merchant">Merchant — sell inventory</option>
              </select>
            </label>

            {form.role === "merchant" && (
              <>
                <label>
                  Store name
                  <input
                    name="storeName"
                    value={form.storeName}
                    onChange={handleChange}
                    placeholder="My Awesome Store"
                    required
                  />
                </label>

                <div className="form-row">
                  <label>
                    City
                    <input name="city" value={form.city} onChange={handleChange} placeholder="Mumbai" />
                  </label>
                  <label>
                    State
                    <input name="state" value={form.state} onChange={handleChange} placeholder="Maharashtra" />
                  </label>
                  <label>
                    Pincode
                    <input name="pincode" value={form.pincode} onChange={handleChange} placeholder="400001" />
                  </label>
                </div>

                <div>
                  <p className="small" style={{ fontWeight: 600, color: "var(--text-h)" }}>
                    Store inventory types
                  </p>
                  <div className="chip-group">
                    {INVENTORY_CATEGORIES.map((category) => (
                      <button
                        key={category.value}
                        type="button"
                        className={
                          form.inventoryTypes.includes(category.value) ? "chip active" : "chip"
                        }
                        onClick={() => toggleInventoryType(category.value)}
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
