import { EventEmitter } from 'events';
import { ResearchSession } from './state.js';
import { SELLER_PROFILES } from './sellers.js';
import { loadExcerpt, loadPrompt } from './content.js';
import { sendPayment } from '../payment.js';

const BUYER_ROLE = 'buyer';
const SELLER_ROLE = 'seller';
const SYSTEM_ROLE = 'system';

function addTranscriptEntry(thread, role, text, status) {
  thread.transcript.push({ role, text, status });
}

function extractConfirmationId(paymentResult) {
  if (!paymentResult) return null;
  if (typeof paymentResult === 'string') {
    const sanitized = paymentResult.replace(/\*/g, '').replace(/`/g, '');
    const match =
      sanitized.match(/Transaction ID[:#]?\s*([A-Za-z0-9-]+)/i) ||
      sanitized.match(/transaction ID is[:\s`]*([A-Za-z0-9-]+)/i);
    if (match) return match[1];
  }
  const candidates = [
    paymentResult?.transaction_id,
    paymentResult?.transactionId,
    paymentResult?.transactionID,
    paymentResult?.id,
    paymentResult?.tx_hash,
    paymentResult?.txHash,
    paymentResult?.hash
  ].filter(Boolean);
  if (candidates.length > 0) {
    return candidates[0];
  }
  if (typeof paymentResult === 'object') {
    for (const value of Object.values(paymentResult)) {
      if (typeof value === 'string') {
        const match = value.match(/0x[a-f0-9]{64}/i);
        if (match) return match[0];
      }
    }
  }
  return null;
}

function buildFeasibilitySummary(session) {
  const recommendations = [
    {
      site: 'Johns Hopkins – Baltimore, MD',
      rationale:
        '100/100 compliance score from Deloitte, 210 TNBC patients per year in McKinsey demographics, and 2.8 patients/site/month enrollment velocity per Stanford benchmarks.',
      source: 'Patient Population Demographics, Site Regulatory Compliance History, Enrollment Rate Benchmarks'
    },
    {
      site: 'Dana-Farber Cancer Institute – Boston, MA',
      rationale:
        'Gold-standard FDA record, 91% retention, strong Northeast diversity index, and fast time-to-first-patient.',
      source: 'Site Regulatory Compliance History, Enrollment Rate Benchmarks'
    },
    {
      site: 'UCSF Helen Diller – San Francisco, CA',
      rationale:
        'West Coast coverage with perfect compliance, 54% diversity index, and above-average enrollment velocity.',
      source: 'Patient Population Demographics, Site Regulatory Compliance History'
    }
  ];

  const nextSteps = [
    'Engage recommended sites to validate investigator availability and contract terms.',
    'Pair Deloitte compliance findings with site-specific risk mitigation plans.',
    'Use Stanford enrollment benchmarks to finalize recruitment timelines for the 18-month window.'
  ];

  return {
    question: session.question,
    budget: session.budget.total,
    spent: session.budget.spent,
    recommendations,
    nextSteps
  };
}

function buildNegotiationTranscript(session, thread, purchase, excerptSnippet) {
  const sellerName = thread.profile.name;
  const wallet = thread.profile.walletAddress;
  const docTitle = thread.profile.documentTitle;
  const amount = purchase.amount.toFixed(2);
  const excerptPrice = thread.profile.excerptPrice.toFixed(2);
  const fullPrice = thread.profile.basePrice.toFixed(2);
  addTranscriptEntry(
    thread,
    BUYER_ROLE,
    `Hi ${sellerName}, I'm leading the research initiative on "${session.question}" and need your insights on ${docTitle}.`
  );
  addTranscriptEntry(
    thread,
    SELLER_ROLE,
    `Thanks for reaching out. The full ${docTitle} report is $${fullPrice} USDC, and I can provide a focused excerpt for $${excerptPrice}. The excerpt includes the most decision-ready data.`
  );
  const purchaseLabel = purchase.delivery === 'excerpt' ? 'the excerpt' : 'your full report';
  addTranscriptEntry(
    thread,
    BUYER_ROLE,
    `Given my budget, I'd like to purchase ${purchaseLabel} for $${amount}. Can you accept that?`
  );
  addTranscriptEntry(
    thread,
    SELLER_ROLE,
    `Deal confirmed. Please send $${amount} USDC to ${wallet} and I'll release ${purchaseLabel === 'the excerpt' ? 'the requested summary' : 'the complete report'} immediately.`
  );
  addTranscriptEntry(
    thread,
    SYSTEM_ROLE,
    `Sending $${amount} USDC to seller agent [💳 wallet ID: ${wallet}]`,
    'processing'
  );
  addTranscriptEntry(
    thread,
    SYSTEM_ROLE,
    'Buyer is sending funds. Awaiting confirmation...',
    'waiting'
  );
  addTranscriptEntry(
    thread,
    SYSTEM_ROLE,
    '✅ Payment confirmed. Transaction completed successfully.',
    'success'
  );

  if (purchase.delivery === 'excerpt' && excerptSnippet) {
    addTranscriptEntry(
      thread,
      SELLER_ROLE,
      `Here is the excerpt you requested:\n\n${excerptSnippet}`,
      'delivery'
    );
  } else {
    addTranscriptEntry(
      thread,
      SELLER_ROLE,
      `You can download the full report here: ${thread.profile.resourcePath}`,
      'delivery'
    );
  }

  addTranscriptEntry(
    thread,
    BUYER_ROLE,
    `Thanks ${sellerName}! I'll integrate this data into the feasibility recommendation.`,
    'complete'
  );
}

