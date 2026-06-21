/**
 * Seed script — populates the database with the platform admin and the
 * initial set of real, approved mentors so the site isn't empty on launch.
 *
 * Run with:  npm run seed   (from the backend folder)
 *
 * Safe to re-run: it upserts by email and won't create duplicates.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/database";
import User from "../models/User.model";
import Mentor from "../models/Mentor.model";
import Student from "../models/Student.model";

dotenv.config();

const ADMIN = {
  name: "Karigar Admin",
  email: (process.env.SEED_ADMIN_EMAIL || "admin@karigar.com").toLowerCase(),
  password: process.env.SEED_ADMIN_PASSWORD || "Admin@12345",
};

const MENTOR_PASSWORD = process.env.SEED_MENTOR_PASSWORD || "Mentor@12345";
const STUDENT_PASSWORD = process.env.SEED_STUDENT_PASSWORD || "Student@12345";

// Expand an availability range like "Mon 15:00-17:00" into 1-hour slots.
const toMin = (t: string): number => { const [h, m] = t.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const fromMin = (v: number): string => `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
const expandHourly = (ranges: string[]): string[] => {
  const out: string[] = [];
  for (const r of ranges) {
    const [day, range] = r.trim().split(/\s+/);
    const [start, end] = (range || "").split("-");
    if (!day || !start) continue;
    const s = toMin(start);
    const e = end ? toMin(end) : s + 60;
    let added = false;
    for (let t = s; t + 60 <= e; t += 60) { out.push(`${day} ${fromMin(t)}-${fromMin(t + 60)}`); added = true; }
    if (!added) out.push(`${day} ${fromMin(s)}-${fromMin(s + 60)}`);
  }
  return [...new Set(out)];
};

const slugEmail = (name: string): string =>
  name
    .toLowerCase()
    .replace(/dr\.?\s+/g, "")
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(".") + "@karigar.com";

type SeedMentor = {
  name: string;
  title: string;
  type: "academic" | "industry";
  field: string;
  expertise: string[];
  rating: number;
  sessionsCount: number;
  bio: string;
  qualification: string;
  city: string;
  hourlyRate: number;
  availability: string[];
  company?: string;
  university?: string;
};

const MENTORS: SeedMentor[] = [
  { name: "Rabia Awan", title: "Freelance Tutoring O/A Levels", type: "academic", field: "Education", expertise: ["O Level Mathematics", "A Level Mathematics", "Cambridge International", "Edexcel", "AQA"], rating: 4.9, sessionsCount: 145, bio: "I have 20 years of teaching experience in O Level and A Level Mathematics, both nationally and internationally. I have extensive experience teaching various Cambridge curricula, including Cambridge International, Edexcel, and AQA boards.", qualification: "Master's in Applied Economics, Bachelor's in Education (B.Ed.)", city: "Islamabad", hourlyRate: 4000, availability: ["Mon 15:00-17:00", "Wed 15:00-17:00", "Sat 10:00-13:00"] },
  { name: "Zeeshan Farooq", title: "Entrepreneur", type: "industry", field: "Business Administration", expertise: ["Islamiat", "Business Studies", "Cambridge Curriculum", "Islamic Banking & Finance", "Entrepreneurship"], rating: 4.8, sessionsCount: 98, bio: "I have 15 years of teaching experience in O Level, specializing in Islamiat and Business Studies. I have worked extensively with international curricula and have strong experience collaborating with reputable organizations such as Cambridge and the British Council. I focus on delivering concept-based, engaging, and student-centered lessons.", qualification: "PhD (in progress) in Islamic Banking and Finance, MS in Islamic Banking and Finance, Cambridge Certified Teacher", city: "Islamabad", company: "Self-Employed", hourlyRate: 4000, availability: ["Tue 16:00-18:00", "Thu 16:00-18:00", "Sat 10:00-12:00"] },
  { name: "Dr Abbas", title: "Dentist", type: "industry", field: "Medicine", expertise: ["Operative Dentistry", "Periodontology", "Pediatric Dentistry", "Oral Health Awareness", "Public Health"], rating: 4.8, sessionsCount: 112, bio: "I have 18 years of experience in clinical dentistry. I have worked in departments of operative dentistry, paediatrics and periodontology. I also worked with different organizations for oral health awareness programs.", qualification: "BDS, MCPS Operative Dentistry, MPhil Public Health", city: "Peshawar", company: "Private Clinic", hourlyRate: 4000, availability: ["Mon 17:00-19:00", "Wed 17:00-19:00", "Sat 10:00-12:00"] },
  { name: "Dr Hira Jamil", title: "Senior Lecturer Dentistry (Women Medical College)", type: "academic", field: "Medicine", expertise: ["Community Dentistry", "Orthodontics", "Oral Hygiene Education", "Clinical Practice", "Rural Health"], rating: 4.9, sessionsCount: 87, bio: "I have 18 years of experience in both clinical and basic sciences. I have 9 years of teaching experience in the department of community dentistry, where I arranged dental camps for awareness of our community.", qualification: "BDS, MCPS Orthodontics, Senior Dental Surgeon at KPK Health Department", city: "Peshawar", university: "Women Medical College", hourlyRate: 4000, availability: ["Tue 15:00-17:00", "Fri 15:00-17:00"] },
  { name: "Sara Shamim", title: "College Professor O/A levels (HITEC)", type: "academic", field: "Education", expertise: ["O Level Mathematics", "A Level Mathematics", "Additional Mathematics", "Cambridge Curriculum", "Problem Solving & Critical Thinking"], rating: 4.9, sessionsCount: 178, bio: "I have over 13 years of teaching experience of O/A level mathematics and additional mathematics in top schools of the country. As a Cambridge Certified Teacher, I specialize in creating engaging, concept-based, and student-centered learning environments.", qualification: "MSc (Hons.) in Mathematics, MS in Mathematics, Cambridge Certified Teacher", city: "Rawalpindi", university: "HITEC College", hourlyRate: 4000, availability: ["Mon 14:00-16:00", "Wed 14:00-16:00", "Fri 10:00-12:00"] },
  { name: "Dr. Iqra Ateeq", title: "Doctor", type: "industry", field: "Medicine", expertise: ["Clinical Medicine", "FCPS Preparation", "Medical Research", "Community Health", "MBBS Guidance"], rating: 4.7, sessionsCount: 54, bio: "With over two years of clinical experience, I have developed a strong technical and analytical foundation in medicine. I successfully cleared the FCPS Part-1 exam, which led to my current fellowship at a premier hospital in Lahore.", qualification: "MBBS, postgraduate research (FCPS - in progress)", city: "Lahore", company: "Teaching Hospital, Lahore", hourlyRate: 4000, availability: ["Sat 11:00-13:00", "Sun 11:00-13:00"] },
  { name: "Bisma Ateeq", title: "Research Professional at NUST", type: "academic", field: "Biotechnology", expertise: ["Chemical Engineering", "Precision Agriculture", "Sanitation Systems", "Green Chemistry", "Resource Recovery"], rating: 4.7, sessionsCount: 43, bio: "Beyond my foundational training in chemical engineering, I am driven to apply technical discipline across diverse sectors to solve complex real-world challenges. Currently serving as a research professional at one of Pakistan's most prestigious universities.", qualification: "BS Chemical Engineering, MS Chem Engg (in progress)", city: "Islamabad", university: "NUST", hourlyRate: 4000, availability: ["Tue 17:00-19:00", "Thu 17:00-19:00"] },
  { name: "Afnan Sukhera", title: "Entrepreneur", type: "industry", field: "Business Administration", expertise: ["Healthcare Operations", "Supply Chain Management", "Procurement Strategy", "Regulatory Compliance", "Medical Sterilization"], rating: 4.8, sessionsCount: 76, bio: "I have several years of experience in Pakistan's healthcare sector, working across healthcare operations, international supply chain management, procurement strategy, regulatory compliance, and commercial contracting. Currently, I manage my own medical supply chain business.", qualification: "Bachelor of Science in Healthcare", city: "Islamabad", company: "Medical Supply Chain Business", hourlyRate: 4000, availability: ["Wed 18:00-20:00", "Sat 14:00-16:00"] },
  { name: "Syed Muhammad Taqi", title: "Executive Manager Site Reliability (Easy Paisa)", type: "industry", field: "Software Engineering", expertise: ["Site Reliability Engineering", "DevOps & GitOps", "Kubernetes", "Linux Administration", "Cloud Infrastructure", "Telecom Networks"], rating: 4.9, sessionsCount: 134, bio: "With over nine years of professional experience, I currently serve as an Executive Manager in the Site Reliability Engineering (SRE) department at Easypaisa, ensuring the reliability, scalability, and performance of mission-critical financial platforms. I consistently achieve 99.99% service availability.", qualification: "BS Telecom Engineering from UET Taxila, AWS Certified DevOps", city: "Islamabad", company: "Easypaisa", hourlyRate: 4000, availability: ["Tue 19:00-21:00", "Thu 19:00-21:00", "Sat 10:00-12:00"] },
  { name: "Syeda Kainat Fatima", title: "Biostatistician at SMDAS, Pakistan-Austria Fachhochschule", type: "academic", field: "Data Science", expertise: ["Biostatistics", "Statistics", "Research Methodology", "Data Analysis", "Sampling Techniques", "Simulation Studies"], rating: 4.8, sessionsCount: 67, bio: "I have extensive teaching and research experience in the field of Statistics, currently serving as a Biostatistician at the School of Medicine, Dentistry and Allied Sciences (SMDAS). I have strong expertise in statistical software and research methodology.", qualification: "PhD Scholar in Statistics, M.Phil. in Statistics, B.Ed.", city: "Islamabad", university: "Pakistan-Austria Fachhochschule", hourlyRate: 4000, availability: ["Mon 16:00-18:00", "Wed 16:00-18:00", "Fri 14:00-16:00"] },
  { name: "Afroze Zehra", title: "Lecturer (IMCGF)", type: "academic", field: "Education", expertise: ["O Levels Physics", "IGCSE Physics", "A-Levels Physics", "SAT Math", "EdTech", "AI-Assisted Teaching"], rating: 4.8, sessionsCount: 91, bio: "I have over 5 years of teaching experience spanning O Levels, IGCSE, A-Levels, and college-level Physics. I currently serve as a Lecturer at IMCG F-11/3, Islamabad. I integrate Generative AI tools to develop lecture materials and personalized learning plans.", qualification: "MPhil in Physics", city: "Islamabad", university: "IMCG F-11/3", hourlyRate: 4000, availability: ["Mon 15:00-17:00", "Thu 15:00-17:00", "Sat 11:00-13:00"] },
  { name: "Sunny Rakhiani", title: "Finance Assistant Manager PTCL", type: "industry", field: "Finance & Accounting", expertise: ["Financial Planning & Budgeting", "Capex & Opex Management", "Group Financials", "Accounts Preparation", "Financial Literacy"], rating: 4.8, sessionsCount: 89, bio: "I have 10 years of corporate experience working with MNCs including S&P Global and PTCL & PTML. Experience in group level financials, accounts preparation, financial planning and budgeting. I also work as a consultant to non-profit organizations on financial literacy.", qualification: "MS Finance, BS Business Administration", city: "Islamabad", company: "PTCL", hourlyRate: 4000, availability: ["Tue 18:00-20:00", "Sat 10:00-12:00", "Sun 10:00-12:00"] },
  { name: "Faiza Iqbal", title: "Lecturer UET (Former)", type: "academic", field: "Education", expertise: ["English Language", "Academic Writing", "English Literature", "Communication Skills", "Linguistics"], rating: 4.6, sessionsCount: 48, bio: "Worked as a lecturer in UET with a focus on English language and literature, academic writing and communication skills.", qualification: "Double Masters English", city: "Lahore", university: "UET Lahore (Former)", hourlyRate: 4000, availability: ["Mon 17:00-19:00", "Wed 17:00-19:00", "Fri 17:00-19:00"] },
];

type SeedStudent = {
  name: string;
  email: string;
  city: string;
  institution: string;
  field: string;
  interests: string[];
  bio: string;
  preferredMentorType: "academic" | "industry" | "both";
};

const STUDENTS: SeedStudent[] = [
  { name: "Ali Haider", email: "ali.haider@nu.edu.pk", city: "Islamabad", institution: "FAST-NUCES", field: "Computer Science", interests: ["Machine Learning", "Web Development", "Cloud Computing"], bio: "Aspiring software engineer with strong interest in AI.", preferredMentorType: "industry" },
  { name: "Zara Mahmood", email: "zara.mahmood@lums.edu.pk", city: "Lahore", institution: "LUMS", field: "Business Administration", interests: ["Startup Strategy", "Digital Marketing", "Product Management"], bio: "Final year BBA student. Co-founded a social enterprise.", preferredMentorType: "industry" },
  { name: "Hamza Sheikh", email: "hamza.sheikh@giki.edu.pk", city: "Rawalpindi", institution: "GIKI", field: "Electrical Engineering", interests: ["Embedded Systems", "IoT", "Renewable Energy"], bio: "Passionate about embedded systems and IoT.", preferredMentorType: "academic" },
  { name: "Fatima Noor", email: "fatima.noor@aku.edu", city: "Karachi", institution: "Aga Khan University", field: "Medicine", interests: ["Surgery", "Medical Research", "Public Health"], bio: "Medical student with research experience in public health.", preferredMentorType: "both" },
  { name: "Omar Farooq", email: "omar.farooq@nust.edu.pk", city: "Islamabad", institution: "NUST", field: "Software Engineering", interests: ["System Design", "Backend Development", "DevOps"], bio: "Building backend systems. Interned at 10Pearls.", preferredMentorType: "industry" },
  { name: "Ayesha Riaz", email: "ayesha.riaz@bnu.edu.pk", city: "Lahore", institution: "BNU", field: "Graphic Design", interests: ["Brand Identity", "UI/UX Design", "Typography"], bio: "Award-winning design student freelancing for startups.", preferredMentorType: "industry" },
  { name: "Saad Bin Khalid", email: "saad.khalid@iba.edu.pk", city: "Karachi", institution: "IBA Karachi", field: "Finance & Accounting", interests: ["Investment Banking", "Financial Modeling", "Fintech"], bio: "Finance enthusiast preparing for CFA Level 1.", preferredMentorType: "industry" },
  { name: "Hiba Tariq", email: "hiba.tariq@pu.edu.pk", city: "Lahore", institution: "Punjab University", field: "Psychology", interests: ["Clinical Psychology", "Child Development", "Counseling"], bio: "Interested in clinical psychology and mental health awareness.", preferredMentorType: "academic" },
  { name: "Danyal Ahmed", email: "danyal.ahmed@uet.edu.pk", city: "Lahore", institution: "UET Lahore", field: "Civil Engineering", interests: ["Structural Design", "Urban Planning", "Project Management"], bio: "Final year civil engineering student. Interned at NESPAK.", preferredMentorType: "both" },
  { name: "Maryam Aslam", email: "maryam.aslam@comsats.edu.pk", city: "Islamabad", institution: "COMSATS", field: "Data Science", interests: ["Data Analytics", "Machine Learning", "NLP"], bio: "Data science student with Kaggle competition experience.", preferredMentorType: "industry" },
  { name: "Usman Akbar", email: "usman.akbar@lse.edu.pk", city: "Lahore", institution: "LSE", field: "Law", interests: ["Corporate Law", "Constitutional Law", "Human Rights"], bio: "LLB student passionate about corporate law and human rights.", preferredMentorType: "both" },
  { name: "Rania Khalid", email: "rania.khalid@szabist.edu.pk", city: "Karachi", institution: "SZABIST", field: "Media & Communications", interests: ["Digital Journalism", "Content Creation", "Public Relations"], bio: "Aspiring journalist with internship experience at Dawn News.", preferredMentorType: "industry" },
  { name: "Bilal Hussain", email: "bilal.hussain@qau.edu.pk", city: "Islamabad", institution: "Quaid-i-Azam University", field: "Biotechnology", interests: ["Genomics", "Bioinformatics", "Pharmaceutical Research"], bio: "Research assistant in QAU's molecular biology lab.", preferredMentorType: "academic" },
  { name: "Sana Iqbal", email: "sana.iqbal@uetpeshawar.edu.pk", city: "Peshawar", institution: "UET Peshawar", field: "Mechanical Engineering", interests: ["Automotive Design", "Manufacturing", "3D Modeling"], bio: "Mechanical engineering student passionate about automotive design.", preferredMentorType: "both" },
  { name: "Taha Mirza", email: "taha.mirza@fast.edu.pk", city: "Lahore", institution: "FAST-NUCES", field: "Computer Science", interests: ["Distributed Systems", "Cloud Architecture", "Backend Engineering"], bio: "Final year CS student building a distributed caching system.", preferredMentorType: "industry" },
  { name: "Nimra Shah", email: "nimra.shah@aku.edu.pk", city: "Karachi", institution: "Aga Khan University", field: "Education", interests: ["EdTech", "Curriculum Design", "Inclusive Education"], bio: "Passionate about using technology to improve education access.", preferredMentorType: "academic" },
];

const run = async () => {
  await connectDB();

  // ── Admin ──
  const existingAdmin = await User.findOne({ email: ADMIN.email });
  if (existingAdmin) {
    console.log(`Admin already exists: ${ADMIN.email}`);
  } else {
    await User.create({ name: ADMIN.name, email: ADMIN.email, password: ADMIN.password, role: "admin", status: "active" });
    console.log(`✅ Created admin: ${ADMIN.email} (password: ${ADMIN.password})`);
  }

  // ── Mentors ──
  let created = 0;
  for (const m of MENTORS) {
    const email = slugEmail(m.name);
    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`Mentor already exists: ${m.name} (${email})`);
      continue;
    }

    const user = await User.create({ name: m.name, email, password: MENTOR_PASSWORD, role: "mentor", status: "active" });
    await Mentor.create({
      userId: user._id,
      type: m.type,
      field: m.field,
      expertise: m.expertise,
      title: m.title,
      qualification: m.qualification,
      education: m.qualification,
      designation: m.title,
      company: m.company,
      university: m.university,
      specialization: m.field,
      subjects: m.expertise,
      skills: m.expertise,
      languages: ["English", "Urdu"],
      city: m.city,
      country: "Pakistan",
      hourlyRate: m.hourlyRate,
      bio: m.bio,
      availability: expandHourly(m.availability),
      availableDays: [...new Set(m.availability.map((a) => a.split(" ")[0]))],
      availableSlots: expandHourly(m.availability),
      rating: m.rating,
      sessionsCount: m.sessionsCount,
      isApproved: true,
    });
    created++;
    console.log(`✅ Seeded mentor: ${m.name} (${email})`);
  }

  // ── Students ──
  let studentsCreated = 0;
  for (const s of STUDENTS) {
    const email = s.email.toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`Student already exists: ${s.name} (${email})`);
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
    studentsCreated++;
    console.log(`✅ Seeded student: ${s.name} (${email})`);
  }

  console.log(`\nDone. ${created} new mentors (password: ${MENTOR_PASSWORD}), ${studentsCreated} new students (password: ${STUDENT_PASSWORD}).`);
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
