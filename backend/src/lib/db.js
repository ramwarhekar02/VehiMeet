const mongoose = require("mongoose");
const { mongoUri } = require("../config/env");

const connectDatabase = async () => {
  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
};

module.exports = { connectDatabase };
