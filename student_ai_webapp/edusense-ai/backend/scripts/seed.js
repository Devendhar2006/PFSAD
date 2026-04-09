import "dotenv/config";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";

import { connectDb } from "../src/config/db.js";
import { Student } from "../src/models/Student.js";
import { User } from "../src/models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  try {
    await connectDb(process.env.MONGODB_URI);

    const seedPath = path.join(__dirname, "..", "data", "students.seed.json");
    const raw = fs.readFileSync(seedPath, "utf-8");
    const studentsPayload = JSON.parse(raw.replace(/^\uFEFF/, ""));

    await Student.deleteMany({});
    await User.deleteMany({});

    const students = await Student.insertMany(studentsPayload);

    const teacherHash = await bcrypt.hash("Teacher@123", 10);
    await User.create({
      name: "Dr. Neha Verma",
      email: "teacher.edusense.ai@gmail.com",
      passwordHash: teacherHash,
      role: "teacher"
    });

    const studentHash = await bcrypt.hash("Student@123", 10);
    const studentUsers = students.map((student) => ({
      name: student.name,
      email: `${student.studentId.toLowerCase()}@gmail.com`,
      passwordHash: studentHash,
      role: "student",
      studentRef: student._id
    }));

    await User.insertMany(studentUsers);

    console.log(`Seeded ${students.length} students`);
    console.log("Teacher login: teacher.edusense.ai@gmail.com / Teacher@123");
    console.log(`Student login sample: ${students[0].studentId.toLowerCase()}@gmail.com / Student@123`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
