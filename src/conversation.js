import {
  PDF_LINK,
  RECEIVER_ADDRESS,
  BUYER_LIMIT,
  MIN_PRICE,
  NEGOTIATION_MAX_TURNS,
  PDF_EXTRACTS
} from './config.js';
import { sendPayment } from './payment.js';
import { NegotiationState } from './negotiation.js';
import { queryBuyer, querySeller } from './agents.js';

function createMessage(partial) {
  const message = {
    timestamp: new Date().toISOString(),
    status: 'status' in partial ? partial.status : 'default',
    audience: partial.audience || 'both',
    ...partial
  };

  const label = message.agent?.toUpperCase() || 'SYSTEM';
  const statusLabel = message.status && message.status !== 'default' ? ` (${message.status})` : '';
  const audienceLabel = message.audience && message.audience !== 'both' ? ` [${message.audience}]` : '';
  console.log(`[Conversation] ${label}${statusLabel}${audienceLabel}: ${message.text}`);

  return message;
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
    paymentResult.transaction_id,
    paymentResult.transactionId,
    paymentResult.transactionID,
    paymentResult.id,
    paymentResult.tx_hash,
    paymentResult.txHash,
    paymentResult.hash
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

async function* aiNegotiationFlow() {
  const state = new NegotiationState();

  yield createMessage({
    agent: 'system',
    text: '🤝 Starting negotiation between Buyer Agent and Seller Agent...',
    status: 'negotiating'
  });

  const initialBuyerMessage = 'Hello! I\'m looking for access to the labour law PDF. What price are you asking?';
  state.addMessage('buyer', initialBuyerMessage);
  yield createMessage({
    agent: 'buyer',
    displayName: 'Buyer Agent',
    text: initialBuyerMessage
  });

  while (state.shouldContinue()) {
    const sellerResponse = await querySeller(state);
    state.addMessage('seller', sellerResponse);
    yield createMessage({
      agent: 'seller',
      displayName: 'Seller Agent',
      text: sellerResponse
    });

    const sellerOffer = state.lastOfferByAgent.seller;
    if (sellerOffer && sellerOffer > BUYER_LIMIT && !state.shouldRequestExtract()) {
      state.triggerExtractRequest();
    }

    if (state.status === 'agreed' || state.status === 'failed') {
      break;
    }

    const buyerResponse = await queryBuyer(state);
    state.addMessage('buyer', buyerResponse);
    yield createMessage({
      agent: 'buyer',
      displayName: 'Buyer Agent',
      text: buyerResponse
    });

    if (state.status === 'agreed' || state.status === 'failed') {
      break;
    }

    state.turns += 1;
  }

  if (state.status !== 'agreed' && state.turns >= state.maxTurns) {
    state.markFailure('Maximum turns reached');
  }

  if (state.status === 'agreed' && state.agreedPrice) {
    yield createMessage({
      agent: 'system',
      text: `✅ Agreement reached! Price: $${state.agreedPrice.toFixed(2)} USDC`,
      status: 'success',
      summary: true
    });

    yield* executePayment(state, state.agreedPrice);
    return;
    return;
  }

  const reason =
    state.failReason ||
    `Negotiation ended after ${Math.min(state.turns, NEGOTIATION_MAX_TURNS)} turns without an agreement.`;

  yield createMessage({
    agent: 'buyer',
    displayName: 'Buyer Agent',
    text: 'Thank you for the conversation. I will pass for now.',
    status: 'complete'
  });

  yield createMessage({
    agent: 'system',
    text: `❌ Negotiation failed: ${reason}`,
    status: 'error',
    summary: true
  });
  return;
}

function resolveExtractText(topic) {
  if (!topic) return null;
  return PDF_EXTRACTS[topic]?.excerpt ?? null;
}

async function* executePayment(state, amount) {
  if (amount > BUYER_LIMIT) {
    yield createMessage({
      agent: 'system',
      text: `❌ Cannot send $${amount.toFixed(2)} USDC because it exceeds the buyer limit of $${BUYER_LIMIT.toFixed(2)}.`,
      status: 'error',
      summary: true
    });
    return;
  }

  yield createMessage({
    agent: 'system',
    text: `Sending ${amount.toFixed(2)} USDC to seller agent [💳 wallet ID: ${RECEIVER_ADDRESS}]`,
    status: 'processing',
    audience: 'buyer'
  });

  yield createMessage({
    agent: 'system',
    text: `Buyer is sending ${amount.toFixed(2)} USDC. Awaiting confirmation...`,
    status: 'waiting',
    audience: 'seller'
  });

  try {
    const payment = await sendPayment({
      to: RECEIVER_ADDRESS,
      amount,
      memo: 'PDF negotiation purchase'
    });

    console.log('[Conversation] Payment result payload:', JSON.stringify(payment, null, 2));

    const confirmationId = extractConfirmationId(payment?.result);
    if (!confirmationId) {
      yield createMessage({
        agent: 'system',
        text: '⏳ Payment queued and awaiting confirmation from Locus. The seller will share the document once funds settle.',
        status: 'waiting',
        audience: 'both'
      });
      return;
    }

    yield createMessage({
      agent: 'system',
      text: `✅ Payment confirmed. Transaction ID: ${confirmationId}`,
      status: 'success',
      details: payment.result,
      audience: 'buyer'
    });

    yield createMessage({
      agent: 'system',
      text: `💰 Payment received. Transaction ID: ${confirmationId}`,
      status: 'success',
      details: payment.result,
      audience: 'seller'
    });

    const extractText = resolveExtractText(state.requestedExtractTopic);
    const deliveringExtract = extractText && amount <= MIN_PRICE + 0.0001;

    if (deliveringExtract) {
      yield createMessage({
        agent: 'seller',
        displayName: 'Seller Agent',
        text: `Payment received! Here is the requested excerpt:\n\n${extractText}`,
        status: 'delivery'
      });

      yield createMessage({
        agent: 'buyer',
        displayName: 'Buyer Agent',
        text: 'Thanks! The excerpt is perfect.',
        status: 'complete'
      });
    } else {
      yield createMessage({
        agent: 'seller',
        displayName: 'Seller Agent',
        text: `Payment received! Here is the PDF link: <a href="${PDF_LINK}" target="_blank" rel="noopener noreferrer">Download PDF</a>`,
        status: 'delivery'
      });

      yield createMessage({
        agent: 'buyer',
        displayName: 'Buyer Agent',
        text: 'Thanks! I can access the full PDF now.',
        status: 'complete'
      });
    }

    yield createMessage({
      agent: 'system',
      text: 'Conversation complete. Thank you both!',
      status: 'success',
      summary: true
    });
  } catch (error) {
    yield createMessage({
      agent: 'system',
      text: `❌ Payment failed: ${error.message}`,
      status: 'error'
    });
  }
}

export async function* conversationFlow() {
  yield* aiNegotiationFlow();
}

export async function runConversation() {
  const messages = [];
  for await (const message of conversationFlow()) {
    messages.push(message);
  }
  return { messages };
}
