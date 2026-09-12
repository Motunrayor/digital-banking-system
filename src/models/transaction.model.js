const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    senderAccountNumber: {
      type: String,
      required: true,
    },

    recipientAccountNumber: {
      type: String,
      required: true,
    },

    recipientBankCode: {
      type: String,
    },

    amount: {
      type: Number,
      required: true,
    },

    transactionType: {
      type: String,
      enum: ["INTRA_BANK", "INTER_BANK"],
      required: true,
    },

    reference: {
      type: String,
      required: true,
      unique: true,
    },

    status: {
      type: String,
      default: "PENDING",
    },

    narration: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Transaction", transactionSchema);
