import { useRef, useState } from "react";
import api from "../services/api";

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setDraft("");
    setSending(true);

    try {
      const response = await api.post("/chatbot", { message: text });
      setMessages((prev) => [...prev, { role: "bot", text: response.data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "bot", text: "Something went wrong." }]);
    } finally {
      setSending(false);
      scrollToBottom();
    }
  };

  return (
    <div className="chatbot-widget-wrap">
      {open && (
        <div className="chatbot-widget-panel">
          <div className="chatbot-widget-toolbar">
            <strong>Chat</strong>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.length === 0 && (
              <p className="muted small chat-empty">Kuch poochhein...</p>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={message.role === "user" ? "chat-bubble own" : "chat-bubble bot-bubble"}
              >
                <p>{message.text}</p>
              </div>
            ))}
            {sending && (
              <div className="chat-bubble bot-bubble typing">
                <p>Typing...</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-composer" onSubmit={handleSend}>
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message..."
              disabled={sending}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !draft.trim()}>
              Send
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="chatbot-fab"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open chat"
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}

export default ChatWidget;
