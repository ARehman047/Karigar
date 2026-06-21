import mongoose, { Schema, Document } from "mongoose";

export interface IStudent extends Document {
  userId: mongoose.Types.ObjectId;
  phone?: string;
  dateOfBirth?: Date;
  gender?: string;
  country: string;
  city: string;
  educationLevel: string;
  institution: string;
  fieldOfStudy: string;
  careerGoals?: string;
  interests: string[];
  // Mentor-matching preferences
  preferredMentorType: "academic" | "industry" | "both";
  preferredFields: string[];
  preferredMentorCategories: string[];
  bio?: string;
  linkedin?: string;
  github?: string;
  timezone: string;
}

const StudentSchema = new Schema<IStudent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    phone: String,
    dateOfBirth: Date,
    gender: String,
    country: { type: String, default: "Pakistan" },
    city: String,
    educationLevel: String,
    institution: String,
    fieldOfStudy: String,
    careerGoals: String,
    interests: [String],
    preferredMentorType: { type: String, enum: ["academic", "industry", "both"], default: "both" },
    preferredFields: [String],
    preferredMentorCategories: [String],
    bio: String,
    linkedin: String,
    github: String,
    timezone: { type: String, default: "Asia/Karachi" },
  },
  { timestamps: true }
);

export default mongoose.model<IStudent>("Student", StudentSchema);
