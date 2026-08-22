import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import ProtectedRoute from "./components/ProtectedRoute";
import HomeRedirect from "./pages/HomeRedirect";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MerchantDashboard from "./pages/MerchantDashboard";
import Merchants from "./pages/Merchants";
import Storefront from "./pages/Storefront";
import Cart from "./pages/Cart";
import MyOrders from "./pages/MyOrders";
import AiDebug from "./pages/AiDebug";
import "./App.css";

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/merchant"
            element={
              <ProtectedRoute role="merchant">
                <MerchantDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/merchants"
            element={
              <ProtectedRoute role="customer">
                <Merchants />
              </ProtectedRoute>
            }
          />

          <Route
            path="/merchants/:id"
            element={
              <ProtectedRoute role="customer">
                <Storefront />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cart"
            element={
              <ProtectedRoute role="customer">
                <Cart />
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders"
            element={
              <ProtectedRoute role="customer">
                <MyOrders />
              </ProtectedRoute>
            }
          />

          <Route
            path="/ai-debug"
            element={
              <ProtectedRoute>
                <AiDebug />
              </ProtectedRoute>
            }
          />

        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}

export default App;
