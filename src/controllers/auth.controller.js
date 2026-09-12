const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Customer = require("../models/customer.model");

const registerCustomer = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if the customer already exists
    const existingEmail = await Customer.findOne({ email });

    if (existingEmail) {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    const existingPhone = await Customer.findOne({ phoneNumber });

    if (existingPhone) {
      return res.status(409).json({
        message: "Phone number already exists",
      });
    }

    // Create a new customer
    const newCustomer = new Customer({
      firstName,
      lastName,
      email,
      phoneNumber,
      password: hashedPassword,
    });

    // Save customer to MongoDB
    await newCustomer.save();

    res.status(201).json({
      message: "Customer registered successfully",
      customer: {
        id: newCustomer._id,
        firstName: newCustomer.firstName,
        lastName: newCustomer.lastName,
        email: newCustomer.email,
        phoneNumber: newCustomer.phoneNumber,
        isVerified: newCustomer.isVerified,
      },
    });
  } catch (error) {
    console.error("Error registering customer:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;

    const customer = await Customer.findOne({ email });

    if (!customer) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, customer.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      { customerId: customer._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.status(200).json({
      message: "Login successful",
      token,
      customer: {
        id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        isVerified: customer.isVerified,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = { registerCustomer, loginCustomer };
