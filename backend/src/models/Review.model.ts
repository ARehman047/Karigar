import mongoose, { Schema, Document } from "mongoose";

export interface IReview extends Document {
  sessionId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  mentorId: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
}

const ReviewSchema = new Schema<IReview>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true, unique: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    mentorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
  },
  { timestamps: true }
);

ReviewSchema.index({ mentorId: 1 });

export default mongoose.model<IReview>("Review", ReviewSchema);
