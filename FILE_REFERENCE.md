# Quick File Reference Guide

## Backend Files

### `/server.js` - Express Server & SSE Handler
**Size**: ~70 lines | **Type**: HTTP Server

**Key Exports**: None (standalone Express app)

**Key Functions**:
- `app.post('/api/chat/start')` - Sync negotiation endpoint (deprecated)
- `app.get('/api/chat/stream')` - SSE streaming endpoint (PRIMARY)

**To Modify For Multi-Supplier**:
- Add `app.get('/api/rfq/:rfqId/stream')` for parallel RFQ
- Create `/api/rfq/create` endpoint for RFQ initialization
- Route between negotiation and procurement flows

**SSE Protocol**:
```
event: message
data: {"agent":"seller","text":"...","timestamp":"2024-11-15T..."}

event: done
data: {}

event: error
data: {"error":"..."}
```

---

### `/src/agents.js` - Agent Query Interface
**Size**: ~62 lines | **Type**: Module | **Exports**: `querySeller()`, `queryBuyer()`

**Key Functions**:
- `querySeller(state)` → Promise<string>
  - Takes `NegotiationState` instance
  - Returns seller agent response
  - System prompt with price guidance
  
- `queryBuyer(state)` → Promise<string>
  - Takes `NegotiationState` instance
  - Returns buyer agent response
  - Budget constraint enforcement

- `runAgentPrompt(prompt)` → Promise<string>
  - Generic wrapper for Claude Agent SDK
  - Handles message filtering and error checking

**To Modify For Multi-Supplier**:
- Rename to `queryAgent(role, context, supplierId?)`
- Add supplier-specific system prompts
- Support parallel Promise.all() of supplier queries
- Add timeout handling

**System Prompt Template**:
```
You are a [seller/buyer] agent...
- Your [price range/budget limit] is...
- [Negotiation guidance]

Conversation so far:
${transcript}

Your response as the [Seller/Buyer] Agent:
```

---

### `/src/negotiation.js` - State Management
**Size**: ~130 lines | **Type**: Class | **Exports**: `NegotiationState`

**Key Class**: `NegotiationState`
- Constructor initializes negotiation state
- `addMessage(agent, text)` - Add & analyze message
- `extractPrice(text)` → number | null - Parse prices
- `containsAcceptance(text)` → boolean - Check for deal keywords
- `checkAgreement(agent, text)` → boolean - Validate agreement
- `formatTranscript()` → string - Format for agent context

**Price Extraction Logic**:
```javascript
// Regex: /(?:\$|USD|USDC)?\s*(0?\.\d+|\d+\.\d{1,2}|\d+)/i
// Matches: "$0.05", "0.05 USDC", "5 cents", "5"
// Handles cents conversion: "5 cents" → 0.05
```

**Agreement Regex**:
```javascript
ACCEPTANCE_REGEX = /\b(accept|deal|agreed|okay|ok|yes)\b/i
```

**State Transitions**:
```
'negotiating' ─┬→ 'agreed' (both parties accept same price)
               └→ 'failed' (max turns reached or other reason)
```

**To Modify For Multi-Supplier**:
- Extend to `SupplierQuote extends NegotiationState`
- Add supplier-specific fields (id, name, deliveryDays, rating)
- Create `ProcurementState` with `suppliers: Map<id, SupplierQuote>`
- Track status per supplier independently

---

### `/src/conversation.js` - Negotiation & Payment Flow
**Size**: ~212 lines | **Type**: Module | **Exports**: `conversationFlow()`, `runConversation()`

**Key Generators**:
- `aiNegotiationFlow()` - Main negotiation loop (async generator)
- `executePayment(amount)` - Payment execution (async generator)
- `conversationFlow()` - Wrapper that yields from negotiation
- `runConversation()` - Collect all messages into array

**Message Structure**:
```javascript
{
  timestamp: ISO string,
  status: 'default|success|error|processing|waiting|negotiating|delivery|complete',
  audience: 'buyer|seller|both',
  agent: 'buyer|seller|system',
  text: string,
  displayName: string (optional),
  summary: boolean (optional),
  details: object (optional)
}
```

