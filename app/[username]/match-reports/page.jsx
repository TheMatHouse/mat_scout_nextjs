"use client";
export const dynamic = "force-dynamic";

import { use, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Eye, CheckCircle2, XCircle } from "lucide-react";

import { slugToStyleMap } from "@/lib/styleSlugMap";
import PreviewReportModal from "@/components/dashboard/PreviewReportModal";
import BackToProfile from "@/components/profile/BackToProfile";
import MatchReportCard from "@/components/shared/MatchReportCard";

const uniq = (arr) => Array.from(new Set(arr));
const toDate = (v) => (v ? new Date(v) : null);

/* ---------- Match division helpers (same as DashboardMatches) ---------- */
const genderWord = (g) =>
  g === "male" ? "Men" : g === "female" ? "Women" : g === "coed" ? "Coed" : "";

const isObjectId = (v) => typeof v === "string" && /^[0-9a-f]{24}$/i.test(v);

const getDivisionDisplay = (report) => {
  const d = report?.division;

  // Object case (populated division)
  if (d && typeof d === "object") {
    const name = (d.name || d.label || d.code || "").trim();
    const gender = genderWord(d.gender);
    if (name && gender) return `${name} — ${gender}`;
    if (name) return name;
  }

  // Snapshot or fallback
  const snap =
    report?.divisionDisplay ||
    report?.divisionLabel ||
    report?.divisionName ||
    "";
  if (snap && !isObjectId(snap)) return snap;

  // Raw string fallback
  if (typeof report?.division === "string" && !isObjectId(report.division)) {
    return report.division.trim();
  }

  return "—";
};
/* ---------------------------------------------------------------------- */

const LoadingSkeleton = () => (
  <div className="p-6 max-w-6xl mx-auto">
    <div className="h-8 w-40 rounded bg-muted mb-4" />
    <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
      <div className="h-11 bg-muted/70" />
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

/* ---------- UI helpers ---------- */
const ResultBadge = ({ result, score }) => {
  if (!result) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-xs text-foreground/60">
        —
      </span>
    );
  }
  const isWin = String(result).toLowerCase().startsWith("w");
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1";
  return (
    <span
      className={
        base +
        " " +
        (isWin
          ? "bg-emerald-600/12 text-emerald-300 ring-emerald-500/25"
          : "bg-rose-600/12 text-rose-300 ring-rose-500/25")
      }
    >
      {isWin ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {isWin ? "Win" : "Loss"}
      {score ? ` • ${score}` : ""}
    </span>
  );
};

const StyleChip = ({ label }) => {
  if (!label) return <span className="text-foreground/60">—</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/40 px-2 py-0.5 text-[11px] text-foreground/80">
      <span className="h-1.5 w-1.5 rounded-full bg-foreground/50" />
      {label}
    </span>
  );
};

const StatPill = ({ label, value }) => (
  <div className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background/40 px-3 py-1.5 text-sm">
    <span className="text-foreground/60">{label}</span>
    <span className="font-semibold text-foreground">{value}</span>
  </div>
);
/* ---------------------------------------------------------------------- */

const UserMatchReportsPage = ({ params }) => {
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

        console.log("[profile/match-reports] fetched reports:", {
          total: publicReports.length,
          sample: publicReports[0]
            ? {
                _id: publicReports[0]._id,
                division: publicReports[0].division,
                typeofDivision: typeof publicReports[0].division,
                divisionDisplay: getDivisionDisplay(publicReports[0]),
              }
            : "none",
        });

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
    if (selectedStyle !== "All")
      out = out.filter((r) => r.matchType === selectedStyle);
    if (resultFilter !== "All")
      out = out.filter((r) => r.result === resultFilter);

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
    return { wins, losses };
  }, [filteredReports]);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <main className="relative w-full no-x-overflow">
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="p-6 max-w-6xl mx-auto text-gray-900 dark:text-gray-100">
            <BackToProfile
              username={username}
              className="mb-4"
            />
            <h1 className="text-2xl font-bold text-center mb-4">
              Match Reports
            </h1>
            <div className="max-w-xl mx-auto rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      <main className="relative w-full no-x-overflow">
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="px-4 md:px-6 lg:px-8 py-4 max-w-6xl mx-auto text-gray-900 dark:text-gray-100">
            {/* MOBILE */}
            <div className="md:hidden space-y-4">
              {filteredReports.map((report) => (
                <MatchReportCard
                  key={report._id}
                  match={{
                    ...report,
                    divisionDisplay: getDivisionDisplay(report),
                  }}
                  onView={() => {
                    console.log("[profile/mobile] before modal", {
                      _id: report._id,
                      division: report.division,
                      typeofDivision: typeof report.division,
                      divisionDisplay_raw: report.divisionDisplay,
                      divisionDisplay_safe: getDivisionDisplay(report),
                    });
                    setSelectedReport({
                      ...report,
                      divisionDisplay: getDivisionDisplay(report),
                    });
                    setOpen(true);
                  }}
                />
              ))}
            </div>

            {/* DESKTOP */}
            <div className="hidden md:block relative">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead>
                    <tr className="text-foreground/80">
                      <th className="px-5 py-3">Event</th>
                      <th className="px-5 py-3">Opponent</th>
                      <th className="px-5 py-3">Result</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Style</th>
                      <th className="px-5 py-3 text-center">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/80">
                    {filteredReports.map((report, idx) => (
                      <tr
                        key={report._id}
                        className={`group transition-colors ${
                          idx % 2 === 0
                            ? "bg-background/40"
                            : "bg-background/20"
                        } hover:bg-muted/50`}
                      >
                        <td className="px-5 py-4">{report.eventName || "—"}</td>
                        <td className="px-5 py-4">
                          {report.opponentName || "—"}
                        </td>
                        <td className="px-5 py-4">
                          <ResultBadge
                            result={report.result}
                            score={report.score}
                          />
                        </td>
                        <td className="px-5 py-4">
                          {report.matchDate
                            ? format(new Date(report.matchDate), "PPP")
                            : "N/A"}
                        </td>
                        <td className="px-5 py-4">
                          <StyleChip label={report.matchType} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-center">
                            <button
                              onClick={() => {
                                console.log("[profile/desktop] before modal", {
                                  _id: report._id,
                                  division: report.division,
                                  typeofDivision: typeof report.division,
                                  divisionDisplay_raw: report.divisionDisplay,
                                  divisionDisplay_safe:
                                    getDivisionDisplay(report),
                                });
                                setSelectedReport({
                                  ...report,
                                  divisionDisplay: getDivisionDisplay(report),
                                });
                                setOpen(true);
                              }}
                              className="inline-flex items-center gap-2 border border-border/70 bg-background/40 px-3 py-1.5 rounded-lg"
                            >
                              <Eye size={16} />
                              <span className="text-xs font-medium">View</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
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
