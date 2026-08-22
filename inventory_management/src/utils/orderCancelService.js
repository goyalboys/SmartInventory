const Product = require("../models/Product");
const Order = require("../models/Order");
const { createNotification } = require("./notifications");
const { issueRazorpayRefund } = require("./razorpayRefund");
const { getOrderEligibility } = require("../ai/utils/orderEligibility");

const restoreOrderStock = async (order) => {
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { quantity: item.quantity },
    });
  }
};

const processPaidOrderRefund = async (order) => {
  if (order.paymentMethod === "razorpay" && order.paymentStatus === "paid") {
    const refund = await issueRazorpayRefund(order);
    order.razorpayRefundId = refund.id;
    order.paymentStatus = "refunded";
    return refund;
  }

  if (order.paymentStatus === "paid") {
    order.paymentStatus = "refunded";
  }

  return null;
};

/**
 * Shared cancellation logic used by REST API and AI cancelOrder tool.
 */
const cancelOrderRecord = async (order) => {
  if (order.status === "cancelled") {
    return { error: "Order is already cancelled" };
  }

  const eligibility = getOrderEligibility(order);

  if (!eligibility.cancellation.eligible) {
    return { error: eligibility.cancellation.reason };
  }

  try {
    await processPaidOrderRefund(order);
  } catch (refundError) {
    return {
      error: refundError.message || "Failed to process refund",
    };
  }

  await restoreOrderStock(order);
  order.status = "cancelled";
  await order.save();

  await createNotification({
    userId: order.customer,
    title: "Order cancelled",
    message:
      order.paymentStatus === "refunded"
        ? `Your order was cancelled and ₹${order.total.toFixed(2)} has been refunded.`
        : "Your order has been cancelled.",
    type: "order_status",
    orderId: order._id,
  });

  await createNotification({
    userId: order.merchant,
    title: "Order cancelled",
    message: `Order #${order._id.toString().slice(-6)} was cancelled.`,
    type: "order_status",
    orderId: order._id,
  });

  return {
    order: await Order.findById(order._id)
      .populate("customer", "name email")
      .populate("merchant", "name email"),
  };
};

module.exports = {
  cancelOrderRecord,
  restoreOrderStock,
  processPaidOrderRefund,
};
