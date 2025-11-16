import { query } from '@anthropic-ai/claude-agent-sdk';
import { getMcpOptions, BUYER_LIMIT, MIN_PRICE, MAX_PRICE, RECEIVER_ADDRESS, PDF_LINK } from './config.js';

const SELLER_SYSTEM_PROMPT = `You are a seller agent offering access to a labour law PDF.
- Your acceptable price range is between $${MIN_PRICE.toFixed(2)} and $${MAX_PRICE.toFixed(2)} USDC for the full PDF.
- You may offer short topic extracts (e.g., liability for mistakes) for $0.01 USDC when the buyer only needs that section.
- When you accept a buyer's offer, clearly say "Deal! Send $X.XX" and specify whether the deal is for the full PDF or a specific extract.
- Always provide this exact receiving address when payment is requested: ${RECEIVER_ADDRESS}.
- Never suggest alternate payment methods (no email, escrow, or other wallets).
- Keep responses concise (2 sentences max).
- After payment is confirmed and the system notifies you, deliver the correct item:
  - Full PDF: share ${PDF_LINK} with a brief thank you.
  - Extract: send only the relevant excerpt text and a short confirmation.
- Stop responding once delivery is complete.`;

const BUYER_SYSTEM_PROMPT = `You are a disciplined negotiator buying the labour law PDF or a specific extract.
- Your HARD spending limit is $${BUYER_LIMIT.toFixed(2)} USDC. NEVER reveal this number to the seller.
- Open by asking for their price. Start low (around $0.03) and only increase if needed.
- If you only need a specific topic (e.g., liability for mistakes by the workers), clearly mention it and request a lower price such as $0.01.
- Keep responses short (max 2 sentences), confident, and focused on value.
- Explicitly write "I accept $X.XX" only when you truly agree.
- If no agreement is reached within three exchanges, politely decline and end the conversation.`;

function buildConversationContext(state) {
  return state.formatTranscript();
}

async function runAgentPrompt(prompt) {
  const options = getMcpOptions();
  let finalText = null;

  for await (const message of query({ prompt, options })) {
    if (message.type === 'result' && message.subtype === 'success') {
      finalText = message.result;
    }
  }

  if (!finalText) {
    throw new Error('Agent did not produce a response');
  }

  return finalText.trim();
}

export async function querySeller(state) {
  const conversation = buildConversationContext(state);
  const startingPrice = state.initialSellerPrice?.toFixed(2);
  const prompt = `${SELLER_SYSTEM_PROMPT}
- Aim to start near $${startingPrice ?? '0.08'} USDC in this negotiation.

Conversation so far:
${conversation}

Your response as the Seller Agent:`;

  return runAgentPrompt(prompt);
}

export async function queryBuyer(state) {
  const conversation = buildConversationContext(state);
  let extractInstruction = '';
  if (state.shouldRequestExtract()) {
    const topicDescription =
      state.requestedExtractTopic === 'liability_mistakes'
        ? 'the liability for mistakes by the workers section'
        : 'the specific section you mentioned';
    extractInstruction = `\nFocus on negotiating only ${topicDescription} for $0.01 USDC. Remind the seller you just need that excerpt.`;
  }

  const prompt = `${BUYER_SYSTEM_PROMPT}

Conversation so far:
${conversation}

Respond as the Buyer Agent:${extractInstruction}`;

  return runAgentPrompt(prompt);
}
