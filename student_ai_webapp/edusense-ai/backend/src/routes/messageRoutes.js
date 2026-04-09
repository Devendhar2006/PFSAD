import { Router } from "express";
import { sendMessage, getMessages, markAsRead, deleteMessage, sendReply } from "../controllers/messageController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

// Send a message (teacher only)
router.post("/send-message", protect, sendMessage);

// Get messages for a student
router.get("/messages/:studentId", getMessages);

// Mark message as read
router.patch("/message/:messageId/read", markAsRead);

// Delete a message
router.delete("/message/:messageId", protect, deleteMessage);

// Send a reply to a message
router.post("/reply/:messageId", protect, sendReply);

export default router;
