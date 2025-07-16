// lib/auth.js
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import User from "@/models/userModel";
import { connectDB } from "./mongo";

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

  const cookieStore = await cookies(); // await is correct here
  console.log("cookieStore:", cookieStore);

  const token = cookieStore.get("token")?.value;
  console.log("Token from cookie:", token);

  if (!token) return null;

  try {
    const decoded = await verifyToken(token);
    console.log("Decoded token:", decoded);
    const user = await User.findById(decoded._id);
    return user || null;
  } catch (err) {
    console.error("getCurrentUserFromCookies error:", err.message);
    return null;
  }
}
