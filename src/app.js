const express = require("express");
const customerRoutes = require("./routes/auth.routes");
const onboardingRoutes = require("./routes/onboarding.routes");
const accountRoutes = require("./routes/account.routes");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Digital Banking API is running",
  });
});

app.use("/api/auth", customerRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/account", accountRoutes);

module.exports = app;
