export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import AttendanceRecord from "@/models/attendanceRecordModel";

export async function GET(req) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month")); // 0–11 optional

    if (!year) {
      return NextResponse.json({ error: "year is required" }, { status: 400 });
    }

    let start = new Date(year, month ?? 0, 1);
    let end =
      month !== null && month !== undefined
        ? new Date(year, month + 1, 1)
        : new Date(year + 1, 0, 1);

    const records = await AttendanceRecord.find({
      athlete: user._id,
      attendedAt: { $gte: start, $lt: end },
    })
      .sort({ attendedAt: -1 })
      .select("attendedAt club clubNameFallback classType createdBy visibility")
      .lean();

    return NextResponse.json({ records });
  } catch (err) {
    console.error("Attendance history failed:", err);
    return NextResponse.json(
      { error: "Failed to load attendance history" },
      { status: 500 }
    );
  }
}
