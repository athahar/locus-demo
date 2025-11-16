const startBtn = document.getElementById('start-btn');
const statusBadge = document.getElementById('status-badge');
const chatThread = document.getElementById('chat-thread');

let eventSource = null;
let renderQueue = Promise.resolve();
const typingBubbles = new Map();

function setStatus(state, text) {
  statusBadge.className = `badge ${state || ''}`.trim();
  statusBadge.textContent = text || 'Idle';
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clearChat() {
  chatThread.innerHTML = '';
  typingBubbles.clear();
}

function showTyping(agent) {
  clearTyping(agent);
  const bubble = document.createElement('div');
  bubble.className = `message ${agent} typing`;
  bubble.innerHTML = '<span></span><span></span><span></span>';
  chatThread.appendChild(bubble);
  bubble.scrollIntoView({ behavior: 'smooth', block: 'end' });
  typingBubbles.set(agent, bubble);
}

function clearTyping(agent) {
  const bubble = typingBubbles.get(agent);
  if (bubble) {
    bubble.remove();
    typingBubbles.delete(agent);
  }
}

function appendMessage(message) {
  clearTyping(message.agent);
  const bubble = document.createElement('div');
  bubble.className = `message ${message.agent}`;

  if (message.displayName) {
    const label = document.createElement('div');
    label.className = 'message-label';
    label.textContent = message.displayName;
    bubble.appendChild(label);
  }

  const body = document.createElement('div');
  body.className = 'message-body';
  body.innerHTML = message.text.replace(/\n/g, '<br />');
  bubble.appendChild(body);

  chatThread.appendChild(bubble);
  bubble.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

async function processMessage(message) {
  if (message.agent === 'buyer' || message.agent === 'seller') {
    showTyping(message.agent);
    await wait(900);
  }
  appendMessage(message);
  if (message.status && message.status !== 'default') {
    const plain = message.text.replace(/<.*?>/g, '');
    setStatus(message.status, plain);
  }
}

function handleEvent(message) {
  renderQueue = renderQueue.then(() => processMessage(message)).catch((error) => {
    console.error('Render error', error);
  });
}

function listenToChat() {
  if (eventSource) eventSource.close();
  eventSource = new EventSource('/api/chat/stream');
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleEvent(data);
  };
  eventSource.onerror = () => {
    eventSource?.close();
    setStatus('error', 'Stream error');
    startBtn.disabled = false;
  };
}

startBtn.addEventListener('click', () => {
  startBtn.disabled = true;
  clearChat();
  setStatus('processing', 'Running...');
  listenToChat();
});
