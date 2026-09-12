const express = require("express");

const {
  onboardWithBvn,
  onboardWithNin,
} = require("../controllers/onboarding.controller");

const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/bvn", authMiddleware, onboardWithBvn);
router.post("/nin", authMiddleware, onboardWithNin);

module.exports = router;
