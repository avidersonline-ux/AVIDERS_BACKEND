const SpinService = require("../services/spin.service");
const SpinUser = require("../models/SpinUser");
const rewardsConfig = require("../config/rewards.config.json");

// ---------- SPIN NOW ----------
exports.spinNow = async (req, res) => {
  try {
    const uid = req.user?.uid || req.body.uid || req.query.uid;
    const email = req.user?.email || req.body.email || req.query.email;

    if (!uid) return res.status(400).json({ success: false, message: "UID is required" });

    const result = await SpinService.spinNow(uid, email);
    return res.json(result);

  } catch (err) {
    console.error("SPIN ERROR:", err);
    return res.status(500).json({ success: false, message: "Spin failed" });
  }
};

// ---------- STATUS ----------
exports.getStatus = async (req, res) => {
  try {
    const uid = req.user?.uid || req.query.uid || req.body.uid;
    if (!uid) return res.status(400).json({ success: false, message: "UID is required" });

    const status = await SpinService.getStatus(uid);
    return res.json(status);

  } catch (err) {
    console.error("STATUS ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------- BONUS SPIN ----------
exports.addBonusSpin = async (req, res) => {
  try {
    const uid = req.user?.uid || req.body.uid || req.query.uid;
    const email = req.user?.email || req.body.email || req.query.email;

    if (!uid) return res.status(400).json({ success: false, message: "UID is required" });

    let user = await SpinUser.findOne({ uid });

    if (!user) {
      user = await SpinUser.create({
        uid,
        email,
        spin_balance: 1
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
    console.error("BONUS ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------- REWARDS ----------
exports.getRewards = (req, res) => {
  res.json(rewardsConfig.rewards);
};

// ---------- HISTORY ----------
exports.getHistory = async (req, res) => {
  res.json([]);
};