**Negotiation Loop**:
```
1. Query Seller → yield message
2. While state.shouldContinue():
   - Query Buyer → yield message
   - Check agreement
   - If not agreed: Query Seller → yield message
   - state.turns++
3. If agreed: executePayment()
4. Else: yield failure message
```

**To Modify For Multi-Supplier**:
- Create `procurementFlow()` with parallel supplier queries
- Yield messages as suppliers respond (race-based)
- Add comparison logic after all quotes received
- Negotiate only with selected supplier if needed

---

### `/src/payment.js` - Locus Payment Handler
**Size**: ~24 lines | **Type**: Module | **Exports**: `sendPayment()`

**Key Function**:
- `sendPayment({ to, amount, memo })` → Promise<{success, result}>
  - Queries Claude to execute payment
  - Uses Locus MCP tools via Claude Agent SDK
  - Handles async message streaming

**Payment Extraction**:
```javascript
// Looks for transaction ID in payment result
// Tries: transaction_id, transactionId, id, tx_hash, 0x hash pattern
extractConfirmationId(paymentResult)
```

**To Modify For Multi-Supplier**:
- Support batch payments: `sendPaymentBatch([{to, amount}, ...])`
- Add payment status tracking per supplier
- Handle partial payment failures (retry/rollback logic)

---

### `/src/config.js` - Configuration & MCP Setup
**Size**: ~57 lines | **Type**: Module | **Exports**: Constants + `getMcpOptions()`

**Exported Constants**:
```javascript
SENDER_ADDRESS = '0xe68...'
RECEIVER_ADDRESS = '0x4ae...'
PDF_LINK = '...'
MIN_PRICE = 0.01
MAX_PRICE = 0.10
BUYER_LIMIT = 0.05
SELLER_START_MIN = 0.06
SELLER_START_MAX = 0.10
NEGOTIATION_MAX_TURNS = 10
```

**Key Function**:
- `getMcpOptions()` → object
  - Configures MCP servers
  - Sets allowed tools
  - Defines `canUseTool` authorization callback

**MCP Server Config**:
```javascript
{
  locus: {
    type: 'http',
    url: 'https://mcp.paywithlocus.com/mcp',
    headers: { Authorization: `Bearer ${LOCUS_API_KEY}` }
  }
}
```

**Tool Authorization Callback**:
```javascript
canUseTool: async (toolName, input) => {
  // Enforce budget limit on send_to_address
  // Whitelist only Locus tools
  // Allow MCP resource reading
}
```

**To Modify For Multi-Supplier**:
- Add supplier configuration object
- Add RFQ-specific constants (timeout, max suppliers)
- Add supplier profiles (name, price range, delivery range)
- Expand authorization for multiple suppliers

---

## Frontend Files

### `/public/index.html` - HTML Structure
**Size**: ~34 lines | **Type**: HTML

**Key Elements**:
- `<button id="start-btn">` - Trigger negotiation
- `<span id="status-badge">` - Status indicator
- `<div id="negotiation-summary">` - Result banner
- `<div id="buyer-column">` - Buyer messages column
- `<div id="seller-column">` - Seller messages column

**To Modify For Multi-Supplier**:
- Add dynamic supplier columns (JavaScript inserted)
- Keep left column for buyer/procurement manager
- Add N columns for each supplier
- Add supplier info header (name, rating, delivery)
- Add selection UI (radio button or card)

---

### `/public/styles.css` - Styling
**Size**: ~200 lines | **Type**: CSS

**Key Classes**:
- `.chat` - Grid container (auto-fit columns)
- `.column` - Individual agent column
- `.message` - Message bubble
- `.message.buyer|seller|system` - Agent color coding
- `.message.typing` - Animated typing indicator
- `.badge` - Status badge
- `.summary-banner` - Result notification

**Colors**:
- Buyer: #dbeafe (light blue)
- Seller: #fef3c7 (light yellow)
- System: #ede9fe (light purple)
- Typing: Darker shades of above

**To Modify For Multi-Supplier**:
- Dynamic grid columns: `grid-template-columns: repeat(var(--supplier-count), 1fr)`
- Set CSS variable from JavaScript: `--supplier-count: 4`
- Supplier header styling (name, rating, delivery time)
- Price comparison badge styling
- Selection checkbox/radio styling

