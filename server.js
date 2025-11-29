const express = require("express");
const cors = require("cors");

const app = express();

// Basic CORS
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`, req.body || '');
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    success: true, 
    message: "Server is running in emergency mode", 
    timestamp: new Date().toISOString()
  });
});

// Simple in-memory storage (replace with MongoDB later)
const users = new Map();

const ensureUser = (uid) => {
  if (!users.has(uid)) {
    users.set(uid, {
      freeSpins: 1,
      bonusSpins: 0,
      walletCoins: 100,
      lastSpin: null
    });
    console.log(`👤 New user created: ${uid}`);
  }
  return users.get(uid);
};

// SPIN API ENDPOINTS
app.post("/api/spin/status", (req, res) => {
  try {
    const { uid } = req.body;
    console.log(`🔎 STATUS requested for UID: ${uid}`);
    
    if (!uid) {
      return res.json({ success: false, message: "UID is required" });
    }

    const user = ensureUser(uid);
    
    res.json({
      success: true,
      free_spin_available: user.freeSpins > 0,
      bonus_spins: user.bonusSpins,
      wallet_coins: user.walletCoins,
      rewards: [
        { type: "coins", value: 10, label: "10 Coins" },
        { type: "coins", value: 20, label: "20 Coins" },
        { type: "coins", value: 5, label: "5 Coins" },
        { type: "none", value: 0, label: "Try Again" },
        { type: "coins", value: 15, label: "15 Coins" },
        { type: "coupon", code: "SPIN10", label: "Discount Coupon" },
        { type: "coins", value: 25, label: "25 Coins" },
        { type: "none", value: 0, label: "Better Luck" }
      ]
    });
  } catch (error) {
    console.error('❌ Status error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/spin/bonus", (req, res) => {
  try {
    const { uid } = req.body;
    console.log(`➕ BONUS requested for UID: ${uid}`);
    
    if (!uid) {
      return res.json({ success: false, message: "UID is required" });
    }

    const user = ensureUser(uid);
    user.bonusSpins += 1;

    console.log(`✅ Bonus spin added for ${uid}. Total: ${user.bonusSpins}`);
    
    res.json({
      success: true,
      bonus_spins: user.bonusSpins,
      message: "Bonus spin added successfully!"
    });
  } catch (error) {
    console.error('❌ Bonus spin error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/spin/spin", (req, res) => {
  try {
    const { uid } = req.body;
    console.log(`🎰 SPIN requested for UID: ${uid}`);
    
    if (!uid) {
      return res.json({ success: false, message: "UID is required" });
    }

    const user = ensureUser(uid);
    
    // Check if user has spins
    if (user.freeSpins <= 0 && user.bonusSpins <= 0) {
      return res.json({ success: false, message: "No spins available" });
    }

    // Use free spin first, then bonus spins
    let freeSpinUsed = false;
    
    if (user.freeSpins > 0) {
      user.freeSpins -= 1;
      freeSpinUsed = true;
    } else {
      user.bonusSpins -= 1;
    }

    user.lastSpin = new Date();

    // Generate reward
    const rewards = [
      { type: "coins", value: 10, label: "10 Coins", sector: 0 },
      { type: "coins", value: 20, label: "20 Coins", sector: 1 },
      { type: "coins", value: 5, label: "5 Coins", sector: 2 },
      { type: "none", value: 0, label: "Try Again", sector: 3 },
      { type: "coins", value: 15, label: "15 Coins", sector: 4 },
      { type: "coupon", code: "SPIN" + Math.random().toString(36).substring(2, 6).toUpperCase(), label: "Discount Coupon", sector: 5 },
      { type: "coins", value: 25, label: "25 Coins", sector: 6 },
      { type: "none", value: 0, label: "Better Luck", sector: 7 }
    ];
    
    const randomIndex = Math.floor(Math.random() * rewards.length);
    const reward = rewards[randomIndex];
    
    // Update wallet if coins reward
    if (reward.type === "coins") {
      user.walletCoins += reward.value;
    }

    console.log(`✅ Spin completed for ${uid}. Reward: ${reward.label}, Coins: ${user.walletCoins}, Free Spins: ${user.freeSpins}, Bonus Spins: ${user.bonusSpins}`);
    
    res.json({
      success: true,
      sector: reward.sector,
      reward: reward,
      free_spin_used_today: freeSpinUsed,
      bonus_spins: user.bonusSpins,
      wallet_coins: user.walletCoins,
      message: `You won: ${reward.label}`
    });
  } catch (error) {
    console.error('❌ Spin error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} (Emergency Mode)`);
  console.log(`✅ No MongoDB required - using in-memory storage`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
});
