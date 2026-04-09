import { Message } from "../models/Message.js";

export async function sendMessage(req, res) {
  try {
    const { studentId, teacherId, teacherName, studentName, message } = req.body;

    if (!studentId || !teacherId || !teacherName || !message) {
      return res.status(400).json({ 
        message: "studentId, teacherId, teacherName, and message are required" 
      });
    }

    const newMessage = new Message({
      studentId,
      teacherId,
      teacherName,
      studentName,
      message,
      isRead: false
    });

    await newMessage.save();

    return res.status(201).json({
      message: "Message sent successfully",
      data: newMessage
    });
  } catch (error) {
    console.error("Send message error:", error);
    return res.status(500).json({ message: "Failed to send message" });
  }
}

export async function getMessages(req, res) {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({ message: "studentId is required" });
    }

    const messages = await Message.find({ studentId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(messages);
  } catch (error) {
    console.error("Get messages error:", error);
    return res.status(500).json({ message: "Failed to retrieve messages" });
  }
}

export async function markAsRead(req, res) {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({ message: "messageId is required" });
    }

    const message = await Message.findByIdAndUpdate(
      messageId,
      { isRead: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    return res.json({
      message: "Message marked as read",
      data: message
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    return res.status(500).json({ message: "Failed to update message" });
  }
}

export async function deleteMessage(req, res) {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({ message: "messageId is required" });
    }

    const message = await Message.findByIdAndDelete(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    return res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Delete message error:", error);
    return res.status(500).json({ message: "Failed to delete message" });
  }
}

export async function sendReply(req, res) {
  try {
    const { messageId } = req.params;
    const { text, senderName } = req.body;

    if (!messageId) {
      return res.status(400).json({ message: "messageId is required" });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Reply text is required" });
    }

    const message = await Message.findByIdAndUpdate(
      messageId,
      {
        $push: {
          replies: {
            sender: "student",
            senderName: senderName || "Student",
            text: text.trim(),
            createdAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    return res.json({
      message: "Reply sent successfully",
      data: message
    });
  } catch (error) {
    console.error("Send reply error:", error);
    return res.status(500).json({ message: "Failed to send reply" });
  }
}
