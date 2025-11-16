import {
  BUYER_LIMIT,
  MIN_PRICE,
  MAX_PRICE,
  NEGOTIATION_MAX_TURNS,
  SELLER_START_MIN,
  SELLER_START_MAX,
  PDF_EXTRACTS
} from './config.js';

const ACCEPTANCE_REGEX = /\b(i\s+accept|deal|agreed|okay|ok\b|yes\b)\b/i;

function clampPrice(value) {
  if (Number.isNaN(value)) return null;
  return parseFloat(value.toFixed(4));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export class NegotiationState {
  constructor() {
    this.transcript = [];
    this.turns = 0;
    this.maxTurns = NEGOTIATION_MAX_TURNS;
    this.status = 'negotiating';
    this.currentOffer = null;
    this.lastOffer = null;
    this.lastOfferByAgent = { buyer: null, seller: null };
    this.agreedPrice = null;
    this.failReason = null;
    this.initialSellerPrice = clampPrice(randomBetween(SELLER_START_MIN, SELLER_START_MAX));
    this.requestedExtractTopic = null;
    this.requestingExtractOnly = false;
  }

  addMessage(agent, text) {
    const entry = {
      agent,
      text,
      timestamp: Date.now()
    };
    this.transcript.push(entry);

    if (agent === 'buyer') {
      const detected = this.detectExtractTopic(text);
      if (detected) {
        this.requestedExtractTopic = detected;
        this.requestingExtractOnly = true;
      }
    }

    const extractedPrice = this.extractPrice(text);
    if (extractedPrice) {
      this.currentOffer = extractedPrice;
      this.lastOffer = { agent, price: extractedPrice };
      this.lastOfferByAgent[agent] = extractedPrice;
    }

    this.checkAgreement(agent, text);
  }

  detectExtractTopic(text = '') {
    const lower = text.toLowerCase();
    for (const [topic, data] of Object.entries(PDF_EXTRACTS)) {
      if (data.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
        return topic;
      }
    }
    return null;
  }

  triggerExtractRequest(topicKey = 'liability_mistakes') {
    if (!this.requestedExtractTopic) {
      this.requestedExtractTopic = topicKey;
    }
    this.requestingExtractOnly = true;
  }

  shouldRequestExtract() {
    return this.requestingExtractOnly && this.requestedExtractTopic != null;
  }

  extractPrice(text = '') {
    const pattern = /(?:\$|USD|USDC)?\s*(0?\.\d+|\d+\.\d{1,2}|\d+)/gi;
    let candidate = null;

    for (const match of text.matchAll(pattern)) {
      let value = parseFloat(match[1]);
      if (Number.isNaN(value)) {
        continue;
      }

      const vicinity = text.slice(Math.max(0, match.index - 15), Math.min(text.length, match.index + 15));
      if (value > 1 && /cent/i.test(vicinity)) {
        value = value / 100;
      }

      if (value < MIN_PRICE || value > MAX_PRICE) {
        continue;
      }

      candidate = clampPrice(value);
    }

    return candidate;
  }

  containsAcceptance(text = '') {
    return ACCEPTANCE_REGEX.test(text) || /i accept/i.test(text);
  }

  isPriceWithinBuyerLimit(price) {
    return price >= MIN_PRICE && price <= BUYER_LIMIT;
  }

  isPriceWithinSellerRange(price) {
    return price >= MIN_PRICE && price <= MAX_PRICE;
  }

  checkAgreement(agent, text) {
    if (!this.containsAcceptance(text)) {
      return false;
    }

    const counterparty = agent === 'buyer' ? 'seller' : 'buyer';
    const counterpartyPrice = this.lastOfferByAgent[counterparty];

    if (!counterpartyPrice) {
      return false;
    }

    if (agent === 'buyer' && this.isPriceWithinBuyerLimit(counterpartyPrice)) {
      this.status = 'agreed';
      this.agreedPrice = counterpartyPrice;
      return true;
    }

    if (agent === 'seller' && this.isPriceWithinSellerRange(counterpartyPrice)) {
      this.status = 'agreed';
      this.agreedPrice = counterpartyPrice;
      return true;
    }

    return false;
  }

  shouldContinue() {
    return this.status === 'negotiating' && this.turns < this.maxTurns;
  }

  markFailure(reason) {
    this.status = 'failed';
    this.failReason = reason;
  }

  formatTranscript() {
    if (this.transcript.length === 0) {
      return 'No conversation yet.';
    }

    return this.transcript
      .map((entry) => {
        const name = entry.agent === 'buyer' ? 'Buyer Agent' : entry.agent === 'seller' ? 'Seller Agent' : 'System';
        return `${name}: ${entry.text}`;
      })
      .join('\n');
  }
}
