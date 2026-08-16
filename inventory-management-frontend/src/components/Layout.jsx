import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../services/api";
import { useCart } from "../context/CartContext";
import NotificationsBell from "./NotificationsBell";

function Layout({ children, role }) {
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get("/users/me");
        setUser(response.data.user);
      } catch {
        setUser(null);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    await api.post("/auth/logout");
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <header className="top-nav">
        <Link to="/" className="brand">
          <span className="brand-icon">IH</span>
          InventoryHub
        </Link>

        <nav className="nav-links">
          {role === "merchant" && (
            <>
              <Link to="/merchant">My Inventory</Link>
              <Link to="/merchant?tab=profile">Store Profile</Link>
            </>
          )}

          {role === "customer" && (
            <>
              <Link to="/merchants">Stores</Link>
              <Link to="/orders">My Orders</Link>
              <Link to="/cart">Cart {cartCount > 0 && `(${cartCount})`}</Link>
            </>
          )}
        </nav>

        <div className="nav-actions">
          <NotificationsBell />
          {user && <span className="user-badge">{user.name}</span>}
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="page">{children}</main>
    </div>
  );
}

export default Layout;
