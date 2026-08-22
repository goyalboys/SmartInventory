const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  sendMessage,
  getConversation,
  startConversation,
  getConversationList,
} = require("../controllers/chatbotController");

const router = express.Router();

router.post("/", authMiddleware, sendMessage);
router.get("/conversations", authMiddleware, getConversationList);
router.post("/conversations", authMiddleware, startConversation);
router.get("/conversations/:id", authMiddleware, getConversation);

module.exports = router;
