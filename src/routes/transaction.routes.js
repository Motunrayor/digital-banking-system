const express = require("express");
const {
  getTransactionHistory,
  getTransactionStatus,
} = require("../controllers/transaction.controller");

const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/history", authMiddleware, getTransactionHistory);
router.get("/status/:reference", authMiddleware, getTransactionStatus);

module.exports = router;
