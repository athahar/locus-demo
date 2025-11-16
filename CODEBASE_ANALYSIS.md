# Locus Agent Negotiation Codebase Analysis

## Project Overview

This is a buyer-seller negotiation demo built with:
- **Backend**: Express.js + Node.js with Claude Agent SDK
- **Frontend**: Vanilla HTML/CSS/JavaScript with Server-Sent Events (SSE)
- **Payment Integration**: Locus MCP server for USDC transactions
- **AI Agents**: Anthropic Claude for autonomous negotiation

---

## 1. AGENT NEGOTIATION ARCHITECTURE

### Core Flow
The negotiation follows this sequence:

```
1. System initiates → 2. Seller agent makes opening offer 
→ 3. Buyer responds with counteroffer
→ 4. Loop: Seller response → Buyer response (max 10 turns)
→ 5. Check for agreement (both parties accept same price)
→ 6. Execute payment + deliver resource
```

### Key Files

#### `/src/agents.js` - Agent Query Interface
- **`querySeller(state)`**: Queries seller agent with conversation context
  - System prompt defines price range ($0.01-$0.10 USDC)
  - Initial price randomized between $0.06-$0.10
  - Uses `NegotiationState.formatTranscript()` for context
  
- **`queryBuyer(state)`**: Queries buyer agent with conversation context
  - System prompt defines hard spending limit ($0.05)
  - Instructs to negotiate politely
  
- **`runAgentPrompt(prompt)`**: Generic agent query wrapper
  - Uses Anthropic's `@anthropic-ai/claude-agent-sdk` `query()` function
  - Filters for `type === 'result'` and `subtype === 'success'` messages
  - Passes MCP options with Locus tool access

#### `/src/negotiation.js` - State Management
```javascript
export class NegotiationState {
  constructor() {
    this.transcript = []           // All messages exchanged
    this.turns = 0                 // Current turn count
    this.maxTurns = 10             // Max 10 turns before failure
    this.status = 'negotiating'    // negotiating | agreed | failed
    this.currentOffer = null       // Latest price mentioned
    this.lastOffer = null          // { agent, price } of last valid offer
    this.agreedPrice = null        // Final agreed price
    this.failReason = null         // Why negotiation failed
    this.initialSellerPrice = ...  // Random opening price
  }

  addMessage(agent, text)          // Add message and extract price
  extractPrice(text)               // Parse $ amounts from text
  containsAcceptance(text)         // Regex check for deal acceptance
  checkAgreement(agent, text)      // Validate if deal is accepted
  shouldContinue()                 // Check if negotiation can continue
  markFailure(reason)              // Mark negotiation as failed
  formatTranscript()               // Format for agent context
}
```

**Key Logic:**
- Prices extracted via regex: `/(?:\$|USD|USDC)?\s*(0?\.\d+|\d+\.\d{1,2}|\d+)/i`
- Agreement requires BOTH:
  1. Agent says acceptance keywords (accept, deal, ok, yes, agreed)
  2. Last offer price is within their limits
- Seller accepts prices in $0.01-$0.10 range
- Buyer rejects prices above $0.05

---

## 2. REAL-TIME COMMUNICATION SETUP

### Server-Side: Express + SSE

#### `/server.js` - Main Express Server

**POST `/api/chat/start`**
- Synchronous negotiation execution
- Returns all messages as JSON response
- Deprecated in favor of SSE streaming

**GET `/api/chat/stream`** (PRIMARY)
```javascript
// Server-Sent Events setup
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');

// Heartbeat every 15 seconds to prevent timeout
setInterval(() => res.write(': heartbeat\n\n'), 15000);

// Stream messages as JSON from conversationFlow()
for await (const message of conversationFlow()) {
  res.write(`event: message\n`);
  res.write(`data: ${JSON.stringify(message)}\n\n`);
}

// Signal completion
res.write(`event: done\ndata: {}\n\n`);
```

**Message Format:**
```javascript
{
  timestamp: '2024-11-15T10:30:00.000Z',
  status: 'default|success|error|processing|waiting',
  audience: 'buyer|seller|both',
  agent: 'buyer|seller|system',
  text: '...',
  displayName: 'Buyer Agent|Seller Agent',
  summary: boolean,      // Set for final messages
  details: {...}         // Payment details if applicable
}
```

