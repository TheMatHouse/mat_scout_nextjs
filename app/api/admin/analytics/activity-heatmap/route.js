export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import User from "@/models/userModel";

/**
 * GET /api/admin/analytics/activity-heatmap
 *
 * Returns activity counts for users active in the last 30 days,
 * bucketed by day-of-week (0–6, Sun–Sat) and hour-of-day (0–23).
 */
export async function GET() {
  try {
    await connectDB();

    const me = await getCurrentUser();
    if (!me || !me.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Initialize empty 7x24 grid
    const grid = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => 0)
    );

    // Pull only what we need
    const users = await User.find(
      {
        $or: [
          { lastActiveAt: { $gte: since } },
          { lastLogin: { $gte: since } },
        ],
      },
      {
        lastActiveAt: 1,
        lastLogin: 1,
      }
    ).lean();

    for (const u of users) {
      const d = u.lastActiveAt || u.lastLogin;
      if (!d) continue;

      const date = new Date(d);
      if (Number.isNaN(date.getTime())) continue;

      const day = date.getDay(); // 0 (Sun) → 6 (Sat)
      const hour = date.getHours(); // 0 → 23

      if (grid[day] && typeof grid[day][hour] === "number") {
        grid[day][hour] += 1;
      }
    }

    return NextResponse.json({
      windowDays: 30,
      generatedAt: now.toISOString(),
      grid,
    });
  } catch (err) {
    console.error("activity-heatmap error:", err);
    return NextResponse.json(
      { error: "Failed to generate heatmap" },
      { status: 500 }
    );
  }
}
