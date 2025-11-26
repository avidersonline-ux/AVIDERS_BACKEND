const router = require("express").Router();
const controller = require("../controllers/spin.controller");

router.get("/status", controller.spinStatus);
router.post("/spin", controller.spinNow);

module.exports = router;

