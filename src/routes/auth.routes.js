const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");

const {
  registerCustomer,
  loginCustomer,
} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", registerCustomer);
router.post("/login", loginCustomer);

router.get("/protected", authMiddleware, (req, res) => {
  res.status(200).json({
    message: "You can access this protected route",
    customerId: req.customerId,
  });
});
module.exports = router;
