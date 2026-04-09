import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/User.js";
import { Student } from "../models/Student.js";
import { predictEngagement } from "../services/predictService.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function isGmailAddress(email = "") {
  return /^[^\s@]+@(gmail\.com|googlemail\.com)$/i.test(email.trim());
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

function authResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    studentRef: user.studentRef
  };
}

async function generateStudentId() {
  const total = await Student.countDocuments();
  let next = total + 1;

  while (true) {
    const studentId = `EDU${String(next).padStart(4, "0")}`;
    // Ensure uniqueness even if some records were deleted earlier.
    const exists = await Student.exists({ studentId });
    if (!exists) return studentId;
    next += 1;
  }
}

function hashSeed(value) {
  return [...value].reduce((total, char, index) => total + char.charCodeAt(0) * (index + 1), 0);
}

function seededRange(seed, min, max, offset = 0) {
  const span = max - min + 1;
  return min + ((seed + offset) % span);
}

function buildDefaultStudentProfile(studentId, name, course = "General Studies") {
  const seed = hashSeed(`${studentId}:${name}:${course}`);
  const attendance = seededRange(seed, 64, 95);
  const marks = seededRange(seed, 58, 91, 11);
  const behaviorRating = seededRange(seed, 2, 5, 23);
  const feedbackOptions = [
    "Shows steady classroom participation",
    "Needs occasional support to stay focused",
    "Responds well to guided practice",
    "Demonstrates improving confidence in coursework"
  ];
  const feedbackText = feedbackOptions[seed % feedbackOptions.length];
  const prediction = predictEngagement({
    attendance,
    marks,
    behaviorRating,
    feedbackText
  });

  return {
    name: name.trim(),
    course: course?.trim() || "General Studies",
    attendance,
    marks,
    behaviorRating,
    feedbackText,
    engagementStatus: prediction.engagement_status,
    riskLevel: prediction.risk_level,
    confidenceScore: prediction.confidence_score,
    feedbackHistory: [{ text: feedbackText }],
    performanceTrend: [
      { term: "Term 1", marks: Math.max(40, marks - 6) },
      { term: "Term 2", marks: Math.max(42, marks - 3) },
      { term: "Term 3", marks }
    ],
    predictionLogs: [
      {
        attendance,
        marks,
        behaviorRating,
        feedbackText,
        engagementStatus: prediction.engagement_status,
        confidenceScore: prediction.confidence_score,
        explanation: prediction.explanation
      }
    ]
  };
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (!isGmailAddress(email)) {
      return res.status(400).json({ message: "Please login using a Google Mail (Gmail) address" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).populate("studentRef");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken(user._id);

    return res.json({
      token,
      user: authResponse(user)
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Login failed" });
  }
}

export async function googleLogin(req, res) {
  const { credential } = req.body || {};

  if (!credential) {
    return res.status(400).json({ message: "Google credential is required" });
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({ message: "Google Sign-In is not configured on the server" });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const email = (payload?.email || "").toLowerCase();
    const displayName = payload?.name?.trim() || "Google User";
    const emailVerified = Boolean(payload?.email_verified);

    if (!email || !emailVerified || !isGmailAddress(email)) {
      return res.status(401).json({ message: "Google account is invalid or not eligible" });
    }

    let user = await User.findOne({ email }).populate("studentRef");

    if (!user) {
      const studentId = await generateStudentId();
      const student = await Student.create({
        studentId,
        ...buildDefaultStudentProfile(studentId, displayName, "General Studies")
      });

      const randomPassword = `Google@${Math.random().toString(36).slice(2)}${Date.now()}`;
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      const createdUser = await User.create({
        name: displayName,
        email,
        passwordHash,
        role: "student",
        studentRef: student._id
      });

      user = await User.findById(createdUser._id).populate("studentRef");
    }

    const token = signToken(user._id);
    return res.json({ token, user: authResponse(user) });
  } catch (error) {
    return res.status(401).json({ message: "Google authentication failed" });
  }
}

export async function register(req, res) {
  try {
    const { name, email, password, role = "student", course } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!isGmailAddress(normalizedEmail)) {
      return res.status(400).json({ message: "Please register using a Google Mail (Gmail) address" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const normalizedRole = role === "teacher" ? "teacher" : "student";
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    let studentRef = null;
    if (normalizedRole === "student") {
      const studentId = await generateStudentId();
      const createdStudent = await Student.create({
        studentId,
        ...buildDefaultStudentProfile(studentId, name, course)
      });
      studentRef = createdStudent._id;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: normalizedRole,
      studentRef
    });

    const populatedUser = await User.findById(user._id).populate("studentRef");
    const token = signToken(populatedUser._id);

    return res.status(201).json({ token, user: authResponse(populatedUser) });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(400).json({ message: error.message || "Registration failed" });
  }
}

export async function resetPassword(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!isGmailAddress(normalizedEmail)) {
      return res.status(400).json({ message: "Please use a Google Mail (Gmail) address" });
    }

    if (password.trim().length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "No account found for this email" });
    }

    user.passwordHash = await bcrypt.hash(password.trim(), 10);
    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Password reset error:", error);
    return res.status(500).json({ message: "Unable to reset password" });
  }
}

export async function me(req, res) {
  return res.json({
    user: authResponse(req.user)
  });
}
