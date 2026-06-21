import mongoose, { Schema, Document } from "mongoose";

export interface IOtp extends Document {
  email: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
}

const OtpSchema = new Schema<IOtp>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// TTL index — MongoDB auto-deletes the doc once expiresAt passes.
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IOtp>("Otp", OtpSchema);
