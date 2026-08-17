const razorpay = require("../config/razorpay");

const getRazorpayErrorMessage = (error) => {
  if (error?.error?.description) {
    return error.error.description;
  }

  if (typeof error?.message === "string" && error.message) {
    return error.message;
  }

  return "Refund failed";
};

const toRefundError = (error) => {
  const refundError = new Error(getRazorpayErrorMessage(error));
  refundError.statusCode = error?.statusCode || 502;
  return refundError;
};

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

  try {
    const payment = await razorpay.payments.fetch(order.razorpayPaymentId);

    if (payment.status !== "captured") {
      const error = new Error("Payment is not captured yet, so it cannot be refunded");
      error.statusCode = 400;
      throw error;
    }

    if (payment.refund_status === "full") {
      const error = new Error("This payment has already been fully refunded");
      error.statusCode = 400;
      throw error;
    }

    const refund = await razorpay.api.post({
      url: "/refunds",
      data: {
        payment_id: order.razorpayPaymentId,
        amount: payment.amount,
        notes: {
          orderId: order._id.toString(),
        },
      },
    });

    return refund;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    throw toRefundError(error);
  }
};

module.exports = { issueRazorpayRefund };
