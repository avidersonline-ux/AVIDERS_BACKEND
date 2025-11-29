const rewardsConfig = require("../rewards.config.json");

class RewardEngine {
  constructor() {
    this.rewards = rewardsConfig.rewards || this.getDefaultRewards();
  }

  getDefaultRewards() {
    return [
      { type: "coins", value: 10, probability: 0.3, label: "10 Coins" },
      { type: "coins", value: 20, probability: 0.2, label: "20 Coins" },
      { type: "coins", value: 5, probability: 0.4, label: "5 Coins" },
      { type: "none", value: 0, probability: 0.05, label: "Try Again" },
      { type: "coins", value: 15, probability: 0.25, label: "15 Coins" },
      { type: "coupon", code: "SPIN10", probability: 0.1, label: "Discount Coupon" },
      { type: "coins", value: 25, probability: 0.15, label: "25 Coins" },
      { type: "none", value: 0, probability: 0.05, label: "Better Luck" }
    ];
  }

  async getAvailableRewards() {
    return this.rewards;
  }

  async generateReward(uid) {
    // Simple random reward selection
    const randomIndex = Math.floor(Math.random() * this.rewards.length);
    const reward = { ...this.rewards[randomIndex] };
    
    // Add sector for wheel animation
    reward.sector = randomIndex;
    
    // Generate coupon code if needed
    if (reward.type === "coupon" && !reward.code) {
      reward.code = "SPIN" + Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    
    return reward;
  }
}

module.exports = new RewardEngine();
