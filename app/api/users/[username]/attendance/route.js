export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import UserStyle from "@/models/userStyleModel";
import AttendanceRecord from "@/models/attendanceRecordModel";
import Team from "@/models/teamModel";
import { cookies } from "next/headers";

function escapeRegex(s = "") {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function norm(v) {
  return String(v || "")
    .trim()
    .toLowerCase();
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
      .select("_id")
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
        if (payload?.userId === String(user._id)) isOwner = true;
      } catch {}
    }

    /* ---------------- Attendance ---------------- */

    const records = await AttendanceRecord.find({
      athlete: user._id,
      ...(isOwner ? {} : { visibility: "public" }),
    })
      .sort({ attendedAt: -1 })
      .limit(60)
      .lean();

    /* ---------------- Teams ---------------- */

    const clubIds = records
      .map((r) => r.club)
      .filter(Boolean)
      .map(String);

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

    /* ---------------- Last 30 Days ---------------- */

    const cutoff30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const last30DaysByDiscipline = {};

    for (const r of records) {
      if (!isOwner && r.visibility !== "public") continue;
      const ts = new Date(r.attendedAt).getTime();
      if (!Number.isFinite(ts) || ts < cutoff30) continue;

      const d = norm(r.discipline);
      last30DaysByDiscipline[d] = (last30DaysByDiscipline[d] || 0) + 1;
    }

    /* ---------------- Since Promotion (CORRECT) ---------------- */

    const styles = await UserStyle.find({
      userId: user._id,
      familyMemberId: null,
    }).lean();

    const sincePromotion = {};

    for (const style of styles) {
      if (!Array.isArray(style.promotions) || style.promotions.length === 0)
        continue;

      const styleKey = norm(style.styleName);

      // explicitly ignore wrestling
      if (styleKey.includes("wrestling")) continue;

      const lastPromotion = style.promotions.reduce(
        (acc, p) => (!acc || p.promotedOn > acc.promotedOn ? p : acc),
        null
      );

      if (!lastPromotion?.promotedOn) continue;

      const fromTs = new Date(lastPromotion.promotedOn).getTime();
      if (!Number.isFinite(fromTs)) continue;

      let count = 0;

      for (const r of records) {
        if (!isOwner && r.visibility !== "public") continue;

        const ts = new Date(r.attendedAt).getTime();
        if (!Number.isFinite(ts) || ts < fromTs) continue;

        if (norm(r.discipline) === styleKey) {
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
    console.error("attendance route error", err);
    return NextResponse.json({ records: [], stats: {} }, { status: 500 });
  }
}
