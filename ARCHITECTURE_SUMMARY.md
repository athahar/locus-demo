# Architecture Summary: Key Insights for Multi-Supplier Procurement

## Core Technologies Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Backend Framework | Express.js (Node.js) | HTTP server + SSE streaming |
| AI/LLM | Anthropic Claude Agent SDK | Autonomous agent negotiations |
| Real-time Communication | Server-Sent Events (SSE) | Server → Client streaming |
| MCP Integration | Locus HTTP MCP Server | USDC payment execution |
| Frontend | Vanilla HTML/CSS/JavaScript | Two-column chat UI |
| State Management | In-memory class instances | NegotiationState per agent |

---

## Critical Design Patterns

### 1. Generator-Based Streaming
```javascript
// Server yields messages over time
async function* conversationFlow() {
  for await (const message of query({ prompt, options })) {
    yield createMessage({ ... });
  }
}

// Frontend receives via EventSource
const eventSource = new EventSource('/api/chat/stream');
eventSource.onmessage = (event) => {
  const message = JSON.parse(event.data);
};
```

**Why This Matters for Multi-Supplier:**
- Can yield messages from multiple parallel agent queries
- Frontend renders suppliers as they respond (progressive reveal)
- No need to wait for all suppliers before showing first response

### 2. Audience-Aware Messaging
```javascript
yield createMessage({
  text: 'Payment sent',
  audience: 'buyer'  // Only shown in buyer column
});

yield createMessage({
  text: 'Payment received',
  audience: 'seller'  // Only shown in seller column
});
```

**For Multi-Supplier:**
- Send comparison messages to buyer (e.g., "Supplier A: $5, Supplier B: $3")
- Send RFQ status to each supplier independently
- Show different delivery timelines per supplier

### 3. Price Extraction & Agreement Detection
```javascript
// Automatic price parsing from natural language
extractPrice(text)     // Finds "$0.05" or "5 cents" in any text
containsAcceptance(text)  // Regex for "deal", "accept", "agreed"
checkAgreement(agent, text)  // Validates both conditions met
```

**For Multi-Supplier:**
- Extract multiple prices from responses (items, qty, discounts)
- Detect acceptance independently per supplier
- Track agreement state per supplier

---

## Current Message Flow

```
START NEGOTIATION
    ↓
[System] "Starting negotiation..."
    ↓
Query Seller Agent → [Generate opening price]
    ↓
[SSE] Yield Seller Message
    ↓
Query Buyer Agent → [Generate counteroffer]
    ↓
[SSE] Yield Buyer Message
    ↓
Check Agreement? 
    ├─ YES → Execute Payment → [SSE] Payment messages → Deliver
    └─ NO → Loop back (max 10 turns)
```

**For Multi-Supplier (Proposed):**

```
START RFQ
    ↓
[System] "Requesting quotes from 3 suppliers..."
    ↓
┌─────────────────────┬──────────────────────┬──────────────────────┐
│ Query Supplier A    │ Query Supplier B     │ Query Supplier C     │
│ (Parallel)          │ (Parallel)           │ (Parallel)           │
│                     │                      │                      │
│ Response: $10/unit  │ Response: $8/unit    │ Response: $12/unit   │
└─────────────────────┴──────────────────────┴──────────────────────┘
    ↓
[SSE] Yield Supplier A quote
[SSE] Yield Supplier B quote  ← FASTEST
[SSE] Yield Supplier C quote
    ↓
[System] "Comparing quotes... Supplier B is cheapest"
    ↓
Negotiate with Supplier B (if needed)
    ↓
[System] "Agreement reached with B at $7.50/unit"
    ↓
Execute Payment to Supplier B
    ↓
[System] "Delivery scheduled..."
```

---

## State Management Pattern

### Current: Single Negotiation
```javascript
class NegotiationState {
  transcript = []        // Conversation history
  status = 'agreed'      // Final state
  agreedPrice = 0.05     // Single agreed price
}
```

### For Multi-Supplier: Array of States
```javascript
class SupplierQuote {
  supplierId = 'supplier-a'
  supplierName = 'Acme Inc'
  transcript = []        // RFQ exchange
  status = 'quoted'      // quoted | negotiating | agreed | rejected
  quotePrice = 10.00     // Latest quote
  deliveryDays = 5
  ratings = 4.5
}

class ProcurementRequest {
  rfqId = 'rfq-2024-001'
  item = 'Widget'
  quantity = 100
  budget = 1500
  suppliers = [          // Array of SupplierQuote
    new SupplierQuote('a'),
    new SupplierQuote('b'),
    new SupplierQuote('c')
  ]
  selectedSupplier = null
  status = 'rfq_sent'    // rfq_sent | comparing | negotiating | ordered | delivered
}
```

