# SmartInventory AI Agent — Interview Guide

Use this document to prepare for AI Engineering interviews. Each section maps to a part of the project you built and can demo live.

---

## How to Present the Project (2-Minute Pitch)

> "I extended an inventory/e-commerce app with an AI support agent. The LLM doesn't query the database directly — it calls typed backend tools for live data and uses RAG for company policies. For destructive actions like cancellation, I implemented human-in-the-loop confirmation in the backend, not just in the prompt. Conversations are persisted in MongoDB, and every request produces an observability trace I can inspect in a debug view."

Then run **one RAG demo**, **one tool demo**, and **one hybrid + confirmation demo**.

---

## Part 1 — Fundamentals

### Q: What is an AI agent vs a chatbot?

**Answer:** A chatbot typically generates text from the model's training data. An **agent** can **decide to take actions** — call tools, retrieve documents, and combine results before answering. In this project, the agent loop is: user message → LLM → optional tool calls → tool results → LLM → final answer.

### Q: What is tool calling (function calling)?

**Answer:** The LLM returns structured JSON specifying a function name and arguments, e.g. `{ name: "getOrder", args: { orderId: "abc123" } }`. The backend validates, authorizes, executes, and returns the result. The LLM then turns that into natural language. Tool **schemas** (name, description, parameters) tell the model when and how to call each tool.

### Q: Why shouldn't the LLM access the database directly?

**Answer:**
- **Security** — prompt injection could exfiltrate data
- **Authorization** — backend enforces who can see what
- **Hallucination** — model might invent "order cancelled" without actually doing it
- **Auditability** — tool calls are logged in traces
- **Reliability** — business logic stays in tested code, not generated SQL

### Q: What is the agent loop in your project?

**Answer:** Implemented in `src/ai/agent/agent.js`:
1. Send user message + history + tool schemas to Gemini
2. If model returns `functionCall`(s) → execute via registry
3. Append tool results to conversation
4. Call Gemini again
5. Repeat until text response (max 5 rounds)

---

## Part 2 — RAG

### Q: What is RAG?

**Answer:** **Retrieval Augmented Generation** — before answering, search a knowledge base for relevant documents, inject those chunks into the LLM context, and generate an answer grounded in that text. Used for policies, FAQs, docs that aren't in the model weights.

### Q: Walk through your RAG pipeline.

**Answer:**
1. **Ingest** — markdown policies in `knowledge/`
2. **Chunk** — split by `##` headers (~700 chars) in `chunking.js`
3. **Embed** — Gemini `gemini-embedding-001` → vector
4. **Store** — `KnowledgeChunk` collection in MongoDB
5. **Retrieve** — embed user query, cosine similarity, top-K (default 3)
6. **Generate** — LLM answers from retrieved chunks only

Run: `npm run rag:ingest`

### Q: Why chunk documents?

**Answer:** LLMs have context limits; smaller chunks improve retrieval precision. Embeddings represent focused passages better than entire manuals. Overlap preserves context across chunk boundaries.

### Q: What are embeddings?

**Answer:** A list of numbers (vector) representing semantic meaning. Similar concepts → similar vectors. Enables search by meaning ("money back") not just keywords ("refund").

### Q: RAG vs fine-tuning?

**Answer:**

| | RAG | Fine-tuning |
|---|-----|-------------|
| Update knowledge | Edit markdown + re-ingest | Retrain model |
| Cost | Lower | Higher |
| Auditability | See which chunks were used | Opaque |
| Best for | Policies, docs, FAQs | Style, domain tone |

This project uses RAG because policies change and must be auditable.

### Q: How do you prevent policy hallucination?

**Answer:**
1. System prompt: answer only from retrieved chunks
2. If no chunk above `RAG_MIN_SCORE` → say information unavailable
3. RAG exposed as `searchKnowledgeBase` tool — model must call it for policy questions

---

## Part 3 — Hybrid RAG + Tools

### Q: What problem does hybrid solve?

