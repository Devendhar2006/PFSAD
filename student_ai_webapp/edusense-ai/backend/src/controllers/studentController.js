import { Student } from "../models/Student.js";
import { predictEngagement } from "../services/predictService.js";

export async function createStudent(req, res) {
  const { name, studentId, attendance, marks, behaviorRating, feedbackText, course } = req.body;

  if (!name || !studentId) {
    return res.status(400).json({ message: "Name and Student ID are required" });
  }

  const existingStudent = await Student.findOne({ studentId });
  if (existingStudent) {
    return res.status(400).json({ message: "Student ID already exists" });
  }

  const attendanceNum = Number(attendance) || 75;
  const marksNum = Number(marks) || 70;
  const behaviorNum = Number(behaviorRating) || 3;
  const feedback = typeof feedbackText === "string" && feedbackText.trim() ? feedbackText.trim() : "New student";

  const prediction = predictEngagement({
    attendance: attendanceNum,
    marks: marksNum,
    behaviorRating: behaviorNum,
    feedbackText: feedback
  });

  const student = new Student({
    name,
    studentId,
    course: course || "General",
    attendance: attendanceNum,
    marks: marksNum,
    behaviorRating: behaviorNum,
    feedbackText: feedback,
    engagementStatus: prediction.engagement_status,
    riskLevel: prediction.risk_level,
    confidenceScore: prediction.confidence_score,
    feedbackHistory: feedback ? [{ text: feedback }] : [],
    predictionLogs: [
      {
        attendance: attendanceNum,
        marks: marksNum,
        behaviorRating: behaviorNum,
        feedbackText: feedback,
        engagementStatus: prediction.engagement_status,
        confidenceScore: prediction.confidence_score,
        explanation: prediction.explanation
      }
    ],
    performanceTrend: [
      { term: "Term 1", marks: marksNum },
      { term: "Term 2", marks: marksNum },
      { term: "Term 3", marks: marksNum }
    ]
  });

  await student.save();

  return res.status(201).json({
    message: "Student created successfully",
    student
  });
}

export async function getStudents(req, res) {
  const { q = "", risk = "all" } = req.query;

  const filter = {};
  if (q) {
    filter.name = { $regex: q, $options: "i" };
  }

  if (risk === "At Risk" || risk === "Disengaged" || risk === "Engaged") {
    filter.engagementStatus = risk;
  }

  const students = await Student.find(filter)
    .select("name studentId attendance marks engagementStatus riskLevel confidenceScore course")
    .sort({ name: 1 });

  return res.json(students);
}

export async function getStudentById(req, res) {
  const student = await Student.findById(req.params.id);
  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }
  return res.json(student);
}

export async function getTeacherAnalytics(req, res) {
  const students = await Student.find({}).select("engagementStatus confidenceScore");
  const total = students.length;

  const engaged = students.filter((s) => s.engagementStatus === "Engaged").length;
  const atRisk = students.filter((s) => s.engagementStatus === "At Risk").length;
  const disengaged = students.filter((s) => s.engagementStatus === "Disengaged").length;
  const highRisk = disengaged;

  const averageConfidence =
    total === 0 ? 0 : students.reduce((sum, s) => sum + (s.confidenceScore || 0), 0) / total;

  return res.json({
    totalStudents: total,
    engaged,
    atRisk,
    disengaged,
    highRisk,
    averageConfidence: Number(averageConfidence.toFixed(3))
  });
}
