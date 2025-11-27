// modules/spinwheel-service/controllers/spin.controller.js

const SpinService = require("../services/spin.service");
const SpinUser = require("../models/SpinUser");
const SpinHistory = require("../models/SpinHistory");
const rewardsConfig = require("../config/rewards.config.json");

// -------------------------------------------------------
// SPIN NOW
// -------------------------------------------------------
exports.spinNow = async (req, res) => {
  try {
    const uid = req.user?.uid || req.body.uid || req.query.uid;
    const email = req.user?.email || req.body.email || req.query.email;

    if (!uid) {
      return res.status(400).json({ success: false, message: "UID is required" });
    }

    const result = await SpinService.spinNow(uid, email);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json({
      success: true,
      reward: result.reward,
      sector: result.sector,
      free_spin_used_today: result.free_spin_used_today,
      bonus_spins_left: result.bonus_spins_left
    });

  } catch (err) {
    console.error("SPIN ERROR:", err);
    return res.status(500).json({ success: false, message: "Spin failed" });
  }
};

// -------------------------------------------------------
// SPIN STATUS
// -------------------------------------------------------
exports.spinStatus = async (req, res) => {
  try {
    const uid = req.user?.uid || req.query.uid || req.body.uid;

    if (!uid) {
      return res.status(400).json({ success: false, message: "UID is required" });
    }

    const status = await SpinService.getStatus(uid);

    return res.json(status);

  } catch (err) {
    console.error("STATUS ERROR:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -------------------------------------------------------
// ADD BONUS SPIN (Rewarded Ad)
// -------------------------------------------------------
exports.addBonusSpin = async (req, res) => {
  try {
    const uid = req.user?.uid || req.body.uid || req.query.uid;
    const email = req.user?.email || req.body.email || req.query.email;

    if (!uid) {
      return res.status(400).json({ success: false, message: "UID is required" });
    }

    let user = await SpinUser.findOne({ uid });

    if (!user) {
      user = await SpinUser.create({
        uid,
        email,
        spin_balance: 1,
        free_spin_used_today: false,
        coins: 0
      });
    } else {
      user.spin_balance += 1;
      await user.save();
    }

    return res.json({
      success: true,
      message: "Bonus spin added",
      bonus_spins_left: user.spin_balance
    });

  } catch (err) {
    console.error("BONUS SPIN ERROR:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -------------------------------------------------------
// GET USER SPIN HISTORY
// -------------------------------------------------------
exports.getHistory = async (req, res) => {
  try {
    const uid = req.user?.uid || req.query.uid || req.body.uid;

    if (!uid) {
      return res.status(400).json({
        success: false,
        message: "UID is required"
      });
    }

    const history = await SpinHistory.find({ uid }).sort({ created_at: -1 });

    return res.json({
      success: true,
      total: history.length,
      history
    });

  } catch (err) {
    console.error("HISTORY ERROR:", err);
    return res.status(500).json({ success: false, message: "History fetch failed" });
  }
};

// -------------------------------------------------------
// GET AVAILABLE REWARDS (from rewards.config.json)
// -------------------------------------------------------
exports.getRewards = async (req, res) => {
  try {
    return res.json({
      success: true,
      rewards: rewardsConfig.rewards
    });

  } catch (err) {
    console.error("REWARDS ERROR:", err);
    return res.status(500).json({ success: false, message: "Rewards fetch failed" });
  }
};
