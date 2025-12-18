import mongoose from "mongoose";
import logger from "./logger.js";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI not defined in environment");
}

/**
 * IMPORTANT:
 * - Disable mongoose buffering (critical for Next.js App Router)
 * - Prevents Server Components from hanging forever
 */
mongoose.set("bufferCommands", false);

/**
 * GLOBAL CONNECTION CACHE
 * Prevents multiple connections in Next.js
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = {
    conn: null,
    promise: null,
  };
}

/**
 * 🔥 CRITICAL STABILITY FIX
 * If Mongo disconnects or errors AFTER startup,
 * clear the cached connection so the app can self-heal.
 */
mongoose.connection.on("disconnected", () => {
  logger.warn("⚠️ MongoDB disconnected — clearing cached connection");
  if (global.mongoose) {
    global.mongoose.conn = null;
    global.mongoose.promise = null;
  }
});

mongoose.connection.on("error", (err) => {
  logger.error("❌ MongoDB connection error:", err.message);
  if (global.mongoose) {
    global.mongoose.conn = null;
    global.mongoose.promise = null;
  }
});

/**
 * CONNECT FUNCTION
 * - Fails fast
 * - Self-recovers
 * - Safe for Server Components
 * - 🔒 Forces IPv4 to avoid MongoDB Atlas SRV + IPv6 instability
 */
export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4, // 🔒 FINAL FIX: force IPv4 only
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
