const SpinUser = require("../models/SpinUser");
const SpinHistory = require("../models/SpinHistory");
const rewardsConfig = require("../config/rewards.config.json");

// ------------------------
// GET STATUS
// ------------------------
exports.getStatus = async (uid) => {
  let user = await SpinUser.findOne({ uid });

  if (!user) {
    user = await SpinUser.create({
      uid,
      email: "",
      spin_balance: 1,
      free_spin_used_today: false,
      coins: 0
    });
  }

  return {
    success: true,
    free_spin_available: !user.free_spin_used_today,
    bonus_spins: user.spin_balance,
    wallet_coins: user.coins,
    rewards: rewardsConfig.rewards
  };
};

// ------------------------
// SPIN NOW
// ------------------------
exports.spinNow = async (uid, email) => {
  let user = await SpinUser.findOne({ uid });

  if (!user) {
    user = await SpinUser.create({
      uid,
      email,
      spin_balance: 1,
      free_spin_used_today: false,
      coins: 0
    });
  }

  // Free spin check
  if (!user.free_spin_used_today) {
    user.free_spin_used_today = true;
  } else if (user.spin_balance > 0) {
    user.spin_balance -= 1;
  } else {
    return { success: false, message: "No spins left" };
  }

  // Random reward
  const reward = pickReward(rewardsConfig.rewards);

  // Apply reward
  if (reward.type === "coins") {
    user.coins += reward.value;
  }

  await user.save();

  await SpinHistory.create({
    uid,
    email,
    reward: reward.label,
    reward_value: reward.value
  });

  return {
    success: true,
    reward,
    sector: reward.sector,
    free_spin_used_today: user.free_spin_used_today,
    bonus_spins_left: user.spin_balance,
    coins: user.coins
  };
};

function pickReward(rewards) {
  const total = rewards.reduce((sum, r) => sum + r.probability, 0);
  let random = Math.random() * total;

  for (let r of rewards) {
    if (random < r.probability) return r;
    random -= r.probability;
  }

  return rewards[rewards.length - 1];
}
