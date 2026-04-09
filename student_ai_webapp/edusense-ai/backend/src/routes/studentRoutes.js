import { Router } from "express";
import { createStudent, getStudentById, getStudents, getTeacherAnalytics } from "../controllers/studentController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.post("/students", protect, authorize("teacher"), createStudent);
router.get("/students", getStudents);
router.get("/student/:id", getStudentById);
router.get("/analytics", getTeacherAnalytics);

export default router;
