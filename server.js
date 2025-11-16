import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { runConversation, conversationFlow } from './src/conversation.js';
import { createResearchSession, runResearchSession, getSession } from './src/research/coordinator.js';
import { SELLER_PROFILES } from './src/research/sellers.js';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const researchEmitters = new Map();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.redirect('/research/');
});

app.post('/api/chat/start', async (req, res) => {
  try {
    const result = await runConversation();
    res.json(result);
  } catch (error) {
    console.error('Conversation error:', error);
    res.status(500).json({ error: error.message || 'Conversation failed' });
  }
});

app.get('/api/chat/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let clientClosed = false;

  const heartbeat = setInterval(() => {
    if (!clientClosed) {
      res.write(': heartbeat\n\n');
    }
  }, 15000);

  req.on('close', () => {
    clientClosed = true;
    clearInterval(heartbeat);
    res.end();
  });

  try {
    for await (const message of conversationFlow()) {
      if (clientClosed) break;
      res.write(`event: message\n`);
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    }
    if (!clientClosed) {
      res.write(`event: done\n`);
      res.write('data: {}\n\n');
    }
  } catch (error) {
    console.error('SSE conversation error:', error);
    if (!clientClosed) {
      res.write('event: error\n');
      res.write(`data: ${JSON.stringify({ error: error.message || 'Conversation failed' })}\n\n`);
    }
  } finally {
    clearInterval(heartbeat);
    if (!clientClosed) {
      res.end();
    }
  }
});

app.post('/api/research/start', (req, res) => {
  const sessionId = crypto.randomUUID();
  const { question, budget } = req.body || {};
  createResearchSession(sessionId, {
    question,
    budget: typeof budget === 'number' ? budget : undefined
  });
  const emitter = runResearchSession(sessionId);
  researchEmitters.set(sessionId, emitter);
  res.json({ sessionId });
});

app.get('/api/research/stream/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const emitter = researchEmitters.get(sessionId) || runResearchSession(sessionId);

  const sendEvent = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const listener = (event) => {
    sendEvent(event);
    if (event.type === 'coordinator:done') {
      emitter.removeListener('event', listener);
      researchEmitters.delete(sessionId);
      res.end();
    }
  };

  emitter.on('event', listener);

  req.on('close', () => {
    emitter.removeListener('event', listener);
  });
});

app.get('/api/research/thread/:sessionId/:threadId', (req, res) => {
  const { sessionId, threadId } = req.params;
  const session = getSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  const thread = session.getThread(threadId);
  if (!thread) {
    return res.status(404).json({ error: 'Thread not found' });
  }
  res.json({ thread });
});

app.get('/api/research/sellers', (req, res) => {
  res.json({ sellers: SELLER_PROFILES });
});

app.listen(PORT, () => {
  console.log(`Web app running on http://localhost:${PORT}`);
});
