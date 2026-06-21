import app from "./app";
import { connectDB } from "./config/database";
import { startReminderJobs } from "./jobs/reminder.job";

const PORT = process.env.PORT || 5000;

// Local / long-running server (not used on Vercel serverless).
const startServer = async () => {
  // Open the port FIRST so the API is reachable even if the DB is briefly
  // unreachable (e.g. a slow Atlas DNS lookup). Each request re-attempts the
  // DB connection via the connectDB middleware, so it self-heals once the DB
  // is available — the frontend never sees a dead port / "network error".
  app.listen(PORT, () => {
    console.log(`\n🚀 Karigar API running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  });
  startReminderJobs();
  connectDB().catch((err) => {
    console.error("⚠️  Initial MongoDB connection failed — will retry on incoming requests.");
    console.error("   Reason:", (err as Error).message);
  });
};

startServer();

export default app;
