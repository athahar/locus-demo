import { ResearchBudget } from './budget.js';
import { SELLER_PROFILES } from './sellers.js';

const DEFAULT_QUESTION = 'Which 3 sites should host our Phase III oncology trial?';

export class ResearchSession {
  constructor(sessionId, options = {}) {
    this.id = sessionId;
    this.question = options.question || DEFAULT_QUESTION;
    this.budget = new ResearchBudget(options.budget ?? 0.2);
    this.threads = SELLER_PROFILES.map((profile) => ({
      id: profile.id,
      profile,
      status: 'pending',
      transcript: [],
      purchase: null
    }));
    this.summary = null;
    this.createdAt = Date.now();
    this.assets = {
      buyerPromptPath: 'resources/clinical-trial/prompts/buyer-prompt.txt'
    };
  }

  getThread(id) {
    return this.threads.find((thread) => thread.id === id);
  }

  updateThread(id, updates) {
    const thread = this.getThread(id);
    if (!thread) return;
    Object.assign(thread, updates);
  }
}
