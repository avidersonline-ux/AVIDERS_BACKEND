const mongoose = require("mongoose");

const SpinHistorySchema = new mongoose.Schema(
  {
    uid: { type: String, required: true },
    email: { type: String },

    reward: String,
    reward_value: Number,
    created_at: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SpinHistory", SpinHistorySchema);
