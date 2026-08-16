const crypto = require("crypto");
const razorpay = require("../config/razorpay");
const { buildOrderItems, deductStock, createOrderRecord } = require("../utils/orderHelpers");

const createRazorpayOrder = async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({
        message: "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env",
      });
    }

    const { merchantId, items, deliveryAddress } = req.body;

    if (!merchantId || !items?.length || !deliveryAddress) {
      return res.status(400).json({
        message: "Merchant, items, and delivery address are required",
      });
    }

    const result = await buildOrderItems(merchantId, items);

    if (result.error) {
      return res.status(result.error.status).json({ message: result.error.message });
    }

    const { total } = result;
    const amountInPaise = Math.round(total * 100);

    if (amountInPaise < 100) {
      return res.status(400).json({ message: "Minimum order amount is ₹1" });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `order_${Date.now()}`,
      // notes: {
      //   customerId: req.userId,
      //   merchantId,
      // },
    });

    res.json({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      // keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create payment order" });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ message: "Razorpay is not configured" });
    }

    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      merchantId,
      items,
      deliveryAddress,
    } = req.body;

    if (
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature ||
      !merchantId ||
      !items?.length ||
      !deliveryAddress
    ) {
      return res.status(400).json({ message: "Missing payment verification details" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const result = await buildOrderItems(merchantId, items);

    if (result.error) {
      return res.status(result.error.status).json({ message: result.error.message });
    }

    const { orderItems, total } = result;

    await deductStock(orderItems);

    const order = await createOrderRecord({
      customerId: req.userId,
      merchantId,
      orderItems,
      total,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      deliveryAddress,
      razorpayOrderId,
      razorpayPaymentId,
    });

    res.status(201).json({ order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Payment verification failed" });
  }
};

// const getRazorpayKey = async (req, res) => {
//   if (!process.env.RAZORPAY_KEY_ID) {
//     return res.status(503).json({ message: "Razorpay is not configured" });
//   }

//   res.json({ keyId: process.env.RAZORPAY_KEY_ID });
// };

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
  // getRazorpayKey,
};
