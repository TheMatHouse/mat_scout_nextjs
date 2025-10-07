"use client";
export const dynamic = "force-dynamic";

import { use, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Eye } from "lucide-react";

import { slugToStyleMap } from "@/lib/styleSlugMap";
import PreviewReportModal from "@/components/dashboard/PreviewReportModal";
import BackToProfile from "@/components/profile/BackToProfile";

const uniq = (arr) => Array.from(new Set(arr));
const toDate = (v) => (v ? new Date(v) : null);

function LoadingSkeleton() {
  return (
    <div className="p-6">
      <div className="h-8 w-40 rounded bg-muted mb-4" />
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="h-10 bg-muted" />
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-12 bg-background animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function UserMatchReportsPage({ params }) {
  const { username } = use(params);
  const searchParams = useSearchParams();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedReport, setSelectedReport] = useState(null);
  const [open, setOpen] = useState(false);

  const [selectedStyle, setSelectedStyle] = useState("All");
  const [resultFilter, setResultFilter] = useState("All");

  const [sortBy, setSortBy] = useState("matchDate");
  const [sortDirection, setSortDirection] = useState("desc");

  useEffect(() => {
    const styleSlug = searchParams.get("style");
    if (styleSlug && slugToStyleMap[styleSlug]) {
      setSelectedStyle(slugToStyleMap[styleSlug]);
    }
  }, [searchParams]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/users/${encodeURIComponent(username)}/match-reports`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("Failed to load match reports");
        const data = await res.json();
        const publicReports = Array.isArray(data?.reports)
          ? data.reports.filter((r) => r?.isPublic)
          : [];
        if (alive) setReports(publicReports);
      } catch (err) {
        console.error(err);
        if (alive) setError("Unable to load match reports.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [username]);

  const stylesAvailable = useMemo(
    () => uniq(reports.map((r) => r?.matchType).filter(Boolean)),
    [reports]
  );

  const hasFilters = selectedStyle !== "All" || resultFilter !== "All";

  const filteredReports = useMemo(() => {
    let out = [...reports];
    if (selectedStyle !== "All") {
      out = out.filter((r) => r.matchType === selectedStyle);
    }
    if (resultFilter !== "All") {
      out = out.filter((r) => r.result === resultFilter);
    }

    out.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === "matchDate") {
        aVal = toDate(aVal)?.getTime() ?? 0;
        bVal = toDate(bVal)?.getTime() ?? 0;
      } else {
        aVal = aVal?.toString().toLowerCase() ?? "";
        bVal = bVal?.toString().toLowerCase() ?? "";
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return out;
  }, [reports, selectedStyle, resultFilter, sortBy, sortDirection]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
  };

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="p-6 text-gray-900 dark:text-gray-100">
        <BackToProfile
          username={username}
          className="mb-4"
        />
        <h1 className="text-2xl font-bold text-center mb-4">Match Reports</h1>
        <div className="max-w-xl mx-auto rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  const nothingAtAll = reports.length === 0;
  const nothingWithFilters = filteredReports.length === 0 && reports.length > 0;

  return (
    <>
      <div className="p-4 md:p-6 text-gray-900 dark:text-gray-100">
        {/* Back + Centered Heading */}
        <BackToProfile
          username={username}
          className="mb-3"
        />
        <h1 className="text-2xl font-bold text-center mb-2">Match Reports</h1>

        {/* Subheading / results count */}
        {!nothingAtAll ? (
          <div className="text-sm text-center text-gray-600 dark:text-gray-400 mb-4">
            {filteredReports.length} result
            {filteredReports.length === 1 ? "" : "s"}
            {hasFilters && " · filtered"}
          </div>
        ) : (
          <div className="text-sm text-center text-gray-900 dark:text-gray-100 mb-6">
            Any public matches reported by this user will be posted to this
            page.
          </div>
        )}

        {/* Filters (only when there are reports) */}
        {!nothingAtAll && (
          <div className="mb-4 flex flex-wrap gap-4 items-center justify-center">
            <div>
              <label className="mr-2 font-semibold">Style:</label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="bg-background border border-border rounded px-2 py-1 text-gray-900 dark:text-gray-100"
              >
                <option value="All">All</option>
                {stylesAvailable.map((style) => (
                  <option
                    key={style}
                    value={style}
                  >
                    {style}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mr-2 font-semibold">Result:</label>
              <select
                value={resultFilter}
                onChange={(e) => setResultFilter(e.target.value)}
                className="bg-background border border-border rounded px-2 py-1 text-gray-900 dark:text-gray-100"
              >
                <option value="All">All</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </select>
            </div>

            {hasFilters && (
              <button
                onClick={() => {
                  setSelectedStyle("All");
                  setResultFilter("All");
                }}
                className="text-sm underline decoration-dotted underline-offset-4"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Empty state when there are no reports at all */}
        {nothingAtAll && (
          <div className="rounded-lg border border-border p-8 text-center">
            <p className="text-sm text-gray-900 dark:text-gray-100">
              No public match reports found for this user.
            </p>
          </div>
        )}

        {/* Empty state under filters */}
        {nothingWithFilters && (
          <div className="rounded-lg border border-border p-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No reports match your current filters.
            </p>
            <button
              onClick={() => {
                setSelectedStyle("All");
                setResultFilter("All");
              }}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border hover:bg-muted transition"
            >
              Reset filters
            </button>
          </div>
        )}

        {/* Table */}
        {!nothingAtAll && !nothingWithFilters && (
          <div className="rounded-lg border border-border bg-background overflow-x-auto">
            <table className="min-w-full text-sm md:text-base text-left">
              <thead className="bg-muted text-gray-900 dark:text-gray-100 uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  {[
                    { key: "eventName", label: "Event" },
                    { key: "opponentName", label: "Opponent" },
                    { key: "result", label: "Result" },
                    { key: "matchDate", label: "Date" },
                    { key: "matchType", label: "Style" },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="px-4 py-3 cursor-pointer hover:underline whitespace-nowrap"
                      title={`Sort by ${label}`}
                    >
                      {label}
                      {sortBy === key
                        ? sortDirection === "asc"
                          ? " ↑"
                          : " ↓"
                        : " ↕"}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center">View</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr
                    key={report._id}
                    className="border-t border-border hover:bg-muted/60 transition-colors"
                  >
                    <td className="px-4 py-3">{report.eventName || "—"}</td>
                    <td className="px-4 py-3">{report.opponentName || "—"}</td>
                    <td className="px-4 py-3 font-semibold">
                      {report.result === "Won" ? (
                        <span className="text-green-500">Win</span>
                      ) : report.result === "Lost" ? (
                        <span className="text-red-500">Loss</span>
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400">
                          {report.result || "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {report.matchDate
                        ? format(new Date(report.matchDate), "PPP")
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3">{report.matchType || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setOpen(true);
                        }}
                        className="hover:opacity-80"
                        title="Preview Report"
                        aria-label="Preview Report"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && selectedReport && (
        <PreviewReportModal
          previewOpen={open}
          setPreviewOpen={setOpen}
          report={selectedReport}
          reportType="match"
        />
      )}
    </>
  );
}
