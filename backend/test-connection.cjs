/**
 * Quick MongoDB connection test.
 * Run with: node --env-file=.env test-connection.cjs
 */
const mongoose = require("mongoose");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌  MONGODB_URI not found in environment.");
  process.exit(1);
}

console.log("⏳  Connecting to MongoDB Atlas …");

mongoose
  .connect(uri)
  .then(async () => {
    console.log("✅  Connected successfully!");
    console.log(`    Host : ${mongoose.connection.host}`);
    console.log(`    DB   : ${mongoose.connection.name}`);

    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    if (collections.length === 0) {
      console.log("    (No collections yet – will be created on first write)");
    } else {
      console.log("    Collections:", collections.map((c) => c.name).join(", "));
    }

    await mongoose.disconnect();
    console.log("🔌  Disconnected. Test passed.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌  Connection failed:", err.message);
    process.exit(1);
  });