### Client-Side: EventSource + DOM Rendering

#### `/public/app.js` - Frontend Event Handler
```javascript
// 1. Open SSE connection
eventSource = new EventSource('/api/chat/stream');

// 2. Handle messages with typing indicator queue
eventSource.onmessage = (event) => {
  const message = JSON.parse(event.data);
  handleMessage(message);  // Enqueue for render
};

// 3. Process queue sequentially
renderQueue = renderQueue
  .then(() => processMessage(message))
  .catch(error => console.error);

// 4. Show typing bubble for 1 second before message
showTyping(agent);
await wait(1000);
clearTyping(agent);
appendMessage(message);

// 5. Handle custom events
eventSource.addEventListener('done', () => {...});
eventSource.addEventListener('error', () => {...});
```

**Key Features:**
- Sequential message rendering via Promise queue
- 1-second typing indicator delay for each agent response
- Typing bubbles with CSS animation (3 bouncing dots)
- Status badge shows current state
- System messages can be audience-specific (buyer-only, seller-only, or both)
- Messages cloned for "both" audience (shown in both columns)

---

## 3. PAYMENT & AUTHORIZATION FLOW

### Payment Execution Pipeline

#### `/src/payment.js` - Payment Handler
```javascript
export async function sendPayment({ to, amount, memo }) {
  const prompt = `Send ${amount} USDC to address ${to} with memo "${memo}"`;
  
  // Query Claude to execute payment via Locus MCP
  for await (const message of query({ prompt, options })) {
    if (message.type === 'result' && message.subtype === 'success') {
      paymentResult = message.result;
    }
  }
  
  return { success: true, result: paymentResult };
}
```

#### `/src/conversation.js` - Payment Integration
```javascript
async function* executePayment(amount) {
  // 1. Show processing status to buyer
  yield message: 'Sending 0.01 USDC to seller...' (audience: buyer)
  
  // 2. Show waiting status to seller
  yield message: 'Buyer is sending 0.01 USDC...' (audience: seller)
  
  // 3. Send actual payment via Locus
  const payment = await sendPayment({ to, amount, memo });
  
  // 4. Extract transaction ID
  const confirmationId = extractConfirmationId(payment.result);
  
  // 5. Confirm to both parties
  yield message: `Payment confirmed. TX: ${confirmationId}` (audience: buyer)
  yield message: `Payment received. TX: ${confirmationId}` (audience: seller)
  
  // 6. Seller delivers resource
  yield message: `<a href="...">Download PDF</a>` (agent: seller)
}
```

### Tool Authorization & Validation

#### `/src/config.js` - MCP Configuration
```javascript
const mcpServers = {
  locus: {
    type: 'http',
    url: 'https://mcp.paywithlocus.com/mcp',
    headers: { Authorization: `Bearer ${LOCUS_API_KEY}` }
  }
};

const options = {
  mcpServers,
  allowedTools: ['mcp__locus__*', 'mcp__list_resources', 'mcp__read_resource'],
  apiKey: process.env.ANTHROPIC_API_KEY,
  
  // Custom authorization callback
  canUseTool: async (toolName, input) => {
    if (toolName.startsWith('mcp__locus__send_to_address')) {
      const amount = parseFloat(input?.amount ?? '0');
      if (amount > BUYER_LIMIT) {
        return {
          behavior: 'deny',
          message: `Amount ${amount} exceeds limit ${BUYER_LIMIT}`
        };
      }
    }
    
    if (toolName.startsWith('mcp__locus__')) {
      return { behavior: 'allow', updatedInput: input };
    }
    
    return { behavior: 'deny', message: 'Only Locus tools allowed' };
  }
};
```

**Authorization Strategy:**
- Whitelist only Locus tools (`mcp__locus__*`)
- Enforce buyer spending limit ($0.05 max)
- Prevent tool use outside allowed list
- No email/escrow alternate payment methods permitted

---

## 4. WEBSOCKET vs SSE DECISION

**Current Implementation: Server-Sent Events (SSE)**

**Advantages Chosen:**
- Unidirectional (server → client) perfectly matches use case
- Built-in browser support (EventSource API)
- HTTP-based, no upgrade handshake
- Simpler implementation (no connection state management)
- Text-based protocol (JSON over HTTP)
- Automatic reconnection with `Last-Event-ID`
- Heartbeat prevents proxy/firewall timeout