---

### `/public/app.js` - Frontend Event Handler
**Size**: ~173 lines | **Type**: JavaScript (Vanilla)

**Key Functions**:
- `startConversation()` - Open EventSource, disable button
- `handleMessage(message)` - Enqueue message for rendering
- `processMessage(message)` - Show typing, render message
- `appendMessage(message)` - Create and insert DOM element
- `showTyping(agent)` - Display typing bubble
- `clearTyping(agent)` - Remove typing bubble

**Message Processing Flow**:
```
1. EventSource.onmessage fires
2. Parse JSON from event.data
3. Enqueue in renderQueue (Promise chain)
4. Show 1-second typing indicator
5. Append message to DOM
6. Update status badge/summary
```

**DOM Manipulation**:
- Messages appended based on `message.agent` field
- System messages cloned for 'both' audience
- HTML from `message.text` rendered (sanitized with `.replace()`)
- No library dependencies

**To Modify For Multi-Supplier**:
- Detect supplier count from initial RFQ message
- Dynamically create N supplier columns
- Route messages to correct supplier column via `message.supplierId`
- Update supplier column with metadata (price, delivery)
- Handle selection interaction (radio button → POST to server)
- Add order tracking view post-selection

---

## Entry Points

### `npm run dev` → `/server.js`
- Starts Express server on port 3000
- Serves static files from `/public`
- Ready for browser at http://localhost:3000

### `npm start` → `/index.js`
- Runs CLI payment demo
- Queries payment context
- Executes test payment to receiver address
- Displays results in console

---

## Data Flow Reference

```
Browser                   Server                   Claude SDK            Locus MCP
────────────────────────────────────────────────────────────────────────────────

Start Negotiation
    │
    ├─ GET /api/chat/stream ──→ server.js
    │                            ├─ for await conversationFlow()
    │                            │   ├─ queryBuyer() ──────────→ Claude API ──→ query()
    │                            │   │                              ├─ MCP tools
    │                            │   │                              └─ Returns text
    │                            │   │
    │                            │   ├─ queryBuyer() ──────────→ Claude API ──→ query()
    │                            │   │
    │                            │   └─ executePayment()
    │                            │       └─ sendPayment() ─────→ Claude API ──→ query()
    │                            │           (Claude calls locus tools)       ──→ send_to_address
    │                            │                                             → returns TX ID
    │                            │
    │                            ├─ yield message (SSE event)
    │ ←─────────────────────────┤
    │
    ├─ SSE message handler
    │   ├─ Parse JSON
    │   ├─ Show typing indicator
    │   └─ Append to DOM
    │
    └─ repeat until 'done' event

```

---

## For Quick Navigation

**If you need to...**

| Task | File | Lines | Function |
|------|------|-------|----------|
| Add new agent type | `agents.js` | 20-62 | Create new query function |
| Add price validation | `negotiation.js` | 48-68 | Modify `extractPrice()` |
| Change negotiation terms | `config.js` | 8-13 | Update constants |
| Add SSE endpoint | `server.js` | 24-65 | Add app.get() route |
| Create supplier column | `app.js` + `styles.css` | - | Dynamic DOM insertion |
| Modify message colors | `styles.css` | 127-138 | Update `.message` classes |
| Change payment memo | `conversation.js` | 145-147 | Edit `sendPayment()` call |
| Adjust MCP permissions | `config.js` | 38-56 | Modify `canUseTool` callback |

---

## Critical Data Structures

### Flowing Through SSE Stream (Message)
```javascript
{
  timestamp: string,
  status: string,
  audience: string,
  agent: string,
  text: string,
  displayName?: string,
  summary?: boolean,
  details?: object
}
```

### In-Memory State (NegotiationState)
```javascript
{
  transcript: [{agent, text, timestamp}, ...],
  turns: number,
  maxTurns: number,
  status: string,
  currentOffer: number,
  lastOffer: {agent, price},
  agreedPrice: number,
  failReason: string,
  initialSellerPrice: number
}
```

### MCP Options (Passed to Claude)
```javascript
{
  mcpServers: {locus: {...}},
  allowedTools: [...],
  apiKey: string,
  canUseTool: function
}
```