**Answer:** Some questions need **both** static knowledge and live data.

*"Can I cancel order ABC123?"* needs:
- **Tool** — actual order status (pending/shipped/delivered)
- **RAG** — cancellation policy explanation
- **Backend rules** — `eligibility.cancellation.eligible` (deterministic yes/no)

RAG alone doesn't know order status. Tools alone don't explain policy.

### Q: Why backend eligibility rules AND RAG?

**Answer:** LLMs are bad at deterministic business rules (status tables, date windows). Backend `orderEligibility.js` computes structured `{ eligible: true/false, reason }`. RAG explains *why* in policy language. LLM combines both — facts from code, explanation from docs.

### Q: How do you detect hybrid flows in observability?

**Answer:** `flowType.js` inspects trace: if both `searchKnowledgeBase` and order tools ran → `hybrid_rag_and_order_data`. Stored in API `trace` and debug UI.

---

## Part 4 — Human-in-the-Loop

### Q: What is human-in-the-loop AI?

**Answer:** The system pauses before high-impact actions and requires explicit user approval. LLM *proposes*; user *approves*; backend *executes*.

### Q: How is confirmation enforced in your project?

**Answer:**
1. `cancelOrder` is in `toolsRequiringConfirmation`
2. First call → `previewCancelOrder` validates → creates `PendingAction` in MongoDB → returns `confirmation_required` (no mutation)
3. User confirms ("Yes" or UI button) → controller executes pending action **directly**, bypassing LLM
4. Cannot cancel without this path

### Q: Why execute confirmed actions outside the LLM loop?

**Answer:** Prevents the model from hallucinating "Done!" without execution. The exact pending action (tool + args) stored in DB is what runs — auditable and deterministic.

### Q: Eligibility question vs cancel request?

**Answer:**
- *"Can I cancel?"* → hybrid explain, no `cancelOrder`
- *"Cancel it"* → `cancelOrder` → confirmation

Different intents, different tools.

---

## Part 5 — Memory

### Q: What is conversation memory here?

**Answer:** Prior user/assistant turns stored in MongoDB (`Conversation` model). Each new message loads last 20 turns into the LLM context. Enables *"What is the status of the first one?"* without repeating order IDs.

### Q: Why server-side memory vs client sending history?

**Answer:** Tamper-proof, works across tabs/refreshes, single source of truth, enables debug view replay. Client only sends `conversationId`.

### Q: Why two limits (100 stored, 20 for agent)?

**Answer:** Store 100 for audit/reload; send 20 to LLM for context window and cost control. Most follow-ups reference recent turns.

### Q: Memory vs RAG?

**Answer:** Memory = this chat's history. RAG = company knowledge base. Different sources, different retrieval.

---

## Part 6 — Observability & UI

### Q: What do you log for each AI request?

**Answer:** `conversationId`, user message, model, latency, tool calls (name, args, result, duration), RAG sources, flow type, confirmation state, final response, success/failure.

### Q: Why show AI steps in the UI?

**Answer:** Transparency for users and impressive for demos. Shows the assistant used real tools/RAG, not invented answers. Debug view gives engineers full JSON traces.

---

## Part 7 — Security & Authorization

### Q: Where is authorization enforced?

**Answer:** Three layers:
1. **Route** — JWT auth middleware
2. **Registry** — role per tool (`customer` vs `merchant`)
3. **Tool implementation** — row-level (customer can't read another customer's order)

Never rely on the prompt alone.

### Q: What happens if a customer asks for all users' orders?

**Answer:** No tool returns cross-user data. `getCustomerOrders` filters by `req.userId`. If model tries unauthorized action, tool returns error; agent reports failure honestly.

---

## Part 8 — System Design Questions

### Q: How would you scale RAG?

**Answer:** Current POC: brute-force cosine over ~58 chunks in Node.js. At scale: dedicated vector DB (Qdrant, Pinecone, Atlas Vector Search), hybrid search (keyword + vector), reranking, caching frequent queries.