**Why Not WebSocket:**
- Requires bidirectional communication (not needed here)
- More complex protocol handshake
- Requires WebSocket client library in browser
- Connection management overhead

**Note:** Could upgrade to WebSocket for:
- User intervention during negotiation (stop/pause)
- Real-time user input injected into negotiation
- Two-way chat (manual + agents)

---

## 5. AGENT ARCHITECTURE & COMMUNICATION

### Agent Types

#### 1. **Seller Agent**
- **System Prompt**: Price range $0.01-$0.10 USDC
- **Behavior**: Start high, negotiate down
- **Initial Price**: Randomized $0.06-$0.10
- **Goal**: Accept highest price within range
- **Trigger**: Activated after each buyer response

#### 2. **Buyer Agent**
- **System Prompt**: Hard limit $0.05 USDC
- **Behavior**: Polite negotiation
- **Goal**: Accept lowest price (must be ≤ $0.05)
- **Trigger**: Activated after each seller response

#### 3. **System Agent**
- No AI queries
- Manages flow control, status updates, payment execution
- Audience-aware messaging (buyer vs seller views)

### Agent Communication Flow

```
[System] Start negotiation
         │
         ├─→ Query Seller Agent
         │   Input: NegotiationState.formatTranscript()
         │   System Prompt: Price range, opening price guidance
         │   Output: Natural language counteroffer
         │
         ├─→ Output to Frontend (SSE message)
         │
         └─→ Query Buyer Agent
             Input: Updated transcript with Seller's response
             System Prompt: Budget limit, negotiation strategy
             Output: Natural language response/counteroffer
             
             └─→ Check Agreement
                 if state.status === 'agreed':
                   └─→ Execute Payment
                       └─→ Deliver Resource
```

### Context Passing

**NegotiationState.formatTranscript()**
```
Seller Agent: I'm offering this PDF for $0.08 USDC
Buyer Agent: That's a bit high. Can you do $0.03?
Seller Agent: I can come down to $0.06
Buyer Agent: I accept $0.06
```

Each agent receives the full conversation history to:
1. Understand negotiation progress
2. Learn counter-party's position
3. Make informed responses
4. Detect agreement conditions

### Tool Access per Agent
- **Seller & Buyer**: Query MCP tools via Claude SDK
- **System**: Direct MCP tool calls for payment
- **Tool Authorization**: `canUseTool` callback enforces budget limits

---

## 6. UI COMPONENTS & LAYOUT

### DOM Structure
```html
<header>
  <h1>Locus Agent Negotiation</h1>
  <button id="start-btn">Start Negotiation</button>
  <span id="status-badge">Idle</span>
</header>

<div id="negotiation-summary"><!-- Success/error banner --></div>

<section class="chat">
  <div class="column" id="buyer-column">
    <h2>Buyer</h2>
    <div class="messages" id="buyer-messages"><!-- Messages here --></div>
  </div>
  
  <div class="column" id="seller-column">
    <h2>Seller</h2>
    <div class="messages" id="seller-messages"><!-- Messages here --></div>
  </div>
</section>
```

### Message Component
```javascript
<div class="message buyer|seller|system">
  <div class="message-label">BUYER AGENT</div>
  <div class="message-body">Message text with <br /> newlines</div>
</div>
```

### Styling
- **Responsive grid**: 2 columns on desktop, 1 on mobile
- **Color coding**: Buyer (blue), Seller (yellow), System (purple)
- **Typing indicator**: 3 bouncing dots with CSS animation
- **Status badge**: Shows current state (processing, success, error)
- **Summary banner**: Large notification for deal completion/failure

---

## 7. CONFIG & CONSTANTS

### `/src/config.js`
```javascript
SENDER_ADDRESS = '0xe68a976548be38257043efdd97af89249b2a49dd'
RECEIVER_ADDRESS = '0x4ae934efc1b61b3686394ffcf8c4a6a3780b7cb9'
PDF_LINK = '...labour-law-pdf...'

MIN_PRICE = 0.01
MAX_PRICE = 0.10
BUYER_LIMIT = 0.05
SELLER_START_MIN = 0.06
SELLER_START_MAX = 0.10
NEGOTIATION_MAX_TURNS = 10
```

