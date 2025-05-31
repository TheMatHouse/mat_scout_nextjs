// app/api/auth/me/route.js
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import { verifyToken } from "@/lib/jwt";

export async function GET() {
  const token = cookies().get("token");

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  await connectDB();

  const decoded = verifyToken(token.value);
  if (!decoded) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
    });
  }

  const user = await User.findById(decoded.userId).select("-password");
  if (!user) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
    });
  }

  return new Response(JSON.stringify({ user }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
