import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";

export function verifyTokenFromCookie() {
  const cookieStore = cookies(); // ✅ no await needed
  const token = cookieStore.get("token")?.value;
  console.log("Token from cookie:", token);
  if (!token) return null;
  return verifyToken(token);
}
