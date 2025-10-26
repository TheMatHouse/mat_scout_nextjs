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

function LoadingSkeleton() {
  return (
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
}

/* ---------- Tiny, polished UI helpers (desktop) ---------- */
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
/* -------------------------------------------------------- */

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

  const nothingAtAll = reports.length === 0;
  const nothingWithFilters = filteredReports.length === 0 && reports.length > 0;

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
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <BackToProfile
                  username={username}
                  className="mb-2"
                />
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  Match Reports
                </h1>
                {!nothingAtAll ? (
                  <p className="text-sm text-foreground/60 mt-1">
                    {filteredReports.length} result
                    {filteredReports.length === 1 ? "" : "s"}
                    {selectedStyle !== "All" && (
                      <>
                        {" "}
                        · <span className="font-medium">{selectedStyle}</span>
                      </>
                    )}
                    {resultFilter !== "All" && (
                      <>
                        {" "}
                        · <span className="font-medium">{resultFilter}</span>
                      </>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-foreground/60 mt-1">
                    Any public matches reported by this user will be posted
                    here.
                  </p>
                )}
              </div>

              {/* Quick stats (desktop only) */}
              {!nothingAtAll && (
                <div className="hidden md:flex items-center gap-2">
                  <StatPill
                    label="Wins"
                    value={summary.wins}
                  />
                  <StatPill
                    label="Losses"
                    value={summary.losses}
                  />
                </div>
              )}
            </div>

            {/* Filters */}
            {!nothingAtAll && (
              <div className="mb-4 rounded-2xl border border-border bg-background/60 px-4 py-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-4 justify-between">
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <label className="mr-2 text-sm font-semibold">
                        Style
                      </label>
                      <select
                        value={selectedStyle}
                        onChange={(e) => setSelectedStyle(e.target.value)}
                        className="bg-background border border-border rounded-md px-2 py-1.5 text-sm"
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
                      <label className="mr-2 text-sm font-semibold">
                        Result
                      </label>
                      <select
                        value={resultFilter}
                        onChange={(e) => setResultFilter(e.target.value)}
                        className="bg-background border border-border rounded-md px-2 py-1.5 text-sm"
                      >
                        <option value="All">All</option>
                        <option value="Won">Won</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </div>
                  </div>

                  {hasFilters ? (
                    <button
                      onClick={() => {
                        setSelectedStyle("All");
                        setResultFilter("All");
                      }}
                      className="text-sm underline decoration-dotted underline-offset-4 text-foreground/80 hover:text-foreground"
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {/* Empty states */}
            {nothingAtAll && (
              <div className="rounded-2xl border border-border p-8 text-center bg-background/60 shadow-sm">
                <p className="text-sm">
                  No public match reports found for this user.
                </p>
              </div>
            )}

            {nothingWithFilters && (
              <div className="rounded-2xl border border-border p-8 text-center bg-background/60 shadow-sm">
                <p className="text-sm text-foreground/70">
                  No reports match your current filters.
                </p>
                <button
                  onClick={() => {
                    setSelectedStyle("All");
                    setResultFilter("All");
                  }}
                  className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border hover:bg-muted/60 transition"
                >
                  Reset filters
                </button>
              </div>
            )}

            {/* Results */}
            {!nothingAtAll && !nothingWithFilters && (
              <>
                {/* MOBILE: shared card list */}
                <div className="md:hidden space-y-4">
                  {filteredReports.map((report) => (
                    <MatchReportCard
                      key={report._id}
                      match={{
                        _id: report._id,
                        matchType: report.matchType || "",
                        matchDate: report.matchDate || null,
                        opponentName: report.opponentName || "—",
                        eventName: report.eventName || "",
                        divisionDisplay: report.divisionDisplay || "",
                        weightDisplay: report.weightDisplay || "",
                        method: report.method || "",
                        myRank: report.myRank || "",
                        opponentRank: report.opponentRank || "",
                        result: report.result || "",
                        score: report.score || "",
                      }}
                      onView={(m) => {
                        setSelectedReport(m);
                        setOpen(true);
                      }}
                    />
                  ))}
                </div>

                {/* DESKTOP: premium polish */}
                <div className="hidden md:block relative">
                  {/* ambient glows */}
                  <div
                    className="pointer-events-none absolute -top-12 -left-12 h-56 w-56 rounded-full blur-3xl opacity-20"
                    style={{
                      background:
                        "radial-gradient(120px 120px at 50% 50%, rgba(99,102,241,0.35), transparent 70%)",
                    }}
                  />
                  <div
                    className="pointer-events-none absolute -bottom-10 -right-12 h-56 w-56 rounded-full blur-3xl opacity-20"
                    style={{
                      background:
                        "radial-gradient(120px 120px at 50% 50%, rgba(56,189,248,0.30), transparent 70%)",
                    }}
                  />

                  <div className="relative rounded-2xl border border-border/80 bg-background/70 shadow-lg shadow-black/10 overflow-hidden">
                    {/* header */}
                    <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-b from-muted/70 to-muted/40 border-b border-border/80">
                      <div className="text-sm text-foreground/70">
                        Showing{" "}
                        <span className="font-semibold text-foreground">
                          {filteredReports.length}
                        </span>{" "}
                        {filteredReports.length === 1 ? "report" : "reports"}
                        {hasFilters && (
                          <span className="ml-1 text-foreground/50">
                            · filtered
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm text-left">
                        <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur supports-[backdrop-filter]:bg-muted/60">
                          <tr className="text-foreground/80">
                            {[
                              {
                                key: "eventName",
                                label: "Event",
                                className: "w-[28%]",
                              },
                              {
                                key: "opponentName",
                                label: "Opponent",
                                className: "w-[22%]",
                              },
                              {
                                key: "result",
                                label: "Result",
                                className: "w-[18%]",
                              },
                              {
                                key: "matchDate",
                                label: "Date",
                                className: "w-[16%]",
                              },
                              {
                                key: "matchType",
                                label: "Style",
                                className: "w-[12%]",
                              },
                            ].map(({ key, label, className }) => (
                              <th
                                key={key}
                                onClick={() => handleSort(key)}
                                className={`px-5 py-3 font-semibold tracking-wide uppercase text-[11px] cursor-pointer select-none hover:text-foreground ${
                                  className || ""
                                }`}
                                title={`Sort by ${label}`}
                              >
                                {label}
                                <span className="ml-1 text-foreground/50">
                                  {sortBy === key
                                    ? sortDirection === "asc"
                                      ? "↑"
                                      : "↓"
                                    : "↕"}
                                </span>
                              </th>
                            ))}
                            <th className="px-5 py-3 text-center w-[100px] font-semibold tracking-wide uppercase text-[11px]">
                              View
                            </th>
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
                              <td className="px-5 py-4">
                                <div
                                  className="max-w-[36ch] truncate"
                                  title={report.eventName || "—"}
                                >
                                  {report.eventName || (
                                    <span className="text-foreground/60">
                                      —
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <div
                                  className="max-w-[28ch] truncate"
                                  title={report.opponentName || "—"}
                                >
                                  {report.opponentName || (
                                    <span className="text-foreground/60">
                                      —
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <ResultBadge
                                  result={report.result}
                                  score={report.score}
                                />
                              </td>

                              <td className="px-5 py-4 whitespace-nowrap">
                                {report.matchDate ? (
                                  <span className="text-foreground">
                                    {format(new Date(report.matchDate), "PPP")}
                                  </span>
                                ) : (
                                  <span className="text-foreground/60">
                                    N/A
                                  </span>
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <StyleChip label={report.matchType} />
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex justify-center">
                                  <button
                                    onClick={() => {
                                      setSelectedReport(report);
                                      setOpen(true);
                                    }}
                                    className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background/40 px-3 py-1.5 text-foreground/90 hover:bg-muted/60 hover:border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                    title="Preview report"
                                    aria-label="Preview report"
                                  >
                                    <Eye
                                      size={16}
                                      className="opacity-80"
                                    />
                                    <span className="text-xs font-medium">
                                      View
                                    </span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="px-5 py-3 border-t border-border/80 text-xs text-foreground/60">
                      Sorted by{" "}
                      <span className="font-medium text-foreground/80">
                        {
                          {
                            eventName: "Event",
                            opponentName: "Opponent",
                            result: "Result",
                            matchDate: "Date",
                            matchType: "Style",
                          }[sortBy]
                        }
                      </span>{" "}
                      ({sortDirection})
                    </div>
                  </div>
                </div>
              </>
            )}
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
}
