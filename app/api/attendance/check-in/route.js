export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import AttendanceRecord from "@/models/attendanceRecordModel";
import AthleteAttendanceStats from "@/models/athleteAttendanceStatsModel";

const DUPLICATE_WINDOW_MINUTES =
  Number(process.env.ATTENDANCE_DUPLICATE_WINDOW_MINUTES) || 90;

export async function POST(req) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { attendedAt, clubId, clubName, classType, visibility } = body;

    if (!attendedAt) {
      return NextResponse.json(
        { error: "attendedAt is required" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // Prevent duplicate check-ins within time window
    // --------------------------------------------------
    const windowStart = new Date(attendedAt);
    windowStart.setMinutes(windowStart.getMinutes() - DUPLICATE_WINDOW_MINUTES);

    const existing = await AttendanceRecord.findOne({
      athlete: user._id,
      attendedAt: { $gte: windowStart },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Already checked in for this practice." },
        { status: 409 }
      );
    }

    // --------------------------------------------------
    // Create attendance record
    // --------------------------------------------------
    const attendance = await AttendanceRecord.create({
      athlete: user._id,
      club: clubId || null,
      clubNameFallback: clubId ? null : clubName || null,
      attendedAt: new Date(attendedAt),
      classType: classType || null,
      createdBy: "athlete",
      visibility: visibility || "private",
    });

    // --------------------------------------------------
    // Update cached stats
    // --------------------------------------------------
    const stats =
      (await AthleteAttendanceStats.findOne({ athlete: user._id })) ||
      (await AthleteAttendanceStats.create({ athlete: user._id }));

    stats.lifetimeClasses += 1;
    stats.rankCycleClasses += 1;
    await stats.save();

    return NextResponse.json({ success: true, attendance });
  } catch (err) {
    console.error("Athlete check-in failed:", err);
    return NextResponse.json({ error: "Failed to check in" }, { status: 500 });
  }
}
