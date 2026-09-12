const assert = require("node:assert/strict");
const test = require("node:test");

test("transaction model defines transfer history fields", () => {
  const Transaction = require("../src/models/transaction.model.js");
  const schema = Transaction.schema;

  assert.equal(schema.path("customer").options.ref, "Customer");
  assert.equal(schema.path("customer").options.required, true);

  assert.equal(schema.path("senderAccountNumber").options.required, true);
  assert.equal(schema.path("recipientAccountNumber").options.required, true);
  assert.equal(schema.path("recipientBankCode").options.required, undefined);
  assert.equal(schema.path("amount").options.required, true);

  assert.deepEqual(schema.path("transactionType").options.enum, [
    "INTRA_BANK",
    "INTER_BANK",
  ]);
  assert.equal(schema.path("transactionType").options.required, true);

  assert.equal(schema.path("reference").options.required, true);
  assert.equal(schema.path("reference").options.unique, true);

  assert.equal(schema.path("status").options.default, "PENDING");
  assert.ok(schema.path("narration"));
  assert.ok(schema.path("createdAt"));
  assert.ok(schema.path("updatedAt"));
});
