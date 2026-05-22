const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const routes = require("./routes");
const { clientOrigin } = require("./config/env");
const { notFoundHandler, errorHandler } = require("./middlewares/error.middleware");

const app = express();

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

// Root route handler
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Welcome to VehiMeet backend API",
  });
});

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "VehiMeet backend is healthy",
    data: {
      mongoState: mongoose.connection.readyState,
    },
  });
});

app.use("/api", routes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
