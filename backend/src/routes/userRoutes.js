const express = require("express");
const router = express.Router();
const { signup, signin } = require("../controllers/userController");
const { authLimiter } = require("../middleware/rateLimiter");

router.post("/signup", authLimiter, signup);
router.post("/signin", authLimiter, signin);

module.exports = router;
