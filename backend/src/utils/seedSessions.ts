/**
 * Seed completed sessions + reviews (realistic history).
 *
 * What it does:
 *   1. Deletes ALL existing sessions, payments and reviews.
 *   2. Creates each session below as a COMPLETED session (with a paid Payment and
 *      a mentor payout marked done) using real student/mentor accounts (by email).
 *   3. Adds the student's review (star rating + comment) to each session.
 *   4. Recomputes every mentor's rating + completed-session count, so it shows on
 *      their profile, dashboard and the mentor cards.
 *
 * Edit the SESSIONS array below to add/change entries, then run (from /backend):
 *   npm run seed:sessions
 *
 * Notes:
 *   - studentEmail / mentorEmail must be EXISTING accounts (unknown ones are skipped).
 *   - packageName must match a package in src/config/pricing.ts — the student price
 *     and mentor payout are taken from there automatically.
 *   - rating is 1–5; review is the student's comment.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/database";
import User from "../models/User.model";
import Mentor from "../models/Mentor.model";
import Session from "../models/Session.model";
import Payment from "../models/Payment.model";
import Review from "../models/Review.model";
import BadgeRequest from "../models/BadgeRequest.model";
import { packageByName } from "../config/pricing";
import { checkBadgeEligibility } from "../controllers/badge.controller";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

interface SeedSession {
  studentEmail: string;
  mentorEmail: string;
  packageName: string; // must match a pricing package name
  date: string; // actual session date "YYYY-MM-DD"
  time: string; // "HH:MM-HH:MM" (24h)
  topic: string;
  rating: number; // 1..5
  review: string; // student's comment
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT THIS LIST — each row becomes one completed, reviewed session.
// ─────────────────────────────────────────────────────────────────────────────
const SESSIONS: SeedSession[] = [
  { studentEmail: "areba.ali@gmail.com", mentorEmail: "amal.zafar@gmail.com", packageName: "CV/Resume Building", date: "2026-06-17", time: "16:00-17:00", topic: "CV Building", rating: 5, review: "Good teacher." },
  { studentEmail: "aleen.zainab@gmail.com", mentorEmail: "amal.zafar@gmail.com", packageName: "Basic Career Consultation", date: "2026-06-13", time: "20:00-21:00", topic: "Basic Consultancy", rating: 5, review: "Amal is an excellent mentor." },
  { studentEmail: "muhammad.ali@gmail.com", mentorEmail: "amal.zafar@gmail.com", packageName: "Basic Career Consultation", date: "2026-06-20", time: "18:00-19:00", topic: "Data Science", rating: 5, review: "Gave me an excellent overview of data science career paths." },
  { studentEmail: "haya.mirza@gmail.com", mentorEmail: "hira.jamil@gmail.com", packageName: "Basic Career Consultation", date: "2026-06-10", time: "15:00-16:00", topic: "Medical Careers", rating: 4, review: "Very informative session." },
  { studentEmail: "aleen.zainab@gmail.com", mentorEmail: "rabia.awan@gmail.com", packageName: "Basic Career Consultation", date: "2026-06-04", time: "10:00-11:00", topic: "Career Planning", rating: 5, review: "Rabia gave me a realistic study schedule and great resources. Feeling much more confident." },
  { studentEmail: "muhammad.ali@gmail.com", mentorEmail: "syed.muhammad@gmail.com", packageName: "Entrepreneurial Coaching Package", date: "2026-06-03", time: "17:00-18:00", topic: "Finance Industry Insights", rating: 4, review: "Solid, honest advice about the finance industry. Very helpful." },
  { studentEmail: "haya.amir@gmail.com", mentorEmail: "afnan.sukhera@gmail.com", packageName: "Entrepreneurial Coaching Package", date: "2026-06-05", time: "14:00-15:00", topic: "Entrepreneurial Strategies", rating: 5, review: "Excellent guidance on entrepreneurial strategies." },
  { studentEmail: "haya.mirza@gmail.com", mentorEmail: "abbas@gmail.com", packageName: "Academic Mentorship", date: "2026-06-07", time: "15:00-16:00", topic: "Academic Planning", rating: 4, review: "Good session." },
  { studentEmail: "zainab.mansoor@gmail.com", mentorEmail: "afroze.zehra@gmail.com", packageName: "Academic Mentorship", date: "2026-06-18", time: "11:00-12:00", topic: "University application essays", rating: 5, review: "My personal statement is so much stronger now. Afroze is a fantastic mentor." },
  { studentEmail: "zainab.mansoor@gmail.com", mentorEmail: "hira.jamil@gmail.com", packageName: "Academic Mentorship", date: "2026-05-18", time: "11:00-12:00", topic: "Medical ", rating: 5, review: "Good Session" },
  { studentEmail: "abdul.rehman@gmail.com", mentorEmail: "amal.zafar@gmail.com", packageName: "Academic Mentorship", date: "2026-05-12", time: "1:00-2:00", topic: "Computer Science", rating: 5, review: "Good quality mentorship." },
  { studentEmail: "anushay.babar@gmail.com", mentorEmail: "afnan.sukhera@gmail.com", packageName: "Entrepreneurial Coaching Package", date: "2026-05-06", time: "3:00-4:00", topic: "Healthcare industry", rating: 5, review: "Good" },
  { studentEmail: "haleema.ahmad@gmail.com", mentorEmail: "zeeshan.farooq@gmail.com", packageName: "Entrepreneurial Coaching Package", date: "2026-05-17", time: "11:30-12:30", topic: "Career Planning", rating: 5, review: "Good." },
  { studentEmail: "fahad.khan@gmail.com", mentorEmail: "faiza.iqbal@gmail.com", packageName: "Basic Career Consultation", date: "2026-05-01", time: "7:30-8:30", topic: "Career Planning", rating: 5, review: "Good Advice." },
  { studentEmail: "haya.mirza@gmail.com", mentorEmail: "rabia.awan@gmail.com", packageName: "Basic Career Consultation", date: "2026-05-26", time: "2:00-3:00", topic: "Consultation", rating: 5, review: "Good." },
  { studentEmail: "fahad.khan@gmail.com", mentorEmail: "sara.shamim@gmail.com", packageName: "Basic Career Consultation", date: "2026-05-14", time: "10:00-11:00", topic: "Medical ", rating: 5, review: "Good Session" },
  { studentEmail: "abdul.rehman@gmail.com", mentorEmail: "syed.muhammad@gmail.com", packageName: "Basic Career Consultation", date: "2026-06-12", time: "1:00-2:00", topic: "Computer Science", rating: 5, review: "Good quality mentorship." },
  { studentEmail: "haleema.ahmad@gmail.com", mentorEmail: "zeeshan.farooq@gmail.com", packageName: "Entrepreneurial Coaching Package", date: "2026-05-09", time: "5:00-6:00", topic: "Healthcare industry", rating: 5, review: "Good" },
  { studentEmail: "haleema.ahmad@gmail.com", mentorEmail: "rabia.awan@gmail.com", packageName: "Entrepreneurial Coaching Package", date: "2026-05-17", time: "11:30-12:30", topic: "Career Planning", rating: 5, review: "Good." },
{ studentEmail: "ahsan.raza@gmail.com", mentorEmail: "afroze.zehra@gmail.com", packageName: "Entrepreneurial Coaching Package", date: "2026-05-17", time: "11:30-12:30", topic: "Career Planning", rating: 5, review: "Good." },
{ studentEmail: "aleen.zainab@gmail.com", mentorEmail: "amal.zafar@gmail.com", packageName: " Basic Career Consultation", date: "2026-06-13", time: "5:00-6:00", topic: "Healthcare industry", rating: 5, review: "Good" },
{ studentEmail: "aleen.zainab@gmail.com", mentorEmail: "rabia.awan@gmail.com", packageName: " Basic Career Consultation", date: "2026-06-04", time: "5:00-6:00", topic: "Healthcare industry", rating: 5, review: "Good" },

{ studentEmail: "amna.ahmad@gmail.com", mentorEmail: "zeeshan.farooq@gmail.com", packageName: "Entrepreneurial Coaching Package", date: "2026-05-09", time: "5:00-6:00", topic: "Healthcare industry", rating: 5, review: "Good" },

{ studentEmail: "anushay.babar@gmail.com", mentorEmail: "afnan.sukhera@gmail.com", packageName: " Entrepreneurial Coaching Package", date: "2026-05-06", time: "1:00-2:00", topic: "Computer Science", rating: 5, review: "Good quality mentorship." },
{ studentEmail: "areba.ali@gmail.com", mentorEmail: "amal.zafar@gmail.com", packageName: " CV/Resume Building", date: "2026-06-17", time: "1:00-2:00", topic: "Computer Science", rating: 5, review: "Good quality mentorship." },
{ studentEmail: "bilal.hassan@gmail.com", mentorEmail: "syed.muhammad@gmail.com", packageName: "Basic Career Consultation", date: "2026-06-12", time: "1:00-2:00", topic: "Computer Science", rating: 5, review: "Good quality mentorship." },
{ studentEmail: "haleema.ahmad@gmail.com", mentorEmail: "zeeshan.farooq@gmail.com", packageName: " Entrepreneurial Coaching Package", date: "2026-05-17", time: "1:00-2:00", topic: "Medical ", rating: 5, review: "Good Session" },
{ studentEmail: "haleema.ahmad@gmail.com", mentorEmail: "rabia.awan@gmail.com", packageName: " Entrepreneurial Coaching Package", date: "2026-05-17", time: "10:00-11:00", topic: "Medical ", rating: 5, review: "Good Session" },
{ studentEmail: "haleema.ahmad@gmail.com", mentorEmail: "zeeshan.farooq@gmail.com", packageName: "Entrepreneurial Coaching Package", date: "2026-05-09", time: "10:00-11:00", topic: "Medical ", rating: 5, review: "Good Session" },

{ studentEmail: "haya.amir@gmail.com", mentorEmail: "afnan.sukhera@gmail.com", packageName: "Entrepreneurial Coaching Package", date: "2026-06-05", time: "10:00-11:00", topic: "Medical ", rating: 5, review: "Good Session" },
{ studentEmail: "haya.mirza@gmail.com", mentorEmail: "abbas@gmail.com", packageName: "Academic Mentorship", date: "2026-06-07", time: "10:00-11:00", topic: "Medical ", rating: 5, review: "Good Session" },
{ studentEmail: "haya.mirza@gmail.com", mentorEmail: "hira.jamil@gmail.com", packageName: "Academic Mentorship", date: "2026-06-10", time: "10:00-11:00", topic: "Medical ", rating: 5, review: "Good Session" },
{ studentEmail: "haya.mirza@gmail.com", mentorEmail: "rabia.awan@gmail.com", packageName: "Basic Career Consultation", date: "2026-05-26", time: "10:00-11:00", topic: "Medical ", rating: 5, review: "Good Session" },

{ studentEmail: "hira.saleem@gmail.com", mentorEmail: "afroze.zehra@gmail.com", packageName: "Entrepreneurial Coaching Package", date: "2026-05-17", time: "1:30-2:30", topic: "Career Planning", rating: 5, review: "Good." },
{ studentEmail: "kashan.javed@gmail.com", mentorEmail: "afroze.zehra@gmail.com", packageName: "Entrepreneurial Coaching Package", date: "2026-05-17", time: "11:30-12:30", topic: "Career Planning", rating: 5, review: "Good." },
{ studentEmail: "maham.tariq@gmail.com", mentorEmail: "afroze.zehra@gmail.com", packageName: "Entrepreneurial Coaching Package", date: "2026-05-17", time: "3:00-4:00", topic: "Career Planning", rating: 5, review: "Good." },
{ studentEmail: "malaika.ahmad@gmail.com", mentorEmail: "syed.muhammad@gmail.com", packageName: "Basic Career Consultation", date: "2026-06-12", time: "1:00-2:00", topic: "Computer Science", rating: 5, review: "Good quality mentorship."},
{ studentEmail: "muhammad.ali@gmail.com", mentorEmail: "amal.zafar@gmail.com", packageName: "Basic Career Consultation", date: "2026-06-20", time: "1:00-2:00", topic: "Computer Science", rating: 5, review: "Good quality mentorship." },
{ studentEmail: "muhammad.ali@gmail.com", mentorEmail: "syed.muhammad@gmail.com", packageName: "Entrepreneurial Coaching Package", date: "2026-06-03", time: "1:00-2:00", topic: "Computer Science", rating: 5, review: "Good quality mentorship." },

{ studentEmail: "saad.iqbal@gmail.com", mentorEmail: "zeeshan.farooq@gmail.com", packageName: "Entrepreneurial Coaching Package", date: "2026-05-09", time: "5:00-6:00", topic: "Healthcare industry", rating: 5, review: "Good" },
{ studentEmail: "usman.shahid@gmail.com", mentorEmail: "zeeshan.farooq@gmail.com", packageName: "Entrepreneurial Coaching Package", date: "2026-05-09", time: "2:00-3:00", topic: "Healthcare industry", rating: 5, review: "Good" },
{ studentEmail: "zainab.mansoor@gmail.com", mentorEmail: "hira.jamil@gmail.com", packageName: "Academic Mentorship", date: "2026-05-18", time: "5:00-6:00", topic: "Healthcare industry", rating: 5, review: "Good" },
{ studentEmail: "zainab.mansoor@gmail.com", mentorEmail: "afroze.zehra@gmail.com", packageName: "Academic Mentorship", date: "2026-06-18", time: "5:00-6:00", topic: "Healthcare industry", rating: 5, review: "Good" },

{ studentEmail: "zoya.khan@gmail.com", mentorEmail: "zeeshan.farooq@gmail.com", packageName: "Entrepreneurial Coaching Package", date: "2026-05-09", time: "12:30-1:30", topic: "Healthcare industry", rating: 5, review: "Good" },

];
// ─────────────────────────────────────────────────────────────────────────────

const isValidDate = (d: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));

async function run() {
  await connectDB();

  // 1) Wipe existing sessions / payments / reviews
  const [s, p, r] = await Promise.all([Session.deleteMany({}), Payment.deleteMany({}), Review.deleteMany({})]);
  console.log(`Cleared ${s.deletedCount} sessions, ${p.deletedCount} payments, ${r.deletedCount} reviews.`);

  // 2) Reset all mentor stats (recomputed below from the new data). Also clear the
  //    auto-generated (eligibility) badge requests + reset the badge, since those are
  //    derived from completed-session counts which we are re-seeding.
  await Mentor.updateMany({}, { rating: 0, sessionsCount: 0, badge: "none" });
  const br = await BadgeRequest.deleteMany({ source: "eligibility" });
  console.log(`Reset mentor stats + badges; cleared ${br.deletedCount} eligibility badge request(s).`);

  const affectedMentors = new Set<string>();
  let created = 0;

  for (const row of SESSIONS) {
    const student = await User.findOne({ email: row.studentEmail.toLowerCase(), role: "student" });
    const mentor = await User.findOne({ email: row.mentorEmail.toLowerCase(), role: "mentor" });
    if (!student) { console.warn(`  ⚠ skip — student not found: ${row.studentEmail}`); continue; }
    if (!mentor) { console.warn(`  ⚠ skip — mentor not found: ${row.mentorEmail}`); continue; }
    const pkg = packageByName(row.packageName.trim());
    if (!pkg) { console.warn(`  ⚠ skip — unknown package: "${row.packageName}"`); continue; }
    if (row.rating < 1 || row.rating > 5) { console.warn(`  ⚠ skip — bad rating for ${row.studentEmail}`); continue; }
    if (!isValidDate(row.date)) { console.warn(`  ⚠ skip — bad date (use YYYY-MM-DD): ${row.date}`); continue; }

    const date = row.date;
    // Parse the start time robustly (handles "9:00" and "09:00", with/without leading zero).
    const startMatch = (row.time.split("-")[0] || "").trim().match(/(\d{1,2}):(\d{2})/);
    const startHHMM = startMatch ? `${startMatch[1].padStart(2, "0")}:${startMatch[2]}` : "09:00";
    const when = new Date(`${date}T${startHHMM}:00+05:00`);
    const roomId = `room-${uuidv4()}`;

    const session = await Session.create({
      studentId: student._id,
      mentorId: mentor._id,
      studentName: student.name,
      mentorName: mentor.name,
      date,
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

    // Backdate createdAt on both the session and the payment so the history is
    // ordered realistically (the admin Payments table shows payment.createdAt, and
    // the Payouts table shows mentorPayoutAt — both must match the session date).
    // Use the native driver: Mongoose makes createdAt immutable under timestamps:true,
    // so a model-level $set on createdAt is silently ignored.
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
    console.log(`  ✓ ${student.name} ↔ ${mentor.name} — ${pkg.name}  (${date}, ${row.time})  ★${row.rating}`);
  }

  // 3) Recompute each mentor's completed count + average rating, then run the same
  //    badge-eligibility check the live "session completed" flow runs (a mentor that
  //    has crossed 30/50 completed sessions gets a pending badge request for admin).
  for (const mentorId of affectedMentors) {
    const completed = await Session.countDocuments({ mentorId, status: "COMPLETED" });
    const reviews = await Review.find({ mentorId }).select("rating");
    const avg = reviews.length ? reviews.reduce((a, rv) => a + rv.rating, 0) / reviews.length : 0;
    await Mentor.findOneAndUpdate({ userId: mentorId }, { sessionsCount: completed, rating: Math.round(avg * 10) / 10 });
    await checkBadgeEligibility(mentorId);
  }

  console.log(`\n✅ Done. Created ${created} completed sessions with reviews across ${affectedMentors.size} mentors.`);
  console.log("Mentor ratings + session counts have been recomputed.");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
