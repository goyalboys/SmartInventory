function AuthHero({ title, description }) {
  return (
    <div className="auth-hero">
      <div className="auth-hero-content">
        <span className="auth-hero-badge">Inventory Management Platform</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="auth-hero-features">
          <div className="auth-hero-feature">
            <span>📦</span> Manage inventory in real time
          </div>
          <div className="auth-hero-feature">
            <span>🛒</span> Customers browse & order online
          </div>
          <div className="auth-hero-feature">
            <span>🔔</span> Instant order notifications
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthHero;
