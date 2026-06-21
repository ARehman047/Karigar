import mongoose, { Schema, Document } from "mongoose";

export type BadgeTier = "silver" | "gold";
export type BadgeRequestSource = "eligibility" | "application" | "admin";
export type BadgeRequestStatus = "pending" | "approved" | "declined";

export interface IBadgeRequest extends Document {
  mentorId: mongoose.Types.ObjectId; // the mentor's USER id
  badge: BadgeTier;
  source: BadgeRequestSource; // eligibility (auto), application (paid), admin (manual)
  status: BadgeRequestStatus;
  // Paid application details
  fee?: number;
  receiptImage?: string; // base64 receipt for the application fee
  // Snapshot of stats at time of request (helps admin review)
  completedSessions?: number;
  // Admin decision
  declineReason?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BadgeRequestSchema = new Schema<IBadgeRequest>(
  {
    mentorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    badge: { type: String, enum: ["silver", "gold"], required: true },
    source: { type: String, enum: ["eligibility", "application", "admin"], required: true },
    status: { type: String, enum: ["pending", "approved", "declined"], default: "pending" },
    fee: Number,
    receiptImage: { type: String, select: false }, // heavy base64 — fetched on demand
    completedSessions: Number,
    declineReason: String,
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
  },
  { timestamps: true }
);

BadgeRequestSchema.index({ mentorId: 1, status: 1 });

export default mongoose.model<IBadgeRequest>("BadgeRequest", BadgeRequestSchema);
