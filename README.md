# SmartInventory — AI-Powered Inventory & Customer Support Agent

An e-commerce / inventory management application extended with a production-oriented **AI agent** suitable for AI Engineering portfolio demos and interviews.

Creds: user@gmail.com Admin@123


The assistant lives in the chat widget and can:

- Answer policy questions using **RAG**
- Fetch live order/product data using **tool calling**
- Combine both for hybrid questions (e.g. *"Can I cancel my order?"*)
- Require **human confirmation** before destructive actions
- Remember **conversation context** across turns
- Expose **observability traces** for debugging

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, Axios |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose) |
| AI | Google Gemini (`@google/genai`) |
| Embeddings | Gemini `gemini-embedding-001` |
| Vector storage | MongoDB (`KnowledgeChunk` collection + cosine similarity) |
| Payments | Razorpay (COD + online) |

---

## Project Structure

```
SmartInventory/
├── inventory_management/          # Backend API + AI agent
│   ├── knowledge/                 # Policy docs for RAG (.md)
│   └── src/
│       ├── ai/
│       │   ├── agent/             # LLM loop, prompts
│       │   ├── tools/             # Tool schemas + implementations
│       │   ├── rag/               # Chunking, embeddings, retrieval
│       │   ├── memory/            # Conversations, pending confirmations
│       │   ├── observability/     # Traces, flow type detection
│       │   └── evaluation/        # Phase 1–6 smoke tests
│       ├── controllers/
│       ├── models/
│       └── routes/
└── inventory-management-frontend/ # React UI + chat widget + debug view
```

---

## AI Architecture

```
User
  ↓
Chat UI (React)
  ↓
POST /api/chatbot
  ↓
Agent (Gemini)
  ↓
Decision
  ├── Direct answer (greetings)
  ├── RAG (searchKnowledgeBase)
  ├── Tools (orders, products, support)
  └── Hybrid (RAG + tools)
  ↓
Tool layer (authorization + validation)
  ↓
MongoDB / business logic
  ↓
LLM synthesizes final response
  ↓
Trace + conversation memory persisted
```

**Core rule:** The LLM never accesses MongoDB directly. It only calls explicitly defined tools.

---

## Features by Phase

| Phase | Feature | Key files |
|-------|---------|-----------|
| 1 | Tool calling | `ai/tools/*`, `ai/agent/agent.js` |
| 2 | RAG | `knowledge/*`, `ai/rag/*` |
| 3 | Hybrid RAG + tools | `ai/utils/orderEligibility.js`, enhanced prompts |
| 4 | Human-in-the-loop | `models/PendingAction.js`, `cancelOrder` |
| 5 | Conversation memory | `models/Conversation.js`, `ai/memory/conversation.js` |
| 6 | AI UI + debug view | `AiActionSteps`, `/ai-debug` |

---

## AI Tools

| Tool | Type | Description |
|------|------|-------------|
| `getCustomerProfile` | Read | User profile |
| `getCustomerOrders` | Read | Recent orders |
| `getOrder` | Read | Order details + eligibility |
| `getOrderStatus` | Read | Status only |
| `searchProducts` | Read | Product search |
| `getProductStock` | Read | Stock check |
| `searchKnowledgeBase` | RAG | Policy / FAQ retrieval |
| `createSupportTicket` | Write | Escalate issue |
| `getSupportTicket` | Read | Ticket lookup |
| `cancelOrder` | **Destructive** | Cancels order (requires confirmation) |

Authorization is enforced in the **tool layer**, not in prompts.

---

## Setup

### Prerequisites

