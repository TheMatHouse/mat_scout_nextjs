import mongoose from "mongoose";

export async function connectDB() {
  try {
    const conn = await mongoose.connect(String(process.env.MONGO_URI));

    return conn;
  } catch (err) {
    throw new Error(err);
  }
}
