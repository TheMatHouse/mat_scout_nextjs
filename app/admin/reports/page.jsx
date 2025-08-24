// app/admin/reports/page.jsx
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import Team from "@/models/teamModel";
import MatchReport from "@/models/matchReportModel";
import ScoutingReport from "@/models/scoutingReportModel";
import ReportsDashboard from "@/components/admin/reports/ReportsDashboard";

/** ---------- small in-memory cache (per server instance) ---------- */
const CACHE_TTL_MS = 60_000; // 60s
const cache = new Map(); // key -> { ts, data }

/** helper: yyyy-mm-dd */
function dstr(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** helper: list of dates (yyyy-mm-dd) inclusive */
function dateRangeDays(start, end) {
  const out = [];
  const d = new Date(start);
  while (d <= end) {
    out.push(dstr(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** fill missing dates over last N days (zeros become null so lines don't sit on the x-axis) */
function fillSeries(rows, daysBack, key = "date", valueKeys = ["count"]) {
  const end = new Date();
  const start = new Date(end.getTime() - (daysBack - 1) * 86400000);
  const days = dateRangeDays(start, end);
  const map = new Map(rows.map((r) => [r[key], r]));
  return days.map((day) => {
    const r = map.get(day) || {};
    const filled = { date: day };
    for (const k of valueKeys) {
      const v = Number(r[k] ?? 0);
      filled[k] = v === 0 ? null : v; // ⬅️ key change: null instead of 0
    }
    return filled;
  });
}

export default async function ReportsPage({ searchParams }) {
  await connectDB();

  const sp = await searchParams;
  const rawRange = parseInt(sp?.range, 10);
  const allowed = [7, 30, 90, 180, 365];
  const rangeDays = allowed.includes(rawRange) ? rawRange : 30;

  const key = `range:${rangeDays}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return <ReportsDashboard data={hit.data} />;
  }

  const since = (days) => new Date(Date.now() - days * 86400000);
  const sinceRange = since(rangeDays);

  const [matchByDayAgg, scoutByDayAgg] = await Promise.all([
    MatchReport.aggregate([
      { $match: { createdAt: { $gte: sinceRange } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
          public: { $sum: { $cond: ["$isPublic", 1, 0] } },
        },
      },
      { $project: { _id: 0, date: "$_id", count: 1, public: 1 } },
      { $sort: { date: 1 } },
    ]),
    ScoutingReport.aggregate([
      { $match: { createdAt: { $gte: sinceRange } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, date: "$_id", count: 1 } },
      { $sort: { date: 1 } },
    ]),
  ]);

  const matchSeries = fillSeries(matchByDayAgg, rangeDays, "date", [
    "count",
    "public",
  ]);
  const scoutSeries = fillSeries(scoutByDayAgg, rangeDays, "date", ["count"]);

  const [newUsersRange, newMatchesRange, newScoutsRange, totalTeams] =
    await Promise.all([
      User.countDocuments({ createdAt: { $gte: sinceRange } }),
      MatchReport.countDocuments({ createdAt: { $gte: sinceRange } }),
      ScoutingReport.countDocuments({ createdAt: { $gte: sinceRange } }),
      Team.countDocuments(),
    ]);

  const winLossByStyle = await MatchReport.aggregate([
    { $match: { createdAt: { $gte: sinceRange } } },
    {
      $group: {
        _id: "$matchType",
        total: { $sum: 1 },
        wins: { $sum: { $cond: [{ $eq: ["$result", "Won"] }, 1, 0] } },
        losses: { $sum: { $cond: [{ $eq: ["$result", "Lost"] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        styleName: { $ifNull: ["$_id", "(none)"] },
        total: 1,
        wins: 1,
        losses: 1,
        winRate: {
          $cond: [{ $gt: ["$total", 0] }, { $divide: ["$wins", "$total"] }, 0],
        },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 20 },
  ]);

  const [topOpponents, topTags] = await Promise.all([
    ScoutingReport.aggregate([
      {
        $match: {
          createdAt: { $gte: sinceRange },
          opponentName: { $exists: true, $ne: "" },
        },
      },
      { $group: { _id: "$opponentName", reports: { $sum: 1 } } },
      { $project: { _id: 0, opponent: "$_id", reports: 1 } },
      { $sort: { reports: -1 } },
      { $limit: 20 },
    ]),
    ScoutingReport.aggregate([
      { $match: { createdAt: { $gte: sinceRange } } },
      {
        $project: {
          tags: {
            $concatArrays: [
              { $ifNull: ["$opponentAttacks", []] },
              { $ifNull: ["$athleteAttacks", []] },
            ],
          },
        },
      },
      { $unwind: "$tags" },
      { $group: { _id: { $toLower: "$tags" }, c: { $sum: 1 } } },
      { $project: { _id: 0, tag: "$_id", count: "$c" } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
  ]);

  const newUsersInRange = await User.find({ createdAt: { $gte: sinceRange } })
    .select("_id createdAt")
    .lean();

  const firstMatchByUser = await MatchReport.aggregate([
    { $group: { _id: "$createdBy", firstReportAt: { $min: "$createdAt" } } },
  ]);
  const firstMap = new Map(
    firstMatchByUser.map((x) => [String(x._id), x.firstReportAt])
  );

  let fA_step1 = newUsersInRange.length;
  let fA_step2 = 0;
  const diffs = [];
  for (const u of newUsersInRange) {
    const f = firstMap.get(String(u._id));
    if (!f) continue;
    const days = Math.max(0, (f - u.createdAt) / 86400000);
    diffs.push(days);
    if (days <= 7) fA_step2++;
  }
  const fA_conv = fA_step1 ? Math.round((fA_step2 / fA_step1) * 100) : 0;
  const medianDays =
    diffs.length > 0
      ? diffs.sort((a, b) => a - b)[Math.floor(diffs.length / 2)]
      : 0;

  const usersWithStyle = await User.find({ "userStyles.0": { $exists: true } })
    .select("_id")
    .lean();
  const styleUserIds = usersWithStyle.map((u) => u._id);
  const authorsWithReports = await MatchReport.distinct("createdBy", {
    createdBy: { $in: styleUserIds },
  });
  const fB_step1 = styleUserIds.length;
  const fB_step2 = authorsWithReports.length;
  const fB_conv = fB_step1 ? Math.round((fB_step2 / fB_step1) * 100) : 0;

  const data = {
    generatedAt: new Date().toISOString(),
    rangeDays,
    kpis: {
      newUsers7: newUsersRange,
      newMatches7: newMatchesRange,
      newScouts7: newScoutsRange,
      totalTeams,
      pctWithin7: fA_conv,
      medianDays,
    },
    series: { matchSeries, scoutSeries },
    tables: { winLossByStyle, topOpponents, topTags },
    funnels: {
      signupToFirstReport: {
        title: "Sign-up → First report (≤7d)",
        steps: [
          { label: `New sign-ups (${rangeDays}d)`, count: fA_step1 },
          { label: "First report ≤7d", count: fA_step2 },
        ],
        conversion: fA_conv,
        medianDays,
      },
      styleToMatchReport: {
        title: "Added style → Created match report",
        steps: [
          { label: "Users with ≥1 style (lifetime)", count: fB_step1 },
          { label: "Users with ≥1 match report", count: fB_step2 },
        ],
        conversion: fB_conv,
      },
    },
  };

  const serializable = JSON.parse(JSON.stringify(data));
  cache.set(key, { ts: Date.now(), data: serializable });

  return <ReportsDashboard data={serializable} />;
}
