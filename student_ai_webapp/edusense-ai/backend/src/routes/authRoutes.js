import { Router } from "express";
import { googleLogin, login, me, register, resetPassword } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.post("/login", login);
router.post("/register", register);
router.post("/reset-password", resetPassword);
router.post("/google-login", googleLogin);
router.get("/me", protect, me);

export default router;
