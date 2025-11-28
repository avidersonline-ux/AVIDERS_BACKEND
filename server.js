const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./config/mongo")();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", require("./routes/index"));

app.listen(process.env.PORT || 5000, () =>
  console.log("Spin backend running on port", process.env.PORT)
);
