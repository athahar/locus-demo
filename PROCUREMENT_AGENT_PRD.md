# PRD: Multi-Supplier Procurement Agent

## Overview
Build a procurement system where a buyer agent autonomously negotiates with multiple supplier agents in parallel to procure goods (e.g., paint for Tesla manufacturing), compares offers, selects the best supplier, and executes payment within authorized limits.

## User Story
As a procurement manager, I want an AI agent to negotiate with multiple suppliers simultaneously to get the best price for bulk purchases, so that I can save time and optimize costs while maintaining payment controls.

## Use Case: Tesla Paint Procurement
- **Item**: Industrial paint for manufacturing
- **Volume**: 1,000,000 gallons
- **Delivery Schedule**: Monthly deliveries over 6 months (166,667 gallons/month)
- **Number of Suppliers**: 3 competing suppliers
- **Budget Range**: $0.05 - $0.08 USDC per gallon (total: $50K - $80K)
- **Payment Method**: USDC on-chain payment via Locus

---

## Core Features

### 1. Multi-Agent Negotiation
- **Parallel Negotiations**: Buyer agent simultaneously negotiates with 3 supplier agents
- **Negotiation Parameters** (all negotiable):
  - Price per gallon
  - Delivery schedule (e.g., monthly over 6 months, but flexible)
  - Total volume (e.g., 1M gallons, suppliers can counter-offer different volumes)
  - Payment terms (net-30, net-60, advance payment, etc.)
- **Supplier Agent Behavior**:
  - Different strategies per supplier: aggressive (low price, push back), conservative (high price, flexible terms), balanced
  - Suppliers are informed they're competing with 2 others (competitive pressure)
- **Autonomous Execution**: No human intervention during negotiation phase
- **Time Limit**: Complete all negotiations within 2-3 minutes
- **Fallback Scenarios**:
  - If all suppliers exceed budget: Re-negotiate with stricter price targets
  - If a supplier agent crashes: Continue with remaining suppliers (minimum 2 required)

### 2. Real-Time Monitoring Dashboard

#### Overview Panel (Right Side)
- **Buyer Agent Status**: Current activity of the buyer agent
  - "Negotiating with Supplier 1..."
  - "Comparing offers..."
  - "Selecting best supplier..."
- **Progress Indicators**: Visual progress for each supplier negotiation
- **Live Updates**: Real-time SSE streaming of buyer agent decisions

#### Detailed Negotiation Views
- **Clickable Supplier Cards**: Click on any supplier to see detailed chat
- **Real-Time Chat Logs**: View message-by-message negotiation transcript
- **Offer Comparison Table**: Side-by-side comparison of all offers
- **Status Badges**: Active, Completed, Best Offer indicators

### 3. Supplier Selection & Payment Authorization

#### Offer Comparison
- **Automated Ranking**: Best price, delivery terms, reliability score
- **Total Cost Calculation**: Price per gallon × 1M gallons
- **Recommendation**: Buyer agent recommends best supplier with justification

#### Payment Execution
- **Authorization Limits**:
  - **Configurable Per Request**: Buyer defines min/max limits (e.g., $50K-$80K) when starting procurement
  - **Auto-Approval**: Payment executes if best offer within range
  - **Out-of-Range Handling**: If best offer exceeds limit:
    1. Auto-reject that supplier and try next-best
    2. Notify user for manual approval decision
    3. Option to re-negotiate with all suppliers for lower prices
- **Payment Flow**:
  1. Buyer agent evaluates all offers using multi-factor scoring
  2. Selects best supplier based on: price, delivery reliability, payment terms, reputation
  3. Calculates total payment amount
  4. Checks against buyer-defined authorization limit
  5. If within range: Execute USDC payment via Locus MCP
  6. If out of range: Trigger fallback workflow (next supplier or manual approval)
  7. Display success/failure with transaction details

---

## UI/UX Requirements

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│                     Procurement Dashboard                    │
├─────────────────────────────┬───────────────────────────────┤
│                             │   BUYER AGENT STATUS          │
│   Supplier Cards            │                               │
│                             │   📊 Overview                 │
│   ┌─────────────────────┐   │   • Negotiating with 3        │
│   │  Supplier 1         │   │     suppliers...             │
│   │  Status: Active     │   │   • Current best: $0.065/gal │
│   │  Offer: $0.065/gal  │   │                               │
│   │  [View Chat]        │   │   🔄 Live Activity            │
│   └─────────────────────┘   │   → Comparing delivery terms  │
│                             │   → Calculating total costs   │
│   ┌─────────────────────┐   │                               │
│   │  Supplier 2         │   │   📋 Negotiations             │
│   │  Status: Active     │   │   ✓ Supplier 1 (Complete)    │
│   │  Offer: $0.072/gal  │   │   ⏳ Supplier 2 (In Progress)│
│   │  [View Chat]        │   │   ⏳ Supplier 3 (Pending)    │
│   └─────────────────────┘   │                               │
│                             │   💰 Best Offer               │
│   ┌─────────────────────┐   │   Supplier 1: $65,000        │
│   │  Supplier 3         │   │   ✓ Within budget            │
│   │  Status: Pending    │   │                               │
│   │  Offer: TBD         │   │   [Authorize Payment]         │
│   │  [View Chat]        │   │                               │
│   └─────────────────────┘   │                               │
└─────────────────────────────┴───────────────────────────────┘
```

### Interaction Flow
1. **Landing Page**: "Start Procurement" button with requirements form
2. **Negotiation Phase**: 3 supplier cards + buyer agent status panel
3. **Click Supplier Card**: Expand to show full chat transcript
4. **Offer Comparison**: Table view with sortable columns
5. **Payment Authorization**: Confirmation modal with limit check
6. **Result Page**: Success/failure with transaction details

---

## Technical Considerations

### Backend Changes
- **New Files**:
  - `src/multi-supplier-procurement.js`: Orchestrate parallel negotiations
  - `src/supplier-agents.js`: Manage 3 supplier agent instances
  - `src/offer-comparison.js`: Compare and rank supplier offers
  - `src/payment-authorization.js`: Validate payment limits

### Frontend Changes
- **New Components**:
  - `ProcurementDashboard.jsx`: Main container
  - `SupplierCard.jsx`: Individual supplier status/chat view
  - `BuyerAgentPanel.jsx`: Right-side live activity panel
  - `OfferComparisonTable.jsx`: Side-by-side offer comparison
  - `PaymentAuthorizationModal.jsx`: Final payment confirmation

### Data Flow
```
User Input (requirements)
    ↓
