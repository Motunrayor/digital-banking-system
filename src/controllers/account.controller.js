const Customer = require("../models/customer.model");
const Account = require("../models/account.model");
const Transaction = require("../models/transaction.model");
const {
  createAccount,
  getAccountBalance,
  getNameEnquiry,
  transferFunds,
} = require("../services/nibss.service");

const createCustomerAccount = async (req, res) => {
  try {
    const { dob } = req.body;

    const customer = await Customer.findById(req.customerId);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    // Customer must complete BVN or NIN onboarding first
    if (!customer.isVerified) {
      return res.status(400).json({
        message: "Customer must complete BVN or NIN verification first",
      });
    }

    // Customer can only have one account
    const existingAccount = await Account.findOne({
      customer: customer._id,
    });

    if (existingAccount) {
      return res.status(400).json({
        message: "Customer already has an account",
      });
    }

    // Determine which KYC the customer used
    const kycType = customer.onboardingType;

    const kycID = kycType === "BVN" ? customer.bvn : customer.nin;

    const accountData = {
      kycType: kycType.toLowerCase(),
      kycID,
      dob,
    };

    // Create account through NIBSS
    const nibssAccount = await createAccount(accountData);
    const accountDetails = nibssAccount.account || nibssAccount.data || nibssAccount;
    console.log("NIBSS account response:", accountDetails);

    // Save account locally
    const account = new Account({
      customer: customer._id,
      accountNumber: accountDetails.accountNumber,
      bankCode: accountDetails.bankCode,
      bankName: accountDetails.bankName || process.env.NIBSS_BANK_NAME,
      balance: accountDetails.balance,
    });

    await account.save();

    return res.status(201).json({
      message: "Account created successfully",
      account: {
        accountNumber: account.accountNumber,
        bankCode: account.bankCode,
        bankName: account.bankName,
        balance: account.balance,
      },
    });
  } catch (error) {
    console.error(
      "Account creation error:",
      error.response?.data || error.message,
    );

    return res.status(500).json({
      message: "Account creation failed",
      error: error.response?.data || error.message,
    });
  }
};

const getCustomerAccountBalance = async (req, res) => {
  try {
    const account = await Account.findOne({
      customer: req.customerId,
    });

    if (!account) {
      return res.status(404).json({
        message: "Account not found",
      });
    }

    const balance = await getAccountBalance(account.accountNumber);

    return res.status(200).json(balance);
  } catch (error) {
    console.error(
      "Account balance error:",
      error.response?.data || error.message,
    );

    return res.status(500).json({
      message: "Account balance check failed",
      error: error.response?.data || error.message,
    });
  }
};

const getAccountNameEnquiry = async (req, res) => {
  try {
    const accountNumber = req.params.accountNumber?.trim();

    if (!accountNumber) {
      return res.status(400).json({
        message: "Account number is required",
      });
    }

    const nameEnquiry = await getNameEnquiry(accountNumber);

    return res.status(200).json(nameEnquiry);
  } catch (error) {
    console.error(
      "Name enquiry error:",
      error.response?.data || error.message,
    );

    return res.status(500).json({
      message: "Name enquiry failed",
      error: error.response?.data || error.message,
    });
  }
};

const transferCustomerFunds = async (req, res) => {
  try {
    const { to, amount, narration } = req.body;

    if (!to) {
      return res.status(400).json({
        message: "Recipient account number is required",
      });
    }

    if (amount === undefined) {
      return res.status(400).json({
        message: "Amount is required",
      });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than 0",
      });
    }

    const senderAccount = await Account.findOne({
      customer: req.customerId,
    });

    if (!senderAccount) {
      return res.status(404).json({
        message: "Sender account not found",
      });
    }

    const recipientAccount = await Account.findOne({
      accountNumber: to,
    });

    const transferData = {
      from: senderAccount.accountNumber,
      to,
      amount: Number(amount),
    };

    const transferResponse = await transferFunds(transferData);
    const transferDetails =
      transferResponse.transaction || transferResponse.data || transferResponse;

    const transaction = new Transaction({
      customer: req.customerId,
      senderAccountNumber: senderAccount.accountNumber,
      recipientAccountNumber: to,
      recipientBankCode:
        recipientAccount?.bankCode ||
        transferDetails.recipientBankCode ||
        transferDetails.bankCode,
      amount: Number(amount),
      transactionType: recipientAccount ? "INTRA_BANK" : "INTER_BANK",
      reference:
        transferDetails.reference ||
        transferDetails.transactionReference ||
        transferDetails.ref,
      status: transferDetails.status,
      narration,
    });

    await transaction.save();

    return res.status(200).json({
      message: transferResponse.message || "Transfer successful",
      transfer: transferResponse,
      transaction: {
        reference: transaction.reference,
        status: transaction.status,
        transactionType: transaction.transactionType,
        amount: transaction.amount,
        senderAccountNumber: transaction.senderAccountNumber,
        recipientAccountNumber: transaction.recipientAccountNumber,
      },
    });
  } catch (error) {
    console.error(
      "Transfer error:",
      error.response?.data || error.message,
    );

    return res.status(500).json({
      message: "Transfer failed",
      error: error.response?.data || error.message,
    });
  }
};

module.exports = {
  createCustomerAccount,
  getCustomerAccountBalance,
  getAccountNameEnquiry,
  transferCustomerFunds,
};
