import mongoose from "mongoose";

export async function connectDB() {
  try {
    console.log("✅ MONGO_URI:", process.env.MONGO_URI); // This should always print
    const conn = await mongoose.connect(String(process.env.MONGO_URI));
    if (conn) {
      console.log("CONNECTED");
    }
    return conn;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    throw new Error(err);
  }
}
