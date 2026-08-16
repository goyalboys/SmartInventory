const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const { createNotification } = require("./notifications");

const buildOrderItems = async (merchantId, items) => {
  const orderItems = [];
  let total = 0;

  for (const item of items) {
    const product = await Product.findOne({ _id: item.productId, merchant: merchantId });

    if (!product) {
      return { error: { status: 404, message: `Product not found: ${item.productId}` } };
    }

    if (product.quantity < item.quantity) {
      return {
        error: {
          status: 400,
          message: `Insufficient stock for ${product.name}. Available: ${product.quantity}`,
        },
      };
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

  return { orderItems, total };
};

const deductStock = async (orderItems) => {
  for (const item of orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { quantity: -item.quantity },
    });
  }
};

const createOrderRecord = async ({
  customerId,
  merchantId,
  orderItems,
  total,
  paymentMethod,
  paymentStatus,
  deliveryAddress,
  razorpayOrderId,
  razorpayPaymentId,
}) => {
  const order = await Order.create({
    customer: customerId,
    merchant: merchantId,
    items: orderItems,
    total,
    paymentMethod,
    paymentStatus,
    deliveryAddress,
    razorpayOrderId,
    razorpayPaymentId,
  });

  const customer = await User.findById(customerId).select("name");

  await createNotification({
    userId: merchantId,
    title: "New order received",
    message: `${customer.name} placed an order worth ₹${total.toFixed(2)}`,
    type: "order_placed",
    orderId: order._id,
  });

  await createNotification({
    userId: customerId,
    title: "Order placed successfully",
    message: `Your order #${order._id.toString().slice(-6)} has been placed.`,
    type: "order_placed",
    orderId: order._id,
  });

  return Order.findById(order._id)
    .populate("customer", "name email")
    .populate("merchant", "name email");
};

module.exports = {
  buildOrderItems,
  deductStock,
  createOrderRecord,
};
