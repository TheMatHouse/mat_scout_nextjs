// app/api/results/summary/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import User from "@/models/userModel";
import FamilyMember from "@/models/familyMemberModel";
import MatchReport from "@/models/matchReportModel";

function json(data, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

const norm = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase();
const normalizeResult = (val) => {
  const v = String(val || "")
    .trim()
    .toLowerCase();
  if (v === "won" || v === "win" || v === "w") return "win";
  if (v === "lost" || v === "loss" || v === "l") return "loss";
  if (v === "draw" || v === "tie" || v === "d") return "draw";
  return "";
};

export async function GET(req) {
  await connectDB();

  const url = new URL(req.url);
  const username = url.searchParams.get("username"); // public profile path
  const athleteIdQS = url.searchParams.get("athleteId"); // optional (family member)
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let ownerUser = null;
  let targetAthleteId = null;

  if (username) {
    // Public profile mode
    ownerUser = await User.findOne({ username }).select(
      "_id allowPublic username"
    );
    if (!ownerUser) return json({ error: "User not found" }, 404);

    const me = await getCurrentUserFromCookies().catch(() => null);
    const isOwnerViewing = me && String(me._id) === String(ownerUser._id);

    if (!ownerUser.allowPublic && !isOwnerViewing) {
      return json({ error: "Forbidden" }, 403);
    }

    if (athleteIdQS && athleteIdQS !== String(ownerUser._id)) {
      const fam = await FamilyMember.findOne({
        _id: athleteIdQS,
        userId: ownerUser._id,
      }).lean();
      if (!fam) return json({ error: "Invalid family member" }, 404);
      targetAthleteId = String(fam._id);
    } else {
      targetAthleteId = String(ownerUser._id);
    }
  } else {
    // Logged-in dashboard mode
    const me = await getCurrentUserFromCookies();
    if (!me) return json({ error: "Unauthorized" }, 401);

    ownerUser = me;

    if (athleteIdQS && athleteIdQS !== String(me._id)) {
      const fam = await FamilyMember.findOne({
        _id: athleteIdQS,
        userId: me._id,
      }).lean();
      if (!fam) return json({ error: "Forbidden" }, 403);
      targetAthleteId = String(fam._id);
    } else {
      targetAthleteId = String(me._id);
    }
  }

  // Only this athlete’s matches
  const baseQuery = {
    athleteId: { $in: [targetAthleteId, String(targetAthleteId)] },
  };

  const dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);
  if (Object.keys(dateFilter).length) baseQuery.matchDate = dateFilter;

  const reports = await MatchReport.find(baseQuery)
    .select("matchType result")
    .lean();

  // Aggregate
  const byKey = new Map();
  const totals = { wins: 0, losses: 0, draws: 0 };

  for (const r of reports) {
    const label = String(r.matchType || "").trim();
    if (!label) continue;
    const key = norm(label);
    if (!byKey.has(key))
      byKey.set(key, { wins: 0, losses: 0, draws: 0, label });
    const out = normalizeResult(r.result);
    if (out === "win") {
      byKey.get(key).wins += 1;
      totals.wins += 1;
    } else if (out === "loss") {
      byKey.get(key).losses += 1;
      totals.losses += 1;
    } else if (out === "draw") {
      byKey.get(key).draws += 1;
      totals.draws += 1;
    }
  }

  // Return format that StyleCard.getTotals() can read easily
  const byStyle = {};
  for (const [key, v] of byKey.entries()) {
    const small = { wins: v.wins, losses: v.losses };
    byStyle[key] = small; // normalized key
    if (v.label) byStyle[v.label] = small; // human label key
  }

  return json({ byStyle, totals });
}
