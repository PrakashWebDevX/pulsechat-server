import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  { emoji: String, userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" } },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    senderId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    groupId:    { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },
    message:    { type: String, default: "" },
    type:       { type: String, enum: ["text", "image", "file", "audio"], default: "text" },
    fileUrl:    { type: String, default: "" },
    fileName:   { type: String, default: "" },
    fileSize:   { type: Number, default: 0 },
    duration:   { type: Number, default: 0 }, // for audio messages
    replyTo: {
      _id:      mongoose.Schema.Types.ObjectId,
      message:  String,
      senderId: mongoose.Schema.Types.ObjectId,
      type:     String,
    },
    reactions: { type: [reactionSchema], default: [] },
    status:    { type: String, enum: ["sent", "delivered", "read"], default: "sent" },
    edited:    { type: Boolean, default: false },
    deleted:   { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });
messageSchema.index({ groupId: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;