### Environment Variables
```
LOCUS_API_KEY=...        # Locus MCP authentication
ANTHROPIC_API_KEY=...    # Claude API authentication
```

---

## 8. KEY INTEGRATION POINTS

### Claude Agent SDK Integration
```javascript
import { query } from '@anthropic-ai/claude-agent-sdk';

// Agent query with MCP tool access
for await (const message of query({ prompt, options })) {
  if (message.type === 'result' && message.subtype === 'success') {
    finalResult = message.result;
  }
}
```

### Locus MCP Server
- **Endpoint**: `https://mcp.paywithlocus.com/mcp`
- **Auth**: Bearer token via Authorization header
- **Tools Available**: 
  - `mcp__locus__send_to_address` (USDC transfers)
  - `mcp__locus__get_payment_context`
  - Others discoverable via MCP
- **Budget Enforcement**: Server-side `canUseTool` callback

### Express Server
```javascript
app.post('/api/chat/start', async (req, res) => {...})
app.get('/api/chat/stream', async (req, res) => {
  for await (const message of conversationFlow()) {...}
})
```

---

## 9. DATA FLOW DIAGRAM

```
┌─────────────────────┐
│  Frontend Browser   │
│  (app.js)           │
└──────────┬──────────┘
           │ EventSource("/api/chat/stream")
           ▼
┌─────────────────────────────────────────┐
│  Express Server (server.js)             │
│  GET /api/chat/stream                   │
└──────────┬──────────────────────────────┘
           │ for await (conversationFlow())
           ▼
┌─────────────────────────────────────────┐
│  Conversation Generator (conversation.js)│
│  • Negotiation loop                     │
│  • Payment execution                    │
└──────────┬──────────────────────────────┘
           │
      ┌────┴────┐
      │          │
      ▼          ▼
  ┌────────────────────┐    ┌──────────────────────┐
  │ Buyer Agent Query  │    │ Seller Agent Query   │
  │ (agents.js)        │    │ (agents.js)          │
  └────────┬───────────┘    └──────────┬──────────┘
           │                           │
           └───────────────┬───────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ Claude Agent SDK + MCP           │
        │ (Anthropic API)                  │
        └────────┬───────────────────────┬─┘
                 │                       │
                 ▼                       ▼
        ┌──────────────────┐   ┌───────────────────┐
        │ NegotiationState │   │ Payment Handler   │
        │ (negotiation.js) │   │ (payment.js)      │
        └─────────────────┬┘   └────────┬──────────┘
                          │             │
                          └─────┬───────┘
                                ▼
                 ┌──────────────────────────────┐
                 │ Locus MCP Server             │
                 │ • USDC transfers             │
                 │ • Payment context            │
                 │ • Blockchain interaction     │
                 └──────────────────────────────┘
```

---

## 10. DEPLOYMENT STRUCTURE

```
locus-test/
├── server.js              # Express server for web demo
├── index.js               # CLI demo (payment script)
├── package.json           # Dependencies
├── .env                   # API keys (not committed)
├── .env.example           # Template
├── README.md              # Documentation
│
├── src/
│   ├── agents.js          # Agent query interface
│   ├── negotiation.js     # NegotiationState class
│   ├── conversation.js    # Negotiation & payment flow
│   ├── payment.js         # Locus payment execution
│   └── config.js          # Config & MCP setup
│
└── public/
    ├── index.html         # HTML markup
    ├── styles.css         # Styling
    └── app.js             # Frontend EventSource handler
```

---

## 11. EXTENSIBILITY NOTES FOR MULTI-SUPPLIER

Current architecture supports evolution to multi-supplier through:

1. **Multiple Agent Instances**
   - Query N suppliers simultaneously
   - Track separate `NegotiationState` per supplier
   - Compare prices across suppliers

2. **Supplier Comparison UI**
   - Extend `.chat` grid from 2 to N columns
   - One column per supplier
   - System column showing comparisons

3. **Procurement Logic**
   - Parallel agent queries instead of alternating
   - Request for Quote (RFQ) distribution
   - Winner selection based on price/terms

4. **Data Model Changes**
   - Replace single `NegotiationState` with array of states
   - Add supplier metadata (name, rating, location)
   - Track RFQ responses and status per supplier

5. **Payment Distribution**
   - Split total payment across multiple suppliers
   - Execute parallel payment confirmations
   - Aggregate delivery status

