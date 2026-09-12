const express = require("express");
const {
  getTransactionStatus,
} = require("../controllers/transaction.controller");

const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/status/:reference", authMiddleware, getTransactionStatus);

module.exports = router;
