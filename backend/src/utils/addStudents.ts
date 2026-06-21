/**
 * ADD students (append-only) — creates the student accounts listed below in the
 * live database. Existing accounts (matched by email) are left untouched, so this
 * is safe to re-run.
 *
 * Each row becomes an active User (role "student", password Student@12345) plus a
 * matching Student profile.
 *
 * Run (from /backend):  npm run add:students
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/database";
import User from "../models/User.model";
import Student from "../models/Student.model";

dotenv.config();

const STUDENT_PASSWORD = process.env.SEED_STUDENT_PASSWORD || "Student@12345";

interface AddStudent {
  name: string;
  email: string;
  city: string;
  institution: string;
  field: string;
  interests: string[];
  bio: string;
  preferredMentorType: "academic" | "industry" | "both";
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT THIS LIST — these students are ADDED on top of whatever already exists.
// ─────────────────────────────────────────────────────────────────────────────
const ADD_STUDENTS: AddStudent[] = [
  { name: "Ahsan Raza", email: "ahsan.raza@gmail.com", city: "Islamabad", institution: "FAST-NUCES", field: "Computer Science", interests: ["Web Development", "Artificial Intelligence", "Competitive Programming"], bio: "CS undergraduate keen on building AI-powered web apps.", preferredMentorType: "industry" },
  { name: "Bilal Hassan", email: "bilal.hassan@gmail.com", city: "Lahore", institution: "UET Lahore", field: "Electrical Engineering", interests: ["Power Systems", "Embedded Systems", "Robotics"], bio: "Electrical engineering student interested in robotics and automation.", preferredMentorType: "both" },
  { name: "Hira Saleem", email: "hira.saleem@gmail.com", city: "Karachi", institution: "IBA Karachi", field: "Business Administration", interests: ["Marketing", "Entrepreneurship", "Brand Strategy"], bio: "BBA student exploring marketing and startups.", preferredMentorType: "industry" },
  { name: "Kashan Javed", email: "kashan.javed@gmail.com", city: "Rawalpindi", institution: "NUST", field: "Software Engineering", interests: ["Mobile Development", "Cloud Computing", "System Design"], bio: "Software engineering student building cross-platform apps.", preferredMentorType: "industry" },
  { name: "Maham Tariq", email: "maham.tariq@gmail.com", city: "Islamabad", institution: "COMSATS", field: "Data Science", interests: ["Data Analytics", "Machine Learning", "Visualization"], bio: "Data science enthusiast with a focus on analytics.", preferredMentorType: "both" },
  { name: "Saad Iqbal", email: "saad.iqbal@gmail.com", city: "Lahore", institution: "LUMS", field: "Finance & Accounting", interests: ["Investment Banking", "Financial Modeling", "Fintech"], bio: "Finance student preparing for a career in investment banking.", preferredMentorType: "industry" },
  { name: "Usman Shahid", email: "usman.shahid@gmail.com", city: "Peshawar", institution: "UET Peshawar", field: "Mechanical Engineering", interests: ["CAD Design", "Manufacturing", "Thermodynamics"], bio: "Mechanical engineering student passionate about design and manufacturing.", preferredMentorType: "both" },
  { name: "Zoya Khan", email: "zoya.khan@gmail.com", city: "Karachi", institution: "Aga Khan University", field: "Medicine", interests: ["Clinical Medicine", "Public Health", "Medical Research"], bio: "Medical student interested in public health and research.", preferredMentorType: "academic" },
];
// ─────────────────────────────────────────────────────────────────────────────

async function run() {
  await connectDB();

  let created = 0;
  let skipped = 0;

  for (const s of ADD_STUDENTS) {
    const email = s.email.toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) {
      console.warn(`  ↩ skip — already exists: ${s.name} (${email})`);
      skipped++;
      continue;
    }

    const user = await User.create({ name: s.name, email, password: STUDENT_PASSWORD, role: "student", status: "active" });
    await Student.create({
      userId: user._id,
      city: s.city,
      country: "Pakistan",
      institution: s.institution,
      fieldOfStudy: s.field,
      educationLevel: "Undergraduate",
      interests: s.interests,
      preferredMentorType: s.preferredMentorType,
      preferredFields: [s.field],
      preferredMentorCategories: [s.field],
      careerGoals: s.bio,
      bio: s.bio,
      timezone: "Asia/Karachi",
    });
    created++;
    console.log(`  ✓ ${s.name} (${email})`);
  }

  console.log(`\n✅ Added ${created} student(s), skipped ${skipped}. Password: ${STUDENT_PASSWORD}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Add-students failed:", err);
  process.exit(1);
});
