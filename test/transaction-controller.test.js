const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

test("transaction status checks ownership before calling NIBSS and updates local status", async () => {
  const originalLoad = Module._load;
  const controllerPath = require.resolve("../src/controllers/transaction.controller.js");

  delete require.cache[controllerPath];

  let transactionQuery;
  let requestedReference;
  let savedStatus;

  try {
    Module._load = function mockedLoad(request, parent, isMain) {
      if (request === "../models/transaction.model") {
        return {
          findOne: async (query) => {
            transactionQuery = query;
            return {
              reference: "NIBSS-REF-001",
              customer: "customer-id",
              status: "PENDING",
              async save() {
                savedStatus = this.status;
              },
            };
          },
        };
      }

      if (request === "../services/nibss.service") {
        return {
          getTransactionStatus: async (reference) => {
            requestedReference = reference;
            return {
              message: "Transaction retrieved successfully",
              reference,
              status: "SUCCESSFUL",
            };
          },
        };
      }

      return originalLoad.apply(this, arguments);
    };

    const { getTransactionStatus } = require("../src/controllers/transaction.controller.js");
    const req = {
      params: { reference: "NIBSS-REF-001" },
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

    await getTransactionStatus(req, res);

    assert.deepEqual(transactionQuery, {
      reference: "NIBSS-REF-001",
      customer: "customer-id",
    });
    assert.equal(requestedReference, "NIBSS-REF-001");
    assert.equal(savedStatus, "SUCCESSFUL");
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      message: "Transaction retrieved successfully",
      reference: "NIBSS-REF-001",
      status: "SUCCESSFUL",
    });
  } finally {
    Module._load = originalLoad;
    delete require.cache[controllerPath];
  }
});

test("transaction status returns 404 when reference does not belong to customer", async () => {
  const originalLoad = Module._load;
  const controllerPath = require.resolve("../src/controllers/transaction.controller.js");

  delete require.cache[controllerPath];

  try {
    Module._load = function mockedLoad(request, parent, isMain) {
      if (request === "../models/transaction.model") {
        return {
          findOne: async (query) => {
            assert.deepEqual(query, {
              reference: "OTHER-REF",
              customer: "customer-id",
            });
            return null;
          },
        };
      }

      if (request === "../services/nibss.service") {
        return {
          getTransactionStatus: async () => {
            throw new Error("should not call NIBSS for another customer's transaction");
          },
        };
      }

      return originalLoad.apply(this, arguments);
    };

    const { getTransactionStatus } = require("../src/controllers/transaction.controller.js");
    const req = {
      params: { reference: "OTHER-REF" },
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

    await getTransactionStatus(req, res);

    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, {
      message: "Transaction not found",
    });
  } finally {
    Module._load = originalLoad;
    delete require.cache[controllerPath];
  }
});

test("transaction history returns only the authenticated customer's transactions newest first", async () => {
  const originalLoad = Module._load;
  const controllerPath = require.resolve("../src/controllers/transaction.controller.js");

  delete require.cache[controllerPath];

  let transactionQuery;
  let sortQuery;

  const transactions = [
    {
      reference: "REF-002",
      senderAccountNumber: "7628180202",
      recipientAccountNumber: "7621111111",
      recipientBankCode: "762",
      amount: 5000,
      transactionType: "INTRA_BANK",
      status: "SUCCESSFUL",
      narration: "Rent",
      createdAt: new Date("2026-09-12T10:00:00.000Z"),
      customer: "customer-id",
      secret: "do-not-expose",
    },
    {
      reference: "REF-001",
      senderAccountNumber: "7628180202",
      recipientAccountNumber: "9991111111",
      amount: 2000,
      transactionType: "INTER_BANK",
      status: "PENDING",
      narration: undefined,
      createdAt: new Date("2026-09-11T10:00:00.000Z"),
      customer: "customer-id",
      secret: "do-not-expose",
    },
  ];

  try {
    Module._load = function mockedLoad(request, parent, isMain) {
      if (request === "../models/transaction.model") {
        return {
          findOne: async () => null,
          find: (query) => {
            transactionQuery = query;
            return {
              sort(sort) {
                sortQuery = sort;
                return Promise.resolve(transactions);
              },
            };
          },
        };
      }

      if (request === "../services/nibss.service") {
        return {
          getTransactionStatus: async () => ({}),
        };
      }

      return originalLoad.apply(this, arguments);
    };

    const { getTransactionHistory } = require("../src/controllers/transaction.controller.js");
    const req = {
      customerId: "customer-id",
      query: { customerId: "another-customer" },
      body: { customerId: "another-customer" },
      params: { customerId: "another-customer" },
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

    await getTransactionHistory(req, res);

    assert.deepEqual(transactionQuery, { customer: "customer-id" });
    assert.deepEqual(sortQuery, { createdAt: -1 });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      transactions: [
        {
          reference: "REF-002",
          senderAccountNumber: "7628180202",
          recipientAccountNumber: "7621111111",
          recipientBankCode: "762",
          amount: 5000,
          transactionType: "INTRA_BANK",
          status: "SUCCESSFUL",
          narration: "Rent",
          createdAt: new Date("2026-09-12T10:00:00.000Z"),
        },
        {
          reference: "REF-001",
          senderAccountNumber: "7628180202",
          recipientAccountNumber: "9991111111",
          recipientBankCode: undefined,
          amount: 2000,
          transactionType: "INTER_BANK",
          status: "PENDING",
          narration: undefined,
          createdAt: new Date("2026-09-11T10:00:00.000Z"),
        },
      ],
    });
  } finally {
    Module._load = originalLoad;
    delete require.cache[controllerPath];
  }
});

test("transaction history returns an empty array when customer has no transactions", async () => {
  const originalLoad = Module._load;
  const controllerPath = require.resolve("../src/controllers/transaction.controller.js");

  delete require.cache[controllerPath];

  try {
    Module._load = function mockedLoad(request, parent, isMain) {
      if (request === "../models/transaction.model") {
        return {
          findOne: async () => null,
          find: () => ({
            sort: () => Promise.resolve([]),
          }),
        };
      }

      if (request === "../services/nibss.service") {
        return {
          getTransactionStatus: async () => ({}),
        };
      }

      return originalLoad.apply(this, arguments);
    };

    const { getTransactionHistory } = require("../src/controllers/transaction.controller.js");
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

    await getTransactionHistory(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      transactions: [],
    });
  } finally {
    Module._load = originalLoad;
    delete require.cache[controllerPath];
  }
});
