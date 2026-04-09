import mongoose from "mongoose";

export async function connectDb(uri) {
  if (!uri) {
    throw new Error("Missing MONGODB_URI in environment");
  }

  await mongoose.connect(uri);
  console.log("MongoDB connected");
}
