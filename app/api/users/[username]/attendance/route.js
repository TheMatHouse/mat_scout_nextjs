export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import AttendanceRecord from "@/models/attendanceRecordModel";
import { cookies } from "next/headers";

function escapeRegex(s = "") {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req, context) {
  try {
    console.log("ROUTE HIT");

    await connectDB();

    // ✅ FIX 1: await params
    const { username } = await context.params;

    // ✅ FIX 2: await cookies()
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    const user = await User.findOne({
      username: { $regex: `^${escapeRegex(username)}$`, $options: "i" },
    }).lean();

    if (!user?._id) {
      return NextResponse.json({ records: [] });
    }

    let isOwner = false;
    if (token) {
      try {
        const payload = JSON.parse(
          Buffer.from(token.split(".")[1], "base64").toString()
        );
        if (payload?.userId === String(user._id)) {
          isOwner = true;
        }
      } catch {}
    }

    // 🔒 IMPORTANT: Do NOT populate team — it is not in schema
    const query = {
      athlete: user._id,
      ...(isOwner ? {} : { visibility: "public" }),
    };

    const records = await AttendanceRecord.find(query)
      .sort({ attendedAt: -1 })
      .limit(30)
      .lean();

    const normalized = records.map((r) => ({
      _id: String(r._id),
      attendedAt: r.attendedAt,
      discipline: r.discipline || "",
      teamId: r.team || null, // keep raw ID if present
      visibility: r.visibility || "public",
    }));

    return NextResponse.json({ records: normalized });
  } catch (err) {
    console.error("GET /api/users/[username]/attendance error:", err);
    return NextResponse.json({ records: [] }, { status: 500 });
  }
}
