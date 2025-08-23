// app/admin/reports/page.jsx
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import Team from "@/models/teamModel";
import MatchReport from "@/models/matchReportModel";
import ScoutingReport from "@/models/scoutingReportModel";
import ReportsDashboard from "@/components/admin/reports/ReportsDashboard";

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

/** fill missing dates with zeros */
function fillSeries(rows, key = "date", valueKeys = ["count"]) {
  const today = new Date();
  const start = new Date();
  start.setDate(today.getDate() - 29);
  const days = dateRangeDays(start, today);
  const map = new Map(rows.map((r) => [r[key], r]));
  return days.map((day) => {
    const r = map.get(day) || {};
    const filled = { date: day };
    for (const k of valueKeys) filled[k] = Number(r[k] || 0);
    return filled;
  });
}

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await connectDB();

  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * 86400000);
  const since30 = new Date(now.getTime() - 30 * 86400000);
  const since90 = new Date(now.getTime() - 90 * 86400000);

  // --- Series: Match & Scouting reports per day (last 30) ---
  const [matchByDayAgg, scoutByDayAgg] = await Promise.all([
    MatchReport.aggregate([
      { $match: { createdAt: { $gte: since30 } } },
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
      { $match: { createdAt: { $gte: since30 } } },
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

  const matchSeries = fillSeries(matchByDayAgg, "date", ["count", "public"]);
  const scoutSeries = fillSeries(scoutByDayAgg, "date", ["count"]);

  // --- KPIs: 7d new users / match reports / scouting reports ---
  const [newUsers7, newMatches7, newScouts7, totalTeams] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: since7 } }),
    MatchReport.countDocuments({ createdAt: { $gte: since7 } }),
    ScoutingReport.countDocuments({ createdAt: { $gte: since7 } }),
    Team.countDocuments(),
  ]);

  // --- Win/Loss by style (rename 'style' -> 'styleName' to avoid React 'style' prop collision) ---
  const winLossByStyle = await MatchReport.aggregate([
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
        styleName: { $ifNull: ["$_id", "(none)"] }, // <-- renamed here
        total: 1,
        wins: 1,
        losses: 1,
        winRate: {
          $cond: [{ $gt: ["$total", 0] }, { $divide: ["$wins", "$total"] }, 0],
        },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 12 },
  ]);

  // --- Most-scouted opponents (90d) ---
  const topOpponents = await ScoutingReport.aggregate([
    {
      $match: {
        createdAt: { $gte: since90 },
        opponentName: { $exists: true, $ne: "" },
      },
    },
    { $group: { _id: "$opponentName", reports: { $sum: 1 } } },
    { $project: { _id: 0, opponent: "$_id", reports: 1 } },
    { $sort: { reports: -1 } },
    { $limit: 10 },
  ]);

  // --- Top technique tags from scouting (90d) ---
  const topTags = await ScoutingReport.aggregate([
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
    {
      $group: {
        _id: { $toLower: "$tags" },
        c: { $sum: 1 },
      },
    },
    { $project: { _id: 0, tag: "$_id", count: "$c" } },
    { $sort: { count: -1 } },
    { $limit: 12 },
  ]);

  // --- Mini Funnel A: Sign-up → First report within 7 days (among new users in last 30d) ---
  const newUsers30 = await User.find({ createdAt: { $gte: since30 } })
    .select("_id createdAt")
    .lean();

  const firstMatchByUser = await MatchReport.aggregate([
    { $group: { _id: "$createdBy", firstReportAt: { $min: "$createdAt" } } },
  ]);
  const firstMap = new Map(
    firstMatchByUser.map((x) => [String(x._id), x.firstReportAt])
  );

  let funnelA_step1 = newUsers30.length;
  let funnelA_step2 = 0;
  const diffs = [];
  for (const u of newUsers30) {
    const f = firstMap.get(String(u._id));
    if (!f) continue;
    const days = Math.max(0, (f - u.createdAt) / 86400000);
    diffs.push(days);
    if (days <= 7) funnelA_step2++;
  }
  const funnelA_conv = funnelA_step1
    ? Math.round((funnelA_step2 / funnelA_step1) * 100)
    : 0;
  const medianDays =
    diffs.length > 0
      ? diffs.sort((a, b) => a - b)[Math.floor(diffs.length / 2)]
      : 0;

  // --- Mini Funnel B: Added style → Created any match report (lifetime) ---
  const usersWithStyle = await User.find({ "userStyles.0": { $exists: true } })
    .select("_id")
    .lean();
  const styleUserIds = usersWithStyle.map((u) => u._id);
  const authorsWithReports = await MatchReport.distinct("createdBy", {
    createdBy: { $in: styleUserIds },
  });

  const funnelB_step1 = styleUserIds.length;
  const funnelB_step2 = authorsWithReports.length;
  const funnelB_conv = funnelB_step1
    ? Math.round((funnelB_step2 / funnelB_step1) * 100)
    : 0;

  const data = {
    kpis: {
      newUsers7,
      newMatches7,
      newScouts7,
      totalTeams,
      pctWithin7: funnelA_conv,
      medianDays,
    },
    series: {
      matchSeries,
      scoutSeries,
    },
    tables: {
      winLossByStyle,
      topOpponents,
      topTags,
    },
    funnels: {
      signupToFirstReport: {
        title: "Sign-up → First report (≤7d)",
        steps: [
          { label: "New sign-ups (30d)", count: funnelA_step1 },
          { label: "First report ≤7d", count: funnelA_step2 },
        ],
        conversion: funnelA_conv,
        medianDays,
      },
      styleToMatchReport: {
        title: "Added style → Created match report",
        steps: [
          { label: "Users with ≥1 style", count: funnelB_step1 },
          { label: "Users with ≥1 match report", count: funnelB_step2 },
        ],
        conversion: funnelB_conv,
      },
    },
  };

  return <ReportsDashboard data={JSON.parse(JSON.stringify(data))} />;
}
