/**
 * CLEAR all sessions — removes every Session plus its Payments and Reviews,
 * then resets every mentor's rating + completed-session count back to zero.
 *
 * Use this to wipe the demo / seeded sessions and start from a clean slate.
 *
 * Run (from /backend):  npm run clear:sessions
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/database";
import Mentor from "../models/Mentor.model";
import Session from "../models/Session.model";
import Payment from "../models/Payment.model";
import Review from "../models/Review.model";

dotenv.config();

async function run() {
  await connectDB();

  const sessions = await Session.countDocuments();
  const payments = await Payment.countDocuments();
  const reviews = await Review.countDocuments();

  await Payment.deleteMany({});
  await Review.deleteMany({});
  await Session.deleteMany({});

  const reset = await Mentor.updateMany({}, { $set: { rating: 0, sessionsCount: 0 } });

  console.log(`\n🧹 Cleared ${sessions} session(s), ${payments} payment(s), ${reviews} review(s).`);
  console.log(`   Reset rating + sessionsCount on ${reset.modifiedCount} mentor(s).`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Clear-sessions failed:", err);
  process.exit(1);
});
