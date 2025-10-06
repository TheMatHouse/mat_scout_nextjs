// components/dashboard/DashboardMatches.jsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import moment from "moment";
import { toast } from "react-toastify";

import { ReportDataTable } from "../shared/report-data-table";
import MatchReportForm from "./forms/MatchReportForm";
import PreviewReportModal from "./PreviewReportModal";

import { Button } from "@/components/ui/button";
import { ArrowUpDown, Eye, Edit, Trash, Printer } from "lucide-react";
import ModalLayout from "@/components/shared/ModalLayout";
import Spinner from "@/components/shared/Spinner";

/* ---------------- helpers to normalize styles shapes ---------------- */
const toIdString = (v) =>
  v && typeof v === "object" && v._id ? String(v._id) : v ? String(v) : "";

function extractStylesShape(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.styles)) return payload.styles;
  if (payload && Array.isArray(payload.userStyles)) return payload.userStyles;
  if (payload && typeof payload === "object") {
    const arr = Object.values(payload).find(Array.isArray);
    if (Array.isArray(arr)) return arr;
  }
  return [];
}

function onlyPrimaryUserStyles(arr, userId) {
  const uid = String(userId || "");
  return (Array.isArray(arr) ? arr : []).filter((s) => {
    const sUid = toIdString(s?.userId);
    const fam = s?.familyMemberId;
    const isMine = sUid && sUid === uid;
    const noFamily =
      fam == null ||
      String(fam) === "" ||
      (typeof fam === "object" && !fam._id);
    return isMine && noFamily;
  });
}
/* ------------------------------------------------------------------- */

const genderWord = (g) =>
  g === "male" ? "Men" : g === "female" ? "Women" : g === "coed" ? "Coed" : "";

