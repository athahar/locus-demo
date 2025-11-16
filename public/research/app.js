const startBtn = document.getElementById('start-btn');
const sellerList = document.getElementById('seller-list');
const coordinatorFeed = document.getElementById('coordinator-feed');
const summaryContent = document.getElementById('summary-content');
const budgetIndicator = document.getElementById('budget-indicator');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const closeModalBtn = document.getElementById('close-modal');
const startModal = document.getElementById('start-modal');
const questionInput = document.getElementById('research-question');
const budgetInput = document.getElementById('research-budget');
const confirmStartBtn = document.getElementById('confirm-start');
const cancelStartBtn = document.getElementById('cancel-start');

let sessionId = null;
let sellers = [];
let sellerState = new Map();
let eventSource = null;
let totalBudget = 0.2;
let researchStarted = false;
let latestSummary = null;
let activeModalSeller = null;

const DEFAULT_QUESTION = 'Which 3 sites should host our Phase III oncology trial?';

function openStartModal() {
  questionInput.value = DEFAULT_QUESTION;
  budgetInput.value = totalBudget.toFixed(2);
  startModal.classList.remove('hidden');
}

function closeStartModal() {
  startModal.classList.add('hidden');
}

async function fetchSellers() {
  const res = await fetch('/api/research/sellers');
  const data = await res.json();
  sellers = data.sellers;
  sellers.forEach((seller) => sellerState.set(seller.id, { status: 'pending' }));
  renderSellers();
  renderSummary();
}

function renderSellers() {
  sellerList.innerHTML = '';
  const visibleSellers = sellers.filter((seller) => {
    const status = sellerState.get(seller.id)?.status || 'pending';
    return status !== 'pending';
  });

  if (!researchStarted || visibleSellers.length === 0) {
    const placeholder = document.createElement('li');
    placeholder.className = 'seller-placeholder';
    placeholder.textContent = researchStarted
      ? 'Negotiations will appear here as threads begin.'
      : 'Start the research session to see negotiations.';
    sellerList.appendChild(placeholder);
    return;
  }

  visibleSellers.forEach((seller) => {
    const state = sellerState.get(seller.id) || { status: 'pending' };
    const li = document.createElement('li');
    li.className = 'seller-card';
    li.innerHTML = `
      <h3>${seller.name}</h3>
      <p>${seller.documentTitle}</p>
      <span class="status-badge ${state.status}">${state.status}</span>
      <button class="view-thread" data-seller="${seller.id}">View details</button>
    `;
    li.querySelector('button').addEventListener('click', () => openThreadModal(seller.id, seller.documentTitle));
    sellerList.appendChild(li);
  });
}

function appendFeedEntry(text) {
  const entry = document.createElement('div');
  entry.className = 'feed-entry';
  entry.textContent = text;
  coordinatorFeed.appendChild(entry);
  coordinatorFeed.scrollTop = coordinatorFeed.scrollHeight;
}

function updateBudget(spent, remaining) {
  budgetIndicator.textContent = `Budget: $${totalBudget.toFixed(2)} • Spent: $${spent.toFixed(2)} • Remaining: $${remaining.toFixed(2)}`;
}

function renderSummary() {
  if (latestSummary) {
    const recList = latestSummary.recommendations
      .map(
        (rec) =>
          `<li><strong>${rec.site}</strong><p>${rec.rationale}</p><small>Sources: ${rec.source}</small></li>`
      )
      .join('');
    const nextSteps = latestSummary.nextSteps.map((step) => `<li>${step}</li>`).join('');
    summaryContent.innerHTML = `
      <div class="summary-block">
        <h3>Recommended Sites</h3>
        <ol>${recList}</ol>
      </div>
      <div class="summary-block">
        <h3>Next Steps</h3>
        <ul>${nextSteps}</ul>
      </div>
    `;
    return;
  }

  const purchased = Array.from(sellerState.entries())
    .filter(([, state]) => state.purchase)
    .map(([sellerId, state]) => {
      const seller = sellers.find((s) => s.id === sellerId);
      return `<li><strong>${seller?.documentTitle || sellerId}</strong> – $${state.purchase.amount.toFixed(2)} (${state.purchase.delivery})</li>`;
    });

  summaryContent.innerHTML = purchased.length
    ? `<ul>${purchased.join('')}</ul>`
    : '<p>No findings yet.</p>';
}

function renderThreadMessages(messages) {
  if (!messages || !messages.length) {
    modalBody.innerHTML = '<p>No transcript yet.</p>';
    return;
  }
  modalBody.innerHTML = messages
    .map((msg) => `<p><strong>${msg.role}:</strong> ${msg.text}</p>`)
    .join('');
}

