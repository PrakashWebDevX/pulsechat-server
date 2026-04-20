import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    image:      { type: String, default: "" },
    // Profile extras
    bio:        { type: String, default: "", maxlength: 150 },
    username:   { type: String, default: "", trim: true },
    // Push notifications
    pushTokens: { type: [String], default: [] },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
