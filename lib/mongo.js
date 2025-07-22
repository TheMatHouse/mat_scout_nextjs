import mongoose from "mongoose";
import logger from "@/lib/logger"; // ⬅️ Make sure this path is correct

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error("❌ MONGO_URI not defined in environment");
}

let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(MONGO_URI); // ✅ Clean connection
    isConnected = true;
    logger.info("✅ MongoDB connected");
  } catch (err) {
    logger.error("❌ MongoDB connection error:", err.message);
    throw err;
  }
}
