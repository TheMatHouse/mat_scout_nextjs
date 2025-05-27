import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";

export async function verifyTokenFromCookie() {
  const cookieStore = await cookies(); // ✅ make this async
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}
