"use client";
export const dynamic = "force-dynamic";

import { use, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { slugToStyleMap } from "@/lib/styleSlugMap";
import PreviewReportModal from "@/components/dashboard/PreviewReportModal";
import BackToProfile from "@/components/profile/BackToProfile";
import MatchReportCard from "@/components/shared/MatchReportCard";

const PAGE_SIZE = 10;

/* ---------- helpers ---------- */
const uniq = (arr) => Array.from(new Set(arr));
const toDate = (v) => (v ? new Date(v) : null);

/* ---------- Match division helpers (UNCHANGED) ---------- */
const genderWord = (g) =>
  g === "male" ? "Men" : g === "female" ? "Women" : g === "coed" ? "Coed" : "";

const isObjectId = (v) => typeof v === "string" && /^[0-9a-f]{24}$/i.test(v);

const getDivisionDisplay = (report) => {
  const d = report?.division;

  if (d && typeof d === "object") {
    const name = (d.name || d.label || d.code || "").trim();
    const gender = genderWord(d.gender);
    if (name && gender) return `${name} — ${gender}`;
    if (name) return name;
  }

  const snap =
    report?.divisionDisplay ||
    report?.divisionLabel ||
    report?.divisionName ||
    "";
  if (snap && !isObjectId(snap)) return snap;

  if (typeof report?.division === "string" && !isObjectId(report.division)) {
    return report.division.trim();
  }

  return "—";
};
/* ------------------------------------------------------ */

const UserMatchReportsPage = ({ params }) => {
  const { username } = use(params);
  const searchParams = useSearchParams();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedReport, setSelectedReport] = useState(null);
  const [open, setOpen] = useState(false);

  const [selectedStyle, setSelectedStyle] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [eventFilter, setEventFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  /* ---------- read style from URL ---------- */
  useEffect(() => {
    const styleSlug = searchParams.get("style");
    if (styleSlug && slugToStyleMap[styleSlug]) {
      setSelectedStyle(slugToStyleMap[styleSlug]);
    }
  }, [searchParams]);

  /* ---------- fetch reports ---------- */
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

  /* ---------- derived filter options ---------- */
  const yearsAvailable = useMemo(() => {
    const years = reports
      .map((r) => toDate(r.matchDate)?.getFullYear())
      .filter(Boolean);
    return uniq(years).sort((a, b) => b - a);
  }, [reports]);

  const eventsAvailable = useMemo(() => {
    return uniq(reports.map((r) => r.eventName).filter(Boolean)).sort();
  }, [reports]);

  /* ---------- filtering + sorting ---------- */
  const filteredReports = useMemo(() => {
    let out = [...reports];

    if (selectedStyle !== "All") {
      out = out.filter((r) => r.matchType === selectedStyle);
    }

    if (yearFilter !== "All") {
      out = out.filter(
        (r) => toDate(r.matchDate)?.getFullYear() === Number(yearFilter)
      );
    }

    if (eventFilter !== "All") {
      out = out.filter((r) => r.eventName === eventFilter);
    }

    out.sort((a, b) => {
      const aVal = toDate(a.matchDate)?.getTime() ?? 0;
      const bVal = toDate(b.matchDate)?.getTime() ?? 0;
      return bVal - aVal;
    });

    return out;
  }, [reports, selectedStyle, yearFilter, eventFilter]);

  /* ---------- summary ---------- */
  const summary = useMemo(() => {
    const wins = filteredReports.filter((r) =>
      String(r.result || "")
        .toLowerCase()
        .startsWith("w")
    ).length;
    const losses = filteredReports.filter((r) =>
      String(r.result || "")
        .toLowerCase()
        .startsWith("l")
    ).length;
    return {
      wins,
      losses,
      total: filteredReports.length,
    };
  }, [filteredReports]);

  /* ---------- pagination ---------- */
  const totalPages = Math.ceil(filteredReports.length / PAGE_SIZE);
  const pagedReports = filteredReports.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStyle, yearFilter, eventFilter]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10 text-gray-900 dark:text-gray-100">
        <div className="h-8 w-64 rounded bg-muted mb-4" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-2xl border border-border bg-background animate-pulse"
            />
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10 text-gray-900 dark:text-gray-100">
        <BackToProfile
          username={username}
          className="mb-4"
        />
        <h1 className="text-2xl font-bold mb-4">Match Reports</h1>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-red-300">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-6xl px-6 py-10 text-gray-900 dark:text-gray-100">
        {/* Header */}
        <div className="mb-6">
          <BackToProfile
            username={username}
            className="mb-4"
          />
          <h1 className="text-3xl font-bold">{username}’s Match Reports</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Public competition match history
          </p>
        </div>

        {/* Summary */}
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="rounded-xl border border-border bg-background px-4 py-2">
            <span className="text-sm text-foreground/60">Wins</span>
            <div className="text-lg font-semibold">{summary.wins}</div>
          </div>
          <div className="rounded-xl border border-border bg-background px-4 py-2">
            <span className="text-sm text-foreground/60">Losses</span>
            <div className="text-lg font-semibold">{summary.losses}</div>
          </div>
          <div className="rounded-xl border border-border bg-background px-4 py-2">
            <span className="text-sm text-foreground/60">Matches</span>
            <div className="text-lg font-semibold">{summary.total}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="All">All Years</option>
            {yearsAvailable.map((y) => (
              <option
                key={y}
                value={y}
              >
                {y}
              </option>
            ))}
          </select>

          {eventsAvailable.length >= 3 && (
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="w-64 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="All">All Events</option>
              {eventsAvailable.map((ev) => (
                <option
                  key={ev}
                  value={ev}
                >
                  {ev}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Empty */}
        {filteredReports.length === 0 && (
          <div className="rounded-2xl border border-border bg-background p-8 text-center">
            <p className="text-gray-600 dark:text-gray-300">
              No matches found for the selected filters.
            </p>
          </div>
        )}

        {/* Cards */}
        {pagedReports.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pagedReports.map((report) => (
              <MatchReportCard
                key={report._id}
                match={{
                  ...report,
                  divisionDisplay: getDivisionDisplay(report),
                }}
                onView={() => {
                  setSelectedReport({
                    ...report,
                    divisionDisplay: getDivisionDisplay(report),
                  });
                  setOpen(true);
                }}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Prev
            </button>

            <span className="text-sm text-gray-600 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </main>

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
};

export default UserMatchReportsPage;
