require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/databaseConfig");

const PORT = 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
