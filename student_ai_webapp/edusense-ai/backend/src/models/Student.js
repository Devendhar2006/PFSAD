import mongoose from "mongoose";

const feedbackEntrySchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const trendPointSchema = new mongoose.Schema(
  {
    term: { type: String, required: true },
    marks: { type: Number, required: true }
  },
  { _id: false }
);

const predictionLogSchema = new mongoose.Schema(
  {
    attendance: Number,
    marks: Number,
    behaviorRating: Number,
    feedbackText: String,
    engagementStatus: String,
    confidenceScore: Number,
    explanation: String,
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    course: { type: String, required: true },
    attendance: { type: Number, default: 75 },
    marks: { type: Number, default: 70 },
    behaviorRating: { type: Number, default: 3 },
    feedbackText: { type: String, default: "" },
    engagementStatus: { type: String, enum: ["Engaged", "At Risk", "Disengaged"], default: "Engaged" },
    riskLevel: { type: String, enum: ["Low", "Medium", "High"], default: "Low" },
    confidenceScore: { type: Number, default: 0 },
    feedbackHistory: { type: [feedbackEntrySchema], default: [] },
    performanceTrend: { type: [trendPointSchema], default: [] },
    predictionLogs: { type: [predictionLogSchema], default: [] }
  },
  { timestamps: true }
);

export const Student = mongoose.model("Student", studentSchema);
