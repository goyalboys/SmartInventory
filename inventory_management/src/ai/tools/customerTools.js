const User = require("../../models/User");
const Order = require("../../models/Order");
const { formatOrder } = require("./orderTools");

/**
 * getCustomerProfile — returns the authenticated user's profile.
 */
const getCustomerProfile = async (_args, context) => {
  const user = await User.findById(context.userId).select("name email role createdAt");

  if (!user) {
    return { success: false, error: "User not found" };
  }

  return {
    success: true,
    data: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      memberSince: user.createdAt,
    },
  };
};

/**
 * getCustomerOrders — list orders for the current user.
 * Customers see their own orders; merchants see incoming orders.
 */
const getCustomerOrders = async ({ limit = 5 }, context) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 20);

  const filter =
    context.role === "merchant"
      ? { merchant: context.userId }
      : { customer: context.userId };

  const orders = await Order.find(filter)
    .populate("customer", "name email")
    .populate("merchant", "name email")
    .sort({ createdAt: -1 })
    .limit(safeLimit);

  return {
    success: true,
    data: {
      count: orders.length,
      orders: orders.map(formatOrder),
    },
  };
};

module.exports = { getCustomerProfile, getCustomerOrders };
