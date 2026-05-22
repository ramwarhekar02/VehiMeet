const { connectDatabase } = require("../lib/db");
const { seedDatabase } = require("./seedDatabase");

(async () => {
  await connectDatabase();
  await seedDatabase();
  process.exit(0);
})().catch((error) => {
  console.error("Failed to seed MongoDB", error);
  process.exit(1);
});
