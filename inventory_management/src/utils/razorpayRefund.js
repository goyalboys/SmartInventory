const razorpay = require("../config/razorpay");

const issueRazorpayRefund = async (order) => {
  if (!razorpay) {
    const error = new Error("Razorpay is not configured");
    error.statusCode = 503;
    throw error;
  }

  if (order.paymentMethod !== "razorpay") {
    const error = new Error("Only Razorpay payments can be refunded online");
    error.statusCode = 400;
    throw error;
  }

  if (order.paymentStatus === "refunded") {
    const error = new Error("Order has already been refunded");
    error.statusCode = 400;
    throw error;
  }

  if (order.paymentStatus !== "paid") {
    const error = new Error("Only paid orders can be refunded");
    error.statusCode = 400;
    throw error;
  }

  if (!order.razorpayPaymentId) {
    const error = new Error("Razorpay payment ID not found for this order");
    error.statusCode = 400;
    throw error;
  }

  const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
    amount: Math.round(order.total * 100),
  });

  return refund;
};

module.exports = { issueRazorpayRefund };
