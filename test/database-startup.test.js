const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

test("database config connects using MONGODB_URI from the environment", async () => {
  const mongoose = require("mongoose");
  const originalConnect = mongoose.connect;
  const originalMongoDbUri = process.env.MONGODB_URI;
  const originalMongoUri = process.env.MONGO_URI;
  const databaseConfigPath = require.resolve("../src/config/databaseConfig.js");

  delete require.cache[databaseConfigPath];
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/test-bank";
  delete process.env.MONGO_URI;

  let receivedUri;
  try {
    mongoose.connect = async (uri) => {
      receivedUri = uri;
      return { connection: { host: "127.0.0.1" } };
    };

    const connectDB = require("../src/config/databaseConfig.js");
    await connectDB();

    assert.equal(receivedUri, "mongodb://127.0.0.1:27017/test-bank");
  } finally {
    mongoose.connect = originalConnect;

    if (originalMongoDbUri === undefined) {
      delete process.env.MONGODB_URI;
    } else {
      process.env.MONGODB_URI = originalMongoDbUri;
    }

    if (originalMongoUri === undefined) {
      delete process.env.MONGO_URI;
    } else {
      process.env.MONGO_URI = originalMongoUri;
    }

    delete require.cache[databaseConfigPath];
  }
});

test("server connects to the database before it starts listening", async () => {
  const originalLoad = Module._load;
  const serverPath = require.resolve("../src/server.js");
  delete require.cache[serverPath];

  const events = [];

  try {
    Module._load = function mockedLoad(request, parent, isMain) {
      if (request === "./app") {
        return {
          listen(port, callback) {
            events.push(`listen:${port}`);
            if (callback) callback();
          },
        };
      }

      if (request === "./config/databaseConfig") {
        return async () => {
          events.push("connect");
        };
      }

      return originalLoad.apply(this, arguments);
    };

    require("../src/server.js");
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(events, ["connect", "listen:5000"]);
  } finally {
    Module._load = originalLoad;
    delete require.cache[serverPath];
  }
});
