const express = require("express");
require("dotenv").config();
const cors = require("cors");

const app = express();

// Trust proxy for express-rate-limit (essential in production behind LB/proxy)
app.set("trust proxy", 1);

const { connectDB } = require("./helpers/dbCon");
const { startExpirySweep } = require("./utils/expireAttempts");

// const compRoutes = require("./routes/compilerRoutes");
const contestRoutes = require("./routes/contestRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");

const port = process.env.PORT || 8080;

app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Pomelo API online"
  });
});

// Routes

app.use("/api/auth", authRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/test", contestRoutes);

(async () => {
  await connectDB();
  startExpirySweep();
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
})();

// Global error handler — must be last
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Server Error' : err.message,
  });
});
