const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

// Basic CORS
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`, req.body || '');
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    success: true, 
    message: "Server is running", 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
  });
});

// MongoDB User Schema
const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  freeSpins: { type: Number, default: 1 },
  bonusSpins: { type: Number, default: 0 },
  walletCoins: { type: Number, default: 100 },
  lastSpin: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('SpinUser', userSchema);

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spinwheel');
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
  }
};

connectDB();

// Ensure user exists in database
const ensureUser = async (uid) => {
  let user = await User.findOne({ uid });
  if (!user) {
    user = await User.create({ 
      uid, 
      freeSpins: 1, 
      bonusSpins: 0, 
      walletCoins: 100 
    });
    console.log(`👤 New user created: ${uid}`);
  }
  return user;
};

// SPIN API ENDPOINTS
app.post("/api/spin/status", async (req, res) => {
  try {
    const { uid } = req.body;
    console.log(`🔎 STATUS requested for UID: ${uid}`);
    
    if (!uid) {
      return res.json({ success: false, message: "UID is required" });
    }

    const user = await ensureUser(uid);
    
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

app.post("/api/spin/bonus", async (req, res) => {
  try {
    const { uid } = req.body;
    console.log(`➕ BONUS requested for UID: ${uid}`);
    
    if (!uid) {
      return res.json({ success: false, message: "UID is required" });
    }

    const user = await User.findOneAndUpdate(
      { uid },
      { $inc: { bonusSpins: 1 }, $set: { updatedAt: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

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

app.post("/api/spin/spin", async (req, res) => {
  try {
    const { uid } = req.body;
    console.log(`🎰 SPIN requested for UID: ${uid}`);
    
    if (!uid) {
      return res.json({ success: false, message: "UID is required" });
    }

    const user = await ensureUser(uid);
    
    // Check if user has spins
    if (user.freeSpins <= 0 && user.bonusSpins <= 0) {
      return res.json({ success: false, message: "No spins available" });
    }

    // Use free spin first, then bonus spins
    let freeSpinUsed = false;
    const updateData = { $set: { updatedAt: new Date(), lastSpin: new Date() } };
    
    if (user.freeSpins > 0) {
      updateData.$inc = { freeSpins: -1 };
      freeSpinUsed = true;
    } else {
      updateData.$inc = { bonusSpins: -1 };
    }

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
      updateData.$inc = { ...updateData.$inc, walletCoins: reward.value };
    }

    const updatedUser = await User.findOneAndUpdate(
      { uid },
      updateData,
      { new: true }
    );

    console.log(`✅ Spin completed for ${uid}. Reward: ${reward.label}, Coins: ${updatedUser.walletCoins}`);
    
    res.json({
      success: true,
      sector: reward.sector,
      reward: reward,
      free_spin_used_today: freeSpinUsed,
      bonus_spins: updatedUser.bonusSpins,
      wallet_coins: updatedUser.walletCoins,
      message: `You won: ${reward.label}`
    });
  } catch (error) {
    console.error('❌ Spin error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ MongoDB will track all user balances and spins`);
});