async function startResearch(payload) {
  startBtn.disabled = true;
  const res = await fetch('/api/research/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  sessionId = data.sessionId;
  listenToSession(sessionId);
}

function listenToSession(id) {
  if (eventSource) {
    eventSource.close();
  }
  eventSource = new EventSource(`/api/research/stream/${id}`);

  eventSource.onmessage = (event) => {
    const payload = JSON.parse(event.data);
    handleEvent(payload);
  };

  eventSource.onerror = () => {
    eventSource?.close();
  };
}

function handleEvent(event) {
  switch (event.type) {
    case 'coordinator:started':
      totalBudget = event.data?.budget ?? totalBudget;
      appendFeedEntry(`Research session started: ${event.data?.question || DEFAULT_QUESTION}`);
      updateBudget(0, totalBudget);
      break;
    case 'coordinator:negotiation_started':
      appendFeedEntry(`Negotiating with ${event.data.documentTitle} seller...`);
      setSellerStatus(event.data.sellerId, 'negotiating');
      break;
    case 'thread:update':
      setSellerStatus(event.data.sellerId, event.data.status);
      break;
    case 'coordinator:negotiation_result':
      if (event.data.purchase) {
        const state = sellerState.get(event.data.sellerId) || {};
        state.purchase = event.data.purchase;
        state.status = event.data.status;
        sellerState.set(event.data.sellerId, state);
        appendFeedEntry(`Purchased from ${event.data.sellerId} for $${event.data.purchase.amount.toFixed(2)}.`);
        const spent = [...sellerState.values()].reduce((sum, st) => sum + (st.purchase?.amount || 0), 0);
        updateBudget(spent, totalBudget - spent);
        renderSummary();
      }
      setSellerStatus(event.data.sellerId, event.data.status);
      break;
    case 'coordinator:summary_update':
      latestSummary = event.data.summary;
      renderSummary();
      break;
    case 'coordinator:done':
      appendFeedEntry('Research session complete.');
      startBtn.disabled = false;
      break;
    case 'thread:message': {
      const state = sellerState.get(event.data.sellerId) || { status: 'pending' };
      state.messages = state.messages || [];
      state.messages.push(event.data.message);
      sellerState.set(event.data.sellerId, state);
      if (activeModalSeller === event.data.sellerId) {
        renderThreadMessages(state.messages);
      }
      break;
    }
    default:
      break;
  }
}

function setSellerStatus(sellerId, status) {
  const state = sellerState.get(sellerId) || {};
  state.status = status;
  sellerState.set(sellerId, state);
  renderSellers();
}

async function openThreadModal(sellerId, title) {
  if (!sessionId) return;
  activeModalSeller = sellerId;
  modalTitle.textContent = `${title} transcript`;
  modal.classList.remove('hidden');
  const state = sellerState.get(sellerId);
  if (state?.messages?.length) {
    renderThreadMessages(state.messages);
  } else {
    modalBody.innerHTML = '<p>Loading transcript...</p>';
  }
  const res = await fetch(`/api/research/thread/${sessionId}/${sellerId}`);
  if (res.ok) {
    const data = await res.json();
    const threadMessages = data.thread.transcript || [];
    const updated = sellerState.get(sellerId) || {};
    updated.messages = threadMessages;
    sellerState.set(sellerId, updated);
    if (activeModalSeller === sellerId) {
      renderThreadMessages(threadMessages);
    }
  } else if (!state?.messages?.length) {
    modalBody.innerHTML = '<p>Transcript not available yet.</p>';
  }
}

closeModalBtn.addEventListener('click', () => {
  modal.classList.add('hidden');
  activeModalSeller = null;
});
startBtn.addEventListener('click', openStartModal);
cancelStartBtn.addEventListener('click', closeStartModal);
confirmStartBtn.addEventListener('click', () => {
  const question = questionInput.value.trim() || DEFAULT_QUESTION;
  const budgetValue = parseFloat(budgetInput.value);
  const budget = Number.isFinite(budgetValue) ? budgetValue : totalBudget;
  totalBudget = budget;
  researchStarted = true;
  latestSummary = null;
  closeStartModal();
  coordinatorFeed.innerHTML = '';
  sellerState = new Map();
  sellers.forEach((seller) => sellerState.set(seller.id, { status: 'pending' }));
  renderSellers();
  renderSummary();
  appendFeedEntry('Launching new research session...');
  startResearch({ question, budget });
});

fetchSellers();
