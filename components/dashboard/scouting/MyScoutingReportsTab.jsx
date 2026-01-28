// components/dashboard/scouting/MyScoutingReportsTab.jsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import { FileDown, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import PreviewReportModal from "@/components/shared/PreviewReportModal";
import ScoutingReportForm from "@/components/dashboard/forms/ScoutingReportForm";
import ModalLayout from "@/components/shared/ModalLayout";
import Spinner from "@/components/shared/Spinner";
import ShareReportModal from "@/components/dashboard/ShareReportModal";
import DashboardScoutingReportCard from "@/components/shared/DashboardScoutingReportCard";

/* ---------------- safe display helpers --------------- */
const genderLabel = (g) => {
  const s = String(g ?? "").toLowerCase();
  if (s === "male") return "Men";
  if (s === "female") return "Women";
  if (s === "coed" || s === "open") return "Coed";
  return s || "";
};

const computeDivisionDisplay = (division) => {
  if (!division) return "—";
  if (typeof division === "string") return division;
  if (typeof division === "object") {
    const name = division?.name || "";
    const glab = genderLabel(division?.gender);
    return name ? (glab ? `${name} — ${glab}` : name) : "—";
  }
  return "—";
};

/* ---------- helpers ---------- */
function extractArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.userStyles)) return payload.userStyles;
  if (payload && Array.isArray(payload.styles)) return payload.styles;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
}

function ensureWeightDisplay(label, unit) {
  if (!label) return "";
  const low = String(label).toLowerCase();
  if (low.includes("kg") || low.includes("lb")) return label;
  return unit ? `${label} ${unit}` : label;
}

function getDivisionId(div) {
  if (!div) return "";
  if (typeof div === "string") return div;
  if (typeof div === "object") {
    if (div._id) return String(div._id);
    if (div.id) return String(div.id);
  }
  return "";
}

/* ---------- preview payload ---------- */
const toSafeStr = (v) => (v == null ? "" : String(v));
const toNonNegInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const buildPreviewPayload = (r) => {
  const divisionDisplay = computeDivisionDisplay(r?.division);
  const weightLabel = toSafeStr(r?.weightLabel).trim();
  const weightUnit = toSafeStr(r?.weightUnit).trim();
  let weightDisplay = weightLabel;
  if (weightDisplay && weightUnit && !/\b(kg|lb)s?\b/i.test(weightDisplay)) {
    weightDisplay = `${weightDisplay} ${weightUnit}`;
  }

  const videos = Array.isArray(r?.videos)
    ? r.videos
        .map((v) =>
          v && typeof v === "object"
            ? {
                title: toSafeStr(v.title),
                notes: toSafeStr(v.notes),
                url: toSafeStr(v.url),
                startSeconds: toNonNegInt(v.startSeconds),
              }
            : null,
        )
        .filter(Boolean)
    : [];

  return {
    ...r,
    divisionDisplay,
    division: divisionDisplay,
    weightDisplay: weightDisplay || "—",
    videos,
  };
};

