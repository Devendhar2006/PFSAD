import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["student", "teacher"], required: true },
    studentRef: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
