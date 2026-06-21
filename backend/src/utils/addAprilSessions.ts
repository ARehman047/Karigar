/**
 * ADD April-2026 sessions with CUSTOM per-row rates (append-only).
 *
 * April used different pricing than the current config, so each row carries its
 * own studentPrice + mentorPayout (these flow into the Payment amount + the
 * session's mentorPayout, so Payments and Payouts show the correct April rates).
 *
 * Any referenced student that doesn't exist yet is created automatically (active,
 * password Student@12345). Mentors must already exist.
 *
 * Safe to re-run: a row is skipped if that student already has a session with the
 * same mentor on the same date + time.
 *
 * Run (from /backend):  npm run add:april
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/database";
import User from "../models/User.model";
import Student from "../models/Student.model";
import Mentor from "../models/Mentor.model";
import Session from "../models/Session.model";
import Payment from "../models/Payment.model";
import Review from "../models/Review.model";
import { checkBadgeEligibility } from "../controllers/badge.controller";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const STUDENT_PASSWORD = process.env.SEED_STUDENT_PASSWORD || "Student@12345";

interface CustomSession {
  studentEmail: string;
  mentorEmail: string;
  packageName: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM-HH:MM"
  topic: string;
  rating: number;
  review: string;
  studentPrice: number; // what the student paid (April rate)
  mentorPayout: number; // what the mentor was paid (April rate)
}

// ─────────────────────────────────────────────────────────────────────────────
const SESSIONS: CustomSession[] = [
  { studentEmail: "muhammad.ali@gmail.com", mentorEmail: "amal.zafar@gmail.com",   packageName: "Basic Career Consultation",       date: "2026-04-20", time: "18:00-19:00", topic: "Data Science",              rating: 5, review: "Gave me an excellent overview of data science career paths.", studentPrice: 4000,  mentorPayout: 2500 },
  { studentEmail: "usman.haider@gmail.com",  mentorEmail: "amal.zafar@gmail.com",   packageName: "CV/Resume Building",              date: "2026-04-17", time: "13:00-14:00", topic: "Computer Science",          rating: 5, review: "Good quality mentorship.", studentPrice: 5000,  mentorPayout: 3500 },
  { studentEmail: "aleen.zainab@gmail.com",  mentorEmail: "amal.zafar@gmail.com",   packageName: "Basic Career Consultation",       date: "2026-04-13", time: "20:00-21:00", topic: "Basic Consultancy",         rating: 5, review: "Amal is an excellent mentor.", studentPrice: 4000,  mentorPayout: 2500 },
  { studentEmail: "bilal.hussain@gmail.com", mentorEmail: "syed.muhammad@gmail.com", packageName: "Basic Career Consultation",      date: "2026-04-12", time: "1:00-2:00",   topic: "Computer Science",          rating: 5, review: "Good quality mentorship.", studentPrice: 4000,  mentorPayout: 2500 },
  { studentEmail: "hina.khan@gmail.com",     mentorEmail: "hira.jamil@gmail.com",   packageName: "Basic Career Consultation",       date: "2026-04-10", time: "15:00-16:00", topic: "Medical Careers",           rating: 4, review: "Very informative session.", studentPrice: 4000,  mentorPayout: 2500 },
  { studentEmail: "aleen.zainab@gmail.com",  mentorEmail: "rabia.awan@gmail.com",   packageName: "Basic Career Consultation",       date: "2026-04-04", time: "10:00-11:00", topic: "Career Planning",           rating: 5, review: "Rabia gave me a realistic study schedule and great resources. Feeling much more confident.", studentPrice: 4000, mentorPayout: 2500 },
  { studentEmail: "muhammad.ali@gmail.com",  mentorEmail: "syed.muhammad@gmail.com", packageName: "Entrepreneurial Coaching Package", date: "2026-04-03", time: "17:00-18:00", topic: "Finance Industry Insights", rating: 4, review: "Solid, honest advice about the finance industry. Very helpful.", studentPrice: 10000, mentorPayout: 7500 },
  { studentEmail: "bilal.hussain@gmail.com", mentorEmail: "amal.zafar@gmail.com",   packageName: "Academic Mentorship",             date: "2026-04-22", time: "1:00-2:00",   topic: "Computer Science",          rating: 5, review: "Good quality mentorship.", studentPrice: 10000, mentorPayout: 7500 },
  { studentEmail: "sana.akhtar@gmail.com",   mentorEmail: "zeeshan.farooq@gmail.com", packageName: "Entrepreneurial Coaching Package", date: "2026-04-19", time: "5:00-6:00",  topic: "Healthcare industry",       rating: 5, review: "Good", studentPrice: 10000, mentorPayout: 7500 },
  { studentEmail: "ali.hassan@gmail.com",    mentorEmail: "faiza.iqbal@gmail.com",  packageName: "Basic Career Consultation",       date: "2026-04-11", time: "7:30-8:30",   topic: "Career Planning",           rating: 5, review: "Good Advice.", studentPrice: 4000,  mentorPayout: 2500 },
];
// ─────────────────────────────────────────────────────────────────────────────

const isValidDate = (d: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));
const nameFromEmail = (email: string): string =>
  email.split("@")[0].split(".").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");

// Find a student by email, creating an active account if missing.
async function ensureStudent(email: string): Promise<typeof User.prototype | null> {
  const lower = email.toLowerCase();
  let user = await User.findOne({ email: lower, role: "student" });
  if (user) return user;
  const name = nameFromEmail(lower);
  user = await User.create({ name, email: lower, password: STUDENT_PASSWORD, role: "student", status: "active" });
  await Student.create({
    userId: user._id,
    city: "Islamabad",
    country: "Pakistan",
    educationLevel: "Undergraduate",
    interests: [],
    preferredMentorType: "both",
    preferredFields: [],
    preferredMentorCategories: [],
    timezone: "Asia/Karachi",
  });
  console.log(`  + created student: ${name} (${lower})`);
  return user;
}

async function run() {
  await connectDB();

  const affectedMentors = new Set<string>();
  let created = 0;
  let skipped = 0;

  for (const row of SESSIONS) {
    const student = await ensureStudent(row.studentEmail);
    const mentor = await User.findOne({ email: row.mentorEmail.toLowerCase(), role: "mentor" });
    if (!student) { console.warn(`  ⚠ skip — student problem: ${row.studentEmail}`); skipped++; continue; }
    if (!mentor) { console.warn(`  ⚠ skip — mentor not found: ${row.mentorEmail}`); skipped++; continue; }
    if (row.rating < 1 || row.rating > 5) { console.warn(`  ⚠ skip — bad rating for ${row.studentEmail}`); skipped++; continue; }
    if (!isValidDate(row.date)) { console.warn(`  ⚠ skip — bad date: ${row.date}`); skipped++; continue; }

    const dupe = await Session.findOne({ studentId: student._id, mentorId: mentor._id, date: row.date, time: row.time });
    if (dupe) { console.warn(`  ↩ skip — already exists: ${student.name} ↔ ${mentor.name} on ${row.date} ${row.time}`); skipped++; continue; }

    const startMatch = (row.time.split("-")[0] || "").trim().match(/(\d{1,2}):(\d{2})/);
    const startHHMM = startMatch ? `${startMatch[1].padStart(2, "0")}:${startMatch[2]}` : "09:00";
    const when = new Date(`${row.date}T${startHHMM}:00+05:00`);
    const roomId = `room-${uuidv4()}`;
    const pkgName = row.packageName.trim();

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
      packageName: pkgName,
      mentorPayout: row.mentorPayout,
      amount: row.studentPrice,
      roomId,
      meetingLink: `https://meet.jit.si/karigar-${roomId}`,
    });

    const payment = await Payment.create({
      sessionId: session._id,
      studentId: student._id,
      mentorId: mentor._id,
      amount: row.studentPrice,
      status: "SUCCESS",
      transactionId: `TXN-${uuidv4().split("-")[0].toUpperCase()}`,
      studentPaidAt: when,
      paidAt: when,
      mentorPayoutAt: when,
    });
    session.paymentId = payment._id;
    await session.save();

    // Backdate createdAt on both (native driver — createdAt is immutable via Mongoose).
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
    console.log(`  ✓ ${student.name} ↔ ${mentor.name} — ${pkgName}  (${row.date}, ${row.time})  ★${row.rating}  [Rs ${row.studentPrice}/Rs ${row.mentorPayout}]`);
  }

  for (const mentorId of affectedMentors) {
    const completed = await Session.countDocuments({ mentorId, status: "COMPLETED" });
    const reviews = await Review.find({ mentorId }).select("rating");
    const avg = reviews.length ? reviews.reduce((a, rv) => a + rv.rating, 0) / reviews.length : 0;
    await Mentor.findOneAndUpdate({ userId: mentorId }, { sessionsCount: completed, rating: Math.round(avg * 10) / 10 });
    await checkBadgeEligibility(mentorId);
  }

  console.log(`\n✅ Added ${created} April session(s), skipped ${skipped}. Recomputed ${affectedMentors.size} mentor(s).`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Add-April-sessions failed:", err);
  process.exit(1);
});
