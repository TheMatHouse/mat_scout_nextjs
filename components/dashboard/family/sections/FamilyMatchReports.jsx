"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import moment from "moment";
import { toast } from "react-toastify";
import { ReportDataTable } from "@/components/shared/report-data-table";
import MatchReportForm from "@/components/dashboard/forms/MatchReportForm";
import PreviewReportModal from "@/components/dashboard/PreviewReportModal";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Eye, Edit, Trash, Printer } from "lucide-react";
import ModalLayout from "@/components/shared/ModalLayout";
import { normalizeStyles } from "@/lib/normalizeStyles";
import Spinner from "@/components/shared/Spinner";

/* ---------------- helpers ---------------- */
function genderLabel(g) {
  if (!g) return "";
  const s = String(g).toLowerCase();
  if (s === "male") return "Men";
  if (s === "female") return "Women";
  if (s === "coed" || s === "open") return "Coed";
  return s;
}

function joinDivision(name, gender) {
  if (!name) return "";
  const g = genderLabel(gender);
  return g ? `${name} - ${g}` : name;
}

function ensureWeightDisplay(label, unit) {
  if (!label) return "—";
  const low = String(label).toLowerCase();
  const hasKg = low.includes("kg");
  const hasLb = low.includes("lb");
  if (hasKg || hasLb) return label; // already has unit
  if (!unit) return label;
  return `${label} ${unit}`;
}
/* ----------------------------------------- */

