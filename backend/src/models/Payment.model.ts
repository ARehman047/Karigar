import mongoose, { Schema, Document } from "mongoose";

export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED";

export interface IPayment extends Document {
  sessionId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  mentorId: mongoose.Types.ObjectId;
  amount: number;
  status: PaymentStatus;
  transactionId?: string;
  studentPaidAt?: Date;
  paidAt?: Date;
  declineReason?: string;
  receiptImage?: string; // base64 data URL of the bank-transfer receipt the student uploaded
  // Mentor payout — admin sends the mentor their share after confirming the student's payment.
  mentorPayoutReceipt?: string; // base64 receipt of the admin→mentor transfer
  mentorPayoutAt?: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    mentorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["PENDING", "SUCCESS", "FAILED"], default: "PENDING" },
    transactionId: String,
    studentPaidAt: Date,
    paidAt: Date,
    declineReason: String,
    receiptImage: String,
    mentorPayoutReceipt: { type: String, select: false }, // heavy base64 — fetched on demand
    mentorPayoutAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model<IPayment>("Payment", PaymentSchema);
