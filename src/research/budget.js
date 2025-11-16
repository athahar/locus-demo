export class ResearchBudget {
  constructor(total = 0.2) {
    this.total = total;
    this.spent = 0;
    this.allocations = [];
  }

  remaining() {
    return +(this.total - this.spent).toFixed(4);
  }

  canSpend(amount) {
    return amount <= this.remaining();
  }

  recordSpend({ sellerId, amount, description }) {
    if (!this.canSpend(amount)) {
      throw new Error('Budget exceeded');
    }
    this.spent = +(this.spent + amount).toFixed(4);
    this.allocations.push({ sellerId, amount, description, timestamp: Date.now() });
  }
}