Buyer Agent spawns 3 negotiation threads
    ↓
3 Supplier Agents (parallel SSE streams)
    ↓
Real-time updates → Frontend (SSE)
    ↓
Offer Comparison Engine
    ↓
Payment Authorization Check ($50K-$80K)
    ↓
Locus MCP Payment Execution
    ↓
Success/Failure Notification
```

### State Management
- **Global State**: Buyer agent status, all supplier offers
- **Per-Supplier State**: Chat messages, current offer, negotiation status
- **Payment State**: Authorization status, transaction hash

---

## Success Metrics
- **Speed**: Complete 3-supplier negotiation in < 3 minutes
- **Accuracy**: Buyer agent selects lowest valid offer 100% of the time
- **Reliability**: Payment authorization check catches 100% of out-of-range amounts
- **User Experience**: Users can view any negotiation transcript in real-time

---

## Out of Scope (V1)
- ❌ More than 3 suppliers (V1 fixed at 3)
- ❌ Historical negotiation analytics
- ❌ Pause/cancel negotiations mid-stream
- ❌ Manual override to select different supplier than recommended
- ❌ Data persistence (negotiation transcripts, historical pricing)

---

## Decisions Made

### Authorization & Payment
✅ **Authorization limits**: Configurable per request by the buyer
✅ **Out-of-range handling**: Auto-reject → try next supplier → notify user for manual approval → option to re-negotiate

### Selection Criteria
✅ **Multi-factor evaluation**: Price + Delivery reliability + Payment terms + Supplier reputation
⚠️ **Weighting formula**: TO BE DEFINED (see below)

### Negotiation Flexibility
✅ **All parameters negotiable**: Price, volume, delivery schedule, payment terms
✅ **Budget overrun**: Re-negotiate with all suppliers for lower prices
✅ **Supplier awareness**: Suppliers know they're competing with 2 others

### Supplier Agent Behavior
✅ **Different strategies**: Aggressive, conservative, balanced personalities
✅ **Competitive pressure**: Suppliers aware of competition

### Error Handling
✅ **Supplier crash**: Continue with remaining 2 suppliers (don't restart or fail entire procurement)
✅ **Parallel execution**: Negotiations run in parallel for speed

---

## Open Question: Selection Criteria Weighting

The buyer agent needs a scoring formula to rank suppliers. All offers will be scored on:

**Factors**:
1. **Price** (lower is better)
2. **Delivery Reliability** (on-time delivery history, 0-100 score)
3. **Payment Terms** (net-30, net-60, advance payment)
4. **Supplier Reputation** (overall rating, 0-5 stars)

**Proposed Weighting Formula** (Option A):
- Price: **60%**
- Delivery Reliability: **20%**
- Payment Terms: **10%**
- Supplier Reputation: **10%**

**Alternative Formula** (Option B - Balanced):
- Price: **50%**
- Delivery Reliability: **25%**
- Payment Terms: **15%**
- Supplier Reputation: **10%**

**Question**: Which weighting formula do you prefer? Or should we make the weights configurable per procurement request?

---

## Additional Open Questions

### Real-Time UI
- Should the buyer agent explain its selection reasoning to the user? (e.g., "Supplier 1 selected: Best price ($65K), excellent delivery reliability (95/100), net-30 terms, 4.5-star rating")
- Should there be a detailed scorecard showing how each supplier was evaluated?

### Error Handling Edge Cases
- What if Locus MCP payment execution fails after supplier selection? Retry or manual fallback?
- What if only 1 supplier completes negotiation (2 crash)? Proceed with single offer or abort?

### Data & Observability
- Should we log negotiation transcripts for audit purposes?
- Should we track pricing trends over time for each supplier?

---

## Next Steps

### Immediate (Ready to Implement)
1. ✅ **Define weighting formula** (see open question above)
2. ✅ **Confirm UI/UX decisions** (selection reasoning, scorecard display)
3. 🚀 **Start implementation** (see IMPLEMENTATION_PLAN.md)

### Implementation Phases
**Phase 1: Backend Core** (8-10 hours)
- Multi-supplier orchestrator
- Parallel negotiation engine
- Supplier agent personalities (aggressive, conservative, balanced)
- Offer comparison & scoring logic
- Payment authorization with fallback workflows

**Phase 2: Frontend UI** (6-8 hours)
- Procurement dashboard with supplier cards
- Buyer agent status panel (right side)
- Real-time SSE streaming for 3 suppliers
- Offer comparison table
- Payment authorization modal with limit validation

**Phase 3: Testing & Polish** (2-4 hours)
- End-to-end testing with 3 supplier agents
- Error handling (supplier crash, payment failure)
- Re-negotiation flow testing
- UI/UX refinements

---

**Estimated Total Effort**: 16-22 hours
- Backend: 8-10 hours
- Frontend: 6-8 hours
- Testing & Integration: 2-4 hours

**Timeline**: 2-3 days for full implementation