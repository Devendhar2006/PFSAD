import "dotenv/config";
import express from "express";
import cors from "cors";

import { connectDb } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import predictRoutes from "./routes/predictRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const app = express();
const port = process.env.PORT || 5000;
const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, origin);
        return;
      }

      callback(new Error("CORS origin not allowed"));
    },
    credentials: true
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "EduSense AI API running" });
});

app.use("/", authRoutes);
app.use("/", predictRoutes);
app.use("/", studentRoutes);
app.use("/", messageRoutes);
app.use("/api", authRoutes);
app.use("/api", predictRoutes);
app.use("/api", studentRoutes);
app.use("/api", messageRoutes);

app.use(notFound);
app.use(errorHandler);

connectDb(process.env.MONGODB_URI)
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1);
  });
