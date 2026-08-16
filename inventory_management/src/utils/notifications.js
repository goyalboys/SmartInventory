const Notification = require("../models/Notification");

const createNotification = async ({ userId, title, message, type, orderId }) => {
  await Notification.create({
    user: userId,
    title,
    message,
    type,
    order: orderId,
  });
};

module.exports = { createNotification };
