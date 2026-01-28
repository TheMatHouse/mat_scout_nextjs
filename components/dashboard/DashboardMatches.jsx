"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

import MatchReportForm from "./forms/MatchReportForm";
import PreviewReportModal from "./PreviewReportModal";

import { Button } from "@/components/ui/button";
import { Printer, X, Plus } from "lucide-react";
import ModalLayout from "@/components/shared/ModalLayout";
import Spinner from "@/components/shared/Spinner";
import MatchReportCard from "@/components/shared/MatchReportCard";
import ShareReportModal from "./ShareReportModal";

/* ---------------- helpers ---------------- */
const genderWord = (g) =>
  g === "male" ? "Men" : g === "female" ? "Women" : g === "coed" ? "Coed" : "";

function getDivisionDisplay(m) {
  const d = m?.division;
  if (d && typeof d === "object") {
    const name = d.name || "";
    const g = genderWord(d.gender);
    return g ? `${name} — ${g}` : name || "—";
  }
  if (typeof m?.division === "string") return m.division;
  return "—";
}
/* ----------------------------------------- */

function DashboardMatches({ user }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = searchParams.get("view") === "shared" ? "shared" : "mine";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [matchReports, setMatchReports] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(true);

  const [sharedGroups, setSharedGroups] = useState([]);
  const [sharedLoading, setSharedLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const [stylesLoading, setStylesLoading] = useState(false);
  const [stylesForForm, setStylesForForm] = useState([]);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareMatch, setShareMatch] = useState(null);

  /* ---------------- Filters ---------------- */
  const [yearFilter, setYearFilter] = useState("All");
  const [eventFilter, setEventFilter] = useState("All");
  const [resultFilter, setResultFilter] = useState("All");
  const [printStyle, setPrintStyle] = useState("__all__");

  useEffect(() => {
    if (!user?._id) return;
    if (activeTab === "mine") fetchMatches();
    else fetchShared();
  }, [user?._id, activeTab]);

  async function fetchMatches() {
    setMatchesLoading(true);
    try {
      const res = await fetch(`/api/dashboard/${user._id}/matchReports`, {
        cache: "no-store",
      });
      const data = await res.json();
      setMatchReports(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Could not load match reports.");
    } finally {
      setMatchesLoading(false);
    }
  }

  async function fetchShared() {
    setSharedLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/${user._id}/matchReports/shared`,
        { cache: "no-store" },
      );
      const data = await res.json();
      setSharedGroups(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Could not load shared reports.");
    } finally {
      setSharedLoading(false);
    }
  }

  /* LOAD USER STYLES FOR MATCH MODAL */
  const loadStylesForModal = useCallback(async () => {
    if (!user?._id) return;
    setStylesLoading(true);
    try {
      const res = await fetch(`/api/dashboard/${user._id}/userStyles`, {
        cache: "no-store",
      });
      const data = await res.json();
      const styles = Array.isArray(data)
        ? data
        : data?.styles || data?.userStyles || [];
      setStylesForForm(styles);
    } finally {
      setStylesLoading(false);
    }
  }, [user?._id]);

  /* ---------- Filter Sources ---------- */
  const allReports = useMemo(() => {
    if (activeTab === "mine") return matchReports;
    return sharedGroups.flatMap((g) => g.reports || []);
  }, [matchReports, sharedGroups, activeTab]);

  const yearsAvailable = useMemo(() => {
    const years = allReports
      .map((r) => new Date(r.matchDate).getFullYear())
      .filter(Boolean);
    return [...new Set(years)].sort((a, b) => b - a);
  }, [allReports]);

  const eventsAvailable = useMemo(() => {
    return [...new Set(allReports.map((r) => r.eventName).filter(Boolean))];
  }, [allReports]);

  const printableStyles = useMemo(() => {
    return [...new Set(allReports.map((r) => r.matchType).filter(Boolean))];
  }, [allReports]);

  const applyFilters = (r) => {
    if (yearFilter !== "All") {
      const y = new Date(r.matchDate).getFullYear();
      if (y !== Number(yearFilter)) return false;
    }
    if (eventFilter !== "All" && r.eventName !== eventFilter) return false;
    if (resultFilter === "W" && !String(r.result).toLowerCase().startsWith("w"))
      return false;
    if (resultFilter === "L" && !String(r.result).toLowerCase().startsWith("l"))
      return false;
    if (printStyle !== "__all__" && r.matchType !== printStyle) return false;
    return true;
  };

  const filteredMine = useMemo(
    () => matchReports.filter(applyFilters),
    [matchReports, yearFilter, eventFilter, resultFilter, printStyle],
  );

  const filteredShared = useMemo(() => {
    return sharedGroups.map((g) => ({
      ...g,
      reports: g.reports.filter(applyFilters),
    }));
  }, [sharedGroups, yearFilter, eventFilter, resultFilter, printStyle]);

  const hasActiveFilters =
    yearFilter !== "All" ||
    eventFilter !== "All" ||
    resultFilter !== "All" ||
    printStyle !== "__all__";

  const clearFilters = () => {
    setYearFilter("All");
    setEventFilter("All");
    setResultFilter("All");
    setPrintStyle("__all__");
  };

  const handlePrint = () => {
    const base =
      printStyle === "__all__"
        ? `/api/records/style/all`
        : `/api/records/style/${encodeURIComponent(printStyle)}`;
    window.open(base, "_blank");
  };

  return (
    <div className="px-4 md:px-6 lg:px-8">
      {/* Tabs */}
      <div className="flex gap-3 mb-4">
        {["mine", "shared"].map((t) => (
          <button
            key={t}
            onClick={() => {
              setActiveTab(t);
              router.replace(
                t === "shared"
                  ? "/dashboard/matches?view=shared"
                  : "/dashboard/matches",
              );
            }}
            className={`px-4 py-2 rounded-lg border font-medium ${
              activeTab === t
                ? "bg-gray-900 text-white border-gray-900"
                : "border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-800"
            }`}
          >
            {t === "mine" ? "My Reports" : "Shared With Me"}
          </button>
        ))}
      </div>

      {activeTab === "mine" && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Your Reports</h2>
          <Button
            className="btn-add"
            onClick={async () => {
              setSelectedMatch(null);
              await loadStylesForModal();
              setOpen(true);
            }}
          >
            <Plus size={16} /> Add Match Report
          </Button>
        </div>
      )}

      {/* FILTER BAR */}
      {(activeTab === "mine" || allReports.length > 0) && (
        <div className="flex items-center gap-3 mb-6 overflow-x-auto whitespace-nowrap">
          <select
            value={printStyle}
            onChange={(e) => setPrintStyle(e.target.value)}
            className="px-3 py-2 rounded border bg-gray-900 text-gray-100"
          >
            <option value="__all__">All Styles</option>
            {printableStyles.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-2 rounded border bg-gray-900 text-gray-100"
          >
            <option value="All">All Years</option>
            {yearsAvailable.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>

          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="px-3 py-2 rounded border bg-gray-900 text-gray-100"
          >
            <option value="All">All Events</option>
            {eventsAvailable.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>

          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="px-3 py-2 rounded border bg-gray-900 text-gray-100"
          >
            <option value="All">All</option>
            <option value="W">Wins</option>
            <option value="L">Losses</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 rounded border border-red-500 text-red-400 flex items-center gap-1"
            >
              <X size={14} /> Clear
            </button>
          )}

          {activeTab === "mine" && (
            <Button
              onClick={handlePrint}
              className="ml-auto bg-gray-900 hover:bg-gray-800 text-white border border-gray-700"
            >
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          )}
        </div>
      )}

      {/* CONTENT */}
      {activeTab === "mine" &&
        (matchesLoading ? (
          <Spinner size={64} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMine.map((m) => (
              <MatchReportCard
                key={m._id}
                match={{ ...m, divisionDisplay: getDivisionDisplay(m) }}
                onView={(match) => {
                  setSelectedMatch(match);
                  setPreviewOpen(true);
                }}
                onEdit={async (match) => {
                  setSelectedMatch(match);
                  await loadStylesForModal();
                  setOpen(true);
                }}
                onShare={(match) => {
                  setShareMatch(match);
                  setShareOpen(true);
                }}
              />
            ))}
          </div>
        ))}

      {activeTab === "shared" &&
        (sharedLoading ? (
          <Spinner size={64} />
        ) : filteredShared.every((g) => g.reports.length === 0) ? (
          <p className="text-center text-gray-900 dark:text-gray-100 mt-10">
            No one has shared any match reports with you.
          </p>
        ) : (
          <div className="space-y-10">
            {filteredShared.map((g) =>
              g.reports.length === 0 ? null : (
                <div key={g.owner?._id}>
                  <h2 className="text-lg font-semibold mb-4">
                    {g.owner?.name || g.owner?.username}
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {g.reports.map((m) => (
                      <MatchReportCard
                        key={m._id}
                        match={{ ...m, divisionDisplay: getDivisionDisplay(m) }}
                        onView={() => {
                          setSelectedMatch({
                            ...m,
                            divisionDisplay: getDivisionDisplay(m),
                          });
                          setPreviewOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>
        ))}

      {/* MODAL */}
      <ModalLayout
        isOpen={open}
        onClose={() => setOpen(false)}
        title={selectedMatch ? "Edit Match" : "Add Match"}
        withCard
      >
        {stylesLoading ? (
          <Spinner size={40} />
        ) : (
          <MatchReportForm
            athlete={user}
            styles={stylesForForm}
            match={selectedMatch}
            setOpen={setOpen}
            onSuccess={fetchMatches}
            userType="user"
          />
        )}
      </ModalLayout>

      {previewOpen && selectedMatch && (
        <PreviewReportModal
          previewOpen={previewOpen}
          setPreviewOpen={setPreviewOpen}
          report={selectedMatch}
          reportType="match"
        />
      )}

      {shareOpen && shareMatch && (
        <ShareReportModal
          open={shareOpen}
          onClose={() => {
            setShareOpen(false);
            setShareMatch(null);
          }}
          ownerId={user._id}
          documentType="match-report"
          documentId={shareMatch._id}
        />
      )}
    </div>
  );
}

export default DashboardMatches;
