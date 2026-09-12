const Customer = require("../models/customer.model");
const {
  insertBvn,
  validateBvn,
  insertNin,
  validateNin,
} = require("../services/nibss.service");

const onboardWithBvn = async (req, res) => {
  try {
    const { bvn, dob } = req.body;

    const customer = await Customer.findById(req.customerId);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    if (customer.isVerified) {
      return res.status(400).json({
        message: "Customer is already verified",
      });
    }

    const bvnData = {
      bvn,
      firstName: customer.firstName,
      lastName: customer.lastName,
      dob,
      phone: customer.phoneNumber,
    };

    // Create the test BVN on NIBSS
    try {
      await insertBvn(bvnData);
    } catch (error) {
      const message = error.response?.data?.message;

      // If the BVN already exists on NIBSS,
      // continue to validation instead of stopping.
      if (message !== "BVN already exists in the system.") {
        throw error;
      }
    }

    // Validate the BVN
    const validationResponse = await validateBvn(bvn);

    if (!validationResponse.success) {
      return res.status(400).json({
        message: "BVN validation failed",
        error: validationResponse.message,
      });
    }

    // Only mark the customer as verified after successful validation
    customer.bvn = bvn;
    customer.onboardingType = "BVN";
    customer.isVerified = true;

    await customer.save();

    return res.status(200).json({
      message: "BVN onboarding completed successfully",
      customer: {
        id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        onboardingType: customer.onboardingType,
        isVerified: customer.isVerified,
      },
    });
  } catch (error) {
    console.error(
      "BVN onboarding error:",
      error.response?.data || error.message,
    );

    return res.status(500).json({
      message: "BVN onboarding failed",
      error: error.response?.data || error.message,
    });
  }
};

const onboardWithNin = async (req, res) => {
  try {
    const { nin, dob } = req.body;

    const customer = await Customer.findById(req.customerId);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    if (customer.isVerified) {
      return res.status(400).json({
        message: "Customer is already verified",
      });
    }

    const ninData = {
      nin,
      firstName: customer.firstName,
      lastName: customer.lastName,
      dob,
    };

    // Create test NIN on NIBSS
    try {
      await insertNin(ninData);
    } catch (error) {
      const message = error.response?.data?.message;

      // If NIN already exists, continue to validation
      if (message !== "NIN already exists in the system.") {
        throw error;
      }
    }

    // Validate NIN
    const validationResponse = await validateNin(nin);

    if (validationResponse.message !== "NIN Verified!!") {
      return res.status(400).json({
        message: "NIN validation failed",
        error: validationResponse.message,
      });
    }
    // Verification was successful
    customer.nin = nin;
    customer.onboardingType = "NIN";
    customer.isVerified = true;

    await customer.save();

    return res.status(200).json({
      message: "NIN onboarding completed successfully",
      customer: {
        id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        onboardingType: customer.onboardingType,
        isVerified: customer.isVerified,
      },
    });
  } catch (error) {
    console.error(
      "NIN onboarding error:",
      error.response?.data || error.message,
    );

    return res.status(500).json({
      message: "NIN onboarding failed",
      error: error.response?.data || error.message,
    });
  }
};

module.exports = {
  onboardWithBvn,
  onboardWithNin,
};
