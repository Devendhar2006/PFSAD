import { Student } from "../models/Student.js";
import { predictEngagement } from "../services/predictService.js";

export async function predict(req, res) {
  const { attendance, marks, behavior, feedbackText, studentId } = req.body;

  const attendanceNum = Number(attendance);
  const marksNum = Number(marks);
  const behaviorNum = Number(behavior);

  if (
    Number.isNaN(attendanceNum) ||
    Number.isNaN(marksNum) ||
    Number.isNaN(behaviorNum) ||
    typeof feedbackText !== "string"
  ) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  const output = predictEngagement({
    attendance: attendanceNum,
    marks: marksNum,
    behaviorRating: behaviorNum,
    feedbackText
  });

  if (studentId) {
    const student = await Student.findById(studentId);
    if (student) {
      student.attendance = attendanceNum;
      student.marks = marksNum;
      student.behaviorRating = behaviorNum;
      student.feedbackText = feedbackText;
      student.engagementStatus = output.engagement_status;
      student.riskLevel = output.risk_level;
      student.confidenceScore = output.confidence_score;
      student.feedbackHistory.unshift({ text: feedbackText });
      student.predictionLogs.unshift({
        attendance: attendanceNum,
        marks: marksNum,
        behaviorRating: behaviorNum,
        feedbackText,
        engagementStatus: output.engagement_status,
        confidenceScore: output.confidence_score,
        explanation: output.explanation
      });
      student.predictionLogs = student.predictionLogs.slice(0, 20);
      await student.save();
    }
  }

  return res.json({
    status: output.engagement_status,
    confidence: output.confidence_score,
    reason: output.explanation,
    riskLevel: output.risk_level,
    suggestions: output.suggestions
  });
}
