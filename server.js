const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectMongo = require("./config/mongo");
const connectSpinMongo = require("./modules/spinwheel-service/config/mongo.spin");

// Connect databases (they won't crash the server if they fail)
connectMongo();      
connectSpinMongo();

const app = express();

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    success: true, 
    message: "Server is running", 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
  });
});

// Test endpoint with mock data
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "API is working!",
    rewards: [
      { type: "coins", value: 10, label: "10 Coins" },
      { type: "coins", value: 20, label: "20 Coins" },
      { type: "coins", value: 5, label: "5 Coins" },
      { type: "none", value: 0, label: "Try Again" },
      { type: "coins", value: 15, label: "15 Coins" },
      { type: "coupon", code: "TEST10", label: "Discount Coupon" },
      { type: "coins", value: 25, label: "25 Coins" },
      { type: "none", value: 0, label: "Better Luck" }
    ]
  });
});

// Try to load spin routes, but provide fallback if they fail
try {
  app.use("/api/spin", require("./modules/spinwheel-service/routes/spin.routes"));
  console.log("✅ Spin routes loaded successfully");
} catch (error) {
  console.log("❌ Spin routes failed to load:", error.message);
  
  // Provide basic fallback routes
  app.post("/api/spin/status", (req, res) => {
    res.json({
      success: true,
      free_spin_available: true,
      bonus_spins: 1,
      wallet_coins: 100,
      rewards: [
        { type: "coins", value: 10, label: "10 Coins" },
        { type: "coins", value: 20, label: "20 Coins" },
        { type: "coins", value: 5, label: "5 Coins" },
        { type: "none", value: 0, label: "Try Again" },
        { type: "coins", value: 15, label: "15 Coins" },
        { type: "coupon", code: "FALLBACK", label: "Discount Coupon" },
        { type: "coins", value: 25, label: "25 Coins" },
        { type: "none", value: 0, label: "Better Luck" }
      ]
    });
  });

  app.post("/api/spin/bonus", (req, res) => {
    res.json({
      success: true,
      bonus_spins_left: 2,
      message: "Bonus spin added (fallback mode)"
    });
  });

  app.post("/api/spin/spin", (req, res) => {
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
    
    const randomReward = rewards[Math.floor(Math.random() * rewards.length)];
    
    res.json({
      success: true,
      sector: randomReward.sector,
      reward: randomReward,
      free_spin_used_today: false,
      bonus_spins_left: 1,
      wallet_coins: 100 + (randomReward.value || 0),
      message: `You won: ${randomReward.label}`
    });
  });

  console.log("✅ Fallback spin routes loaded");
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`✅ Test endpoint: http://localhost:${PORT}/api/test`);
});