const activeSessions = new Map();

export function getSession(sessionId) {
  return activeSessions.get(sessionId);
}

export function createResearchSession(sessionId, options) {
  const session = new ResearchSession(sessionId, options);
  activeSessions.set(sessionId, session);
  return session;
}

export function runResearchSession(sessionId) {
  const session = getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const emitter = new EventEmitter();

  queueMicrotask(async () => {
    const buyerPrompt = await loadPrompt(session.assets?.buyerPromptPath);
    if (buyerPrompt) {
      session.buyerPrompt = buyerPrompt;
    }

    emitter.emit('event', {
      type: 'coordinator:started',
      sessionId,
      data: { createdAt: session.createdAt, budget: session.budget.total, question: session.question }
    });

    for (const thread of session.threads) {
      emitter.emit('event', {
        type: 'coordinator:negotiation_started',
        sessionId,
        data: { sellerId: thread.id, documentTitle: thread.profile.documentTitle }
      });

      thread.status = 'negotiating';
      thread.transcript.push({ role: 'coordinator', text: `Engaging ${thread.profile.name}` });
      emitter.emit('event', {
        type: 'thread:update',
        sessionId,
        data: { sellerId: thread.id, status: thread.status }
      });

      await new Promise((resolve) => setTimeout(resolve, 800));

      const preferred = thread.profile.preferredPurchase || 'excerpt';
      const targetType = preferred === 'full' ? 'full' : 'excerpt';
      const price = targetType === 'full' ? thread.profile.basePrice : thread.profile.excerptPrice;

      if (!session.budget.canSpend(price)) {
        thread.status = 'skipped';
        console.log(`[Research] Skipping ${thread.id} due to insufficient budget.`);
        emitter.emit('event', {
          type: 'coordinator:negotiation_result',
          sessionId,
          data: { sellerId: thread.id, status: 'skipped', reason: 'Budget exhausted' }
        });
        continue;
      }

      console.log(`[Research] Sending payment to ${thread.profile.name} (${thread.profile.walletAddress}) for $${price.toFixed(2)}.`);

      try {
        const payment = await sendPayment({
          to: thread.profile.walletAddress,
          amount: price,
          memo: thread.profile.documentTitle
        });
        console.log('[Research] Payment result:', JSON.stringify(payment, null, 2));
        const confirmationId = extractConfirmationId(payment?.result) || `${thread.id}-${Date.now()}`;

        session.budget.recordSpend({ sellerId: thread.id, amount: price, description: thread.profile.documentTitle });
        thread.status = 'purchased';
        thread.purchase = {
          amount: price,
          transactionId: confirmationId,
          delivery: targetType === 'full' ? 'pdf' : 'excerpt'
        };

        let excerptSnippet = null;
        if (thread.purchase.delivery === 'excerpt') {
          const excerpt = await loadExcerpt(thread.profile.excerptPath);
          if (excerpt) {
            excerptSnippet = excerpt.length > 1200 ? `${excerpt.slice(0, 1200)}...` : excerpt;
          }
        }

        buildNegotiationTranscript(session, thread, thread.purchase, excerptSnippet);

        emitter.emit('event', {
          type: 'coordinator:negotiation_result',
          sessionId,
          data: { sellerId: thread.id, status: thread.status, purchase: thread.purchase }
        });
      } catch (error) {
        console.error('[Research] Payment error:', error);
        thread.status = 'error';
        addTranscriptEntry(
          thread,
          SYSTEM_ROLE,
          `❌ Payment failed for ${thread.profile.name}: ${error.message || 'Unknown error'}`,
          'error'
        );
        emitter.emit('event', {
          type: 'coordinator:negotiation_result',
          sessionId,
          data: { sellerId: thread.id, status: 'error', reason: error.message || 'Payment failed' }
        });
      }
    }

    session.summary = buildFeasibilitySummary(session);
    emitter.emit('event', {
      type: 'coordinator:summary_update',
      sessionId,
      data: { summary: session.summary }
    });

    emitter.emit('event', {
      type: 'coordinator:done',
      sessionId,
      data: { spent: session.budget.spent, remaining: session.budget.remaining() }
    });
  });

  return emitter;
}
