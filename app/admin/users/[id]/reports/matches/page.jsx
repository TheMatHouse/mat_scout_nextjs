export const dynamic = "force-dynamic";

import Link from "next/link";
import { connectDB } from "@/lib/mongo";
import MatchReport from "@/models/matchReportModel";
import User from "@/models/userModel";
import ClientQuickView from "./quick-view.client";

const pageSizeDefault = 20;

const toInt = (v, d) => {
  const n = parseInt(v ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : d;
};

const buildUserFilter = (userId, visibility, q) => {
  const userMatch = {
    $or: [
      { userId: userId },
      { user: userId },
      { createdBy: userId },
      { ownerId: userId },
      { athleteUserId: userId },
      { athleteId: userId },
      { memberUserId: userId },
    ],
  };
  const filter = { ...userMatch };

  if (visibility === "public") {
    filter.allowPublic = true;
  } else if (visibility === "private") {
    filter.$and = (filter.$and || []).concat([
      { $or: [{ allowPublic: false }, { allowPublic: { $exists: false } }] },
    ]);
  }

  if (q) {
    const rx = { $regex: q, $options: "i" };
    filter.$and = (filter.$and || []).concat([
      {
        $or: [
          { eventName: rx },
          { opponentName: rx },
          { location: rx },
          { result: rx },
          { notes: rx },
        ],
      },
    ]);
  }

  return filter;
};

const Th = ({ children, className = "" }) => (
  <th
    className={`px-4 py-2 text-left font-medium text-gray-900 dark:text-gray-100 ${className}`}
    scope="col"
  >
    {children}
  </th>
);

const AdminUserMatchesPage = async ({ params, searchParams }) => {
  await connectDB();

  const { id } = await params; // ✅ Next 15: await
  const sp = await searchParams; // ✅ Next 15: await

  const page = toInt(sp?.page, 1);
  const limit = toInt(sp?.limit, pageSizeDefault);
  const visibility = String(sp?.visibility || "all").toLowerCase();
  const q = String(sp?.q || "").trim();
  const reportId = String(sp?.report || "").trim();

  const user = await User.findById(id)
    .select("firstName lastName username email")
    .lean();

  if (!user) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          User not found
        </h1>
      </main>
    );
  }

  const filter = buildUserFilter(id, visibility, q);

  const [total, rows] = await Promise.all([
    MatchReport.countDocuments(filter),
    MatchReport.find(filter)
      .select(
        "createdAt eventName opponentName result allowPublic teamSlug weightClass division video url slug"
      )
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  const pages = Math.max(Math.ceil(total / limit), 1);

  // keep current filters in links
  const buildQuery = (overrides = {}) => {
    const sp = new URLSearchParams({
      q,
      visibility,
      page: String(page),
      limit: String(limit),
    });
    Object.entries(overrides).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") sp.delete(k);
      else sp.set(k, String(v));
    });
    return `?${sp.toString()}`;
  };

  return (
    <main className="relative w-full">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            {user.firstName} {user.lastName}{" "}
            <span className="text-gray-600 dark:text-gray-300 font-normal">
              @{user.username}
            </span>
          </h1>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Match Reports (Admin)
          </p>
        </div>

        {/* Controls */}
        <form className="flex flex-col sm:flex-row gap-3 sm:items-center mb-4">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search event, opponent, location, result…"
            className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--ms-light-red,#ef4444)]"
          />
          <select
            name="visibility"
            defaultValue={visibility}
            className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="all">All (admin)</option>
            <option value="public">Public only</option>
            <option value="private">Private only</option>
          </select>
          <input
            type="hidden"
            name="page"
            value="1"
          />
          <button
            className="btn btn-white-sm self-start"
            type="submit"
          >
            Apply
          </button>
        </form>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
              <tr>
                <Th>Date</Th>
                <Th>Event</Th>
                <Th>Opponent</Th>
                <Th>Result</Th>
                <Th>Visibility</Th>
                <Th className="text-right pr-4">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-gray-700 dark:text-gray-300"
                  >
                    No match reports found.
                  </td>
                </tr>
              ) : null}
              {rows.map((r) => (
                <tr
                  key={String(r._id)}
                  className="border-t border-gray-100 dark:border-gray-800"
                >
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                    {r.eventName || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                    {r.opponentName || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100 capitalize">
                    {r.result || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {r.allowPublic ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        Public
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        Private
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right pr-4">
                    <div className="flex gap-2 justify-end">
                      <Link
                        href={buildQuery({ report: r._id })}
                        className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--ms-light-red,#ef4444)]"
                      >
                        Open
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <Link
            href={buildQuery({ page: Math.max(page - 1, 1), report: "" })}
            className="btn btn-white-sm aria-disabled:opacity-50"
            aria-disabled={page <= 1}
          >
            Prev
          </Link>
          <div className="text-sm text-gray-900 dark:text-gray-100">
            {page} / {pages}
          </div>
          <Link
            href={buildQuery({ page: Math.min(page + 1, pages), report: "" })}
            className="btn btn-white-sm aria-disabled:opacity-50"
            aria-disabled={page >= pages}
          >
            Next
          </Link>
        </div>
      </section>

      {/* Quick View Modal (uses ModalLayout internally, same look as Dashboard) */}
      {reportId ? (
        <ClientQuickView
          reportId={reportId}
          closeHref={buildQuery({ report: "" })}
        />
      ) : null}
    </main>
  );
};

export default AdminUserMatchesPage;