---

## Frontend Rendering Evolution

### Current (2 columns)
```
┌────────────────┬────────────────┐
│    Buyer       │     Seller     │
│                │                │
│ Agent message  │ Agent message  │
└────────────────┴────────────────┘
```

### For Multi-Supplier (N+1 columns)
```
┌──────────┬──────────┬──────────┬──────────┐
│ Buyer    │Supplier A│Supplier B│Supplier C│
├──────────┼──────────┼──────────┼──────────┤
│ RFQ sent │ Quote $8 │ Quote $6 │ Quote $9 │
│          │ 5 days   │ 3 days   │ 10 days  │
│          │          │          │          │
│ Negotiate│Negotiat..│ Accepted │ Rejected │
│with B... │ "Best"   │ at $5.50 │ too slow │
└──────────┴──────────┴──────────┴──────────┘
```

### CSS Grid Approach
```css
/* Current: 2 equal columns */
.chat {
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

/* Multi-supplier: N dynamic columns */
.chat {
  grid-template-columns: repeat(var(--supplier-count), minmax(250px, 1fr));
  --supplier-count: 4;  /* Set dynamically via JavaScript */
}

/* Buyer column stays wider or fixed */
.buyer-column {
  grid-column: 1;
  grid-row: 1 / span 2;
  flex-basis: 300px;
}
```

---

## API Endpoint Strategy

### Current
```
GET  /api/chat/stream              → SSE event stream
POST /api/chat/start               → Full conversation JSON
```

### For Multi-Supplier (Add)
```
GET  /api/rfq/:rfqId/stream        → Real-time RFQ status
POST /api/rfq/create               → Create new RFQ
PUT  /api/rfq/:rfqId/negotiate     → Negotiate specific supplier
POST /api/rfq/:rfqId/select        → Choose winner
POST /api/order/:orderId/track     → Track after selection
```

---

## Key Extensions Needed

### 1. Supplier Registry
```javascript
class SupplierRegistry {
  suppliers = [
    { id: 'acme', name: 'Acme Inc', apiEndpoint: '...', systemPrompt: '...' },
    { id: 'widget-co', name: 'Widget Co', apiEndpoint: '...', systemPrompt: '...' },
    { id: 'supply-hub', name: 'Supply Hub', apiEndpoint: '...', systemPrompt: '...' }
  ]
  
  async querySupplier(supplierId, rfqDetails) {
    // Route to specific supplier's agent
  }
}
```

### 2. Parallel Agent Management
```javascript
// Instead of alternating buyer ↔ seller
async function* parallelRFQ(buyers, suppliers, request) {
  // Send RFQ to all suppliers simultaneously
  const quotePromises = suppliers.map(s => querySupplier(s, request));
  
  // Yield responses as they arrive (not in order)
  for await (const quote of parallelResponses(quotePromises)) {
    yield createMessage({ supplier: quote.id, text: quote.offer });
  }
}
```

### 3. Comparison Logic
```javascript
class ProcurementComparator {
  compareQuotes(quotes) {
    // Price per unit analysis
    // Delivery time trade-offs
    // Quality/ratings consideration
    // Payment terms
    return {
      cheapest: quotes[0],
      fastest: quotes[2],
      bestValue: quotes[1]
    };
  }
}
```

### 4. Enhanced Message Types
```javascript
// Current types: buyer, seller, system

// New types for multi-supplier:
{
  type: 'rfq',
  supplierId: 'supplier-a',
  status: 'quote_request',
  quote: { price: 10, delivery: 5 }
}

{
  type: 'comparison',
  summary: 'Supplier B offers best price',
  rankings: [
    { id: 'b', price: 6, delivery: 3, rank: 1 },
    { id: 'a', price: 8, delivery: 5, rank: 2 },
    { id: 'c', price: 12, delivery: 2, rank: 3 }
  ]
}

{
  type: 'negotiation_result',
  supplierId: 'supplier-b',
  status: 'agreed',
  finalPrice: 5.50,
  paymentAddress: '0x...'
}
```

---

## Data Models to Extend

### Add to Negotiation.js
```javascript
export class SupplierState extends NegotiationState {
  supplierId
  supplierName
  deliveryDays
  rating
  minimumOrder
  leadTime
}

export class ProcurementState {
  rfqId
  rfqDate
  budget
  itemQuantity
  suppliers = new Map()  // supplierId → SupplierState
  selectedSupplier = null
  comparisons = []
  orderStatus
}
```

