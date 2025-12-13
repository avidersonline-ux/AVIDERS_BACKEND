const mongoose = require("mongoose");

const spinUserSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true
  },
  free_spin_available: {
    type: Boolean,
    default: true
  },
  bonus_spins: {
    type: Number,
    default: 0
  },
  last_free_spin: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Use main mongoose connection if spin connection fails
module.exports = mongoose.models.SpinUser || mongoose.model("SpinUser", spinUserSchema);
