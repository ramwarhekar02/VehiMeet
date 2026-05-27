const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

module.exports = {
  port: Number(process.env.PORT || 5000),
  jwtSecret: process.env.JWT_SECRET || "vehimeet-dev-secret",
  adminBootstrapSecret: process.env.ADMIN_BOOTSTRAP_SECRET || "",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || "",
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/vehimeet",
  osrmBaseUrl: process.env.OSRM_BASE_URL || "https://router.project-osrm.org",
};
