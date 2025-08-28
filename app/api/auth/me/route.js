export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const body = user
      ? {
          loggedIn: true,
          user: {
            id: String(user._id),
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar || null,
          },
        }
      : { loggedIn: false };

    return new NextResponse(JSON.stringify(body), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch {
    // Fail closed as logged out
    return new NextResponse(JSON.stringify({ loggedIn: false }), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
}
