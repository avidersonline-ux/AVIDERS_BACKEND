const SpinUser = require("../models/SpinUser");
const SpinHistory = require("../models/SpinHistory");
const Wallet = require("../models/wallet.model");
const rewardEngine = require("../engine/rewardEngine");

const spinController = {
  // Get user status
  async getStatus(req, res) {
    try {
      const { uid } = req.body;
      
      if (!uid) {
        return res.status(400).json({
          success: false,
          message: "UID is required"
        });
      }

      // Get or create user
      let user = await SpinUser.findOne({ uid });
      
      if (!user) {
        user = await SpinUser.create({
          uid,
          free_spin_available: true,
          bonus_spins: 0,
          last_free_spin: null
        });
        
        // Create wallet if doesn't exist
        await Wallet.findOneAndUpdate(
          { uid },
          { $setOnInsert: { coins: 0 } },
          { upsert: true, new: true }
        );
      }

      // Get wallet
      const wallet = await Wallet.findOne({ uid });
      
      // Get available rewards
      const rewards = await rewardEngine.getAvailableRewards();

      res.json({
        success: true,
        free_spin_available: user.free_spin_available,
        bonus_spins: user.bonus_spins,
        wallet_coins: wallet ? wallet.coins : 0,
        rewards: rewards
      });

    } catch (error) {
      console.error("❌ getStatus error:", error);
      res.status(500).json({
        success: false,
        message: "Server error fetching status"
      });
    }
  },

  // Add bonus spin
  async addBonusSpin(req, res) {
    try {
      const { uid } = req.body;

      const user = await SpinUser.findOneAndUpdate(
        { uid },
        { $inc: { bonus_spins: 1 } },
        { new: true, upsert: true }
      );

      res.json({
        success: true,
        bonus_spins_left: user.bonus_spins,
        message: "Bonus spin added!"
      });

    } catch (error) {
      console.error("❌ addBonusSpin error:", error);
      res.status(500).json({
        success: false,
        message: "Server error adding bonus spin"
      });
    }
  },

  // Spin the wheel
  async spinWheel(req, res) {
    try {
      const { uid } = req.body;

      // Get user
      let user = await SpinUser.findOne({ uid });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Check if user can spin
      if (!user.free_spin_available && user.bonus_spins <= 0) {
        return res.status(400).json({
          success: false,
          message: "No spins available"
        });
      }

      // Use free spin first, then bonus spins
      let free_spin_used_today = false;
      if (user.free_spin_available) {
        user.free_spin_available = false;
        user.last_free_spin = new Date();
        free_spin_used_today = true;
      } else {
        user.bonus_spins -= 1;
      }

      await user.save();

      // Generate reward
      const reward = await rewardEngine.generateReward(uid);
      
      // Update wallet if coins reward
      if (reward.type === "coins") {
        await Wallet.findOneAndUpdate(
          { uid },
          { $inc: { coins: reward.value } },
          { upsert: true, new: true }
        );
      }

      // Record spin history
      await SpinHistory.create({
        uid,
        reward_type: reward.type,
        reward_value: reward.value,
        reward_code: reward.code,
        reward_label: reward.label,
        timestamp: new Date()
      });

      // Get updated wallet
      const wallet = await Wallet.findOne({ uid });

      res.json({
        success: true,
        sector: reward.sector,
        reward: reward,
        free_spin_used_today: free_spin_used_today,
        bonus_spins_left: user.bonus_spins,
        wallet_coins: wallet ? wallet.coins : 0,
        message: `You won: ${reward.label}`
      });

    } catch (error) {
      console.error("❌ spinWheel error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during spin"
      });
    }
  }
};

module.exports = spinController;
