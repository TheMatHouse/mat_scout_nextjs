export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import { isClubAttendanceEnabled } from "@/lib/featureFlags";

import AttendanceRecord from "@/models/attendanceRecordModel";
import AthleteAttendanceStats from "@/models/athleteAttendanceStatsModel";

export async function POST(req, { params }) {
  if (!isClubAttendanceEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clubId } = await params;
    const { athleteId, classInstanceId } = await req.json();

    if (!athleteId || !classInstanceId) {
      return NextResponse.json(
        { error: "athleteId and classInstanceId required" },
        { status: 400 }
      );
    }

    const attendance = await AttendanceRecord.create({
      athlete: athleteId,
      club: clubId,
      classInstance: classInstanceId,
      attendedAt: new Date(),
      createdBy: "coach",
      visibility: "team",
    });

    const stats =
      (await AthleteAttendanceStats.findOne({ athlete: athleteId })) ||
      (await AthleteAttendanceStats.create({ athlete: athleteId }));

    stats.lifetimeClasses += 1;
    stats.rankCycleClasses += 1;
    await stats.save();

    return NextResponse.json({ success: true, attendance });
  } catch (err) {
    console.error("Club check-in failed:", err);
    return NextResponse.json(
      { error: "Failed to check in athlete" },
      { status: 500 }
    );
  }
}
