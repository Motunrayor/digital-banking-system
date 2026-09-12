const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

test("account creation saves details from nested NIBSS account response", async () => {
  const originalLoad = Module._load;
  const originalBankName = process.env.NIBSS_BANK_NAME;
  const controllerPath = require.resolve("../src/controllers/account.controller.js");
  delete require.cache[controllerPath];

  let savedAccount;

  function Account(data) {
    savedAccount = data;
    return {
      ...data,
      async save() {},
    };
  }

  Account.findOne = async () => null;
  process.env.NIBSS_BANK_NAME = "MOT Bank";

  try {
    Module._load = function mockedLoad(request, parent, isMain) {
      if (request === "../models/customer.model") {
        return {
          findById: async () => ({
            _id: "customer-id",
            isVerified: true,
            onboardingType: "NIN",
            nin: "27777789012",
          }),
        };
      }

      if (request === "../models/account.model") {
        return Account;
      }

      if (request === "../services/nibss.service") {
        return {
          createAccount: async () => ({
            message: "Account created successfully",
            account: {
              accountNumber: "7628180202",
              accountName: "Inioluwa Blessed",
              bankCode: "762",
              balance: 15000,
            },
          }),
        };
      }

      return originalLoad.apply(this, arguments);
    };

    const { createCustomerAccount } = require("../src/controllers/account.controller.js");
    const req = {
      body: { dob: "2005-04-04" },
      customerId: "customer-id",
    };
    const res = {
      statusCode: undefined,
      body: undefined,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };

    await createCustomerAccount(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(savedAccount.accountNumber, "7628180202");
    assert.equal(savedAccount.bankCode, "762");
    assert.equal(savedAccount.bankName, "MOT Bank");
    assert.equal(savedAccount.balance, 15000);
  } finally {
    Module._load = originalLoad;

    if (originalBankName === undefined) {
      delete process.env.NIBSS_BANK_NAME;
    } else {
      process.env.NIBSS_BANK_NAME = originalBankName;
    }

    delete require.cache[controllerPath];
  }
});

test("balance check uses the authenticated customer's stored account number", async () => {
  const originalLoad = Module._load;
  const controllerPath = require.resolve("../src/controllers/account.controller.js");
  delete require.cache[controllerPath];

  let requestedBalanceAccountNumber;

  try {
    Module._load = function mockedLoad(request, parent, isMain) {
      if (request === "../models/customer.model") {
        return {};
      }

      if (request === "../models/account.model") {
        return {
          findOne: async (query) => {
            assert.deepEqual(query, { customer: "customer-id" });
            return {
              accountNumber: "7628180202",
            };
          },
        };
      }

      if (request === "../services/nibss.service") {
        return {
          createAccount: async () => ({}),
          getAccountBalance: async (accountNumber) => {
            requestedBalanceAccountNumber = accountNumber;
            return {
              message: "Account balance retrieved successfully",
              accountNumber,
              balance: 15000,
            };
          },
        };
      }

      return originalLoad.apply(this, arguments);
    };

    const { getCustomerAccountBalance } = require("../src/controllers/account.controller.js");
    const req = {
      body: { accountNumber: "attacker-account" },
      customerId: "customer-id",
    };
    const res = {
      statusCode: undefined,
      body: undefined,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };

    await getCustomerAccountBalance(req, res);

    assert.equal(requestedBalanceAccountNumber, "7628180202");
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      message: "Account balance retrieved successfully",
      accountNumber: "7628180202",
      balance: 15000,
    });
  } finally {
    Module._load = originalLoad;
    delete require.cache[controllerPath];
  }
});

test("balance check returns 404 when the authenticated customer has no account", async () => {
  const originalLoad = Module._load;
  const controllerPath = require.resolve("../src/controllers/account.controller.js");
  delete require.cache[controllerPath];

  try {
    Module._load = function mockedLoad(request, parent, isMain) {
      if (request === "../models/customer.model") {
        return {};
      }

      if (request === "../models/account.model") {
        return {
          findOne: async () => null,
        };
      }

      if (request === "../services/nibss.service") {
        return {
          createAccount: async () => ({}),
          getAccountBalance: async () => {
            throw new Error("should not call NIBSS without a local account");
          },
        };
      }

      return originalLoad.apply(this, arguments);
    };

    const { getCustomerAccountBalance } = require("../src/controllers/account.controller.js");
    const req = {
      customerId: "customer-id",
    };
    const res = {
      statusCode: undefined,
      body: undefined,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };

    await getCustomerAccountBalance(req, res);

    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, {
      message: "Account not found",
    });
  } finally {
    Module._load = originalLoad;
    delete require.cache[controllerPath];
  }
});

