import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../services/api";

function HomeRedirect() {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    const resolve = async () => {
      try {
        const response = await api.get("/users/me");
        const role = response.data.user.role;
        setTarget(role === "merchant" ? "/merchant" : "/merchants");
      } catch {
        setTarget("/login");
      }
    };

    resolve();
  }, []);

  if (!target) {
    return (
      <div className="loading-state" style={{ minHeight: "100svh" }}>
        <div className="spinner" />
      </div>
    );
  }

  return <Navigate to={target} replace />;
}

export default HomeRedirect;
