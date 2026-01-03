export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import AttendanceRecord from "@/models/attendanceRecordModel";

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

export async function GET(_req, { params }) {
  try {
    await connectDB();

    const viewer = await getCurrentUser();
    const athleteId = params?.athleteId;

    if (!mongoose.Types.ObjectId.isValid(athleteId)) {
      return noStore({ error: "Invalid athlete id" }, 400);
    }

    const athleteOID = new mongoose.Types.ObjectId(athleteId);
    const viewerIsOwner =
      viewer?._id && String(viewer._id) === String(athleteId);

    const visibilityFilter = viewerIsOwner ? {} : { visibility: "public" };

    const workouts = await AttendanceRecord.find(
      {
        athlete: athleteOID,
        ...visibilityFilter,
      },
      {
        athlete: 0,
        __v: 0,
      }
    )
      .sort({ attendedAt: -1 })
      .lean();

    // ---- summary ----
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const summary = {
      total: workouts.length,
      last30Days: workouts.filter(
        (w) => new Date(w.attendedAt) >= thirtyDaysAgo
      ).length,
      lastWorkoutAt: workouts[0]?.attendedAt || null,
      disciplines: Array.from(
        new Set(workouts.map((w) => w.discipline).filter(Boolean))
      ),
    };

    return noStore({ summary, workouts });
  } catch (err) {
    console.error("[GET /api/athletes/:id/attendance] error:", err);
    return noStore({ error: "Failed to load attendance" }, 500);
  }
}
