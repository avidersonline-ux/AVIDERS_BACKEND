const express = require("express");
const router = express.Router();

// =============================================
// SPIN WHEEL ROUTES
// =============================================

// GET /api/spin/status - Get spin wheel status
router.get("/status", async (req, res) => {
  try {
    // TODO: Get user from Firebase token (implement auth middleware)
    // const user = await getUserIdFromToken(req);
    
    // For now, return demo data
    res.json({
      success: true,
      free_spin_available: true,
      bonus_spins: 2,
      wallet_coins: 100,
      rewards: [
        { type: "coins", value: 10 },
        { type: "coins", value: 20 },
        { type: "none", value: 0 },
        { type: "coupon", value: "DISCOUNT10" },
        { type: "coins", value: 50 },
        { type: "coins", value: 100 },
        { type: "coins", value: 500 },
        { type: "none", value: 0 }
      ]
    });
  } catch (error) {
    console.error("Status error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching spin status"
    });
  }
});

// POST /api/spin/spin - Perform a spin
router.post("/spin", async (req, res) => {
  try {
    // TODO: Add authentication
    // const user = await getUserIdFromToken(req);
    
    // Check if user has spins (you'll implement this with your DB)
    // For demo - always allow
    const sector = Math.floor(Math.random() * 8);
    const rewards = [10, 20, 0, "DISCOUNT10", 50, 100, 500, 0];
    
    const result = {
      success: true,
      sector: sector,
      reward: {
        type: sector === 3 ? "coupon" : (sector === 2 || sector === 7 ? "none" : "coins"),
        value: rewards[sector]
      },
      free_spin_available: false,
      bonus_spins_left: 1,
      wallet_coins: 150 // Example updated coins
    };

    res.json(result);
  } catch (error) {
    console.error("Spin error:", error);
    res.status(500).json({
      success: false,
      message: "Spin failed"
    });
  }
});

// POST /api/spin/bonus - Add bonus spin after ad
router.post("/bonus", async (req, res) => {
  try {
    // TODO: Add authentication
    // const user = await getUserIdFromToken(req);
    
    res.json({
      success: true,
      bonus_spins_left: 3
    });
  } catch (error) {
    console.error("Bonus error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add bonus spin"
    });
  }
});

// Helper function to extract user from Firebase token (you'll implement this)
async function getUserIdFromToken(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error("No token provided");
  }
  
  const token = authHeader.substring(7);
  
  // TODO: Verify Firebase token and get user ID
  // You'll need to use Firebase Admin SDK
  // const decoded = await admin.auth().verifyIdToken(token);
  // return decoded.uid;
  
  // For now, return mock user
  return "user123";
}

module.exports = router;
