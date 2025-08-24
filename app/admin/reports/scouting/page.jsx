// app/admin/reports/scouting/page.jsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { connectDB } from "@/lib/mongo";
import ScoutingReport from "@/models/scoutingReportModel";

const ALLOWED_RANGES = [7, 30, 90, 180, 365];

function sinceDays(days) {
  return new Date(Date.now() - days * 86400000);
}
function fmtDate(d) {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return String(d).slice(0, 10);
  }
}
function escapeRegex(s = "") {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function keep(qs, updates) {
  const url = new URLSearchParams(qs);
  Object.entries(updates).forEach(([k, v]) => {
    if (v === null || v === undefined || v === "") url.delete(k);
    else url.set(k, String(v));
  });
  return url.toString();
}

export default async function ScoutingReportPage({ searchParams }) {
  await connectDB();

  const sp = await searchParams; // IMPORTANT in Next.js App Router
  const opponent = sp?.opponent ? String(sp.opponent) : "";
  const tag = sp?.tag ? String(sp.tag) : "";
  const rawRange = parseInt(sp?.range, 10);
  const range = ALLOWED_RANGES.includes(rawRange) ? rawRange : 30;

  const page = Math.max(1, parseInt(sp?.page || "1", 10));
  const limit = Math.min(200, Math.max(10, parseInt(sp?.limit || "50", 10)));
  const skip = (page - 1) * limit;

  const filter = { createdAt: { $gte: sinceDays(range) } };

  if (opponent) {
    // case-insensitive exact match on opponentName
    filter.opponentName = {
      $regex: `^${escapeRegex(opponent)}$`,
      $options: "i",
    };
  }

  if (tag) {
    // match tag across either array, case-insensitive
    const rx = new RegExp(escapeRegex(tag), "i");
    filter.$or = [
      { opponentAttacks: { $in: [rx] } },
      { athleteAttacks: { $in: [rx] } },
    ];
  }

  const [total, rows] = await Promise.all([
    ScoutingReport.countDocuments(filter),
    ScoutingReport.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(
        "createdAt opponentName opponentClub opponentRank opponentAttacks athleteAttacks isPublic createdBy createdByName"
      )
      .lean(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Scouting Reports</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {opponent ? (
              <>
                Filter: <span className="font-medium">opponent</span> ={" "}
                <span className="font-mono">{opponent}</span>
              </>
            ) : tag ? (
              <>
                Filter: <span className="font-medium">tag</span> ={" "}
                <span className="font-mono">{tag}</span>
              </>
            ) : (
              "All scouting reports"
            )}{" "}
            · Range: <span className="font-mono">{range}d</span> · Results:{" "}
            <span className="font-mono">
              {rows.length}/{total}
            </span>
          </p>
          {(opponent || tag || range !== 30) && (
            <div className="mt-1">
              <Link
                href="/admin/reports/scouting"
                className="text-sm text-[var(--ms-light-red)] hover:underline"
              >
                Clear filters
              </Link>
            </div>
          )}
        </div>

        {/* Quick range toggle */}
        <div className="flex gap-2">
          {ALLOWED_RANGES.map((d) => {
            const href = `/admin/reports/scouting?${keep(sp, {
              range: d,
              page: 1,
              limit,
            })}`;
            const active = d === range;
            return (
              <Link
                key={d}
                href={href}
                className={[
                  "px-3 py-1 rounded-md border text-sm",
                  active
                    ? "bg-[var(--ms-light-red)] text-white border-transparent"
                    : "bg-transparent border-gray-600 text-gray-200 hover:bg-gray-800",
                ].join(" ")}
              >
                {d}d
              </Link>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-900/30">
            <tr className="text-left">
              <th className="p-3">Date</th>
              <th className="p-3">Opponent</th>
              <th className="p-3">Opponent Club</th>
              <th className="p-3">Rank</th>
              <th className="p-3">Opponent Attacks</th>
              <th className="p-3">Athlete Attacks</th>
              <th className="p-3">Author</th>
              <th className="p-3">Public</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  className="p-4 text-center text-gray-500"
                  colSpan={8}
                >
                  No scouting reports found for these filters.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={String(r._id)}
                  className="border-t border-gray-100 dark:border-gray-800 align-top"
                >
                  <td className="p-3 whitespace-nowrap">
                    {fmtDate(r.createdAt)}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {r.opponentName || "-"}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {r.opponentClub || "-"}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {r.opponentRank || "-"}
                  </td>
                  <td className="p-3">
                    {Array.isArray(r.opponentAttacks) &&
                    r.opponentAttacks.length
                      ? r.opponentAttacks.join(", ")
                      : "-"}
                  </td>
                  <td className="p-3">
                    {Array.isArray(r.athleteAttacks) && r.athleteAttacks.length
                      ? r.athleteAttacks.join(", ")
                      : "-"}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {r.createdByName || "-"}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {r.isPublic ? "Yes" : "No"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <div>
          Page <span className="font-mono">{page}</span> of{" "}
          <span className="font-mono">{totalPages}</span>
        </div>
        <div className="flex gap-2">
          <Link
            aria-disabled={page <= 1}
            className={[
              "px-3 py-1 rounded border",
              page <= 1
                ? "opacity-50 pointer-events-none"
                : "hover:bg-gray-100 dark:hover:bg-gray-900/40",
            ].join(" ")}
            href={`/admin/reports/scouting?${keep(sp, {
              page: Math.max(1, page - 1),
              limit,
            })}`}
          >
            Prev
          </Link>
          <Link
            aria-disabled={page >= totalPages}
            className={[
              "px-3 py-1 rounded border",
              page >= totalPages
                ? "opacity-50 pointer-events-none"
                : "hover:bg-gray-100 dark:hover:bg-gray-900/40",
            ].join(" ")}
            href={`/admin/reports/scouting?${keep(sp, {
              page: Math.min(totalPages, page + 1),
              limit,
            })}`}
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}
