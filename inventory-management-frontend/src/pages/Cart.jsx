import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";
import { useCart } from "../context/CartContext";
import { formatLocation, getImageUrl } from "../constants/categories";
import { loadRazorpayScript, openRazorpayCheckout } from "../utils/razorpay";

const emptyAddress = {
  street: "",
  city: "",
  state: "",
  pincode: "",
};

function Cart() {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeFromCart, clearCart, cartTotal } = useCart();
  const [merchant, setMerchant] = useState(null);
  const [user, setUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [address, setAddress] = useState(emptyAddress);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadMerchant = async () => {
      if (!cart.merchantId) return;

      try {
        const response = await api.get(`/merchants/${cart.merchantId}`);
        setMerchant(response.data.merchant);
      } catch {
        setMerchant(null);
      }
    };

    loadMerchant();
  }, [cart.merchantId]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await api.get("/users/me");
        setUser(response.data.user);
      } catch {
        setUser(null);
      }
    };

    loadUser();
  }, []);

  const handleAddressChange = (e) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const buildDeliveryAddress = () => {
    return [address.street, address.city, address.state, address.pincode]
      .filter(Boolean)
      .join(", ");
  };

  const buildOrderPayload = () => ({
    merchantId: cart.merchantId,
    items: cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
    deliveryAddress: buildDeliveryAddress(),
  });

  const validateForm = () => {
    const nextErrors = {};

    if (!address.street.trim()) nextErrors.street = "Street address is required";
    if (!address.city.trim()) nextErrors.city = "City is required";
    if (!address.state.trim()) nextErrors.state = "State is required";
    if (!address.pincode.trim()) {
      nextErrors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(address.pincode.trim())) {
      nextErrors.pincode = "Enter a valid 6-digit pincode";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const placeCodOrder = async () => {
    await api.post("/orders", {
      ...buildOrderPayload(),
      paymentMethod: "cod",
    });
    clearCart();
    navigate("/orders");
  };

  const placeRazorpayOrder = async () => {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      alert("Failed to load Razorpay. Check your internet connection.");
      return;
    }

    const orderPayload = buildOrderPayload();
    const paymentOrder = await api.post("/payments/create-order", orderPayload);
    const { razorpayOrderId, amount, currency, keyId } = paymentOrder.data;

    await new Promise((resolve, reject) => {
      openRazorpayCheckout({
        keyId,
        amount,
        currency,
        razorpayOrderId,
        name: merchant?.storeName || "Inventory Store",
        description: `Order from ${merchant?.storeName || "store"}`,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        onSuccess: async (response) => {
          try {
            await api.post("/payments/verify", {
              ...orderPayload,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            clearCart();
            navigate("/orders");
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        onDismiss: () => {
          reject(new Error("Payment cancelled"));
        },
      });
    });
  };

  const handleCheckout = async (e) => {
    e.preventDefault();

    if (!cart.items.length) return;
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      if (paymentMethod === "cod") {
        await placeCodOrder();
      } else {
        await placeRazorpayOrder();
      }
    } catch (error) {
      if (error.message !== "Payment cancelled") {
        alert(error.response?.data?.message || error.message || "Checkout failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Layout role="customer">
      <div className="page-header">
        <div>
          <h1>Your cart</h1>
          {merchant && (
            <>
              <p className="muted">Ordering from {merchant.storeName}</p>
              {formatLocation(merchant) && (
                <p className="small location-text">Store location: {formatLocation(merchant)}</p>
              )}
            </>
          )}
        </div>
      </div>

      {cart.items.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">🛒</div>
          <p className="muted">Your cart is empty.</p>
          <Link to="/merchants" className="btn btn-primary">
            Browse stores
          </Link>
        </div>
      ) : (
        <div className="checkout-layout">
          <section className="card">
            <h2>Cart items ({itemCount})</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Qty</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.items.map((item) => (
                    <tr key={item.productId}>
                      <td>
                        <div className="product-cell">
                          {item.imageUrl ? (
                            <img
                              src={getImageUrl(item.imageUrl)}
                              alt={item.name}
                              className="product-thumb"
                            />
                          ) : (
                            <div className="product-thumb placeholder-thumb" />
                          )}
                          <span>{item.name}</span>
                        </div>
                      </td>
                      <td>₹{item.price.toFixed(2)}</td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(item.productId, Number(e.target.value))
                          }
                          className="qty-input"
                        />
                      </td>
                      <td>₹{(item.price * item.quantity).toFixed(2)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => removeFromCart(item.productId)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card checkout-panel">
            <h2>Checkout</h2>
            <p className="muted small checkout-subtitle">Complete delivery and payment details</p>

            <form onSubmit={handleCheckout} className="form checkout-form">
              <fieldset className="checkout-section">
                <legend>Delivery address</legend>

                <label>
                  Street / house no.
                  <input
                    name="street"
                    value={address.street}
                    onChange={handleAddressChange}
                    placeholder="Flat 12, Green Park"
                    className={errors.street ? "input-error" : ""}
                  />
                  {errors.street && <span className="field-error">{errors.street}</span>}
                </label>

                <div className="form-row checkout-form-row">
                  <label>
                    City
                    <input
                      name="city"
                      value={address.city}
                      onChange={handleAddressChange}
                      placeholder="Mumbai"
                      className={errors.city ? "input-error" : ""}
                    />
                    {errors.city && <span className="field-error">{errors.city}</span>}
                  </label>

                  <label>
                    State
                    <input
                      name="state"
                      value={address.state}
                      onChange={handleAddressChange}
                      placeholder="Maharashtra"
                      className={errors.state ? "input-error" : ""}
                    />
                    {errors.state && <span className="field-error">{errors.state}</span>}
                  </label>

                  <label>
                    Pincode
                    <input
                      name="pincode"
                      value={address.pincode}
                      onChange={handleAddressChange}
                      placeholder="400001"
                      maxLength={6}
                      className={errors.pincode ? "input-error" : ""}
                    />
                    {errors.pincode && <span className="field-error">{errors.pincode}</span>}
                  </label>
                </div>
              </fieldset>

              <fieldset className="checkout-section">
                <legend>Payment method</legend>

                <div className="payment-options">
                  {[
                    { value: "cod", label: "Cash on Delivery", hint: "Pay when order arrives" },
                    {
                      value: "razorpay",
                      label: "Pay Online",
                      hint: "UPI, cards, netbanking via Razorpay",
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={
                        paymentMethod === option.value
                          ? "payment-option active"
                          : "payment-option"
                      }
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={option.value}
                        checked={paymentMethod === option.value}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      />
                      <span className="payment-option-content">
                        <strong>{option.label}</strong>
                        <span className="small muted">{option.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="order-summary">
                <div className="order-summary-row">
                  <span className="muted">Items ({itemCount})</span>
                  <span>₹{cartTotal.toFixed(2)}</span>
                </div>
                <div className="order-summary-row">
                  <span className="muted">Delivery</span>
                  <span className="success-text">Free</span>
                </div>
                <div className="order-summary-row total-row">
                  <strong>Total</strong>
                  <span className="checkout-total">₹{cartTotal.toFixed(2)}</span>
                </div>
              </div>

              <button type="submit" className="btn btn-primary checkout-submit" disabled={submitting}>
                {submitting
                  ? "Processing..."
                  : paymentMethod === "razorpay"
                    ? "Pay with Razorpay"
                    : "Place order"}
              </button>
            </form>
          </section>
        </div>
      )}
    </Layout>
  );
}

export default Cart;
