// app/api/auth/me/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return new NextResponse(JSON.stringify({ loggedIn: false }), {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    // Expose all fields your UI expects, plus dual id fields.
    // Do NOT compute avatar here—UI already does logic by avatarType.
    const body = {
      loggedIn: true,
      user: {
        id: user.id, // string
        _id: user._id, // same string
        email: user.email || null,
        username: user.username || null,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        avatarType: user.avatarType || "default",
        avatar: user.avatar || null,
        googleAvatar: user.googleAvatar || null,
        facebookAvatar: user.facebookAvatar || null,
        allowPublic: !!user.allowPublic,
        // Add any other flags you rely on elsewhere
      },
    };

    return new NextResponse(JSON.stringify(body), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    // Fail closed as logged out (never throw)
    return new NextResponse(JSON.stringify({ loggedIn: false }), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
}
