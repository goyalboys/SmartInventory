const Order = require("../models/Order");
const Product = require("../models/Product");
const { createNotification } = require("../utils/notifications");
const { issueRazorpayRefund } = require("../utils/razorpayRefund");
const { buildOrderItems, deductStock, createOrderRecord } = require("../utils/orderHelpers");

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

const placeOrder = async (req, res) => {
  try {
    const { merchantId, items, paymentMethod, deliveryAddress } = req.body;

    if (!merchantId || !items?.length || !paymentMethod || !deliveryAddress) {
      return res.status(400).json({
        message: "Merchant, items, payment method, and delivery address are required",
      });
    }

    if (paymentMethod !== "cod") {
      return res.status(400).json({
        message: "Online payments must use Razorpay checkout",
      });
    }

    const result = await buildOrderItems(merchantId, items);

    if (result.error) {
      return res.status(result.error.status).json({ message: result.error.message });
    }

    const { orderItems, total } = result;

    await deductStock(orderItems);

    const populatedOrder = await createOrderRecord({
      customerId: req.userId,
      merchantId,
      orderItems,
      total,
      paymentMethod: "cod",
      paymentStatus: "pending",
      deliveryAddress,
    });

    res.status(201).json({ order: populatedOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const filter = { customer: req.userId };

    if (req.query.category) {
      filter["items.category"] = req.query.category;
    }

    if (req.query.subcategory) {
      filter["items.subcategory"] = req.query.subcategory;
    }

    const orders = await Order.find(filter)
      .populate("merchant", "name email")
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getIncomingOrders = async (req, res) => {
  try {
    const filter = { merchant: req.userId };

    if (req.query.category) {
      filter["items.category"] = req.query.category;
    }

    if (req.query.subcategory) {
      filter["items.subcategory"] = req.query.subcategory;
    }

    const orders = await Order.find(filter)
      .populate("customer", "name email")
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findOne({ _id: req.params.id, merchant: req.userId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (status === "cancelled" && order.status !== "cancelled") {
      await restoreOrderStock(order);

      try {
        await processPaidOrderRefund(order);
      } catch (refundError) {
        console.error(refundError);
        return res.status(refundError.statusCode || 500).json({
          message: refundError.message || "Failed to process refund",
        });
      }
    }

    if (status === "delivered" && order.paymentMethod === "cod" && order.paymentStatus === "pending") {
      order.paymentStatus = "paid";
    }

    order.status = status;
    await order.save();

    await createNotification({
      userId: order.customer,
      title: status === "cancelled" ? "Order cancelled" : "Order status updated",
      message:
        status === "cancelled" && order.paymentStatus === "refunded"
          ? `Your order was cancelled and ₹${order.total.toFixed(2)} has been refunded.`
          : `Your order is now ${status}.`,
      type: "order_status",
      orderId: order._id,
    });

    const populatedOrder = await Order.findById(order._id)
      .populate("customer", "name email")
      .populate("merchant", "name email");

    res.json({ order: populatedOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const refundOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, merchant: req.userId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ message: "Cancelled orders cannot be refunded again" });
    }

    const refund = await processPaidOrderRefund(order);

    if (!refund && order.paymentMethod === "razorpay") {
      return res.status(400).json({ message: "This order is not eligible for a Razorpay refund" });
    }

    if (order.status !== "cancelled") {
      await restoreOrderStock(order);
      order.status = "cancelled";
    }

    await order.save();

    await createNotification({
      userId: order.customer,
      title: "Refund processed",
      message: `₹${order.total.toFixed(2)} has been refunded for your order #${order._id.toString().slice(-6)}.`,
      type: "order_status",
      orderId: order._id,
    });

    const populatedOrder = await Order.findById(order._id)
      .populate("customer", "name email")
      .populate("merchant", "name email");

    res.json({
      order: populatedOrder,
      refundId: refund?.id || null,
    });
  } catch (error) {
    console.error(error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Refund failed",
    });
  }
};

module.exports = {
  placeOrder,
  getMyOrders,
  getIncomingOrders,
  updateOrderStatus,
  refundOrder,
};