const MyScoutingReportsTab = ({ user }) => {
  const router = useRouter();

  const [scoutingReports, setScoutingReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [previewPayload, setPreviewPayload] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareReport, setShareReport] = useState(null);

  const [stylesLoading, setStylesLoading] = useState(false);
  const [stylesForForm, setStylesForForm] = useState([]);

  const [techniquesLoading, setTechniquesLoading] = useState(false);
  const [techniquesForForm, setTechniquesForForm] = useState([]);

  const didFetchRef = useRef(false);

  /* ---------------- FILTER STATE ---------------- */
  const [filterAthlete, setFilterAthlete] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterDivision, setFilterDivision] = useState("");
  const [filterWeight, setFilterWeight] = useState("");

  const hasActiveFilters =
    filterAthlete || filterCountry || filterDivision || filterWeight;

  /* ---------------- pagination ---------------- */
  const PAGE_SIZE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!user?._id) return;
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    fetchReports();
  }, [user?._id]);

  const fetchReports = async () => {
    try {
      setReportsLoading(true);
      const uid = encodeURIComponent(String(user._id));
      const res = await fetch(`/api/dashboard/${uid}/scoutingReports`, {
        cache: "no-store",
      });
      const raw = await res.json();
      const normalized = (raw || []).map((r) => {
        const athleteDisplay =
          `${r?.athleteFirstName || ""} ${r?.athleteLastName || ""}`.trim();
        return {
          ...r,
          athleteDisplay,
          countryDisplay: r?.athleteCountry || "",
          divisionDisplay: computeDivisionDisplay(r?.division),
          weightDisplay: ensureWeightDisplay(r?.weightLabel, r?.weightUnit),
        };
      });
      setScoutingReports(normalized);
    } catch {
      toast.error("Failed to load scouting reports");
    } finally {
      setReportsLoading(false);
    }
  };

  /* ---------------- FILTERING LOGIC ---------------- */
  const normalizedReports = scoutingReports;

  const filteredReports = useMemo(() => {
    return normalizedReports.filter((r) => {
      if (filterAthlete && r.athleteDisplay !== filterAthlete) return false;
      if (filterCountry && r.countryDisplay !== filterCountry) return false;
      if (filterDivision && r.divisionDisplay !== filterDivision) return false;
      if (filterWeight && r.weightDisplay !== filterWeight) return false;
      return true;
    });
  }, [
    normalizedReports,
    filterAthlete,
    filterCountry,
    filterDivision,
    filterWeight,
  ]);

  const sortAlpha = (arr) =>
    [...arr].sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { sensitivity: "base" }),
    );

  const buildOptions = (selector) =>
    sortAlpha(
      Array.from(new Set(normalizedReports.map(selector).filter(Boolean))),
    );

  const athleteOptions = buildOptions((r) => r.athleteDisplay);
  const countryOptions = buildOptions((r) => r.countryDisplay);
  const divisionOptions = buildOptions((r) => r.divisionDisplay);
  const weightOptions = buildOptions((r) => r.weightDisplay);

  /* ---------------- pagination ---------------- */
  const totalPages = Math.ceil(filteredReports.length / PAGE_SIZE);
  const pagedReports = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredReports.slice(start, start + PAGE_SIZE);
  }, [filteredReports, currentPage]);

  useEffect(
    () => setCurrentPage(1),
    [filterAthlete, filterCountry, filterDivision, filterWeight],
  );

  const exportUrl = `/api/records/scouting?download=1`;

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            My Scouting Reports
          </h1>

          <Button
            type="button"
            className="btn-add relative z-[50] pointer-events-auto touch-manipulation"
            onClick={() => {
              setSelectedReport(null);
              setOpen(true);
            }}
          >
            <Plus size={16} /> Add Scouting Report
          </Button>
        </div>

        <div className="flex justify-end mt-3">
          <Button
            variant="outline"
            onClick={() => window.open(exportUrl, "_blank")}
            className="flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            Export to Excel
          </Button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="mb-6 flex gap-3 flex-wrap">
        <select
          className="w-44 border rounded px-3 py-2"
          value={filterAthlete}
          onChange={(e) => setFilterAthlete(e.target.value)}
        >
          <option value="">Athlete</option>
          {athleteOptions.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>

        <select
          className="w-40 border rounded px-3 py-2"
          value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value)}
        >
          <option value="">Country</option>
          {countryOptions.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>

        <select
          className="w-48 border rounded px-3 py-2"
          value={filterDivision}
          onChange={(e) => setFilterDivision(e.target.value)}
        >
          <option value="">Division</option>
          {divisionOptions.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>

        <select
          className="w-36 border rounded px-3 py-2"
          value={filterWeight}
          onChange={(e) => setFilterWeight(e.target.value)}
        >
          <option value="">Weight</option>
          {weightOptions.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={() => {
              setFilterAthlete("");
              setFilterCountry("");
              setFilterDivision("");
              setFilterWeight("");
            }}
            className="border rounded px-3 py-2 text-sm"
          >
            Clear
          </button>
        )}
      </div>

      {/* REPORT GRID */}
      {reportsLoading ? (
        <div className="flex justify-center items-center h-[40vh]">
          <Spinner size={52} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pagedReports.length ? (
            pagedReports.map((report) => (
              <DashboardScoutingReportCard
                key={report._id}
                report={report}
                onView={() => {
                  setPreviewPayload(buildPreviewPayload(report));
                  setPreviewOpen(true);
                }}
                onEdit={() => {
                  setSelectedReport(report);
                  setOpen(true);
                }}
                onShare={() => {
                  setShareReport(report);
                  setShareOpen(true);
                }}
                onDelete={() => handleDeleteReport(report)}
              />
            ))
          ) : (
            <p className="text-gray-900 dark:text-gray-100">
              No scouting reports found.
            </p>
          )}
        </div>
      )}

      {/* Preview modal */}
      {previewOpen && previewPayload && (
        <PreviewReportModal
          previewOpen={previewOpen}
          setPreviewOpen={setPreviewOpen}
          report={previewPayload}
          reportType="scouting"
        />
      )}

      {shareOpen && shareReport && (
        <ShareReportModal
          open={shareOpen}
          onClose={() => {
            setShareOpen(false);
            setShareReport(null);
          }}
          ownerId={user._id}
          documentType="personal-scout"
          documentId={shareReport._id}
        />
      )}
    </>
  );
};

export default MyScoutingReportsTab;
