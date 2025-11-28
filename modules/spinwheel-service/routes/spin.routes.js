const express = require("express");
const router = express.Router();

const SpinUser = require("../models/SpinUser");
const { pickReward, loadConfig } = require("../engine/rewardEngine");

// ⚠ Ensure user is always available
function getUID(req) {
  return req.headers["x-user-id"] || req.body.userId;
}

// ---------------------- STATUS ----------------------
router.get("/status", async (req, res) => {
  const userId = getUID(req);
  if (!userId) return res.status(400).json({ success: false, message: "UID is required" });

  let user = await SpinUser.findOne({ userId });
  if (!user) {
    user = await SpinUser.create({
      userId,
      bonusSpins: 0,
      walletCoins: 0,
      lastSpinDate: null
    });
  }

  const config = loadConfig();

  let freeSpinAvailable = false;
  const today = new Date().toDateString();

  if (!user.lastSpinDate || new Date(user.lastSpinDate).toDateString() !== today) {
    freeSpinAvailable = true;
  }

  return res.json({
    success: true,
    free_spin_available: freeSpinAvailable,
    bonus_spins: user.bonusSpins,
    wallet_coins: user.walletCoins,
    rewards: config.sectors
  });
});

// ---------------------- BONUS SPIN ----------------------
router.post("/bonus", async (req, res) => {
  const userId = getUID(req);
  if (!userId) return res.status(400).json({ success: false, message: "UID is required" });

  let user = await SpinUser.findOne({ userId });
  if (!user) {
    user = await SpinUser.create({ userId });
  }

  user.bonusSpins += 1;
  await user.save();

  return res.json({
    success: true,
    bonus_spins_left: user.bonusSpins
  });
});

// ---------------------- SPIN NOW ----------------------
router.post("/spin", async (req, res) => {
  const userId = getUID(req);
  if (!userId) return res.status(400).json({ success: false, message: "UID is required" });

  let user = await SpinUser.findOne({ userId });
  if (!user) {
    user = await SpinUser.create({ userId });
  }

  const today = new Date().toDateString();
  let usedFreeSpinToday = false;

  if (!user.lastSpinDate || new Date(user.lastSpinDate).toDateString() !== today) {
    // FREE SPIN ALLOWED
    usedFreeSpinToday = false;
    user.lastSpinDate = new Date();
  } else {
    // NO FREE SPIN, USE BONUS
    if (user.bonusSpins <= 0) {
      return res.json({ success: false, message: "No spins left" });
    }
    usedFreeSpinToday = true;
    user.bonusSpins -= 1;
  }

  const { sectorIndex, reward } = pickReward();

  // APPLY REWARD
  if (reward.type === "coins") {
    user.walletCoins += reward.value;
  }

  await user.save();

  return res.json({
    success: true,
    sector: sectorIndex,
    reward,
    free_spin_used_today: !usedFreeSpinToday,
    bonus_spins_left: user.bonusSpins,
    wallet_coins: user.walletCoins
  });
});

module.exports = router;
