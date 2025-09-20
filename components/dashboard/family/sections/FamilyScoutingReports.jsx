// components/dashboard/family/sections/FamilyScoutingReports.jsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { ReportDataTable } from "@/components/shared/report-data-table";
import ScoutingReportForm from "@/components/dashboard/forms/ScoutingReportForm";
import PreviewReportModal from "@/components/dashboard/PreviewReportModal";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Eye, Edit, Trash } from "lucide-react";
import ModalLayout from "@/components/shared/ModalLayout";
import { normalizeStyles } from "@/lib/normalizeStyles";
import Spinner from "@/components/shared/Spinner";

/* ---------- helpers to pretty-print Division + Weight ---------- */
function genderLabel(g) {
  if (!g) return "";
  const s = String(g).toLowerCase();
  if (s === "male") return "Men";
  if (s === "female") return "Women";
  if (s === "coed" || s === "open") return "Coed";
  return s;
}
function divisionPrettyFromObj(d) {
  if (!d) return "";
  const g = genderLabel(d.gender);
  return g ? `${d.name} — ${g}` : d.name || "";
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
async function fetchDivisionWeights(divisionId) {
  const id = encodeURIComponent(String(divisionId));
  try {
    const res = await fetch(`/api/divisions/${id}/weights`, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    const cat = data?.weightCategory;
    if (!cat) return null;

    const unit = cat.unit || "";
    const items = Array.isArray(cat.items) ? cat.items : [];
    const normItems = items
      .map((it) => ({
        _id: String(it._id ?? it.id ?? it.value ?? it.label ?? "").trim(),
        label: String(it.label ?? it.value ?? "").trim(),
      }))
      .filter((x) => x._id && x.label);
    if (!normItems.length) return null;
    return { unit, items: normItems };
  } catch {
    return null;
  }
}

const FamilyScoutingReports = ({ member, onSwitchToStyles }) => {
  const router = useRouter();
  const [scoutingReports, setScoutingReports] = useState([]);
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // maps for pretty labels
  const [divisionMap, setDivisionMap] = useState({});
  const [weightsMap, setWeightsMap] = useState({});

  // styles for the form (fetched on-demand)
  const [stylesLoading, setStylesLoading] = useState(false);
  const [stylesForForm, setStylesForForm] = useState([]);

  // Baseline styles from the member prop (fallback only)
  const stylesForMember = useMemo(() => {
    const raw = member?.styles?.length
      ? member.styles
      : member?.userStyles || [];
    return normalizeStyles(raw || []);
  }, [member?.styles, member?.userStyles]);

  useEffect(() => {
    if (!member?._id || !member?.userId) return;
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member?._id, member?.userId]);

  const fetchReports = async () => {
    try {
      const res = await fetch(
        `/api/dashboard/${member.userId}/family/${
          member._id
        }/scoutingReports?ts=${Date.now()}`,
        { cache: "no-store", credentials: "same-origin" }
      );
      if (!res.ok) throw new Error("Failed to fetch scouting reports");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setScoutingReports(list);

      // Hydrate pretty maps for division/weights
      await Promise.all([hydrateDivisionMap(list), hydrateWeightsMap(list)]);
    } catch (err) {
      console.error(err);
      toast.error("Could not load scouting reports.");
    }
  };

  const hydrateDivisionMap = async (reports) => {
    const entries = {};
    (reports || []).forEach((r) => {
      const divId = getDivisionId(r?.division);
      const divObj =
        r?.division && typeof r.division === "object" ? r.division : null;
      if (divId && divObj && !entries[divId]) {
        entries[divId] = divisionPrettyFromObj(divObj);
      }
    });
    if (Object.keys(entries).length) {
      setDivisionMap((prev) => ({ ...prev, ...entries }));
    }

    // Also fetch catalog per style to cover id-only divisions
    const styles = Array.from(
      new Set(
        (reports || []).map((r) => (r?.matchType || "").trim()).filter(Boolean)
      )
    );
    if (!styles.length) return;

    const fetched = {};
    await Promise.all(
      styles.map(async (styleName) => {
        try {
          const res = await fetch(
            `/api/divisions?styleName=${encodeURIComponent(styleName)}`,
            {
              cache: "no-store",
              credentials: "same-origin",
              headers: { accept: "application/json" },
            }
          );
          const data = await res.json().catch(() => ({}));
          const divs = Array.isArray(data?.divisions) ? data.divisions : [];
          divs.forEach((d) => {
            if (d?._id) fetched[d._id] = divisionPrettyFromObj(d);
          });
        } catch {
          /* ignore */
        }
      })
    );
    if (Object.keys(fetched).length) {
      setDivisionMap((prev) => ({ ...prev, ...fetched }));
    }
  };

  const hydrateWeightsMap = async (reports) => {
    const divIds = Array.from(
      new Set(
        (reports || []).map((r) => getDivisionId(r?.division)).filter(Boolean)
      )
    );
    if (!divIds.length) return;

    const entries = {};
    await Promise.all(
      divIds.map(async (id) => {
        const weights = await fetchDivisionWeights(id);
        if (weights) entries[id] = weights;
      })
    );
    if (Object.keys(entries).length) {
      setWeightsMap((prev) => ({ ...prev, ...entries }));
    }
  };

  const handleDeleteReport = async (report) => {
    if (
      !window.confirm("This report will be permanently deleted! Are you sure?")
    )
      return;
    try {
      const res = await fetch(
        `/api/dashboard/${member.userId}/family/${member._id}/scoutingReports/${report._id}`,
        { method: "DELETE", headers: { "Content-Type": "application/json" } }
      );
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Deleted.");
        setScoutingReports((prev) => prev.filter((r) => r._id !== report._id));
        setSelectedReport(null);
        router.refresh();
      } else {
        toast.error(data.message || "Failed to delete report");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting report");
    }
  };

  // ===== Load styles (family endpoint) when opening the modal =====
  const loadStylesForModal = useCallback(async () => {
    if (!member?.userId || !member?._id) {
      setStylesForForm([]);
      return;
    }
    setStylesLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/${member.userId}/family/${member._id}/styles`,
        {
          cache: "no-store",
          credentials: "same-origin",
          headers: { accept: "application/json" },
        }
      );
      let list = [];
      if (res.ok) {
        const data = await res.json().catch(() => []);
        list = Array.isArray(data)
          ? data
          : data.userStyles || data.styles || [];
      }
      const normalized = normalizeStyles(list);
      setStylesForForm(normalized.length ? normalized : stylesForMember);
    } catch (e) {
      console.error("Failed to load family styles:", e);
      setStylesForForm(stylesForMember);
    } finally {
      setStylesLoading(false);
    }
  }, [member?.userId, member?._id, stylesForMember]);

  // Derive pretty division/weight for the table and mobile cards
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

  const columns = [
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
    { accessorKey: "athleteFirstName", header: "First Name" },
    {
      accessorKey: "athleteLastName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Last Name <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    { accessorKey: "athleteNationalRank", header: "Nat. Rank" },
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
    // Pretty strings, not IDs
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
      sortingFn: (rowA, rowB) =>
        String(rowA.getValue("divisionDisplay")).localeCompare(
          String(rowB.getValue("divisionDisplay")),
          undefined,
          { sensitivity: "base" }
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
      sortingFn: (rowA, rowB) =>
        String(rowA.getValue("weightDisplay")).localeCompare(
          String(rowB.getValue("weightDisplay")),
          undefined,
          { numeric: true }
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
              title="View Scouting Details"
              className="icon-btn"
            >
              <Eye className="w-5 h-5 text-blue-500" />
            </button>
            <button
              onClick={async () => {
                setSelectedReport(report);
                setOpen(true);
                await loadStylesForModal();
              }}
              title="Edit Scouting Report"
              className="icon-btn"
            >
              <Edit className="w-5 h-5 text-green-500" />
            </button>
            <button
              onClick={() => handleDeleteReport(report)}
              title="Delete Scouting Report"
              className="icon-btn"
            >
              <Trash className="w-5 h-5 text-red-500" />
            </button>
          </div>
        );
      },
    },
  ];

  const excelHref = `/api/records/scouting?download=1&familyMemberId=${encodeURIComponent(
    String(member?._id || "")
  )}&ts=${Date.now()}`;

  return (
    <div>
      {/* Header: Title + Add on the LEFT, Export on the RIGHT */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Family Member Scouting</h1>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 items-center gap-2">
          <div>
            <Button
              className="btn btn-primary"
              onClick={async () => {
                setSelectedReport(null);
                setOpen(true);
                await loadStylesForModal();
              }}
            >
              Add Scouting Report
            </Button>
          </div>
          <div className="flex sm:justify-end">
            <a
              href={excelHref}
              className="btn btn-outline"
              title="Export to Excel"
            >
              Export to Excel
            </a>
          </div>
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
        {stylesLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner size={40} />
          </div>
        ) : stylesForForm.length > 0 ? (
          <ScoutingReportForm
            key={selectedReport?._id}
            athlete={member}
            report={selectedReport}
            setOpen={setOpen}
            onSuccess={fetchReports}
            userType="family"
            styles={stylesForForm}
          />
        ) : (
          <div className="p-6 text-center">
            <p className="text-base text-muted-foreground mb-4">
              This family member doesn’t have any styles yet. Please go to the{" "}
              <strong>Styles</strong> tab on this profile and add a style before
              creating a scouting report.
            </p>
            {typeof onSwitchToStyles === "function" && (
              <Button
                onClick={() => {
                  setOpen(false);
                  onSwitchToStyles();
                }}
                className="bg-ms-blue-gray hover:bg-ms-blue text-white"
              >
                Go to Styles
              </Button>
            )}
          </div>
        )}
      </ModalLayout>

      {/* Mobile cards (use pretty strings) */}
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
                    await loadStylesForModal();
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

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <div className="min-w-[800px]">
          <ReportDataTable
            columns={columns}
            data={tableData}
            onView={(report) => {
              setSelectedReport(report);
              setPreviewOpen(true);
            }}
            onEdit={async (report) => {
              setSelectedReport(report);
              setOpen(true);
              await loadStylesForModal();
            }}
            onDelete={(report) => handleDeleteReport(report)}
          />
        </div>
      </div>

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

export default FamilyScoutingReports;
