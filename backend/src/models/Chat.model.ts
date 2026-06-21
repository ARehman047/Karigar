import mongoose, { Schema, Document } from "mongoose";

export interface IChat extends Document {
  sessionId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  message: string;
  attachments: string[];
  timestamp: Date;
}

const ChatSchema = new Schema<IChat>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    attachments: [String],
    timestamp: { type: Date, default: Date.now },
  }
);

ChatSchema.index({ sessionId: 1, timestamp: 1 });

export default mongoose.model<IChat>("Chat", ChatSchema);
