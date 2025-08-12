// app/api/settings/notifications/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import { getCurrentUserFromCookies } from "@/lib/auth-server";

const DEFAULTS = {
  joinRequests: { inApp: true, email: true },
  teamUpdates: { inApp: true, email: true },
  scoutingReports: { inApp: true, email: true },
};

function bool(v, fallback) {
  return typeof v === "boolean" ? v : !!fallback;
}

function normalizeSettings(input) {
  // accept either {notificationSettings:{...}} or the object itself
  const src = input?.notificationSettings ?? input ?? {};
  return {
    joinRequests: {
      inApp: bool(src.joinRequests?.inApp, DEFAULTS.joinRequests.inApp),
      email: bool(src.joinRequests?.email, DEFAULTS.joinRequests.email),
    },
    teamUpdates: {
      inApp: bool(src.teamUpdates?.inApp, DEFAULTS.teamUpdates.inApp),
      email: bool(src.teamUpdates?.email, DEFAULTS.teamUpdates.email),
    },
    scoutingReports: {
      inApp: bool(src.scoutingReports?.inApp, DEFAULTS.scoutingReports.inApp),
      email: bool(src.scoutingReports?.email, DEFAULTS.scoutingReports.email),
    },
  };
}

export async function GET() {
  try {
    await connectDB();
    const auth = await getCurrentUserFromCookies();
    if (!auth?._id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // lean doc is fine for GET
    const user = await User.findById(auth._id)
      .select("notificationSettings")
      .lean();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = {
      ...DEFAULTS,
      ...(user.notificationSettings || {}),
    };

    return NextResponse.json(
      { notificationSettings: settings },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET notification settings error:", err);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    await connectDB();
    const auth = await getCurrentUserFromCookies();
    if (!auth?._id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const settings = normalizeSettings(body);

    // ✅ Update atomically; no reliance on user.save()
    const updated = await User.findByIdAndUpdate(
      auth._id,
      { $set: { notificationSettings: settings } },
      { new: true, runValidators: true, select: "notificationSettings" }
    );

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, notificationSettings: updated.notificationSettings },
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH notification settings error:", err);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
