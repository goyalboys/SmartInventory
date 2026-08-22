import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import AiDebugTrace from "../components/AiDebugTrace";
import api from "../services/api";

function AiDebug() {
  const [role, setRole] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const userRes = await api.get("/users/me");
        setRole(userRes.data.user.role);

        const listRes = await api.get("/chatbot/conversations");
        setConversations(listRes.data.conversations || []);

        const stored = sessionStorage.getItem("smartinventory_chat_conversation_id");
        if (stored) {
          setSelectedId(stored);
        } else if (listRes.data.conversations?.[0]?.id) {
          setSelectedId(listRes.data.conversations[0].id);
        }
      } catch {
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    const loadConversation = async () => {
      if (!selectedId) {
        setConversation(null);
        return;
      }

      try {
        const response = await api.get(`/chatbot/conversations/${selectedId}`);
        setConversation(response.data.conversation);
        setExpandedIndex(null);
      } catch {
        setConversation(null);
      }
    };

    loadConversation();
  }, [selectedId]);

  if (loading) {
    return (
      <Layout role={role}>
        <p>Loading AI debug view...</p>
      </Layout>
    );
  }

  const turns = [];
  const messages = conversation?.messages || [];

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role !== "assistant") continue;

    const userMessage = messages[index - 1]?.role === "user" ? messages[index - 1].text : "";
    turns.push({
      userMessage,
      reply: message.text,
      trace: message.metadata?.trace || message.metadata,
      index,
    });
  }

  return (
    <Layout role={role}>
      <div className="ai-debug-page">
        <div className="ai-debug-header">
          <div>
            <h1>AI Agent Debug View</h1>
            <p className="muted">
              Inspect tool decisions, RAG retrieval, confirmations, and final responses — useful for demos and debugging.
            </p>
          </div>
          <Link to={role === "merchant" ? "/merchant" : "/merchants"} className="btn btn-secondary btn-sm">
            Back to app
          </Link>
        </div>

        <div className="ai-debug-toolbar card">
          <label htmlFor="conversation-select">Conversation</label>
          <select
            id="conversation-select"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            <option value="">Select conversation</option>
            {conversations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} ({item.messageCount} msgs)
              </option>
            ))}
          </select>
        </div>

        {!conversation && (
          <div className="card empty-state">
            <p>No conversation selected. Start chatting first, then return here.</p>
          </div>
        )}

        {conversation && turns.length === 0 && (
          <div className="card empty-state">
            <p>This conversation has no assistant turns with trace data yet.</p>
          </div>
        )}

        {turns.map((turn) => (
          <div key={turn.index} className="card ai-debug-turn">
            <button
              type="button"
              className="ai-debug-turn-toggle"
              onClick={() => setExpandedIndex(expandedIndex === turn.index ? null : turn.index)}
            >
              <span>
                <strong>Turn {turn.index}</strong>
                <span className="muted"> — {turn.userMessage.slice(0, 80) || "Assistant message"}</span>
              </span>
              <span>{expandedIndex === turn.index ? "▾" : "▸"}</span>
            </button>

            {expandedIndex === turn.index && (
              <AiDebugTrace trace={turn.trace} userMessage={turn.userMessage} reply={turn.reply} />
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
}

export default AiDebug;
