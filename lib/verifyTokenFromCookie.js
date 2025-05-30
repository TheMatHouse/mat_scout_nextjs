// lib/verifyTokenFromCookie.js
import { cookies } from "next/headers";
import { verifyToken } from "./jwt";

export async function verifyTokenFromCookie() {
  const cookieStore = cookies(); // ✅ correct usage
  const token = cookieStore.get("token")?.value;

  if (!token) return null;

  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}
