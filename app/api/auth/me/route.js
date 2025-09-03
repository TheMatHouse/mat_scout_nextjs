// app/api/auth/me/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import { getCurrentUser } from "@/lib/auth-server";

// robust admin detector (inline to keep this file self-contained)
function isAdminUser(u) {
  if (!u) return false;
  if (u.isAdmin === true) return true;

  if (typeof u.isAdmin === "string") {
    const s = u.isAdmin.toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
  }
  if (typeof u.isAdmin === "number" && u.isAdmin === 1) return true;

  const toStr = (x) => String(x ?? "").toLowerCase();

  if (
    typeof u.role === "string" &&
    ["admin", "superadmin"].includes(toStr(u.role))
  ) {
    return true;
  }
  if (
    Array.isArray(u.roles) &&
    u.roles.some((r) => ["admin", "superadmin"].includes(toStr(r)))
  ) {
    return true;
  }
  if (
    Array.isArray(u.permissions) &&
    u.permissions.some((p) => ["admin", "site:admin"].includes(toStr(p)))
  ) {
    return true;
  }
  if (
    Array.isArray(u.scopes) &&
    u.scopes.some((s) => ["admin", "site:admin"].includes(toStr(s)))
  ) {
    return true;
  }
  if (Array.isArray(u.teamMemberships)) {
    if (
      u.teamMemberships.some(
        (m) =>
          m?.isAdmin === true || ["admin", "owner"].includes(toStr(m?.role))
      )
    ) {
      return true;
    }
  }
  return false;
}

export async function GET() {
  try {
    await connectDB();

    const sessionUser = await getCurrentUser();
    if (!sessionUser?._id && !sessionUser?.id) {
      return new NextResponse(JSON.stringify({ loggedIn: false }), {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    const lookupId = String(sessionUser._id || sessionUser.id || "");
    const dbUser =
      (lookupId ? await User.findById(lookupId).lean() : null) ||
      (sessionUser.email
        ? await User.findOne({ email: sessionUser.email }).lean()
        : null);

    if (!dbUser) {
      return new NextResponse(JSON.stringify({ loggedIn: false }), {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    const out = {
      loggedIn: true,
      user: {
        id: dbUser._id.toString(),
        _id: dbUser._id.toString(),

        email: dbUser.email || null,
        username: dbUser.username || null,
        firstName: dbUser.firstName || "",
        lastName: dbUser.lastName || "",

        // ✨ added profile fields so DashboardSettings sees them
        city: dbUser.city || "",
        state: dbUser.state || "",
        country: dbUser.country || "",
        gender: dbUser.gender || "",
        bMonth: dbUser.bMonth || "",
        bDay: dbUser.bDay || "",
        bYear: dbUser.bYear || "",

        allowPublic: !!dbUser.allowPublic,

        avatarType: dbUser.avatarType || "default",
        avatar: dbUser.avatar || null,
        googleAvatar: dbUser.googleAvatar || null,
        facebookAvatar: dbUser.facebookAvatar || null,
        avatarId: dbUser.avatarId || null,

        verified: !!dbUser.verified,
        provider: dbUser.provider || null,

        // raw fields (handy for debugging)
        isAdminRaw: dbUser.isAdmin ?? null,
        role: dbUser.role ?? null,
        roles: Array.isArray(dbUser.roles) ? dbUser.roles : [],
        permissions: Array.isArray(dbUser.permissions)
          ? dbUser.permissions
          : [],
        scopes: Array.isArray(dbUser.scopes) ? dbUser.scopes : [],
        teamMemberships: Array.isArray(dbUser.teamMemberships)
          ? dbUser.teamMemberships
          : [],

        // normalized flag the UI should use
        isAdmin: isAdminUser(dbUser),
      },
    };

    return new NextResponse(JSON.stringify(out), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    console.error("[/api/auth/me] error:", err);
    return new NextResponse(JSON.stringify({ loggedIn: false }), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
}
