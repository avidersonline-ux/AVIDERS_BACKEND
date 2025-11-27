// modules/spinwheel-service/config/mongo.spin.js
const mongoose = require("mongoose");

module.exports = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Spin DB Connected");
  } catch (err) {
    console.error("❌ Spin DB Error:", err);
    process.exit(1);
  }
};
