const http = require("http");
const { app } = require("./app");
const { port } = require("./config/env");
const { connectDatabase } = require("./lib/db");
const { initializeSocketServer } = require("./lib/socket");
const { seedDatabase } = require("./data/seedDatabase");

const startServer = async () => {
  await connectDatabase();
  await seedDatabase();

  const server = http.createServer(app);
  initializeSocketServer(server);

  server.listen(port, () => {
    console.log(`VehiMeet backend running on http://localhost:${port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start VehiMeet backend", error);
  process.exit(1);
});
