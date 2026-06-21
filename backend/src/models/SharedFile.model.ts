import mongoose, { Schema, Document } from "mongoose";

// A document/file shared by a participant during (or around) a session.
// The file bytes are stored as a base64 data URL; kept out of list queries
// (select: false) since they can be large.
export interface ISharedFile extends Document {
  sessionId: mongoose.Types.ObjectId;
  uploaderId: mongoose.Types.ObjectId;
  uploaderName: string;
  name: string;
  mimeType: string;
  size: number;
  data: string; // base64 data URL
}

const SharedFileSchema = new Schema<ISharedFile>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true, index: true },
    uploaderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    uploaderName: { type: String, default: "" },
    name: { type: String, required: true },
    mimeType: { type: String, default: "application/octet-stream" },
    size: { type: Number, default: 0 },
    data: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

export default mongoose.model<ISharedFile>("SharedFile", SharedFileSchema);
