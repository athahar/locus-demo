# Deep Research Implementation Plan

## Overview
Build a multi-seller research experience where a coordinator agent manages negotiations with three seller agents to acquire paid PDFs/extracts for a restaurant feasibility study, within a $0.10 budget. UI mirrors a three-pane ChatGPT-style layout: seller threads (left), coordinator reasoning (center), live summary (right). Each seller conversation remains accessible via modal.

## Phase 1 – Foundation (current sprint)
1. **State & Budget Layers**
   - `src/research/state.js`: coordinator session object with budget, seller thread metadata, purchased docs cache.
   - `ResearchBudget` class enforcing total spend, allocations, and logging transactions.
   - Data structures for seller configs (document name, base price, excerpt price).

2. **Coordinator Orchestrator**
   - `src/research/coordinator.js`: sequentially processes seller configs.
   - Emits SSE events (`coordinator:started`, `coordinator:thinking`, `coordinator:negotiation_started`, `coordinator:negotiation_result`, `coordinator:summary_update`, `coordinator:done`).
   - Spawns buyer negotiation instances (reusing existing negotiation engine with seller-specific prompts).
   - Writes purchased content (PDF link or excerpt text) to `purchased_docs/<seller-id>.json`.

3. **Seller Negotiation Integration**
   - Extend current negotiation module to accept seller profile (document title, initial price range, excerpt availability).
   - Ensure excerpt/full delivery is parameterized per seller.
   - Return structured result (status, price, transaction id, content pointer).

4. **API & SSE Streams**
   - `/api/research/start` POST → kicks off coordinator run; returns session id.
   - `/api/research/stream/:sessionId` SSE → multiplex coordinator events + seller thread summaries.
   - `/api/research/thread/:threadId` GET → returns full transcript for modal.

5. **Frontend Shell (Phase 1)**
   - Replace current single chat UI with 3-column layout:
     - Left: seller cards (status, doc title, price, “View details”).
     - Center: coordinator stream log (scrollable feed of reasoning events).
     - Right: research summary outline updating via SSE.
   - Modal component reuses our existing chat transcript renderer.

## Phase 2 – Enhancements (later)
- Parallel negotiation mode (toggle once sequential is stable).
- Delivery timeline widget with chronological events.
- UI polish: dark mode, responsive layout, animated budget tracker.
- Persistence of sessions + ability to reopen transcripts.

## Immediate Next Steps
1. Scaffold `src/research` directory with state, coordinator, budget helper.
2. Create seller config definitions and adapt negotiation entrypoints.
3. Build SSE controller + REST endpoints supporting new streams.
4. Implement frontend 3-pane layout skeleton + SSE wiring.
