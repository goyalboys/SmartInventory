const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    // TODO: apni chatbot logic yahan likhein
    const reply = `You said: ${message.trim()}`;

    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { sendMessage };
