const mongoose = require("mongoose");

const connectMongo = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("❌ MONGO_URI missing in environment variables!");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: true,
    });

    console.log("✅ MongoDB Connected (Spinwheel)");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

module.exports = connectMongo;
