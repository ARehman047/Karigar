import mongoose, { Schema, Document } from "mongoose";

export interface IMentor extends Document {
  userId: mongoose.Types.ObjectId;
  phone?: string;
  dateOfBirth?: Date;
  gender?: string;
  country: string;
  city: string;
  // Classification (used for student ↔ mentor matching)
  type: "academic" | "industry";
  field: string;
  expertise: string[];
  title: string;
  qualification?: string;
  // Professional details
  education: string;
  university?: string;
  designation: string;
  company?: string;
  yearsOfExperience: number;
  specialization: string;
  subjects: string[];
  skills: string[];
  languages: string[];
  hourlyRate: number;
  bio: string;
  achievements?: string;
  certifications?: string;
  certificateFiles?: { name: string; data: string }[];
  linkedin?: string;
  github?: string;
  timezone: string;
  availableDays: string[];
  availableSlots: string[];
  availability: string[];
  rating: number;
  sessionsCount: number;
  isApproved: boolean;
  badge: "none" | "silver" | "gold";
  // Services this mentor offers (from the pricing packages) — students filter by these.
  specialities?: string[];
  // Bank accounts for receiving payouts (private — admin only, never shown to students).
  bankAccounts?: { bankName: string; accountTitle: string; accountNumber: string; iban?: string }[];
}

const MentorSchema = new Schema<IMentor>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    phone: String,
    dateOfBirth: Date,
    gender: String,
    country: { type: String, default: "Pakistan" },
    city: String,
    type: { type: String, enum: ["academic", "industry"], default: "industry" },
    field: { type: String, default: "Other" },
    expertise: [String],
    title: { type: String, default: "" },
    qualification: String,
    education: String,
    university: String,
    designation: { type: String, required: true },
    company: String,
    yearsOfExperience: { type: Number, default: 0 },
    specialization: { type: String, required: true },
    subjects: [String],
    skills: [String],
    languages: [String],
    hourlyRate: { type: Number, required: true, default: 4000 },
    bio: { type: String, required: true },
    achievements: String,
    certifications: String,
    // Uploaded certificate PDFs (base64 data URLs). Hidden by default (select:false)
    // so they're only loaded when explicitly requested (admin review / owner).
    certificateFiles: { type: [{ name: String, data: String }], select: false, default: [] },
    linkedin: String,
    github: String,
    timezone: { type: String, default: "Asia/Karachi" },
    availableDays: [String],
    availableSlots: [String],
    availability: [String],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    sessionsCount: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: false },
    badge: { type: String, enum: ["none", "silver", "gold"], default: "none" },
    specialities: { type: [String], default: [] },
    // Private payout accounts — select:false so they're never exposed to students.
    bankAccounts: {
      type: [{ bankName: String, accountTitle: String, accountNumber: String, iban: String }],
      select: false,
      default: [],
    },
  },
  { timestamps: true }
);

MentorSchema.index({ specialization: "text", skills: "text", subjects: "text", expertise: "text", field: "text", title: "text" });
MentorSchema.index({ type: 1, field: 1, isApproved: 1 });

export default mongoose.model<IMentor>("Mentor", MentorSchema);
