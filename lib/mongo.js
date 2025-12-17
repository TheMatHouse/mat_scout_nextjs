import mongoose from "mongoose";
import logger from "./logger.js";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI not defined in environment");
}

/**
 * IMPORTANT:
 * - Disable mongoose buffering (critical for Next.js)
 * - Prevents Server Components from hanging forever
 */
mongoose.set("bufferCommands", false);

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = {
    conn: null,
    promise: null,
  };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      })
      .then((mongooseInstance) => {
        logger.info("✅ MongoDB connected");
        return mongooseInstance;
      })
      .catch((err) => {
        cached.promise = null; // allow retry
        logger.error("❌ MongoDB connection failed:", err.message);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
