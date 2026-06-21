import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  sessionId?: mongoose.Types.ObjectId;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    sessionId: { type: Schema.Types.ObjectId, ref: "Session" },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, isRead: 1 });

export default mongoose.model<INotification>("Notification", NotificationSchema);
