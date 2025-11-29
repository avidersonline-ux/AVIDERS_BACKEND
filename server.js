const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const Joi = require('joi');

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: false
}));

app.use(express.json());

// Load rewards configuration
let rewardsConfig = [];
try {
  const configPath = path.join(__dirname, 'modules', 'spinwheel-service', 'config', 'rewards.config.json');
  const configData = fs.readFileSync(configPath, 'utf8');
  rewardsConfig = JSON.parse(configData).rewards;
  console.log("✅ Rewards configuration loaded successfully");
  console.log(`📊 Loaded ${rewardsConfig.length} rewards from config`);
} catch (error) {
  console.error("❌ Failed to load rewards config, using fallback rewards:", error.message);
  // Fallback rewards
  rewardsConfig = [
    { type: "coins", value: 10, probability: 0.3, label: "10 AVD Coins" },
    { type: "coins", value: 20, probability: 0.2, label: "20 AVD Coins" },
    { type: "coins", value: 5, probability: 0.4, label: "5 AVD Coins" },
    { type: "none", value: 0, probability: 0.05, label: "Try Again" },
    { type: "coins", value: 15, probability: 0.25, label: "15 AVD Coins" },
    { type: "coupon", code: "SPIN10", probability: 0.1, label: "Discount Coupon" },
    { type: "coins", value: 25, probability: 0.15, label: "25 AVD Coins" },
    { type: "none", value: 0, probability: 0.05, label: "Better Luck" }
  ];
}

// MongoDB Connection - Use MONGO_URI_SPIN environment variable
const MONGODB_URI = process.env.MONGO_URI_SPIN || process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGO_URI_SPIN environment variable is not set");
  console.log("🔄 Using in-memory storage only - data will not persist");
} else {
  console.log("🔗 Attempting MongoDB connection with MONGO_URI_SPIN...");
  mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Connected - Data will be saved permanently");
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    console.log(`🏷️ Cluster: AVIDERS-SPIN-WIN`);
  })
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err.message);
    console.log("🔄 Using in-memory storage as fallback");
  });
}

// MongoDB Schemas
const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  freeSpins: { type: Number, default: 1 },
  bonusSpins: { type: Number, default: 0 },
  walletCoins: { type: Number, default: 100 },
  lastSpin: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

