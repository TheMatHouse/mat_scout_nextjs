export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import AttendanceRecord from "@/models/attendanceRecordModel";
import Team from "@/models/teamModel";
import { cookies } from "next/headers";

function escapeRegex(s = "") {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keyOf(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(req, context) {
  try {
    await connectDB();

    const { username } = await context.params;

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    const user = await User.findOne({
      username: { $regex: `^${escapeRegex(username)}$`, $options: "i" },
    })
      .select("_id userStyles")
      .lean();

    if (!user?._id) {
      return NextResponse.json({ records: [], stats: {} });
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

    /* --------------------------------------------------
       Attendance records
    -------------------------------------------------- */

    const query = {
      athlete: user._id,
      ...(isOwner ? {} : { visibility: "public" }),
    };

    const records = await AttendanceRecord.find(query)
      .sort({ attendedAt: -1 })
      .limit(60)
      .lean();

    /* --------------------------------------------------
       Resolve clubs
    -------------------------------------------------- */

    const clubIds = records
      .map((r) => r.club)
      .filter(Boolean)
      .map((id) => String(id));

    const teams = clubIds.length
      ? await Team.find({ _id: { $in: clubIds } })
          .select("teamName teamSlug")
          .lean()
      : [];

    const teamMap = Object.fromEntries(teams.map((t) => [String(t._id), t]));

    const normalized = records.map((r) => {
      const team = r.club ? teamMap[String(r.club)] : null;

      return {
        _id: String(r._id),
        attendedAt: r.attendedAt,
        discipline: r.discipline || "",
        visibility: r.visibility || "public",
        team: team
          ? {
              _id: String(team._id),
              teamName: team.teamName,
              teamSlug: team.teamSlug,
            }
          : null,
        clubNameFallback: r.clubNameFallback || null,
      };
    });

    /* --------------------------------------------------
       📊 Last 30 days
    -------------------------------------------------- */

    const now = Date.now();
    const cutoff30 = now - 30 * 24 * 60 * 60 * 1000;

    const last30DaysByDiscipline = {};

    for (const r of records) {
      if (!isOwner && r.visibility !== "public") continue;

      const ts = new Date(r.attendedAt).getTime();
      if (!Number.isFinite(ts) || ts < cutoff30) continue;

      const k = keyOf(r.discipline || "training");
      last30DaysByDiscipline[k] = (last30DaysByDiscipline[k] || 0) + 1;
    }

    /* --------------------------------------------------
       🥋 Since Last Promotion (FIXED, NON-BREAKING)
       - Per discipline
       - Uses promotion date if present
       - Falls back to first recorded session
    -------------------------------------------------- */

    const sincePromotion = {};
    const styles = Array.isArray(user.userStyles) ? user.userStyles : [];

    for (const style of styles) {
      const styleName = style.styleName || style.name;
      if (!styleName) continue;

      const styleKey = keyOf(styleName);

      // Promotion date OR fallback to earliest session
      let fromTs =
        new Date(
          style.currentRankDate || style.promotedAt || style.promotionDate || 0
        ).getTime() || Infinity;

      // If no promotion date, find earliest session for this discipline
      if (!Number.isFinite(fromTs) || fromTs === Infinity) {
        const first = records
          .filter((r) => keyOf(r.discipline) === styleKey)
          .map((r) => new Date(r.attendedAt).getTime())
          .filter(Number.isFinite)
          .sort((a, b) => a - b)[0];

        if (!Number.isFinite(first)) continue;
        fromTs = first;
      }

      let count = 0;

      for (const r of records) {
        if (!isOwner && r.visibility !== "public") continue;

        const ts = new Date(r.attendedAt).getTime();
        if (ts >= fromTs && keyOf(r.discipline) === styleKey) {
          count++;
        }
      }

      sincePromotion[styleKey] = count;
    }

    return NextResponse.json({
      records: normalized,
      stats: {
        last30DaysByDiscipline,
        sincePromotion,
      },
    });
  } catch (err) {
    console.error("GET attendance error:", err);
    return NextResponse.json({ records: [], stats: {} }, { status: 500 });
  }
}
