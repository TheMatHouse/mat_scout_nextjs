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

function ensureWeightDisplay(label, unit) {
  if (!label) return "";
  const low = String(label).toLowerCase();
  if (low.includes("kg") || low.includes("lb")) return label;
  return unit ? `${label} ${unit}` : label;
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

  /* ---------------- pagination ---------------- */
  const PAGE_SIZE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  /* ---------------- FETCH REPORTS ---------------- */
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

  /* ================= MATCH REPORTS STYLE LOADER CLONE + HARD PROOF LOGGING ================= */
  const loadStylesAndTechniques = useCallback(async () => {
    if (!user?._id) return;

    console.log("🔥 SCOUTING LOADER CALLED");

    // -------- STYLES --------
    setStylesLoading(true);
    try {
      const res = await fetch(`/api/dashboard/${user._id}/userStyles`, {
        cache: "no-store",
        credentials: "include", // <<< THIS WAS MISSING
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("🔥 STYLES FETCH STATUS:", res.status);

      const data = await res.json();
      console.log("🔥 RAW STYLES RESPONSE:", data);

      const styles = Array.isArray(data)
        ? data
        : data?.styles || data?.userStyles || [];

      console.log("🔥 NORMALIZED STYLES:", styles);

      setStylesForForm(styles);
    } catch (err) {
      console.error("❌ STYLES FETCH ERROR:", err);
      setStylesForForm([]);
    } finally {
      setStylesLoading(false);
    }

    // -------- TECHNIQUES --------
    setTechniquesLoading(true);
    try {
      const res = await fetch(`/api/techniques`, {
        cache: "no-store",
        credentials: "include", // <<< ADD THIS TOO
      });

      const data = await res.json();
      console.log("🔥 TECHNIQUES:", data);

      setTechniquesForForm(data?.techniques || data || []);
    } catch (err) {
      console.error("❌ TECH FETCH ERROR:", err);
      setTechniquesForForm([]);
    } finally {
      setTechniquesLoading(false);
    }
  }, [user?._id]);

  /* ---------------- FILTERING ---------------- */
  const filteredReports = useMemo(() => {
    return scoutingReports.filter((r) => {
      if (filterAthlete && r.athleteDisplay !== filterAthlete) return false;
      if (filterCountry && r.countryDisplay !== filterCountry) return false;
      if (filterDivision && r.divisionDisplay !== filterDivision) return false;
      if (filterWeight && r.weightDisplay !== filterWeight) return false;
      return true;
    });
  }, [
    scoutingReports,
    filterAthlete,
    filterCountry,
    filterDivision,
    filterWeight,
  ]);

  const pagedReports = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredReports.slice(start, start + PAGE_SIZE);
  }, [filteredReports, currentPage]);

  useEffect(
    () => setCurrentPage(1),
    [filterAthlete, filterCountry, filterDivision, filterWeight],
  );

  const exportUrl = `/api/records/scouting?download=1`;
  useEffect(() => {
    console.log("🔥 STYLES STATE IN TAB:", stylesForForm);
  }, [stylesForForm]);
  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          {" "}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            My Reports
          </h1>
          <Button
            className="btn btn-primary"
            onClick={async () => {
              setSelectedReport(null);
              await loadStylesAndTechniques(); // <<< WAIT FOR DATA
              setOpen(true);
            }}
            onTouchStart={() => {
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

      {/* REPORT GRID */}
      {reportsLoading ? (
        <div className="flex justify-center items-center h-[40vh]">
          <Spinner size={52} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pagedReports.map((report) => (
            <DashboardScoutingReportCard
              key={report._id}
              report={report}
              onView={() => {
                setPreviewPayload(buildPreviewPayload(report));
                setPreviewOpen(true);
              }}
              onEdit={async () => {
                setSelectedReport(report);
                await loadStylesAndTechniques();
                setOpen(true);
              }}
              onShare={() => {
                setShareReport(report);
                setShareOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* SCOUTING MODAL */}
      <ModalLayout
        isOpen={open}
        onClose={() => setOpen(false)}
        title={selectedReport ? "Edit Scouting Report" : "Add Scouting Report"}
        withCard
      >
        {stylesLoading || techniquesLoading ? (
          <Spinner size={40} />
        ) : (
          <ScoutingReportForm
            athlete={user}
            userType="user"
            report={selectedReport}
            styles={stylesForForm}
            techniques={techniquesForForm}
            setOpen={setOpen}
            onSuccess={fetchReports}
          />
        )}
      </ModalLayout>

      {/* Preview */}
      {previewOpen && previewPayload && (
        <PreviewReportModal
          previewOpen={previewOpen}
          setPreviewOpen={setPreviewOpen}
          report={previewPayload}
          reportType="scouting"
        />
      )}

      {/* Share */}
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
