const router = require("express").Router();
const controller = require("../controllers/spin.controller");

// GET spin status
router.get("/status", controller.spinStatus);

// Perform a spin
router.post("/spin", controller.spinNow);

// Bonus spin from ads
router.post("/bonus", controller.addBonusSpin);

// REMOVE these unless you implement them
// router.get("/history", controller.getHistory);
// router.get("/rewards", controller.getRewards);

module.exports = router;
