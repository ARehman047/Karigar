/**
 * ADD sessions (append-only) — does NOT delete anything.
 *
 * For each row below it creates a COMPLETED session + a paid Payment (with the
 * mentor payout marked done) + the student's review, then recomputes the affected
 * mentors' rating + completed-session count. Existing sessions are left untouched.
 *
 * Safe to re-run: a row is skipped if that student already has a session with the
 * same mentor on the same date + time (so you won't get duplicates).
 *
 * Run (from /backend):  npm run add:sessions
 *
 * Notes:
 *   - studentEmail / mentorEmail must be EXISTING accounts (unknown ones are skipped).
 *   - packageName must match a package in src/config/pricing.ts — the student price
 *     and mentor payout are taken from there automatically.
 *   - date is "YYYY-MM-DD", time is "HH:MM-HH:MM", rating is 1–5.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/database";
import User from "../models/User.model";
import Mentor from "../models/Mentor.model";
import Session from "../models/Session.model";
import Payment from "../models/Payment.model";
import Review from "../models/Review.model";
import { packageByName } from "../config/pricing";
import { checkBadgeEligibility } from "../controllers/badge.controller";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

interface AddSession {
  studentEmail: string;
  mentorEmail: string;
  packageName: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM-HH:MM"
  topic: string;
  rating: number; // 1..5
  review: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT THIS LIST — these rows are ADDED on top of whatever already exists.
// ─────────────────────────────────────────────────────────────────────────────
const ADD_SESSIONS: AddSession[] = [
  { studentEmail: "muhammad.ali@gmail.com", mentorEmail: "syeda.kainat@gmail.com", packageName: "Academic Mentorship", date: "2026-05-22", time: "16:00-17:00", topic: "Data Science roadmap", rating: 5, review: "Syeda mapped out a clear learning path for me. Really motivating." },
  { studentEmail: "haya.mirza@gmail.com", mentorEmail: "abbas@gmail.com", packageName: "Basic Career Consultation", date: "2026-05-28", time: "15:00-16:00", topic: "Dentistry as a career", rating: 4, review: "Honest and detailed advice about dentistry. Thank you Dr Abbas." },
  { studentEmail: "abdul.rehman@gmail.com", mentorEmail: "zeeshan.farooq@gmail.com", packageName: "Entrepreneurial Coaching Package", date: "2026-06-02", time: "18:00-19:00", topic: "Starting a side business", rating: 5, review: "Packed with practical tips for launching my side business." },
  { studentEmail: "aleen.zainab@gmail.com", mentorEmail: "faiza.iqbal@gmail.com", packageName: "CV/Resume Building", date: "2026-06-09", time: "11:00-12:00", topic: "Teaching CV review", rating: 5, review: "My CV is far more polished now. Excellent feedback." },
];
// ─────────────────────────────────────────────────────────────────────────────

const isValidDate = (d: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));

async function run() {
  await connectDB();

  const affectedMentors = new Set<string>();
  let created = 0;
  let skipped = 0;

  for (const row of ADD_SESSIONS) {
    const student = await User.findOne({ email: row.studentEmail.toLowerCase(), role: "student" });
    const mentor = await User.findOne({ email: row.mentorEmail.toLowerCase(), role: "mentor" });
    if (!student) { console.warn(`  ⚠ skip — student not found: ${row.studentEmail}`); skipped++; continue; }
    if (!mentor) { console.warn(`  ⚠ skip — mentor not found: ${row.mentorEmail}`); skipped++; continue; }
    const pkg = packageByName(row.packageName);
    if (!pkg) { console.warn(`  ⚠ skip — unknown package: ${row.packageName}`); skipped++; continue; }
    if (row.rating < 1 || row.rating > 5) { console.warn(`  ⚠ skip — bad rating for ${row.studentEmail}`); skipped++; continue; }
    if (!isValidDate(row.date)) { console.warn(`  ⚠ skip — bad date (YYYY-MM-DD): ${row.date}`); skipped++; continue; }

    // De-dupe: same student + mentor + date + time already exists → skip.
    const dupe = await Session.findOne({ studentId: student._id, mentorId: mentor._id, date: row.date, time: row.time });
    if (dupe) { console.warn(`  ↩ skip — already exists: ${student.name} ↔ ${mentor.name} on ${row.date} ${row.time}`); skipped++; continue; }

    const startMatch = (row.time.split("-")[0] || "").trim().match(/(\d{1,2}):(\d{2})/);
    const startHHMM = startMatch ? `${startMatch[1].padStart(2, "0")}:${startMatch[2]}` : "09:00";
    const when = new Date(`${row.date}T${startHHMM}:00+05:00`);
    const roomId = `room-${uuidv4()}`;

    const session = await Session.create({
      studentId: student._id,
      mentorId: mentor._id,
      studentName: student.name,
      mentorName: mentor.name,
      date: row.date,
      time: row.time,
      duration: 60,
      status: "COMPLETED",
      reviewed: true,
      topic: row.topic,
      type: "video",
      packageName: pkg.name,
      mentorPayout: pkg.mentorPayout,
      amount: pkg.studentPrice,
      roomId,
      meetingLink: `https://meet.jit.si/karigar-${roomId}`,
    });

    const payment = await Payment.create({
      sessionId: session._id,
      studentId: student._id,
      mentorId: mentor._id,
      amount: pkg.studentPrice,
      status: "SUCCESS",
      transactionId: `TXN-${uuidv4().split("-")[0].toUpperCase()}`,
      studentPaidAt: when,
      paidAt: when,
      mentorPayoutAt: when,
    });
    session.paymentId = payment._id;
    await session.save();
    // Backdate createdAt on both the session and the payment (the admin Payments
    // table shows payment.createdAt). Use the native driver: Mongoose makes createdAt
    // immutable under timestamps:true, so a model-level $set is silently ignored.
    await Session.collection.updateOne({ _id: session._id }, { $set: { createdAt: when, updatedAt: when } });
    await Payment.collection.updateOne({ _id: payment._id }, { $set: { createdAt: when, updatedAt: when } });

    await Review.create({
      sessionId: session._id,
      studentId: student._id,
      mentorId: mentor._id,
      rating: row.rating,
      comment: row.review,
    });

    affectedMentors.add(mentor._id.toString());
    created++;
    console.log(`  ✓ ${student.name} ↔ ${mentor.name} — ${pkg.name}  (${row.date}, ${row.time})  ★${row.rating}`);
  }

  // Recompute affected mentors' completed count + average rating (from ALL their data).
  for (const mentorId of affectedMentors) {
    const completed = await Session.countDocuments({ mentorId, status: "COMPLETED" });
    const reviews = await Review.find({ mentorId }).select("rating");
    const avg = reviews.length ? reviews.reduce((a, rv) => a + rv.rating, 0) / reviews.length : 0;
    await Mentor.findOneAndUpdate({ userId: mentorId }, { sessionsCount: completed, rating: Math.round(avg * 10) / 10 });
    await checkBadgeEligibility(mentorId);
  }

  console.log(`\n✅ Added ${created} session(s), skipped ${skipped}. Recomputed ${affectedMentors.size} mentor(s).`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Add-sessions failed:", err);
  process.exit(1);
});