test("name enquiry uses the account number from route params", async () => {
  const originalLoad = Module._load;
  const controllerPath = require.resolve("../src/controllers/account.controller.js");
  delete require.cache[controllerPath];

  let requestedAccountNumber;

  try {
    Module._load = function mockedLoad(request, parent, isMain) {
      if (request === "../models/customer.model") {
        return {};
      }

      if (request === "../models/account.model") {
        return {};
      }

      if (request === "../services/nibss.service") {
        return {
          createAccount: async () => ({}),
          getAccountBalance: async () => ({}),
          getNameEnquiry: async (accountNumber) => {
            requestedAccountNumber = accountNumber;
            return {
              message: "Name enquiry successful",
              accountNumber,
              accountName: "Inioluwa Blessed",
              bankCode: "762",
            };
          },
        };
      }

      return originalLoad.apply(this, arguments);
    };

    const { getAccountNameEnquiry } = require("../src/controllers/account.controller.js");
    const req = {
      params: { accountNumber: "7628180202" },
      customerId: "customer-id",
    };
    const res = {
      statusCode: undefined,
      body: undefined,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };

    await getAccountNameEnquiry(req, res);

    assert.equal(requestedAccountNumber, "7628180202");
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      message: "Name enquiry successful",
      accountNumber: "7628180202",
      accountName: "Inioluwa Blessed",
      bankCode: "762",
    });
  } finally {
    Module._load = originalLoad;
    delete require.cache[controllerPath];
  }
});

test("name enquiry returns 400 when account number is missing", async () => {
  const originalLoad = Module._load;
  const controllerPath = require.resolve("../src/controllers/account.controller.js");
  delete require.cache[controllerPath];

  try {
    Module._load = function mockedLoad(request, parent, isMain) {
      if (request === "../models/customer.model") {
        return {};
      }

      if (request === "../models/account.model") {
        return {};
      }

      if (request === "../services/nibss.service") {
        return {
          createAccount: async () => ({}),
          getAccountBalance: async () => ({}),
          getNameEnquiry: async () => {
            throw new Error("should not call NIBSS without an account number");
          },
        };
      }

      return originalLoad.apply(this, arguments);
    };

    const { getAccountNameEnquiry } = require("../src/controllers/account.controller.js");
    const req = {
      params: { accountNumber: " " },
      customerId: "customer-id",
    };
    const res = {
      statusCode: undefined,
      body: undefined,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };

    await getAccountNameEnquiry(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
      message: "Account number is required",
    });
  } finally {
    Module._load = originalLoad;
    delete require.cache[controllerPath];
  }
});

test("transfer uses the authenticated customer's account as sender and records transaction", async () => {
  const originalLoad = Module._load;
  const controllerPath = require.resolve("../src/controllers/account.controller.js");
  delete require.cache[controllerPath];

  let transferPayload;
  let savedTransaction;

  function Transaction(data) {
    savedTransaction = data;
    return {
      ...data,
      async save() {},
    };
  }

  try {
    Module._load = function mockedLoad(request, parent, isMain) {
      if (request === "../models/customer.model") {
        return {};
      }

      if (request === "../models/account.model") {
        return {
          findOne: async (query) => {
            if (query.customer === "customer-id") {
              return {
                accountNumber: "7628180202",
              };
            }

            if (query.accountNumber === "7621111111") {
              return {
                accountNumber: "7621111111",
                bankCode: "762",
              };
            }

            return null;
          },
        };
      }

      if (request === "../models/transaction.model") {
        return Transaction;
      }

      if (request === "../services/nibss.service") {
        return {
          createAccount: async () => ({}),
          getAccountBalance: async () => ({}),
          getNameEnquiry: async () => ({}),
          transferFunds: async (payload) => {
            transferPayload = payload;
            return {
              message: "Transfer successful",
              reference: "NIBSS-REF-001",
              status: "SUCCESSFUL",
              amount: 2000,
            };
          },
        };
      }

      return originalLoad.apply(this, arguments);
    };

    const { transferCustomerFunds } = require("../src/controllers/account.controller.js");
    const req = {
      body: {
        from: "attacker-account",
        to: "7621111111",
        amount: 2000,
        narration: "Lunch",
      },
      customerId: "customer-id",
    };
    const res = {
      statusCode: undefined,
      body: undefined,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };

    await transferCustomerFunds(req, res);

    assert.deepEqual(transferPayload, {
      from: "7628180202",
      to: "7621111111",
      amount: 2000,
    });
    assert.equal(savedTransaction.customer, "customer-id");
    assert.equal(savedTransaction.senderAccountNumber, "7628180202");
    assert.equal(savedTransaction.recipientAccountNumber, "7621111111");
    assert.equal(savedTransaction.recipientBankCode, "762");
    assert.equal(savedTransaction.amount, 2000);
    assert.equal(savedTransaction.transactionType, "INTRA_BANK");
    assert.equal(savedTransaction.reference, "NIBSS-REF-001");
    assert.equal(savedTransaction.status, "SUCCESSFUL");
    assert.equal(savedTransaction.narration, "Lunch");
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, "Transfer successful");
  } finally {
    Module._load = originalLoad;
    delete require.cache[controllerPath];
  }
});

