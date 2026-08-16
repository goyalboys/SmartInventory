import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";
import { useCart } from "../context/CartContext";
import { formatLocation, getImageUrl } from "../constants/categories";

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
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [address, setAddress] = useState(emptyAddress);
  const [paymentDetails, setPaymentDetails] = useState({
    reference: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  });
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

  const handleAddressChange = (e) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const handlePaymentChange = (e) => {
    setPaymentDetails({ ...paymentDetails, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const buildDeliveryAddress = () => {
    return [address.street, address.city, address.state, address.pincode]
      .filter(Boolean)
      .join(", ");
  };

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

    if (paymentMethod === "upi" && !paymentDetails.reference.trim()) {
      nextErrors.reference = "UPI transaction ID is required";
    }

    if (paymentMethod === "card") {
      if (!paymentDetails.cardNumber.trim()) {
        nextErrors.cardNumber = "Card number is required";
      } else if (paymentDetails.cardNumber.replace(/\s/g, "").length < 13) {
        nextErrors.cardNumber = "Enter a valid card number";
      }
      if (!paymentDetails.expiry.trim()) nextErrors.expiry = "Expiry is required";
      if (!paymentDetails.cvv.trim()) nextErrors.cvv = "CVV is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCheckout = async (e) => {
    e.preventDefault();

    if (!cart.items.length) return;
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      await api.post("/orders", {
        merchantId: cart.merchantId,
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        paymentMethod,
        deliveryAddress: buildDeliveryAddress(),
        paymentDetails: paymentMethod === "cod" ? {} : paymentDetails,
      });

      clearCart();
      navigate("/orders");
    } catch (error) {
      alert(error.response?.data?.message || "Checkout failed");
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
                      <td>${item.price.toFixed(2)}</td>
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
                      <td>${(item.price * item.quantity).toFixed(2)}</td>
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
                    { value: "upi", label: "UPI", hint: "Pay via UPI app" },
                    { value: "card", label: "Card", hint: "Credit / debit card" },
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

                {paymentMethod === "upi" && (
                  <label>
                    UPI transaction ID
                    <input
                      name="reference"
                      value={paymentDetails.reference}
                      onChange={handlePaymentChange}
                      placeholder="e.g. UPI123456789"
                      className={errors.reference ? "input-error" : ""}
                    />
                    {errors.reference && <span className="field-error">{errors.reference}</span>}
                  </label>
                )}

                {paymentMethod === "card" && (
                  <>
                    <label>
                      Card number
                      <input
                        name="cardNumber"
                        value={paymentDetails.cardNumber}
                        onChange={handlePaymentChange}
                        placeholder="4111 1111 1111 1111"
                        className={errors.cardNumber ? "input-error" : ""}
                      />
                      {errors.cardNumber && (
                        <span className="field-error">{errors.cardNumber}</span>
                      )}
                    </label>
                    <div className="form-row card-form-row">
                      <label>
                        Expiry (MM/YY)
                        <input
                          name="expiry"
                          value={paymentDetails.expiry}
                          onChange={handlePaymentChange}
                          placeholder="MM/YY"
                          className={errors.expiry ? "input-error" : ""}
                        />
                        {errors.expiry && <span className="field-error">{errors.expiry}</span>}
                      </label>
                      <label>
                        CVV
                        <input
                          name="cvv"
                          type="password"
                          value={paymentDetails.cvv}
                          onChange={handlePaymentChange}
                          placeholder="123"
                          maxLength={4}
                          className={errors.cvv ? "input-error" : ""}
                        />
                        {errors.cvv && <span className="field-error">{errors.cvv}</span>}
                      </label>
                    </div>
                  </>
                )}
              </fieldset>

              <div className="order-summary">
                <div className="order-summary-row">
                  <span className="muted">Items ({itemCount})</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <div className="order-summary-row">
                  <span className="muted">Delivery</span>
                  <span className="success-text">Free</span>
                </div>
                <div className="order-summary-row total-row">
                  <strong>Total</strong>
                  <span className="checkout-total">${cartTotal.toFixed(2)}</span>
                </div>
              </div>

              <button type="submit" className="btn btn-primary checkout-submit" disabled={submitting}>
                {submitting ? "Processing payment..." : "Pay & place order"}
              </button>
            </form>
          </section>
        </div>
      )}
    </Layout>
  );
}

export default Cart;