- Node.js 18+
- MongoDB (Atlas or local via Docker)
- [Gemini API key](https://aistudio.google.com/apikey)

### 1. Clone and install

```bash
cd inventory_management && npm install
cd ../inventory-management-frontend && npm install
```

### 2. Backend environment

Copy/configure `inventory_management/.env`:

```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/smartinventory
JWT_SECRET=your_jwt_secret

# AI
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001

# RAG
RAG_TOP_K=3
RAG_MIN_SCORE=0.55

# Memory
CHAT_MAX_STORED_MESSAGES=100
CHAT_MAX_AGENT_HISTORY=20
```

### 3. Index the knowledge base (required for RAG)

```bash
cd inventory_management
npm run rag:ingest
```

### 4. Start services

```bash
# Terminal 1 — backend
cd inventory_management
npm run dev

# Terminal 2 — frontend
cd inventory-management-frontend
npm run dev
```

Optional — local MongoDB via Docker:

```bash
docker compose up -d mongodb
```

### 5. Open the app

- Frontend: http://localhost:5173
- Backend: http://localhost:5001
- Register as **customer** or **merchant**, then open the chat widget (💬)

---

## API Endpoints (AI)

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/chatbot` | Send message to agent |
| `GET` | `/api/chatbot/conversations` | List conversations |
| `POST` | `/api/chatbot/conversations` | Start new conversation |
| `GET` | `/api/chatbot/conversations/:id` | Load conversation history |

Chat request body:

```json
{
  "message": "Show my recent orders",
  "conversationId": "optional_mongo_id",
  "confirmActionId": "optional_for_confirmation",
  "rejectActionId": "optional_for_rejection"
}
```

Response includes `reply`, `trace`, and optionally `confirmationRequired`.

---

## Demo Script (Interview)

### 1. Normal AI
> "Hello, what can you help me with?"

No tools — direct response.

### 2. RAG
> "What is your refund policy?"

`searchKnowledgeBase` → cites `refund-policy.md`.

### 3. Tool calling
> "Show me my latest order."

`getCustomerOrders` → live data from MongoDB.

### 4. Hybrid
> "Can I cancel my latest order?"

`getCustomerOrders` + `searchKnowledgeBase` + backend `eligibility` object.

### 5. Human-in-the-loop
> "Cancel my latest order."

`cancelOrder` → confirmation card → user confirms → order cancelled.

### 6. Permission
> "Show me all customers and their orders."

Tool/auth layer rejects unauthorized access.

### 7. Memory
> "Show my recent orders" → then → "What is the status of the first one?"

Uses MongoDB conversation history.

### 8. Debug view
Open **AI Debug** (`/ai-debug`) → expand a turn → show full trace.

---

## Testing

```bash
cd inventory_management

npm run rag:ingest       # Re-index knowledge base
```

---

## Observability

Every chat response includes a `trace` object:

```json
{
  "flowType": "hybrid_rag_and_order_data",
  "model": "gemini-2.0-flash",
  "latencyMs": 842,
  "toolCalls": [{ "name": "getCustomerOrders", "success": true }],
  "ragRetrieval": { "sources": [{ "sourceFile": "cancellation-policy.md" }] },
  "confirmationRequired": null
}
```

Traces are also stored in `Conversation.messages[].metadata` for the debug page.

---

## RAG Pipeline

```
Policy document (.md)
  → chunking (by ## headers, ~700 chars)
  → Gemini embeddings
  → MongoDB (KnowledgeChunk)
  → cosine similarity on query
  → top-K chunks → LLM context
```

Re-run `npm run rag:ingest` after editing files in `knowledge/`.

---

## Security Model

1. **Authentication** — JWT cookie on all chat routes
2. **Role permissions** — tool registry checks `customer` vs `merchant`
3. **Row-level auth** — each tool validates ownership (e.g. customer can't read another user's order)
4. **Confirmation gate** — `cancelOrder` creates `PendingAction`; executes only after explicit confirm
5. **No DB access for LLM** — all data access goes through tools

---

## Interview Prep

See **[INTERVIEW_GUIDE.md](./INTERVIEW_GUIDE.md)** for:

- Conceptual questions (tool calling, RAG, hybrid, HITL, memory)
- Architecture questions
- Trade-off questions
- System design follow-ups
- Suggested talking points for each demo scenario

---

## Future Improvements

- Atlas Vector Search or Qdrant for scale
- `createOrder`, `updateInventory` with confirmation
- Streaming responses (SSE)
- Automated eval suite with golden answers
- TypeScript migration
- LangGraph / agent framework after fundamentals are solid

---

## License

ISC (portfolio / educational project)
