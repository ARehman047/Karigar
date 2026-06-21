import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: "student" | "mentor" | "admin";
  phone?: string;
  profilePicture?: string;
  status: "active" | "suspended" | "pending";
  provider: "local" | "google";
  googleId?: string;
  // Google Calendar connection (for auto-adding confirmed sessions + reminders).
  googleCalendar?: {
    connected: boolean;
    refreshToken?: string; // server-side only — never returned to clients
    email?: string; // which Google account is connected
    connectedAt?: Date;
  };
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Password is required for local accounts; Google accounts authenticate via Google.
    password: { type: String, minlength: 6, required: function (this: IUser) { return this.provider !== "google"; } },
    role: { type: String, enum: ["student", "mentor", "admin"], required: true },
    phone: { type: String },
    profilePicture: { type: String },
    status: { type: String, enum: ["active", "suspended", "pending"], default: "active" },
    provider: { type: String, enum: ["local", "google"], default: "local" },
    googleId: { type: String },
    googleCalendar: {
      connected: { type: Boolean, default: false },
      refreshToken: { type: String, select: false }, // never selected/serialized by default
      email: { type: String },
      connectedAt: { type: Date },
    },
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false; // Google-only accounts have no password
  return bcrypt.compare(candidatePassword, this.password);
};

// Don't return password in JSON output
UserSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const r = ret as unknown as Record<string, unknown>;
    r["password"] = undefined;
    // Never leak the calendar refresh token, even if accidentally selected.
    if (r["googleCalendar"] && typeof r["googleCalendar"] === "object") {
      (r["googleCalendar"] as Record<string, unknown>)["refreshToken"] = undefined;
    }
    return r;
  },
});

export default mongoose.model<IUser>("User", UserSchema);