### Q: How would you add streaming?

**Answer:** SSE or WebSocket from agent loop; stream final LLM tokens; send tool/RAG events as structured chunks before text stream.

### Q: How would you evaluate this agent?

**Answer:** Golden dataset (already started in `ai/evaluation/`):
- Correct tool selection
- Correct RAG sources
- Authorization blocks
- Confirmation before cancel
- No hallucination on missing policy

Metrics: tool accuracy, retrieval recall@K, end-to-end answer quality (LLM-as-judge or human).

### Q: LangChain / LangGraph — why not use them first?

**Answer:** Built fundamentals explicitly first (tool loop, RAG pipeline, confirmation gate) to understand every step. Frameworks add value later for complex multi-agent graphs, not for learning core concepts.

### Q: How would you handle LLM failures?

**Answer:** Retry with backoff, fallback model, graceful error message to user, log in trace. Never fabricate tool success on failure.

---

## Part 9 — Trade-Off Questions

### Q: Gemini vs OpenAI?

**Answer:** Both support tool calling and embeddings. Chose Gemini for POC (generous free tier, single API for chat + embeddings). Architecture is provider-agnostic — swap `agent.js` and `embeddings.js`.

### Q: MongoDB for vectors vs dedicated vector DB?

**Answer:** POC has ~58 chunks — brute force is fine and easy to explain. Production would use indexed approximate nearest neighbor search.

### Q: When should an action require confirmation?

**Answer:** Destructive or irreversible: cancel order, large inventory change, refund, payment. Read-only (get order, search, RAG) runs immediately.

---

## Part 10 — Behavioral / Project Questions

### Q: What was the hardest part?

**Good answer themes:** Hybrid flows (eligibility + RAG + tools), confirmation state across turns, Gemini tool result message format, preventing hallucinated cancellations.

### Q: What would you do differently?

**Good answer themes:** TypeScript from start, automated eval CI, vector index from day one, streaming UX, rate limiting on AI endpoints.

### Q: How did you learn AI engineering?

**Good answer:** Built incrementally (6 phases), each adding one concept; read docs; tested with evaluation scripts; prioritized understandable code over frameworks.

---

## Quick Reference — File Map for Whiteboard

| Concept | File |
|---------|------|
| Agent loop | `ai/agent/agent.js` |
| Tool schemas | `ai/tools/definitions.js` |
| Tool execution + confirmation | `ai/tools/registry.js` |
| RAG ingest | `ai/rag/ingestion.js` |
| RAG retrieve | `ai/rag/retrieval.js` |
| Eligibility rules | `ai/utils/orderEligibility.js` |
| Pending confirmations | `ai/memory/pendingActions.js` |
| Conversation memory | `ai/memory/conversation.js` |
| Traces | `ai/observability/trace.js` |
| Chat API | `controllers/chatbotController.js` |
| Debug UI | `frontend/pages/AiDebug.jsx` |

---

## Practice Questions (Self-Test)

1. Explain tool calling in 30 seconds.
2. Draw the RAG pipeline on a whiteboard.
3. Why is "Can I cancel my order?" hybrid but "Cancel my order" not?
4. Where does authorization live? Name all three layers.
5. What happens between "Cancel my order" and the order actually being cancelled?
6. How does "the first one" work without the user repeating the order ID?
7. How would you debug a wrong answer using your trace?
8. What's the difference between memory and RAG?
9. Why not let the LLM write MongoDB queries?
10. How would you add a new tool (`updateInventory`)?

---

## Suggested Answers for #10 (Adding a Tool)

1. Implement handler in `ai/tools/inventoryTools.js`
2. Add schema to `definitions.js`
3. Register in `registry.js` + role permissions
4. Add to `toolsRequiringConfirmation` if destructive
5. Update system prompt with when to use it
6. Add eval case in `ai/evaluation/`

This shows you understand the full pipeline, not just prompt engineering.
