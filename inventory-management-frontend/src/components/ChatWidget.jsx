import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import AiActionSteps from "./AiActionSteps";
import { hasVisibleActions } from "../utils/aiTraceFormat";

const CONVERSATION_KEY = "smartinventory_chat_conversation_id";
const SHOW_STEPS_KEY = "smartinventory_show_ai_steps";

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [showAiSteps, setShowAiSteps] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(CONVERSATION_KEY);
    const stepsPref = sessionStorage.getItem(SHOW_STEPS_KEY);
    if (stored) {
      loadConversation(stored);
    }
    if (stepsPref != null) {
      setShowAiSteps(stepsPref === "true");
    }
  }, []);

  useEffect(() => {
    if (open) {
      scrollToBottom();
    }
  }, [messages, open, pendingConfirmation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const mapServerMessages = (serverMessages) =>
    (serverMessages || []).map((message) => ({
      role: message.role === "user" ? "user" : "bot",
      text: message.text,
      trace: message.metadata?.trace || message.metadata || null,
    }));

  const loadConversation = async (id) => {
    if (!id) return;

    setLoadingHistory(true);
    try {
      const response = await api.get(`/chatbot/conversations/${id}`);
      setMessages(mapServerMessages(response.data.conversation.messages));
      setConversationId(response.data.conversation.id);
      sessionStorage.setItem(CONVERSATION_KEY, response.data.conversation.id);
    } catch {
      sessionStorage.removeItem(CONVERSATION_KEY);
      setConversationId("");
      setMessages([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const startNewConversation = async () => {
    setLoadingHistory(true);
    try {
      const response = await api.post("/chatbot/conversations");
      const newId = response.data.conversation.id;
      setConversationId(newId);
      setMessages([]);
      setPendingConfirmation(null);
      sessionStorage.setItem(CONVERSATION_KEY, newId);
    } catch {
      setMessages((prev) => [...prev, { role: "bot", text: "Could not start a new chat." }]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleShowAiSteps = () => {
    setShowAiSteps((prev) => {
      const next = !prev;
      sessionStorage.setItem(SHOW_STEPS_KEY, String(next));
      return next;
    });
  };

  const sendChatRequest = async ({ text, confirmActionId, rejectActionId }) => {
    const response = await api.post("/chatbot", {
      message: text,
      conversationId: conversationId || undefined,
      confirmActionId,
      rejectActionId,
    });

    if (response.data.conversationId) {
      setConversationId(response.data.conversationId);
      sessionStorage.setItem(CONVERSATION_KEY, response.data.conversationId);
    }

    if (response.data.confirmationRequired) {
      setPendingConfirmation(response.data.confirmationRequired);
    } else if (response.data.confirmationResolved) {
      setPendingConfirmation(null);
    }

    return response;
  };

  const appendBotMessage = (response) => {
    setMessages((prev) => [
      ...prev,
      {
        role: "bot",
        text: response.data.reply,
        trace: response.data.trace || null,
      },
    ]);
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setDraft("");
    setSending(true);

    try {
      const response = await sendChatRequest({ text });
      appendBotMessage(response);
    } catch {
      setMessages((prev) => [...prev, { role: "bot", text: "Something went wrong." }]);
    } finally {
      setSending(false);
    }
  };

  const handleConfirmation = async (confirm) => {
    if (!pendingConfirmation || sending) return;

    const text = confirm ? "Yes, confirm" : "No, cancel";
    setMessages((prev) => [...prev, { role: "user", text }]);
    setSending(true);

    try {
      const response = await sendChatRequest({
        text,
        confirmActionId: confirm ? pendingConfirmation.id : undefined,
        rejectActionId: confirm ? undefined : pendingConfirmation.id,
      });
      appendBotMessage(response);
    } catch {
      setMessages((prev) => [...prev, { role: "bot", text: "Something went wrong." }]);
    } finally {
      setSending(false);
      setPendingConfirmation(null);
    }
  };

  return (
    <div className="chatbot-widget-wrap">
      {open && (
        <div className="chatbot-widget-panel">
          <div className="chatbot-widget-toolbar">
            <strong>AI Assistant</strong>
            <div className="chatbot-widget-actions">
             
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={startNewConversation}
                disabled={loadingHistory || sending}
              >
                New chat
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>
          </div>

          <div className="chatbot-messages">
            {loadingHistory && (
              <p className="muted small chat-empty">Loading conversation...</p>
            )}
            {!loadingHistory && messages.length === 0 && (
              <p className="muted small chat-empty">Ask about orders, policies, or inventory...</p>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={message.role === "user" ? "chat-bubble own" : "chat-bubble bot-bubble"}
              >
                {message.role === "bot"  && hasVisibleActions(message.trace) && (
                  <AiActionSteps trace={message.trace} compact />
                )}
                <p>{message.text}</p>
              </div>
            ))}

            {pendingConfirmation && (
              <div className="chat-confirmation-card">
                <p className="chat-confirmation-title">⚠️ Confirmation required</p>
                <p>{pendingConfirmation.summary}</p>
                <p className="muted small">This action cannot be automatically reversed.</p>
                <div className="chat-confirmation-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleConfirmation(false)}
                    disabled={sending}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleConfirmation(true)}
                    disabled={sending}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}

            {sending && (
              <div className="chat-bubble bot-bubble typing">
                <p>Thinking...</p>
                {showAiSteps && (
                  <AiActionSteps
                    trace={{
                      flowType: "processing",
                      toolCalls: [],
                    }}
                    compact
                  />
                )}
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
              disabled={sending || loadingHistory}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={sending || loadingHistory || !draft.trim()}
            >
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