test("transfer returns 400 when amount is not greater than zero", async () => {
  const originalLoad = Module._load;
  const controllerPath = require.resolve("../src/controllers/account.controller.js");
  delete require.cache[controllerPath];

  try {
    Module._load = function mockedLoad(request, parent, isMain) {
      if (request === "../models/customer.model") {
        return {};
      }

      if (request === "../models/account.model") {
        return {};
      }

      if (request === "../models/transaction.model") {
        return function Transaction() {};
      }

      if (request === "../services/nibss.service") {
        return {
          createAccount: async () => ({}),
          getAccountBalance: async () => ({}),
          getNameEnquiry: async () => ({}),
          transferFunds: async () => {
            throw new Error("should not call NIBSS with an invalid amount");
          },
        };
      }

      return originalLoad.apply(this, arguments);
    };

    const { transferCustomerFunds } = require("../src/controllers/account.controller.js");
    const req = {
      body: {
        to: "7621111111",
        amount: 0,
      },
      customerId: "customer-id",
    };
    const res = {
      statusCode: undefined,
      body: undefined,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };

    await transferCustomerFunds(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
      message: "Amount must be greater than 0",
    });
  } finally {
    Module._load = originalLoad;
    delete require.cache[controllerPath];
  }
});

test("transfer returns 400 when amount is not numeric", async () => {
  const originalLoad = Module._load;
  const controllerPath = require.resolve("../src/controllers/account.controller.js");
  delete require.cache[controllerPath];

  try {
    Module._load = function mockedLoad(request, parent, isMain) {
      if (request === "../models/customer.model") {
        return {};
      }

      if (request === "../models/account.model") {
        return {};
      }

      if (request === "../models/transaction.model") {
        return function Transaction() {};
      }

      if (request === "../services/nibss.service") {
        return {
          createAccount: async () => ({}),
          getAccountBalance: async () => ({}),
          getNameEnquiry: async () => ({}),
          transferFunds: async () => {
            throw new Error("should not call NIBSS with a non-numeric amount");
          },
        };
      }

      return originalLoad.apply(this, arguments);
    };

    const { transferCustomerFunds } = require("../src/controllers/account.controller.js");
    const req = {
      body: {
        to: "7621111111",
        amount: "abc",
      },
      customerId: "customer-id",
    };
    const res = {
      statusCode: undefined,
      body: undefined,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };

    await transferCustomerFunds(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
      message: "Amount must be a valid number",
    });
  } finally {
    Module._load = originalLoad;
    delete require.cache[controllerPath];
  }
});

test("transfer does not save a transaction when NIBSS returns no reference", async () => {
  const originalLoad = Module._load;
  const controllerPath = require.resolve("../src/controllers/account.controller.js");
  delete require.cache[controllerPath];

  let saveCalled = false;

  function Transaction() {
    return {
      async save() {
        saveCalled = true;
      },
    };
  }

  try {
    Module._load = function mockedLoad(request, parent, isMain) {
      if (request === "../models/customer.model") {
        return {};
      }

      if (request === "../models/account.model") {
        return {
          findOne: async (query) => {
            if (query.customer === "customer-id") {
              return {
                accountNumber: "7628180202",
              };
            }

            return null;
          },
        };
      }

      if (request === "../models/transaction.model") {
        return Transaction;
      }

      if (request === "../services/nibss.service") {
        return {
          createAccount: async () => ({}),
          getAccountBalance: async () => ({}),
          getNameEnquiry: async () => ({}),
          transferFunds: async () => ({
            message: "Transfer successful",
            status: "SUCCESSFUL",
          }),
        };
      }

      return originalLoad.apply(this, arguments);
    };

    const { transferCustomerFunds } = require("../src/controllers/account.controller.js");
    const req = {
      body: {
        to: "9991111111",
        amount: 2000,
      },
      customerId: "customer-id",
    };
    const res = {
      statusCode: undefined,
      body: undefined,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };

    await transferCustomerFunds(req, res);

    assert.equal(saveCalled, false);
    assert.equal(res.statusCode, 502);
    assert.deepEqual(res.body, {
      message: "Transfer response did not include a transaction reference",
    });
  } finally {
    Module._load = originalLoad;
    delete require.cache[controllerPath];
  }
});
