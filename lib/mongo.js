import mongoose from "mongoose";
import logger from "./logger"; // ⬅️ Make sure this path is correct

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI not defined in environment");
}

let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI); // ✅ Clean connection
    isConnected = true;
    logger.info("✅ MongoDB connected");
  } catch (err) {
    logger.error("❌ MongoDB connection error:", err.message);
    throw err;
  }
}
