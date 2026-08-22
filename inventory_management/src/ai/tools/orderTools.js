const Order = require("../../models/Order");
const { getOrderEligibility } = require("../utils/orderEligibility");
const { cancelOrderRecord } = require("../../utils/orderCancelService");

/**
 * Resolve an order by MongoDB _id or by the short display id (last 6 chars).
 */
const findOrderByIdentifier = async (orderId) => {
  if (!orderId?.trim()) {
    return { error: "orderId is required" };
  }

  const trimmed = orderId.trim();

  // Full MongoDB ObjectId (24 hex chars)
  if (/^[a-f\d]{24}$/i.test(trimmed)) {
    const order = await Order.findById(trimmed)
      .populate("customer", "name email")
      .populate("merchant", "name email");
    if (!order) return { error: `Order not found: ${trimmed}` };
    return { order };
  }

  // Short id like "a1b2c3" (matches UI format order #xxxxxx)
  const suffix = trimmed.replace(/^ord[-#]?/i, "").slice(-6).toLowerCase();

  const matches = await Order.aggregate([
    {
      $addFields: {
        displayId: { $toLower: { $substr: [{ $toString: "$_id" }, 18, 6] } },
      },
    },
    { $match: { displayId: suffix } },
    { $limit: 1 },
  ]);

  if (!matches.length) {
    return { error: `Order not found: ${orderId}` };
  }

  const order = await Order.findById(matches[0]._id)
    .populate("customer", "name email")
    .populate("merchant", "name email");

  return { order };
};

const formatOrder = (order) => ({
  id: order._id.toString(),
  displayId: order._id.toString().slice(-6).toUpperCase(),
  status: order.status,
  paymentStatus: order.paymentStatus,
  paymentMethod: order.paymentMethod,
  total: order.total,
  deliveryAddress: order.deliveryAddress,
  items: order.items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    price: item.price,
  })),
  customer: order.customer
    ? { id: order.customer._id.toString(), name: order.customer.name }
    : null,
  merchant: order.merchant
    ? { id: order.merchant._id.toString(), name: order.merchant.name }
    : null,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  eligibility: getOrderEligibility(order),
});

/**
 * getOrder — fetch a single order by id.
 * Authorization is enforced here, not by the LLM.
 */
const getOrder = async ({ orderId }, context) => {
  const { order, error } = await findOrderByIdentifier(orderId);

  if (error) {
    return { success: false, error };
  }

  const { userId, role } = context;

  if (role === "customer" && order.customer._id.toString() !== userId) {
    return {
      success: false,
      error: "You are not authorized to view this order",
    };
  }

  if (role === "merchant" && order.merchant._id.toString() !== userId) {
    return {
      success: false,
      error: "You are not authorized to view this order",
    };
  }

  return { success: true, data: formatOrder(order) };
};

/**
 * getOrderStatus — lightweight status lookup.
 */
const getOrderStatus = async ({ orderId }, context) => {
  const result = await getOrder({ orderId }, context);

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    data: {
      id: result.data.id,
      displayId: result.data.displayId,
      status: result.data.status,
      paymentStatus: result.data.paymentStatus,
      paymentMethod: result.data.paymentMethod,
      eligibility: result.data.eligibility,
    },
  };
};

/**
 * cancelOrder — cancel an order (REQUIRES human confirmation via registry).
 * Customers can cancel their own orders; merchants can cancel incoming orders.
 */
const cancelOrder = async ({ orderId }, context) => {
  const { order, error } = await findOrderByIdentifier(orderId);

  if (error) {
    return { success: false, error };
  }

  const { userId, role } = context;

  if (role === "customer" && order.customer._id.toString() !== userId) {
    return {
      success: false,
      error: "You are not authorized to cancel this order",
    };
  }

  if (role === "merchant" && order.merchant._id.toString() !== userId) {
    return {
      success: false,
      error: "You are not authorized to cancel this order",
    };
  }

  const result = await cancelOrderRecord(order);

  if (result.error) {
    return { success: false, error: result.error };
  }

  const cancelled = result.order;

  return {
    success: true,
    data: {
      message: "Order cancelled successfully",
      order: formatOrder(cancelled),
    },
  };
};

/**
 * Preview cancellation for confirmation summary (no mutation).
 */
const previewCancelOrder = async ({ orderId }, context) => {
  const { order, error } = await findOrderByIdentifier(orderId);

  if (error) {
    return { valid: false, error };
  }

  const { userId, role } = context;

  if (role === "customer" && order.customer._id.toString() !== userId) {
    return { valid: false, error: "You are not authorized to cancel this order" };
  }

  if (role === "merchant" && order.merchant._id.toString() !== userId) {
    return { valid: false, error: "You are not authorized to cancel this order" };
  }

  const eligibility = getOrderEligibility(order);

  if (!eligibility.cancellation.eligible) {
    return { valid: false, error: eligibility.cancellation.reason };
  }

  const refundNote =
    order.paymentMethod === "razorpay" && order.paymentStatus === "paid"
      ? "A refund will be issued to your original payment method."
      : order.paymentMethod === "cod"
        ? "No payment has been collected for this COD order."
        : null;

  return {
    valid: true,
    summary: `Cancel order #${order._id.toString().slice(-6).toUpperCase()} (${order.status}, ₹${order.total.toFixed(2)})`,
    details: {
      orderId: order._id.toString(),
      displayId: order._id.toString().slice(-6).toUpperCase(),
      status: order.status,
      total: order.total,
      refundNote,
    },
  };
};

module.exports = {
  getOrder,
  getOrderStatus,
  cancelOrder,
  previewCancelOrder,
  formatOrder,
  findOrderByIdentifier,
};
