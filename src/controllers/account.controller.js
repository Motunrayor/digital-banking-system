const Customer = require("../models/customer.model");
const Account = require("../models/account.model");
const {
  createAccount,
  getAccountBalance,
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

module.exports = {
  createCustomerAccount,
  getCustomerAccountBalance,
};
