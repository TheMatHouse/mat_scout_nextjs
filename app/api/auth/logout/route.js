// app/api/auth/logout/route.js
import { cookies } from "next/headers";

export async function POST() {
  cookies().set("token", "", {
    httpOnly: true,
    path: "/",
    expires: new Date(0), // expires now
  });

  return new Response(JSON.stringify({ message: "Logout successful" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
