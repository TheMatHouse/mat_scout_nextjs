export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import AttendanceRecord from "@/models/attendanceRecordModel";
import AthleteAttendanceStats from "@/models/athleteAttendanceStatsModel";

function noStore(payload, status = 200) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function POST(req) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user?._id) {
      return noStore({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const attendedAtRaw = body.attendedAt;

    if (!attendedAtRaw) {
      return noStore({ error: "attendedAt is required" }, 400);
    }

    const attendedAt = new Date(attendedAtRaw);
    if (Number.isNaN(attendedAt.getTime())) {
      return noStore({ error: "Invalid attendedAt" }, 400);
    }

    // 🚫 no future check-ins
    if (attendedAt.getTime() > Date.now()) {
      return noStore({ error: "Future check-ins are not allowed" }, 400);
    }

    const athleteId = body.athleteId || user._id;

    const clubId = body.teamId || null;
    const clubNameFallback = !clubId ? body.teamName?.trim() : null;

    if (!clubId && !clubNameFallback) {
      return noStore({ error: "Club is required" }, 400);
    }

    const existing = await AttendanceRecord.findOne({
      athlete: new mongoose.Types.ObjectId(athleteId),
      attendedAt: {
        $gte: new Date(Date.now() - 90 * 60 * 1000),
      },
    }).lean();

    if (existing) {
      return noStore({ error: "Already checked in recently" }, 409);
    }

    const attendance = await AttendanceRecord.create({
      athlete: new mongoose.Types.ObjectId(athleteId),
      club: clubId ? new mongoose.Types.ObjectId(clubId) : null,
      clubNameFallback,
      attendedAt,
      discipline: body.discipline || null,
      visibility: body.visibility || "public",
      createdBy: "athlete",
    });

    const stats =
      (await AthleteAttendanceStats.findOne({
        athlete: new mongoose.Types.ObjectId(athleteId),
      })) ||
      (await AthleteAttendanceStats.create({
        athlete: new mongoose.Types.ObjectId(athleteId),
      }));

    stats.lifetimeClasses++;
    stats.rankCycleClasses++;
    await stats.save();

    return noStore({ success: true, attendance });
  } catch (err) {
    console.error(err);
    return noStore({ error: "Failed to check in" }, 500);
  }
}
