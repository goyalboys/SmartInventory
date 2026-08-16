const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

let scriptPromise = null;

export const loadRazorpayScript = () => {
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return scriptPromise;
};

export const openRazorpayCheckout = ({
  keyId,
  amount,
  currency,
  razorpayOrderId,
  name,
  description,
  prefill,
  onSuccess,
  onDismiss,
}) => {
  const options = {
    key: keyId,
    amount,
    currency,
    name: name || "Inventory Store",
    description: description || "Order payment",
    order_id: razorpayOrderId,
    prefill,
    theme: { color: "#2563eb" },
    handler: onSuccess,
    modal: {
      ondismiss: onDismiss,
    },
  };

  const razorpay = new window.Razorpay(options);
  razorpay.open();
  return razorpay;
};
