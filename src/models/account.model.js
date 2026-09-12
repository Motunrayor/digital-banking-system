const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      unique: true,
    },

    accountNumber: {
      type: String,
      required: true,
      unique: true,
    },

    bankCode: {
      type: String,
      required: true,
    },

    bankName: {
      type: String,
      required: true,
    },

    balance: {
      type: Number,
      required: true,
      default: 15000,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Account", accountSchema);