### Add to Config.js
```javascript
export const SUPPLIER_PROFILES = {
  'supplier-a': {
    name: 'Acme Supply',
    priceRange: [5, 20],
    deliveryDays: [3, 7],
    negotiationStyle: 'flexible'
  },
  'supplier-b': {
    name: 'Widget World',
    priceRange: [4, 18],
    deliveryDays: [1, 5],
    negotiationStyle: 'aggressive'
  }
};

export const RFQ_MAX_SUPPLIERS = 5;
export const RFQ_RESPONSE_TIMEOUT = 30000;  // 30 seconds
```

---

## Migration Path

### Phase 1: Refactor Current Code (Minimal Changes)
- Extract `NegotiationState` → Base class `NegotiationState`
- Create `SupplierNegotiationState extends NegotiationState`
- Keep existing 2-column UI working
- No breaking changes to API

### Phase 2: Add Multi-Supplier Support (New Endpoints)
- Add `/api/rfq/*` endpoints (don't touch existing `/api/chat/*`)
- Create parallel agent querying logic
- Add supplier comparison components
- Dual UI: old chat + new RFQ interface

### Phase 3: Unify UI (Optional)
- Merge RFQ into main flow
- Remove legacy chat endpoints
- Single integrated procurement interface

---

## Performance Considerations

### Current Bottleneck
- **Serial**: Seller responds → Buyer responds (10 turns = 20 API calls)
- **Time**: ~2-3 seconds per agent query × 20 = 40-60 seconds total

### Multi-Supplier Advantage
- **Parallel**: All suppliers respond simultaneously
- **Time**: ~2-3 seconds per agent query (all in parallel) + comparison logic
- **Result**: 5+ suppliers in similar time as 1 two-party negotiation

### Optimization Strategies
```javascript
// 1. Cache supplier agent system prompts
const supplierPrompts = new Map();

// 2. Batch RFQ requests
const batchQueries = Promise.all([
  querySupplier('a', rfq),
  querySupplier('b', rfq),
  querySupplier('c', rfq)
]);

// 3. Progressive rendering (yield as responses arrive)
for await (const response of raceResponses(batchQueries)) {
  yield createMessage(response);
}

// 4. SSE heartbeat prevents timeout during long negotiations
setInterval(() => res.write(': heartbeat\n\n'), 15000);
```

---

## Implementation Checklist

### Database/State
- [ ] Create SupplierState class
- [ ] Create ProcurementState class
- [ ] Add supplier registry/config
- [ ] Implement state persistence (if needed)

### Backend Logic
- [ ] Add parallel agent query function
- [ ] Add supplier comparison engine
- [ ] Add winner selection logic
- [ ] Create `/api/rfq/*` endpoints
- [ ] Add timeout handling for slow suppliers

### Frontend UI
- [ ] Dynamic grid columns based on supplier count
- [ ] Supplier metadata display (name, rating, delivery)
- [ ] Price comparison view
- [ ] Selection UI (radio buttons / cards)
- [ ] Order tracking view (post-selection)

### Testing
- [ ] Multi-supplier parallel responses
- [ ] Comparison logic accuracy
- [ ] Payment to selected supplier only
- [ ] SSE streaming with N suppliers
- [ ] Timeout/error handling

---

## Backward Compatibility

The proposed changes maintain full backward compatibility:

```javascript
// Old code still works
conversationFlow()  // Returns buyer-seller negotiation

// New code runs separately
procurementFlow(rfqRequest)  // Returns multi-supplier RFQ

// Same express server handles both
app.get('/api/chat/stream', async (req, res) => {
  for await (const msg of conversationFlow()) yield msg;
});

app.get('/api/rfq/:rfqId/stream', async (req, res) => {
  for await (const msg of procurementFlow(...)) yield msg;
});
```

---

## Risk Mitigation

1. **Agent Hallucination in Multi-Supplier Context**
   - Add price range validation per supplier
   - Detect nonsensical responses early
   - Fallback to list suppliers if negotiation fails

2. **Payment Race Conditions**
   - Lock selected supplier during payment
   - Atomic payment + delivery execution
   - Rollback if payment fails

3. **Network Failures During RFQ**
   - Retry logic for slow suppliers
   - Timeout after 30 seconds
   - Show "no quote" state gracefully

4. **Storage & Scalability**
   - Consider database for multi-session tracking
   - Session-based state for now (in-memory sufficient for demo)
   - Cache supplier profiles

