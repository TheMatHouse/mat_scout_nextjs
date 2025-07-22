// lib/auth.js
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import User from "@/models/userModel";
import { connectDB } from "./mongo";
import { toast } from "react-toastify";

const JWT_SECRET = process.env.JWT_SECRET || "your-default-dev-secret";

export function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
}

export async function getCurrentUserFromCookies() {
  await connectDB();

  const cookieStore = cookies(); // no need for `await` here

  const token = cookieStore.get("token")?.value;

  if (!token) return null;

  try {
    const decoded = await verifyToken(token);
    const user = await User.findById(decoded.userId); // ✅ FIXED
    return user || null;
  } catch (err) {
    toast.error("Something went wrong. Please try again.");
    return null;
  }
}
