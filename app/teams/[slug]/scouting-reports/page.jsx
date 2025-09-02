// app/teams/[slug]/scouting-reports/page.jsx
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash, ArrowUpDown } from "lucide-react";
import PreviewReportModal from "@/components/shared/PreviewReportModal";
import ScoutingReportForm from "@/components/teams/forms/ScoutingReportForm";
import { ReportDataTable } from "@/components/shared/report-data-table";
import ModalLayout from "@/components/shared/ModalLayout";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Spinner from "@/components/shared/Spinner";

export default function TeamScoutingReportsPage() {
  const { slug } = useParams();
  const router = useRouter();

  const [team, setTeam] = useState(null);
  const [reports, setReports] = useState([]);
  const [user, setUser] = useState(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // id -> name for members (users + family)
  const [membersMap, setMembersMap] = useState(() => new Map());

  // Team
  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const res = await fetch(`/api/teams/${slug}`);
        if (!res.ok) throw new Error("Failed to fetch team");
        const data = await res.json();
        setTeam(data.team);
      } catch (e) {
        console.error(e);
        toast.error("Error loading team.");
      }
    })();
  }, [slug]);

  // Reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/teams/${slug}/scouting-reports?ts=${Date.now()}`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReports(data.scoutingReports || []);
    } catch {
      toast.error("Error loading scouting reports");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!slug) return;
    fetchReports();
  }, [slug]);

  // Current user (for form)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        setUser(await res.json());
      } catch {}
    })();
  }, []);

  // Members map for “Report For”
  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const res = await fetch(`/api/teams/${slug}/members?ts=${Date.now()}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        const list = Array.isArray(json.members) ? json.members : [];
        const map = new Map();
        list.forEach((m) => {
          const id = String(m.familyMemberId || m.userId || "");
          if (id) map.set(id, m.name || m.username || "Unknown");
        });
        setMembersMap(map);
      } catch (e) {
        console.error(e);
        setMembersMap(new Map());
      }
    })();
  }, [slug]);

  // Rows with resolved names (also provide a value to sort by)
  const tableRows = useMemo(() => {
    const namesArrFor = (r) =>
      Array.isArray(r?.reportFor) && r.reportFor.length
        ? r.reportFor.map(
            (rf) => membersMap.get(String(rf.athleteId)) || "Unknown"
          )
        : [];

    return (Array.isArray(reports) ? reports : []).map((r) => {
      const namesArr = namesArrFor(r);
      return {
        ...r,
        reportForNamesArr: namesArr, // for rendering as stacked lines
        reportForSort: namesArr.join(" ").toLowerCase(), // for sorting
        _createdAtTs: r?.createdAt ? new Date(r.createdAt).getTime() : 0,
      };
    });
  }, [reports, membersMap]);

  // Actions
  const handleDeleteReport = async (report) => {
    if (!window.confirm("This report will be permanently deleted. Continue?"))
      return;
    try {
      const res = await fetch(
        `/api/teams/${slug}/scouting-reports/${report._id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Delete failed");
      toast.success(data?.message || "Report deleted");
      setReports((prev) => prev.filter((r) => r._id !== report._id));
      setSelectedReport(null);
      router.refresh();
    } catch (e) {
      toast.error(e.message || "Failed to delete report");
    }
  };

  const exportReportsToExcel = () => {
    const dataToExport = reports.map((r) => ({
      Type: r.matchType,
      "Report For":
        Array.isArray(r.reportFor) && r.reportFor.length
          ? r.reportFor
              .map((rf) => membersMap.get(String(rf.athleteId)) || "Unknown")
              .join(", ")
          : "—",
      "Athlete First": r.athleteFirstName,
      "Athlete Last": r.athleteLastName,
      "Nat. Rank": r.athleteNationalRank,
      "World Rank": r.athleteWorldRank,
      Club: r.athleteClub,
      Country: r.athleteCountry,
      Division: r.division,
      "Weight Class": r.weightCategory,
      "Created By": r.createdByName || "—",
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");
    const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(
      new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `scouting-reports-${slug}.xlsx`
    );
  };

  // Columns (sortable via ReportDataTable)
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
      id: "reportFor",
      accessorFn: (row) => row.reportForSort || "",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Report For <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const names = row.original.reportForNamesArr || [];
        if (!names.length) return "—";
        return (
          <div className="whitespace-pre-wrap leading-5">
            {names.map((n, i) => (
              <div key={i}>{n}</div>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "athleteFirstName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          First Name <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
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
    {
      id: "natRank",
      accessorFn: (row) => Number(row?.athleteNationalRank ?? 0),
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Nat. Rank <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.original.athleteNationalRank ?? "—",
      meta: { className: "hidden sm:table-cell" },
    },
    {
      id: "worldRank",
      accessorFn: (row) => Number(row?.athleteWorldRank ?? 0),
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          World Rank <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.original.athleteWorldRank ?? "—",
      meta: { className: "hidden sm:table-cell" },
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
      meta: { className: "hidden md:table-cell" },
    },
    {
      accessorKey: "division",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Division <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "weightCategory",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Weight Class <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
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
              title="View Report Details"
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <Eye className="w-5 h-5 text-blue-500" />
            </button>
            <button
              onClick={() => {
                setSelectedReport(report);
                setOpen(true);
              }}
              title="Edit Report"
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <Edit className="w-5 h-5 text-green-500" />
            </button>
            <button
              onClick={() => handleDeleteReport(report)}
              title="Delete Report"
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <Trash className="w-5 h-5 text-red-500" />
            </button>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] bg-background">
        <Spinner size={64} />
        <p className="text-gray-400 dark:text-gray-300 mt-2 text-lg">
          Loading scouting reports…
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Title left, buttons RIGHT */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scouting Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a scouting report to help your athletes prepare for upcoming
            matches. You can include multiple athletes in a single report if
            they’re in the same division or preparing for the same event.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 sm:justify-end">
          <button
            className="btn-primary px-4 py-2 rounded-md"
            onClick={() => {
              setSelectedReport(null);
              setOpen(true);
            }}
          >
            ➕ Add Scouting Report
          </button>
          <button
            className="btn-secondary px-4 py-2 rounded-md"
            onClick={exportReportsToExcel}
          >
            Export to Excel
          </button>
        </div>
      </div>

      {tableRows.length === 0 ? (
        <div className="rounded-md border border-border p-6 text-sm text-muted-foreground">
          No reports yet. Click{" "}
          <span className="font-medium">Add Scouting Report</span> to create
          your first scouting report.
        </div>
      ) : (
        // No forced min-width; no overflow unless really needed
        <div className="w-full">
          <ReportDataTable
            columns={columns}
            data={tableRows}
            onView={(report) => {
              setSelectedReport(report);
              setPreviewOpen(true);
            }}
            onEdit={(report) => {
              setSelectedReport(report);
              setOpen(true);
            }}
            onDelete={(report) => handleDeleteReport(report)}
          />
        </div>
      )}

      {/* Add/Edit */}
      <ModalLayout
        isOpen={open}
        onClose={() => setOpen(false)}
        title={selectedReport ? "Edit Scouting Report" : "Add Scouting Report"}
        description="Fill out all scouting details below."
        withCard
      >
        <ScoutingReportForm
          key={selectedReport?._id}
          team={team}
          user={user}
          report={selectedReport}
          setOpen={setOpen}
          onSuccess={fetchReports}
        />
      </ModalLayout>

      {/* Preview */}
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
}
