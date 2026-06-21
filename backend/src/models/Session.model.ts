import mongoose, { Schema, Document } from "mongoose";

export type SessionStatus =
  | "PENDING_PAYMENT"
  | "PENDING_ADMIN_CONFIRMATION"
  | "PENDING_MENTOR_PAYOUT"
  | "PENDING_MENTOR_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "RESCHEDULE_REQUESTED"
  | "COMPLETED"
  | "CANCELLED";

export interface ISession extends Document {
  studentId: mongoose.Types.ObjectId;
  mentorId: mongoose.Types.ObjectId;
  // Name snapshots — preserved so history stays readable even if an account is deleted.
  studentName?: string;
  mentorName?: string;
  date: string;
  time: string;
  duration: number;
  status: SessionStatus;
  topic: string;
  type: "video" | "chat" | "in-person";
  packageName?: string;
  mentorPayout?: number; // what the mentor is paid for this session (from pricing config)
  message?: string;
  notes?: string;
  meetingLink?: string;
  roomId?: string;
  amount: number;
  paymentId?: mongoose.Types.ObjectId;
  // Mentor decline
  rejectionReason?: string;
  // Reschedule (mentor-initiated, student responds)
  rescheduleReason?: string;
  proposedDate?: string;
  proposedTime?: string;
  rescheduleRequestedBy?: "mentor" | "student";
  reviewed?: boolean;
  // Google Calendar event ids created for each party (if they connected calendar).
  calendarEvents?: {
    studentEventId?: string;
    mentorEventId?: string;
  };
  // SEQUENCE for emailed .ics invites — incremented on reschedule so the new
  // invite supersedes the old one in the recipient's calendar.
  inviteSeq?: number;
}

const SessionSchema = new Schema<ISession>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    mentorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    studentName: { type: String },
    mentorName: { type: String },
    date: { type: String, required: true },
    time: { type: String, required: true },
    duration: { type: Number, default: 60 },
    status: {
      type: String,
      enum: [
        "PENDING_PAYMENT",
        "PENDING_ADMIN_CONFIRMATION",
        "PENDING_MENTOR_PAYOUT",
        "PENDING_MENTOR_APPROVAL",
        "APPROVED",
        "REJECTED",
        "RESCHEDULE_REQUESTED",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "PENDING_PAYMENT",
    },
    topic: { type: String, required: true },
    type: { type: String, enum: ["video", "chat", "in-person"], default: "video" },
    packageName: String,
    mentorPayout: Number,
    message: String,
    notes: String,
    meetingLink: String,
    roomId: String,
    amount: { type: Number, required: true },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    rejectionReason: String,
    rescheduleReason: String,
    proposedDate: String,
    proposedTime: String,
    rescheduleRequestedBy: { type: String, enum: ["mentor", "student"] },
    reviewed: { type: Boolean, default: false },
    calendarEvents: {
      studentEventId: { type: String },
      mentorEventId: { type: String },
    },
    inviteSeq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<ISession>("Session", SessionSchema);
