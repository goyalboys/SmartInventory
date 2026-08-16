const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { createNotification } = require("../utils/notifications");

const processPayment = (paymentMethod, paymentDetails) => {
  if (paymentMethod === "cod") {
    return { success: true, status: "pending" };
  }

  if (!paymentDetails?.reference) {
    return { success: false, message: "Payment reference is required" };
  }

  if (paymentMethod === "upi" && paymentDetails.reference.length < 6) {
    return { success: false, message: "Invalid UPI transaction ID" };
  }

  if (paymentMethod === "card") {
    const { cardNumber, expiry, cvv } = paymentDetails;
    if (!cardNumber || !expiry || !cvv) {
      return { success: false, message: "Complete card details are required" };
    }
    if (cardNumber.replace(/\s/g, "").length < 13) {
      return { success: false, message: "Invalid card number" };
    }
  }

  return { success: true, status: "paid" };
};

const placeOrder = async (req, res) => {
  try {
    const { merchantId, items, paymentMethod, paymentDetails, deliveryAddress } = req.body;

    if (!merchantId || !items?.length || !paymentMethod || !deliveryAddress) {
      return res.status(400).json({
        message: "Merchant, items, payment method, and delivery address are required",
      });
    }

    const paymentResult = processPayment(paymentMethod, paymentDetails);

    if (!paymentResult.success) {
      return res.status(400).json({ message: paymentResult.message });
    }

    const orderItems = [];
    let total = 0;

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, merchant: merchantId });

      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.productId}` });
      }

      if (product.quantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}. Available: ${product.quantity}`,
        });
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        category: product.category || "other",
        subcategory: product.subcategory || "",
      });

      total += product.price * item.quantity;
    }

    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: -item.quantity },
      });
    }

    const order = await Order.create({
      customer: req.userId,
      merchant: merchantId,
      items: orderItems,
      total,
      paymentMethod,
      paymentStatus: paymentResult.status,
      deliveryAddress,
    });

    const customer = await User.findById(req.userId).select("name");

    await createNotification({
      userId: merchantId,
      title: "New order received",
      message: `${customer.name} placed an order worth $${total.toFixed(2)}`,
      type: "order_placed",
      orderId: order._id,
    });

    await createNotification({
      userId: req.userId,
      title: "Order placed successfully",
      message: `Your order #${order._id.toString().slice(-6)} has been placed.`,
      type: "order_placed",
      orderId: order._id,
    });

    const populatedOrder = await Order.findById(order._id)
      .populate("customer", "name email")
      .populate("merchant", "name email");

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
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { quantity: item.quantity },
        });
      }

      if (order.paymentStatus === "paid") {
        order.paymentStatus = "refunded";
      }
    }

    if (status === "delivered" && order.paymentMethod === "cod" && order.paymentStatus === "pending") {
      order.paymentStatus = "paid";
    }

    order.status = status;
    await order.save();

    await createNotification({
      userId: order.customer,
      title: "Order status updated",
      message: `Your order is now ${status}.`,
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

module.exports = {
  placeOrder,
  getMyOrders,
  getIncomingOrders,
  updateOrderStatus,
};
