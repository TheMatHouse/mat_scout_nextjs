"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import { Eye, Edit, Trash, FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ReportDataTable } from "@/components/shared/report-data-table";
import PreviewReportModal from "@/components/shared/PreviewReportModal";
import ScoutingReportForm from "@/components/dashboard/forms/ScoutingReportForm";
import ModalLayout from "@/components/shared/ModalLayout";
import Spinner from "@/components/shared/Spinner";
import MatchReportCard from "@/components/shared/MatchReportCard";

/* ---------------- helpers ---------------- */

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

const buildPreviewPayload = (r) => {
  const divisionDisplay = computeDivisionDisplay(r?.division);

  let weightDisplay = "";
  if (r?.weightLabel) {
    weightDisplay = ensureWeightDisplay(r.weightLabel, r.weightUnit);
  }

  return {
    ...r,
    division: divisionDisplay,
    divisionDisplay,
    weightDisplay,
    opponentName: r.opponent || "",
  };
};

/* ============================================================ */

function FamilyMyScoutingReportsTab({ member }) {
  const router = useRouter();

  const userId = member?.userId;
  const memberId = member?._id;

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  // modal + preview
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [previewPayload, setPreviewPayload] = useState(null);

  const didFetch = useRef(false);

  /* ---------------- data load ---------------- */

  useEffect(() => {
    if (!userId || !memberId) return;
    if (didFetch.current) return;
    didFetch.current = true;
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, memberId]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/${userId}/family/${memberId}/scoutingReports`,
        { cache: "no-store", credentials: "same-origin" }
      );
      if (!res.ok) throw new Error("Failed to load reports");

      const data = await res.json();
      const normalized = (Array.isArray(data) ? data : []).map((r) => ({
        ...r,
        divisionDisplay: computeDivisionDisplay(r.division),
      }));

      setReports(normalized);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load scouting reports");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- delete ---------------- */

  const handleDelete = async (report) => {
    if (!confirm("Delete this scouting report?")) return;

    const res = await fetch(
      `/api/dashboard/${userId}/family/${memberId}/scoutingReports/${report._id}`,
      { method: "DELETE", credentials: "same-origin" }
    );

    if (res.ok) {
      toast.success("Scouting report deleted");
      setReports((prev) => prev.filter((r) => r._id !== report._id));
    } else {
      toast.error("Failed to delete scouting report");
    }
  };

  /* ---------------- table ---------------- */

  const columns = [
    { accessorKey: "matchType", header: "Type" },
    { accessorKey: "athleteFirstName", header: "First" },
    { accessorKey: "athleteLastName", header: "Last" },
    { accessorKey: "divisionDisplay", header: "Division" },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setPreviewPayload(buildPreviewPayload(r));
                setPreviewOpen(true);
              }}
            >
              <Eye className="w-5 h-5 text-blue-500" />
            </button>
            <button
              onClick={() => {
                setSelectedReport(r);
                setOpen(true);
              }}
            >
              <Edit className="w-5 h-5 text-green-500" />
            </button>
            <button onClick={() => handleDelete(r)}>
              <Trash className="w-5 h-5 text-red-500" />
            </button>
          </div>
        );
      },
    },
  ];

  const exportUrl = `/api/records/scouting?download=1&familyMemberId=${memberId}`;

  /* ============================================================ */

  return (
    <>
      {/* Header + Add */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            My Scouting Reports
          </h2>

          <Button
            className="btn btn-primary"
            onClick={() => {
              setSelectedReport(null);
              setOpen(true);
            }}
          >
            Add Scouting Report
          </Button>
        </div>

        <div className="flex justify-end mt-3">
          <Button
            variant="outline"
            onClick={() => window.open(exportUrl, "_blank")}
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
        </div>
      </div>

      {loading ? (
        <Spinner size={48} />
      ) : (
        <>
          {/* Mobile */}
          <div className="sm:hidden grid gap-4">
            {reports.map((r) => (
              <MatchReportCard
                key={r._id}
                match={{
                  opponentName:
                    `${r.athleteFirstName} ${r.athleteLastName}` || "—",
                  eventName: r.eventName || "",
                  divisionDisplay: r.divisionDisplay,
                }}
                onView={() => {
                  setPreviewPayload(buildPreviewPayload(r));
                  setPreviewOpen(true);
                }}
                onEdit={() => {
                  setSelectedReport(r);
                  setOpen(true);
                }}
                onDelete={() => handleDelete(r)}
              />
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden md:block">
            <ReportDataTable
              columns={columns}
              data={reports}
            />
          </div>
        </>
      )}

      {/* Add / Edit Modal */}
      <ModalLayout
        isOpen={open}
        onClose={() => setOpen(false)}
        title={selectedReport ? "Edit Scouting Report" : "Add Scouting Report"}
        withCard
      >
        <ScoutingReportForm
          athlete={member}
          report={selectedReport}
          userType="family"
          onSuccess={fetchReports}
          setOpen={setOpen}
        />
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
    </>
  );
}

export default FamilyMyScoutingReportsTab;
