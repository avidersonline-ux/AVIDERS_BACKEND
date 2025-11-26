const express = require("express");
const cors = require("cors");
require("dotenv").config();

// ===== DEBUG: SHOW ENV LOADING =====
console.log("===== DEBUG: ENV LOADED =====");
console.log("All ENV keys:", Object.keys(process.env));
console.log("MONGO_URI:", process.env.MONGO_URI);
console.log("PORT:", process.env.PORT);
console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
console.log("================================");

const connectMongo = require("./config/mongo");

// Connect to Mongo
connectMongo();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", require("./routes/index"));

// Error Handler
const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

// Port from Render OR fallback to local
const PORT = process.env.PORT || 5000;

// IMPORTANT: Render needs 0.0.0.0
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🔥 Backend running on PORT ${PORT}`);
});