const FamilyMatchReports = ({ member, onSwitchToStyles }) => {
  const [matchReports, setMatchReports] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(true);

  // modal state
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  // styles for the modal (fresh fetch, not relying only on member prop)
  const [stylesLoading, setStylesLoading] = useState(false);
  const [stylesForForm, setStylesForForm] = useState([]);

  // division cache { divisionId -> { name, gender } } (fallback if no divisionDisplay)
  const [divMap, setDivMap] = useState({});

  // pull styles from member as a baseline (still fetch fresh when opening)
  const stylesForMemberProp = useMemo(() => {
    const raw = member?.styles?.length
      ? member.styles
      : member?.userStyles || [];
    return normalizeStyles(raw || []);
  }, [member?.styles, member?.userStyles]);

  useEffect(() => {
    if (!member?.userId || !member?._id) return;
    // initial load shows spinner
    fetchMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member?.userId, member?._id]);

  // add showSpinner flag so updates can be silent
  const fetchMatches = async ({ showSpinner = true } = {}) => {
    if (showSpinner) setMatchesLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/${member.userId}/family/${
          member._id
        }/matchReports?ts=${Date.now()}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Failed to fetch match reports");
      const data = await res.json();
      const rows = Array.isArray(data) ? data : [];
      setMatchReports(rows);
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Could not load match reports.");
    } finally {
      if (showSpinner) setMatchesLoading(false);
    }
  };

  // Build / refresh the division map whenever reports change (for fallback display).
  useEffect(() => {
    let alive = true;

    async function loadDivisionsForStyles(styles) {
      const map = {};
      for (const styleName of styles) {
        if (!styleName) continue;
        try {
          const res = await fetch(
            `/api/divisions?styleName=${encodeURIComponent(styleName)}`,
            { cache: "no-store" }
          );
          const data = await res.json();
          const divisions = Array.isArray(data?.divisions)
            ? data.divisions
            : [];
          for (const d of divisions) {
            if (d?._id) {
              map[String(d._id)] = { name: d.name, gender: d.gender ?? null };
            }
          }
        } catch (e) {
          console.warn("Failed to load divisions for style:", styleName, e);
        }
      }
      return map;
    }

    const uniqueStyles = Array.from(
      new Set((matchReports || []).map((r) => r?.matchType).filter(Boolean))
    );

    if (uniqueStyles.length === 0) {
      if (alive) setDivMap({});
      return;
    }

    (async () => {
      const map = await loadDivisionsForStyles(uniqueStyles);
      if (!alive) return;
      setDivMap(map);
    })();

    return () => {
      alive = false;
    };
  }, [matchReports]);

  const loadStylesForModal = useCallback(async () => {
    if (!member?.userId || !member?._id) {
      setStylesForForm([]);
      return;
    }
    setStylesLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/${member.userId}/family/${member._id}/styles`,
        { cache: "no-store" }
      );
      let list = [];
      if (res.ok) {
        const data = await res.json();
        list = Array.isArray(data)
          ? data
          : data?.userStyles || data?.styles || [];
      }
      const normalized = normalizeStyles(list);
      setStylesForForm(normalized.length ? normalized : stylesForMemberProp);
    } catch (e) {
      console.error("Failed to load family styles:", e);
      setStylesForForm(stylesForMemberProp);
    } finally {
      setStylesLoading(false);
    }
  }, [member?.userId, member?._id, stylesForMemberProp]);

  const handleDeleteMatch = async (match) => {
    if (
      !window.confirm("This report will be permanently deleted! Are you sure?")
    )
      return;

    try {
      const res = await fetch(
        `/api/dashboard/${member.userId}/family/${member._id}/matchReports/${match._id}`,
        { method: "DELETE", headers: { "Content-Type": "application/json" } }
      );
      let data = {};
      try {
        data = await res.json();
      } catch {}

      if (res.ok) {
        toast.success(data.message || "Deleted.");
        // optimistic update
        setMatchReports((prev) =>
          prev.filter((r) => String(r._id) !== String(match._id))
        );
        setSelectedMatch(null);
        // silent refresh to ensure consistency
        await fetchMatches({ showSpinner: false });
      } else {
        toast.error(data.message || "Failed to delete match report.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete match report.");
    }
  };

  // ✅ helper to load the full report by id (ensures attacks/ranks/etc. present)
  const fetchFullReport = useCallback(
    async (reportId) => {
      try {
        const res = await fetch(
          `/api/dashboard/${encodeURIComponent(
            String(member.userId)
          )}/family/${encodeURIComponent(
            String(member._id)
          )}/matchReports/${encodeURIComponent(String(reportId))}`,
          { cache: "no-store", credentials: "same-origin" }
        );
        if (!res.ok) return null;
        const data = await res.json().catch(() => ({}));
        return data?.report || null;
      } catch {
        return null;
      }
    },
    [member.userId, member._id]
  );

  // Render helpers that prefer server-provided display strings
  const renderDivision = (row) => {
    if (row?.divisionDisplay) return row.divisionDisplay;
    const id =
      row?.division && typeof row.division === "object"
        ? String(row.division?._id || "")
        : String(row?.division || "");
    const meta = id ? divMap[id] : null;
    return meta ? joinDivision(meta.name, meta.gender) : "—";
  };

  const renderWeight = (row) => {
    if (row?.weightDisplay) return row.weightDisplay;
    return ensureWeightDisplay(row?.weightLabel, row?.weightUnit);
  };

  /* ---------------------- TABLE COLUMNS (with sorting) ---------------------- */
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
    {
      accessorKey: "eventName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Event <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "matchDate",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ getValue }) => moment.utc(getValue()).format("MMMM D, YYYY"),
    },
    {
      id: "divisionDisplay",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Division <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) => <span>{renderDivision(row.original)}</span>,
      sortingFn: (rowA, rowB) => {
        const aText = renderDivision(rowA.original) || "";
        const bText = renderDivision(rowB.original) || "";
        return aText.localeCompare(bText, undefined, { sensitivity: "base" });
      },
    },
    {
      id: "weightDisplay",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Weight <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) => <span>{renderWeight(row.original)}</span>,
      sortingFn: (rowA, rowB) => {
        const a = renderWeight(rowA.original) || "";
        const b = renderWeight(rowB.original) || "";
        return String(a).localeCompare(String(b), undefined, { numeric: true });
      },
    },
    {
      accessorKey: "myRank",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          My Rank <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: { className: "hidden lg:table-cell" },
    },
    {
      accessorKey: "opponentRank",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Opponent Rank <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: { className: "hidden xl:table-cell" },
    },
    { accessorKey: "opponentName", header: "Opponent" },
    {
      accessorKey: "opponentCountry",
      header: "Country",
      meta: { className: "hidden sm:table-cell" },
    },
    { accessorKey: "result", header: "Result" },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const minimal = row.original;

        return (
          <div className="flex justify-center gap-3">
            <button
              onClick={async () => {
                const full = (await fetchFullReport(minimal?._id)) || minimal;
                setSelectedMatch(full);
                setPreviewOpen(true);
              }}
              title="View Match Details"
              className="icon-btn"
            >
              <Eye className="w-5 h-5 text-blue-500" />
            </button>

            <button
              onClick={async () => {
                const [full] = await Promise.all([
                  fetchFullReport(minimal?._id),
                  loadStylesForModal(),
                ]);
                setSelectedMatch(full || minimal);
                setOpen(true);
              }}
              title="Edit Match"
              className="icon-btn"
            >
              <Edit className="w-5 h-5 text-green-500" />
            </button>

            <button
              onClick={() => handleDeleteMatch(minimal)}
              title="Delete Match"
              className="icon-btn"
            >
              <Trash className="w-5 h-5 text-red-500" />
            </button>
          </div>
        );
      },
    },
  ];

  /* ---------------------- PRINT CONTROLS ---------------------- */
  const [printStyle, setPrintStyle] = useState("__all__");

  const printableStyles = useMemo(() => {
    const fromMember = (stylesForMemberProp || [])
      .map((s) => s?.styleName)
      .filter(Boolean);
    const fromReports = (matchReports || [])
      .map((r) => r?.matchType)
      .filter(Boolean);
    const names = Array.from(new Set([...fromMember, ...fromReports]));
    names.sort((a, b) => String(a).localeCompare(String(b)));
    return names;
  }, [stylesForMemberProp, matchReports]);

  const handlePrint = () => {
    if (!member?._id) {
      toast.error("Missing family member id.");
      return;
    }
    const baseParams = `familyMemberId=${member._id}`;
    const url =
      printStyle === "__all__"
        ? `/api/records/style/all?${baseParams}`
        : `/api/records/style/${encodeURIComponent(printStyle)}?${baseParams}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      {/* Header with Add Button + Print controls aligned right */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex flex-col items-start gap-4">
          <h1 className="text-2xl font-bold">Family Member Matches</h1>
          <Button
            className="bg-gray-900 hover:bg-gray-500 text-white border-2 border-gray-500 dark:border-gray-100"
            onClick={async () => {
              setSelectedMatch(null);
              setOpen(true);
              await loadStylesForModal();
            }}
          >
            Add Match Report
          </Button>
        </div>

        <div className="flex flex-col items-end gap-2">
          <h3 className="text-sm font-semibold">Print matches to PDF</h3>
          <div className="flex items-center gap-2">
            <select
              value={printStyle}
              onChange={(e) => setPrintStyle(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-900"
              title="Choose a style to print"
            >
              <option value="__all__">All Styles</option>
              {printableStyles.map((name) => (
                <option
                  key={name}
                  value={name}
                >
                  {name}
                </option>
              ))}
            </select>
            <Button
              className="bg-gray-900 hover:bg-gray-500 text-white border-2 border-gray-500 dark:border-gray-100"
              onClick={handlePrint}
              title="Open a PDF of the selected matches"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
          <p className="text-xs text-gray-900 dark:text-gray-100">
            Select a style or All Styles, then click Print.
          </p>
        </div>
      </div>

      {/* Modal */}
      <ModalLayout
        isOpen={open}
        onClose={() => setOpen(false)}
        title={selectedMatch ? "Edit Match Report" : "Add Match Report"}
        description="Fill out all match details below."
        withCard={true}
      >
        {stylesLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner size={40} />
          </div>
        ) : (
          <MatchReportForm
            athlete={member}
            match={selectedMatch}
            setOpen={setOpen}
            onSuccess={() => fetchMatches({ showSpinner: false })}
            userType="family"
            styles={stylesForForm.length ? stylesForForm : stylesForMemberProp}
          />
        )}
      </ModalLayout>

      {matchesLoading ? (
        <div className="flex flex-col justify-center items-center h-[70vh] bg-background">
          <Spinner size={64} />
          <p className="text-gray-400 dark:text-gray-300 mt-2 text-lg">
            Loading matches...
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="block md:hidden space-y-4">
            {matchReports.length > 0 ? (
              matchReports.map((match) => {
                const divisionText = renderDivision(match);
                const weightText = renderWeight(match);

                return (
                  <div
                    key={match._id}
                    className="bg-gray-900 text-white p-4 rounded-lg shadow-md border border-gray-700"
                  >
                    <p>
                      <strong>Type:</strong> {match.matchType}
                    </p>
                    <p>
                      <strong>Event:</strong> {match.eventName}
                    </p>
                    <p>
                      <strong>Date:</strong>{" "}
                      {moment(match.matchDate).format("MMM D, YYYY")}
                    </p>
                    <p>
                      <strong>Division:</strong> {divisionText}
                    </p>
                    <p>
                      <strong>Weight:</strong> {weightText}
                    </p>
                    <p>
                      <strong>Opponent:</strong> {match.opponentName}
                    </p>
                    <p>
                      <strong>My Rank:</strong> {match.myRank || "—"}
                    </p>
                    <p>
                      <strong>Opponent Rank:</strong>{" "}
                      {match.opponentRank || "—"}
                    </p>
                    <p>
                      <strong>Result:</strong>{" "}
                      {match.result === "Won" ? (
                        <span className="text-green-400">Win</span>
                      ) : (
                        <span className="text-red-400">Loss</span>
                      )}
                    </p>
                    <div className="flex justify-end gap-3 mt-3">
                      <button
                        onClick={async () => {
                          const full =
                            (await fetchFullReport(match?._id)) || match;
                          setSelectedMatch(full);
                          setPreviewOpen(true);
                        }}
                        title="View Details"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={async () => {
                          const [full] = await Promise.all([
                            fetchFullReport(match?._id),
                            loadStylesForModal(),
                          ]);
                          setSelectedMatch(full || match);
                          setOpen(true);
                        }}
                        title="Edit"
                        className="text-green-400 hover:text-green-300"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteMatch(match)}
                        title="Delete"
                        className="text-red-500 hover:text-red-400"
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400">No match reports found.</p>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <div className="min-w-[1000px]">
              <ReportDataTable
                columns={columns}
                data={matchReports}
                onView={async (match) => {
                  const full = (await fetchFullReport(match?._id)) || match;
                  setSelectedMatch(full);
                  setPreviewOpen(true);
                }}
                onEdit={async (match) => {
                  const [full] = await Promise.all([
                    fetchFullReport(match?._id),
                    loadStylesForModal(),
                  ]);
                  setSelectedMatch(full || match);
                  setOpen(true);
                }}
                onDelete={(match) => handleDeleteMatch(match)}
              />
            </div>
          </div>
        </>
      )}

      {previewOpen && selectedMatch && (
        <PreviewReportModal
          previewOpen={previewOpen}
          setPreviewOpen={setPreviewOpen}
          report={selectedMatch}
          reportType="match"
        />
      )}
    </div>
  );
};

export default FamilyMatchReports;
