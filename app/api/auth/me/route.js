// app/api/auth/me/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";

function toSafeUser(u) {
  if (!u) return null;

  // Build a safe, whitelisted payload (no password/tokens/etc.)
  const safe = {
    id: String(u._id),
    email: u.email || null,
    username: u.username || null,
    firstName: u.firstName || "",
    lastName: u.lastName || "",
    avatarType: u.avatarType || "default",
    avatar: u.avatar || null,
    googleAvatar: u.googleAvatar || null,
    facebookAvatar: u.facebookAvatar || null,
    // add other non-sensitive flags your UI needs:
    allowPublic: Boolean(u.allowPublic),
    createdAt: u.createdAt || null,
    updatedAt: u.updatedAt || null,
  };

  // Convenience: a single resolved URL the client can use directly
  safe.resolvedAvatar =
    safe.avatarType === "google"
      ? safe.googleAvatar || safe.avatar
      : safe.avatarType === "facebook"
      ? safe.facebookAvatar || safe.avatar
      : safe.avatar;

  return safe;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    const safeUser = toSafeUser(user);

    const body = user
      ? { loggedIn: true, user: safeUser }
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
