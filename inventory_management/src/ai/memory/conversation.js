const mongoose = require("mongoose");
const Conversation = require("../../models/Conversation");

const MAX_STORED_MESSAGES = Number(process.env.CHAT_MAX_STORED_MESSAGES) || 100;
const MAX_AGENT_HISTORY = Number(process.env.CHAT_MAX_AGENT_HISTORY) || 20;

const generateTitle = (firstMessage) => {
  const trimmed = firstMessage?.trim();
  if (!trimmed) return "New conversation";
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
};

/**
 * Resolve conversation by MongoDB id, or create a new one.
 */
const getOrCreateConversation = async (userId, conversationId) => {
  if (conversationId && mongoose.isValidObjectId(conversationId)) {
    const existing = await Conversation.findOne({
      _id: conversationId,
      user: userId,
    });

    if (existing) {
      return existing;
    }
  }

  return Conversation.create({
    user: userId,
    title: "New conversation",
    messages: [],
  });
};

const createConversation = async (userId) => {
  return Conversation.create({
    user: userId,
    title: "New conversation",
    messages: [],
  });
};

/**
 * Load recent messages for the LLM context window.
 * Returns [{ role: 'user'|'assistant', content }] — excludes the current turn.
 */
const loadHistoryForAgent = async (conversation, { limit = MAX_AGENT_HISTORY } = {}) => {
  const messages = conversation.messages || [];
  const recent = messages.slice(-limit);

  return recent.map((message) => ({
    role: message.role,
    content: message.content,
  }));
};

/**
 * Append user + assistant turns and trim old messages.
 */
const appendExchange = async (
  conversationId,
  userId,
  { userMessage, assistantMessage, assistantMetadata = null }
) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    user: userId,
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (conversation.messages.length === 0 && userMessage) {
    conversation.title = generateTitle(userMessage);
  }

  conversation.messages.push({
    role: "user",
    content: userMessage,
  });

  conversation.messages.push({
    role: "assistant",
    content: assistantMessage,
    metadata: assistantMetadata,
  });

  if (conversation.messages.length > MAX_STORED_MESSAGES) {
    conversation.messages = conversation.messages.slice(-MAX_STORED_MESSAGES);
  }

  await conversation.save();
  return conversation;
};

/**
 * Append a single message (e.g. confirmation-only turn handled outside agent).
 */
const appendMessage = async (conversationId, userId, role, content, metadata = null) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    user: userId,
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (conversation.messages.length === 0 && role === "user") {
    conversation.title = generateTitle(content);
  }

  conversation.messages.push({ role, content, metadata });

  if (conversation.messages.length > MAX_STORED_MESSAGES) {
    conversation.messages = conversation.messages.slice(-MAX_STORED_MESSAGES);
  }

  await conversation.save();
  return conversation;
};

const getConversationForUser = async (conversationId, userId) => {
  return Conversation.findOne({ _id: conversationId, user: userId });
};

const listConversations = async (userId, { limit = 10 } = {}) => {
  return Conversation.find({ user: userId })
    .select("title updatedAt createdAt")
    .sort({ updatedAt: -1 })
    .limit(limit);
};

const formatConversation = (conversation) => ({
  id: conversation._id.toString(),
  title: conversation.title,
  messages: (conversation.messages || []).map((message) => ({
    role: message.role,
    text: message.content,
    metadata: message.metadata,
    createdAt: message.createdAt,
  })),
  updatedAt: conversation.updatedAt,
  createdAt: conversation.createdAt,
});

const formatConversationSummary = (conversation) => ({
  id: conversation._id.toString(),
  title: conversation.title,
  updatedAt: conversation.updatedAt,
  messageCount: conversation.messages?.length || 0,
});

module.exports = {
  MAX_STORED_MESSAGES,
  MAX_AGENT_HISTORY,
  getOrCreateConversation,
  createConversation,
  loadHistoryForAgent,
  appendExchange,
  appendMessage,
  getConversationForUser,
  listConversations,
  formatConversation,
  formatConversationSummary,
};
