// components/dashboard/DashboardScouting.jsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import { ArrowUpDown, Eye, Edit, Trash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ReportDataTable } from "../shared/report-data-table";
import PreviewReportModal from "../shared/PreviewReportModal";
import ScoutingReportForm from "./forms/ScoutingReportForm";
import ModalLayout from "@/components/shared/ModalLayout";
import Spinner from "@/components/shared/Spinner";

/* helpers ... (unchanged, keep your current ones) */
function extractArray(payload) {
  /* ... */
}
function genderLabel(g) {
  /* ... */
}
function divisionPrettyFromObj(d) {
  /* ... */
}
function ensureWeightDisplay(label, unit) {
  /* ... */
}
function getDivisionId(div) {
  /* ... */
}
async function fetchDivisionWeights(divisionId) {
  /* ... */
}

const DashboardScouting = ({ user }) => {
  const router = useRouter();
  const [scoutingReports, setScoutingReports] = useState([]);
  const [divisionMap, setDivisionMap] = useState({});
  const [weightsMap, setWeightsMap] = useState({});
  const [reportsLoading, setReportsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [stylesLoading, setStylesLoading] = useState(false);
  const [stylesForForm, setStylesForForm] = useState([]);
  const [techniquesLoading, setTechniquesLoading] = useState(false);
  const [techniquesForForm, setTechniquesForForm] = useState([]);

  const didFetchRef = useRef(false);

  useEffect(() => {
    if (!user?._id || didFetchRef.current) return;
    didFetchRef.current = true;
    fetchReports({ showSpinner: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const fetchReports = async ({ showSpinner = true } = {}) => {
    if (showSpinner) setReportsLoading(true);
    try {
      const uid = encodeURIComponent(String(user._id));
      const res = await fetch(`/api/dashboard/${uid}/scoutingReports`, {
        cache: "no-store",
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();

      const byId = new Map();
      (Array.isArray(raw) ? raw : []).forEach((r) => {
        const id = String(r?._id ?? "");
        if (!/^[a-f0-9]{24}$/i.test(id)) return;
        if (!byId.has(id)) byId.set(id, r);
      });

      const cleaned = Array.from(byId.values()).sort((a, b) => {
        const ta = Date.parse(a?.createdAt || 0) || 0;
        const tb = Date.parse(b?.createdAt || 0) || 0;
        return tb - ta;
      });

      const normalized = cleaned.map((r) => ({
        ...r,
        divisionId: r?.division?._id || r?.division || null,
        divisionName: r?.division?.name || r?.divisionName || "",
        weightText: r?.weightLabel
          ? `${r.weightLabel}${r?.weightUnit ? ` ${r.weightUnit}` : ""}`
          : "",
        athleteFullName: [r?.athleteFirstName, r?.athleteLastName]
          .filter(Boolean)
          .join(" "),
      }));

      setScoutingReports(normalized);
      await Promise.all([
        hydrateDivisionMap(normalized),
        hydrateWeightsMap(normalized),
      ]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch scouting reports");
    } finally {
      if (showSpinner) setReportsLoading(false);
    }
  };

  const hydrateDivisionMap = async (reports) => {
    /* ... */
  };
  const hydrateWeightsMap = async (reports) => {
    /* ... */
  };

  const loadStylesForModal = useCallback(async () => {
    /* ... */
  }, [user?._id, user?.userStyles]);
  const loadTechniquesForModal = useCallback(async () => {
    /* ... */
  }, []);

  const handleDeleteReport = async (report) => {
    /* ... same as your working version ... */
  };

  const tableData = useMemo(() => {
    return (scoutingReports || []).map((r) => {
      const divDisplay =
        (r?.division && typeof r.division === "object"
          ? divisionPrettyFromObj(r.division)
          : r?.division && typeof r.division === "string"
          ? divisionMap[r.division] || "—"
          : "—") || "—";

      let weightDisplay = "—";
      if (r?.weightLabel && String(r.weightLabel).trim()) {
        weightDisplay = ensureWeightDisplay(
          String(r.weightLabel).trim(),
          r?.weightUnit
        );
      } else {
        const divId = getDivisionId(r?.division);
        const w = divId ? weightsMap[divId] : null;
        if (w && Array.isArray(w.items) && r?.weightItemId) {
          const item = w.items.find(
            (it) =>
              String(it._id) === String(r.weightItemId) ||
              String(it.label).toLowerCase() ===
                String(r.weightItemId).toLowerCase()
          );
          if (item?.label) {
            const unit = r?.weightUnit || w.unit || "";
            weightDisplay = ensureWeightDisplay(item.label, unit);
          }
        }
      }

      return { ...r, divisionDisplay: divDisplay, weightDisplay };
    });
  }, [scoutingReports, divisionMap, weightsMap]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "matchType",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Type <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      { accessorKey: "athleteFirstName", header: "Athlete First" },
      {
        accessorKey: "athleteLastName",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Athlete Last <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      { accessorKey: "athleteNationalRank", header: "National Rank" },
      { accessorKey: "athleteWorldRank", header: "World Rank" },
      {
        accessorKey: "athleteClub",
        header: "Club",
        meta: { className: "hidden md:table-cell" },
      },
      {
        accessorKey: "athleteCountry",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Country <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: "divisionDisplay",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Division <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        meta: { className: "hidden md:table-cell" },
        sortingFn: (a, b) =>
          String(a.getValue("divisionDisplay")).localeCompare(
            String(b.getValue("divisionDisplay")),
            undefined,
            {
              sensitivity: "base",
            }
          ),
      },
      {
        accessorKey: "weightDisplay",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Weight Class <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        meta: { className: "hidden md:table-cell" },
        sortingFn: (a, b) =>
          String(a.getValue("weightDisplay")).localeCompare(
            String(b.getValue("weightDisplay")),
            undefined,
            {
              numeric: true,
            }
          ),
      },
      {
        accessorKey: "createdByName",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Created By <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => row.original.createdByName || "—",
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => {
          const report = row.original;
          return (
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  setSelectedReport(report);
                  setPreviewOpen(true);
                }}
                title="View Details"
                className="icon-btn"
              >
                <Eye className="w-5 h-5 text-blue-500" />
              </button>
              <button
                onClick={async () => {
                  setSelectedReport(report);
                  setOpen(true);
                  await Promise.all([
                    loadStylesForModal(),
                    loadTechniquesForModal(),
                  ]);
                }}
                title="Edit Report"
                className="icon-btn"
              >
                <Edit className="w-5 h-5 text-green-500" />
              </button>
              <button
                onClick={() => handleDeleteReport(report)}
                title="Delete Report"
                className="icon-btn"
              >
                <Trash className="w-5 h-5 text-red-500" />
              </button>
            </div>
          );
        },
      },
    ],
    [loadStylesForModal, loadTechniquesForModal]
  );

  const openingModal = stylesLoading || techniquesLoading;

  const excelHref = `/api/records/scouting?download=1&ts=${Date.now()}`;

  return (
    <div className="px-4 md:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">My Scouting Reports</h1>
        <div className="flex items-center gap-3">
          <a
            href={excelHref}
            className="btn btn-outline"
            title="Export to Excel"
          >
            Export to Excel
          </a>
          <Button
            className="btn btn-primary"
            onClick={async () => {
              setSelectedReport(null);
              setOpen(true);
              await Promise.all([
                loadStylesForModal(),
                loadTechniquesForModal(),
              ]);
            }}
          >
            Add Scouting Report
          </Button>
        </div>
      </div>

      {/* Modal */}
      <ModalLayout
        isOpen={open}
        onClose={() => setOpen(false)}
        title={selectedReport ? "Edit Scouting Report" : "Add Scouting Report"}
        description="Fill out all scouting details below."
        withCard={true}
      >
        {openingModal ? (
          <div className="flex items-center justify-center py-10">
            <Spinner size={40} />
          </div>
        ) : stylesForForm.length > 0 ? (
          <ScoutingReportForm
            athlete={user}
            styles={stylesForForm}
            techniques={techniquesForForm}
            userType="user"
            report={selectedReport}
            setOpen={setOpen}
            onSuccess={() => fetchReports({ showSpinner: false })}
          />
        ) : (
          <div className="p-6 text-center">
            <p className="text-base text-muted-foreground mb-4">
              You must add a style/sport before creating a scouting report.
            </p>
            <Button
              onClick={() => {
                setOpen(false);
                router.push("/dashboard/styles");
              }}
              className="bg-ms-blue-gray hover:bg-ms-blue text-white"
            >
              Go to Styles
            </Button>
          </div>
        )}
      </ModalLayout>

      {/* Body */}
      {reportsLoading ? (
        <div className="flex flex-col justify-center items-center h-[40vh]">
          <Spinner size={52} />
          <p className="mt-2 text-base text-muted-foreground">
            Loading scouting reports…
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="grid grid-cols-1 sm:hidden gap-4 mb-6">
            {tableData.length > 0 ? (
              tableData.map((report) => (
                <div
                  key={report._id}
                  className="bg-gray-900 text-white p-4 rounded-xl shadow-md border border-gray-700"
                >
                  <p>
                    <strong>Type:</strong> {report.matchType}
                  </p>
                  <p>
                    <strong>Athlete:</strong> {report.athleteFirstName}{" "}
                    {report.athleteLastName}
                  </p>
                  <p>
                    <strong>Country:</strong> {report.athleteCountry}
                  </p>
                  <p>
                    <strong>Division:</strong> {report.divisionDisplay}
                  </p>
                  <p>
                    <strong>Weight Class:</strong> {report.weightDisplay}
                  </p>
                  <p>
                    <strong>Created By:</strong> {report.createdByName || "—"}
                  </p>

                  <div className="flex justify-end gap-4 mt-4">
                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setPreviewOpen(true);
                      }}
                      title="View Details"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={async () => {
                        setSelectedReport(report);
                        setOpen(true);
                        await Promise.all([
                          loadStylesForModal(),
                          loadTechniquesForModal(),
                        ]);
                      }}
                      title="Edit"
                      className="text-green-400 hover:text-green-300"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteReport(report)}
                      title="Delete"
                      className="text-red-500 hover:text-red-400"
                    >
                      <Trash size={18} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400">No scouting reports found.</p>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <div className="min-w-[800px]">
              <ReportDataTable
                columns={columns}
                data={tableData}
              />
            </div>
          </div>
        </>
      )}

      {/* Preview modal */}
      {previewOpen && selectedReport && (
        <PreviewReportModal
          previewOpen={previewOpen}
          setPreviewOpen={setPreviewOpen}
          report={selectedReport}
          reportType="scouting"
        />
      )}
    </div>
  );
};

export default DashboardScouting;
