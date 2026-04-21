import mongoose from "mongoose";

const viewSchema = new mongoose.Schema(
  { userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, viewedAt: { type: Date, default: Date.now } },
  { _id: false }
);

const storySchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type:     { type: String, enum: ["text", "image"], default: "text" },
    content:  { type: String, default: "" },   // text content or image dataURL
    caption:  { type: String, default: "" },
    bg:       { type: String, default: "#22c55e" }, // background color for text stories
    views:    { type: [viewSchema], default: [] },
    expiresAt:{ type: Date, required: true },   // 24hrs from creation
  },
  { timestamps: true }
);

// Auto-delete expired stories via TTL index
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Story = mongoose.model("Story", storySchema);
export default Story;
