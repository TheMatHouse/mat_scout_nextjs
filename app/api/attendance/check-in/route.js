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
      "cache-control": "no-store, no-cache, must-revalidate",
      pragma: "no-cache",
    },
  });
}

function toInt(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function POST(req) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user?._id) {
      return noStore({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const disciplineRaw = body.discipline ?? null;

    // --- accept BOTH shapes (old + new) ---
    const attendedAtRaw = body.attendedAt;

    const clubIdRaw = body.clubId ?? body.teamId ?? null; // Team _id
    const clubNameRaw = body.clubName ?? body.teamName ?? null;

    // old: classType string
    const classTypeRaw = body.classType ?? null;

    // new: classComponents array (we'll map to classType when possible)
    const classComponentsRaw = Array.isArray(body.classComponents)
      ? body.classComponents
      : [];

    const visibility = body.visibility || "public";
    const createdBy = body.createdBy || "athlete";

    // family flow later (optional)
    const athleteIdRaw = body.athleteId || null;

    if (!attendedAtRaw) {
      return noStore({ error: "attendedAt is required" }, 400);
    }

    const attendedAt = new Date(attendedAtRaw);
    if (Number.isNaN(attendedAt.getTime())) {
      return noStore({ error: "Invalid attendedAt" }, 400);
    }

    // Decide athlete (self by default)
    const athleteId = athleteIdRaw ? String(athleteIdRaw) : String(user._id);

    // Require a club/team name or id (since your product idea depends on it)
    const clubId = clubIdRaw ? String(clubIdRaw) : null;
    const clubNameFallback = !clubId
      ? clubNameRaw
        ? String(clubNameRaw)
        : null
      : null;

    if (!clubId && !clubNameFallback) {
      return noStore({ error: "Please select or enter a club/team." }, 400);
    }

    // Duplicate window (minutes) — env controlled
    const DUPLICATE_WINDOW_MINUTES = toInt(
      process.env.ATTENDANCE_DUPLICATE_WINDOW_MINUTES,
      90
    );

    const windowStart = new Date(
      Date.now() - DUPLICATE_WINDOW_MINUTES * 60 * 1000
    );

    // Duplicate check (same athlete within time window)
    const existing = await AttendanceRecord.findOne({
      athlete: new mongoose.Types.ObjectId(athleteId),
      attendedAt: { $gte: windowStart },
    }).lean();

    if (existing) {
      return noStore({ error: "Already checked in recently" }, 409);
    }

    // Determine what to store for "classType"
    // - If old payload provided, use it
    // - Else if exactly 1 component selected, use that as classType
    // - Else leave null (or you can later add classComponents to the schema)
    let classType = classTypeRaw ? String(classTypeRaw) : null;
    if (
      !classType &&
      Array.isArray(classComponentsRaw) &&
      classComponentsRaw.length === 1
    ) {
      classType = String(classComponentsRaw[0]);
    }

    const attendance = await AttendanceRecord.create({
      athlete: new mongoose.Types.ObjectId(athleteId),
      club: clubId ? new mongoose.Types.ObjectId(clubId) : null,
      clubNameFallback,
      attendedAt,
      discipline: disciplineRaw ? String(disciplineRaw).trim() : null,
      createdBy,
      visibility,
    });

    // ---- update cached stats ----
    const stats =
      (await AthleteAttendanceStats.findOne({
        athlete: new mongoose.Types.ObjectId(athleteId),
      })) ||
      (await AthleteAttendanceStats.create({
        athlete: new mongoose.Types.ObjectId(athleteId),
      }));

    stats.lifetimeClasses = (stats.lifetimeClasses || 0) + 1;
    stats.rankCycleClasses = (stats.rankCycleClasses || 0) + 1;
    await stats.save();

    return noStore({ success: true, attendance });
  } catch (err) {
    console.error("Athlete check-in failed:", err);
    return noStore({ error: "Failed to check in" }, 500);
  }
}