const DashboardMatches = ({ user }) => {
  const router = useRouter();
  const [matchReports, setMatchReports] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(true);

  // Modal state
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Styles-for-form state
  const [stylesLoading, setStylesLoading] = useState(false);
  const [stylesForForm, setStylesForForm] = useState([]);

  // resolve a default logo (used in the PDF header)
  const logoUrl =
    process.env.NEXT_PUBLIC_PDF_LOGO ||
    "https://res.cloudinary.com/matscout/image/upload/v1755958032/matScout_logo_bg_blue_vsebxm.png";

  useEffect(() => {
    if (!user?._id) return;
    fetchMatches(); // initial load shows spinner
  }, [user?._id]);

  // add showSpinner flag so we can do silent refresh after edits/deletes
  const fetchMatches = async ({ showSpinner = true } = {}) => {
    if (showSpinner) setMatchesLoading(true);
    try {
      const res = await fetch(`/api/dashboard/${user._id}/matchReports`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch match reports");
      const data = await res.json();
      setMatchReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Could not load match reports.");
    } finally {
      if (showSpinner) setMatchesLoading(false);
    }
  };

  // Build derived display fields for Division & Weight (expects API to populate division)
  const tableData = useMemo(() => {
    return (matchReports || []).map((m) => {
      const divObj =
        m?.division && typeof m.division === "object" ? m.division : null;

      const divisionDisplay = divObj
        ? `${divObj.name ?? ""}${
            divObj.gender ? ` — ${genderWord(divObj.gender)}` : ""
          }` || "—"
        : typeof m?.division === "string" && m.division
        ? m.division
        : "—";

      // --- Weight (snapshot only): prefer label which already includes unit ---
      const weightDisplay = (() => {
        const label = (m?.weightLabel ?? "").trim();
        if (label) return label; // e.g., "73kg" or "73 kg"

        // fallback: some older reports might have a category label
        const category = (m?.weightCategoryLabel ?? "").trim();
        if (category) return category;

        // last resort: synthesize from numeric + unit if present
        const val = (m?.weight ?? "").toString().trim();
        const unit = (m?.weightUnit ?? "").toString().trim();
        return val ? `${val}${unit ? ` ${unit}` : ""}` : "—";
      })();
      // ----------------------------------------------------------------------

      return { ...m, divisionDisplay, weightDisplay };
    });
  }, [matchReports]);

  // Fetch the current user's styles specifically for the form
  const loadStylesForModal = useCallback(async () => {
    if (!user?._id) {
      setStylesForForm([]);
      return;
    }
    setStylesLoading(true);
    try {
      let list = [];

      // 1) Try dashboard userStyles endpoint
      try {
        const res = await fetch(`/api/dashboard/${user._id}/userStyles`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          list = extractStylesShape(data);
        }
      } catch (_) {
        // ignore and fall through
      }

      // 2) Fallback to generic /api/userStyles
      if (!Array.isArray(list) || list.length === 0) {
        try {
          const res2 = await fetch(`/api/userStyles`, { cache: "no-store" });
          if (res2.ok) {
            const data2 = await res2.json();
            list = extractStylesShape(data2);
          }
        } catch (_) {}
      }

      // Keep only this user's primary (non-family) styles
      const filtered = onlyPrimaryUserStyles(list, user._id);

      setStylesForForm(filtered);
    } catch (e) {
      console.error("Failed to load styles:", e);
      setStylesForForm([]);
    } finally {
      setStylesLoading(false);
    }
  }, [user?._id]);

  // fetch the full report so the preview/edit has opponent/athlete attacks, etc.
  const fetchFullReportById = useCallback(
    async (reportId) => {
      if (!user?._id || !reportId) return null;
      try {
        const res = await fetch(
          `/api/dashboard/${encodeURIComponent(
            String(user._id)
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
    [user?._id]
  );

  const handleDeleteMatch = async (match) => {
    if (
      !window.confirm("This report will be permanently deleted! Are you sure?")
    )
      return;

    try {
      const res = await fetch(
        `/api/dashboard/${user._id}/matchReports/${match._id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
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
        // silent refresh to keep list perfect
        await fetchMatches({ showSpinner: false });
      } else {
        toast.error(data.message || "Failed to delete match report.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete match report.");
    }
  };

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

    // Division (derived)
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
    },

    // Weight (derived)
    {
      accessorKey: "weightDisplay",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Weight <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: { className: "hidden md:table-cell" },
    },

    // My Rank
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
      meta: { className: "hidden md:table-cell" },
    },
    // Opponent Rank
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
      meta: { className: "hidden lg:table-cell" },
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

        // fetch full report so the form has all nested fields
        const fetchFullReport = async () => {
          if (!user?._id || !minimal?._id) return minimal;
          try {
            const res = await fetch(
              `/api/dashboard/${encodeURIComponent(
                String(user._id)
              )}/matchReports/${encodeURIComponent(String(minimal._id))}`,
              { cache: "no-store", credentials: "same-origin" }
            );
            if (!res.ok) return minimal;
            const data = await res.json().catch(() => ({}));
            return data?.report || minimal;
          } catch {
            return minimal;
          }
        };

        return (
          <div className="flex justify-center gap-3">
            <button
              onClick={async () => {
                const full = await fetchFullReport();
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
                  fetchFullReport(),
                  loadStylesForModal(),
                ]);
                setSelectedMatch(full);
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

  // ---------- Print controls ----------
  const [printStyle, setPrintStyle] = useState("__all__");

  const printableStyles = useMemo(() => {
    const names = (matchReports || []).map((r) => r?.matchType).filter(Boolean);
    return Array.from(new Set(names)).sort((a, b) =>
      String(a).localeCompare(String(b))
    );
  }, [matchReports]);

  const handlePrint = () => {
    const base =
      printStyle === "__all__"
        ? `/api/records/style/all`
        : `/api/records/style/${encodeURIComponent(printStyle)}`;

    const qs = new URLSearchParams();
    const url = qs.toString() ? `${base}?${qs.toString()}` : base;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="px-4 md:px-6 lg:px-8">
      {/* Header with Add Button */}
      <div className="flex flex-col items-start gap-4 mb-4">
        <h1 className="text-2xl font-bold">My Matches</h1>
        <Button
          className="btn btn-primary"
          onClick={async () => {
            setSelectedMatch(null);
            setOpen(true);
            await loadStylesForModal();
          }}
        >
          Add Match Report
        </Button>
      </div>

      {/* Modal using ModalLayout */}
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
            athlete={user}
            styles={stylesForForm}
            match={selectedMatch}
            setOpen={setOpen}
            onSuccess={() => fetchMatches({ showSpinner: false })}
            userType="user"
          />
        )}
      </ModalLayout>

      {/* Print controls (right-aligned) */}
      <div className="mb-4 flex justify-start md:justify-end">
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

      {matchesLoading ? (
        <div className="flex flex-col justify-center items-center h-[70vh] bg-background">
          <Spinner size={64} />
          <p className="text-gray-400 dark:text-gray-300 mt-2 text-lg">
            Loading your matches...
          </p>
        </div>
      ) : (
        <>
          {/* Cards for Mobile */}
          <div className="block md:hidden space-y-4">
            {tableData.length > 0 ? (
              tableData.map((match) => (
                <div
                  key={match._id}
                  className="relative card p-4 rounded-lg shadow-md"
                >
                  {/* Floating action rail (top-right) */}
                  <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
                    <button
                      onClick={async () => {
                        const full =
                          (await fetchFullReportById(match?._id)) || match;
                        setSelectedMatch(full);
                        setPreviewOpen(true);
                      }}
                      title="View Details"
                      className="h-9 w-9 grid place-items-center rounded-lg border border-slate-600 bg-slate-800/70 text-blue-400 hover:bg-slate-700"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={async () => {
                        const [full] = await Promise.all([
                          fetchFullReportById(match?._id),
                          loadStylesForModal(),
                        ]);
                        setSelectedMatch(full || match);
                        setOpen(true);
                      }}
                      title="Edit"
                      className="h-9 w-9 grid place-items-center rounded-lg border border-slate-600 bg-slate-800/70 text-green-400 hover:bg-slate-700"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteMatch(match)}
                      title="Delete"
                      className="h-9 w-9 grid place-items-center rounded-lg border border-slate-600 bg-slate-800/70 text-red-400 hover:bg-slate-700"
                    >
                      <Trash size={18} />
                    </button>
                  </div>

                  {/* Card content */}
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
                    <strong>Division:</strong> {match.divisionDisplay}
                  </p>
                  <p>
                    <strong>Weight:</strong> {match.weightDisplay}
                  </p>
                  <p>
                    <strong>Opponent:</strong> {match.opponentName}
                  </p>
                  <p>
                    <strong>My Rank:</strong> {match.myRank || "—"}
                  </p>
                  <p>
                    <strong>Opponent Rank:</strong> {match.opponentRank || "—"}
                  </p>
                  <p>
                    <strong>Result:</strong>{" "}
                    {match.result === "Won" ? (
                      <span className="text-[var(--color-success)]">Win</span>
                    ) : (
                      <span className="text-[var(--color-danger)]">Loss</span>
                    )}
                  </p>

                  {/* Optional bottom action row (keep if you want larger targets) */}
                  {/* <div className="flex justify-end gap-3 mt-3">
          ...
        </div> */}
                </div>
              ))
            ) : (
              <p className="text-gray-400">No match reports found.</p>
            )}
          </div>

          {/* Table for Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <div className="min-w-[1100px]">
              <ReportDataTable
                columns={columns}
                data={tableData}
                onView={(match) => {
                  setSelectedMatch(match);
                  setPreviewOpen(true);
                }}
                onEdit={async (match) => {
                  setSelectedMatch(match);
                  setOpen(true);
                  await loadStylesForModal();
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

export default DashboardMatches;
