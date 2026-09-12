const Transaction = require("../models/transaction.model");
const {
  getTransactionStatus: getNibssTransactionStatus,
} = require("../services/nibss.service");

const getTransactionStatus = async (req, res) => {
  try {
    const reference = req.params.reference?.trim();

    if (!reference) {
      return res.status(400).json({
        message: "Transaction reference is required",
      });
    }

    const transaction = await Transaction.findOne({
      reference,
      customer: req.customerId,
    });

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    const transactionStatus = await getNibssTransactionStatus(reference);
    const transactionDetails =
      transactionStatus.transaction || transactionStatus.data || transactionStatus;

    if (transactionDetails.status) {
      transaction.status = transactionDetails.status;
      await transaction.save();
    }

    return res.status(200).json(transactionStatus);
  } catch (error) {
    console.error(
      "Transaction status error:",
      error.response?.data || error.message,
    );

    return res.status(500).json({
      message: "Transaction status check failed",
      error: error.response?.data || error.message,
    });
  }
};

module.exports = {
  getTransactionStatus,
};