const spinHistorySchema = new mongoose.Schema({
  uid: { type: String, required: true },
  reward_type: { type: String, required: true },
  reward_value: { type: Number, default: 0 },
  reward_code: { type: String, default: null },
  reward_label: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// MongoDB Models
const User = mongoose.model('User', userSchema);
const SpinHistory = mongoose.model('SpinHistory', spinHistorySchema);

// Request logging
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`, req.body || '');
  next();
});

// Health check with DB status
app.get("/health", async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";
  
  // Get some stats
  const userCount = await User.countDocuments().catch(() => 0);
  const spinCount = await SpinHistory.countDocuments().catch(() => 0);
  
  res.json({ 
    success: true, 
    message: "Server is running", 
    timestamp: new Date().toISOString(),
    database: dbStatus,
    stats: {
      total_users: userCount,
      total_spins: spinCount
    },
    rewards_config: {
      loaded: rewardsConfig.length,
      rewards: rewardsConfig.map(r => ({ type: r.type, label: r.label }))
    }
  });
});

// Ensure user exists in MongoDB
const ensureUser = async (uid) => {
  try {
    let user = await User.findOne({ uid });
    
    if (!user) {
      user = new User({
        uid,
        freeSpins: 1,
        bonusSpins: 0,
        walletCoins: 100
      });
      await user.save();
      console.log(`👤 New user CREATED in MongoDB: ${uid}`);
    }
    
    return user;
  } catch (error) {
    console.error("❌ Error ensuring user:", error);
    throw error;
  }
};

// SPIN API ENDPOINTS - NOW SAVING TO MONGODB
app.post("/api/spin/status", async (req, res) => {
  try {
    const { uid } = req.body;
    console.log(`🔎 STATUS requested for UID: ${uid}`);
    
    if (!uid) {
      return res.status(400).json({ success: false, message: "UID is required" });
    }

    const user = await ensureUser(uid);
    
    // Use rewards from config (remove probability field for frontend)
    const frontendRewards = rewardsConfig.map(reward => ({
      type: reward.type,
      value: reward.value,
      label: reward.label,
      code: reward.code
    }));
    
    res.json({
      success: true,
      free_spin_available: user.freeSpins > 0,
      bonus_spins: user.bonusSpins,
      wallet_coins: user.walletCoins,
      rewards: frontendRewards
    });
  } catch (error) {
    console.error('❌ Status error:', error);
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
});

app.post("/api/spin/bonus", async (req, res) => {
  try {
    const { uid } = req.body;
    console.log(`➕ BONUS requested for UID: ${uid}`);
    
    if (!uid) {
      return res.status(400).json({ success: false, message: "UID is required" });
    }

    const user = await ensureUser(uid);
    user.bonusSpins += 1;
    await user.save();

    console.log(`✅ Bonus spin ADDED to MongoDB for ${uid}. Total: ${user.bonusSpins}`);
    
    res.json({
      success: true,
      bonus_spins: user.bonusSpins,
      message: "Bonus spin added successfully!"
    });
  } catch (error) {
    console.error('❌ Bonus spin error:', error);
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
});

app.post("/api/spin/spin", async (req, res) => {
  try {
    const { uid } = req.body;
    console.log(`🎰 SPIN requested for UID: ${uid}`);
    
    if (!uid) {
      return res.status(400).json({ success: false, message: "UID is required" });
    }

    const user = await ensureUser(uid);
    
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

    // ✅ USE REWARDS FROM CONFIG FILE with probability-based selection
    const randomValue = Math.random();
    let cumulativeProbability = 0;
    let selectedReward = rewardsConfig[0]; // fallback
    
    for (const reward of rewardsConfig) {
      cumulativeProbability += reward.probability;
      if (randomValue <= cumulativeProbability) {
        selectedReward = reward;
        break;
      }
    }

    // Add sector index for frontend
    const rewardIndex = rewardsConfig.findIndex(r => r === selectedReward);
    const reward = {
      ...selectedReward,
      sector: rewardIndex
    };
    
    // Update wallet if coins reward
    if (reward.type === "coins") {
      user.walletCoins += reward.value;
    }

    // ✅ SAVE USER DATA TO MONGODB
    await user.save();

    // ✅ SAVE SPIN HISTORY TO MONGODB
    const spinHistory = new SpinHistory({
      uid: uid,
      reward_type: reward.type,
      reward_value: reward.value,
      reward_code: reward.code,
      reward_label: reward.label
    });
    await spinHistory.save();

    console.log(`✅ Spin COMPLETED and SAVED to MongoDB for ${uid}. Reward: ${reward.label}, AVD Coins: ${user.walletCoins}`);
    
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
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
});

// LEDGER endpoint - Get user history from MongoDB
app.post("/api/spin/ledger", async (req, res) => {
  try {
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ success: false, message: "UID is required" });
    }

    const user = await User.findOne({ uid });
    const spinHistory = await SpinHistory.find({ uid }).sort({ timestamp: -1 }).limit(50);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      user: {
        uid: user.uid,
        freeSpins: user.freeSpins,
        bonusSpins: user.bonusSpins,
        walletCoins: user.walletCoins,
        createdAt: user.createdAt
      },
      spinHistory: spinHistory,
      totalSpins: spinHistory.length
    });
  } catch (error) {
    console.error('❌ Ledger error:', error);
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
});

// RESET endpoint - Delete user data from MongoDB
app.post("/api/spin/reset", async (req, res) => {
  try {
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ success: false, message: "UID is required" });
    }

    // Delete user
    await User.deleteOne({ uid });
    
    // Delete user's spin history
    await SpinHistory.deleteMany({ uid });

    console.log(`🔄 User data DELETED from MongoDB: ${uid}`);
    
    res.json({
      success: true,
      message: "User data reset successfully"
    });
  } catch (error) {
    console.error('❌ Reset error:', error);
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
});

// ADMIN endpoint - Get all users (for debugging)
app.get("/api/spin/admin/users", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    const totalSpins = await SpinHistory.countDocuments();
    
    res.json({
      success: true,
      total_users: users.length,
      total_spins: totalSpins,
      users: users
    });
  } catch (error) {
    console.error('❌ Admin users error:', error);
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Premium Spin Wheel Server running on port ${PORT}`);
  console.log(`✅ CORS enabled for all origins`);
  console.log(`🎯 Rewards configuration: ${rewardsConfig.length} rewards loaded`);
  
  // Better connection status check
  const dbStatus = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";
  console.log(`💾 MongoDB: ${dbStatus}`);
  console.log(`🏷️ Cluster: AVIDERS-SPIN-WIN`);
  console.log(`🗃️ Database: spinwheelDb`);
  console.log(`🔑 Using: ${process.env.MONGO_URI_SPIN ? 'MONGO_URI_SPIN' : process.env.MONGO_URI ? 'MONGO_URI' : 'No connection string'}`);
});
