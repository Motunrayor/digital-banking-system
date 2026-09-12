const express = require("express");
const {
  createCustomerAccount,
  getCustomerAccountBalance,
} = require("../controllers/account.controller");

const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/create", authMiddleware, createCustomerAccount);
router.get("/balance", authMiddleware, getCustomerAccountBalance);

module.exports = router;
