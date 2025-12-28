export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import AttendanceRecord from "@/models/attendanceRecordModel";
import AthleteAttendanceStats from "@/models/athleteAttendanceStatsModel";

export async function GET() {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [last30, thisMonth, stats] = await Promise.all([
      AttendanceRecord.countDocuments({
        athlete: user._id,
        attendedAt: { $gte: thirtyDaysAgo },
      }),
      AttendanceRecord.countDocuments({
        athlete: user._id,
        attendedAt: { $gte: monthStart },
      }),
      AthleteAttendanceStats.findOne({ athlete: user._id }),
    ]);

    return NextResponse.json({
      last30Days: last30,
      thisMonth,
      lifetime: stats?.lifetimeClasses || 0,
      sincePromotion: stats?.rankCycleClasses || 0,
      currentRank: stats?.currentRank || null,
    });
  } catch (err) {
    console.error("Attendance summary failed:", err);
    return NextResponse.json(
      { error: "Failed to load attendance summary" },
      { status: 500 }
    );
  }
}
