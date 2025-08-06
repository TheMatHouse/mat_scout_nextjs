"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash, FilePlus2, Download } from "lucide-react";
import PreviewReportModal from "@/components/shared/PreviewReportModal";
import ScoutingReportForm from "@/components/teams/forms/ScoutingReportForm";
import { ReportDataTable } from "@/components/shared/report-data-table";
import ModalLayout from "@/components/shared/ModalLayout";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function TeamScoutingReportsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug;

  const [team, setTeam] = useState(null);
  const [reports, setReports] = useState([]);
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // ✅ Fetch team data
  useEffect(() => {
    if (!slug) return;

    const fetchTeam = async () => {
      try {
        const res = await fetch(`/api/teams/${slug}`);
        if (!res.ok) throw new Error("Failed to fetch team");
        const data = await res.json();
        setTeam(data.team);
      } catch (err) {
        console.error("Error fetching team:", err);
        toast.error("Error loading team data");
      }
    };

    fetchTeam();
  }, [slug]);

  // ✅ Fetch scouting reports
  const fetchReports = async () => {
    try {
      const res = await fetch(
        `/api/teams/${slug}/scouting-reports?ts=${Date.now()}`
      );
      if (!res.ok) throw new Error("Failed to load scouting reports");
      const data = await res.json();
      setReports(data.scoutingReports || []);
    } catch (error) {
      console.error(error);
      toast.error("Error loading scouting reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!slug) return;
    fetchReports();
  }, [slug]);

  // ✅ Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) throw new Error("Failed to fetch user");
        const userData = await res.json();
        setUser(userData);
      } catch (err) {
        console.error("Failed to load user:", err);
      }
    };

    fetchUser();
  }, []);

  const handleDeleteReport = async (report) => {
    if (
      window.confirm(`This report will be permanently deleted! Are you sure?`)
    ) {
      const response = await fetch(
        `/api/teams/${slug}/scouting-reports/${report._id}`,
        {
          method: "DELETE",
          headers: {
            "Content-type": "application/json; charset=UTF-8",
          },
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setReports((prev) => prev.filter((r) => r._id !== report._id));
        setSelectedReport(null);
        router.refresh();
      } else {
        toast.error(data.message || "Failed to delete report");
      }
    }
  };

  const exportReportsToExcel = () => {
    const dataToExport = reports.map((r) => ({
      FirstName: r.athleteFirstName,
      LastName: r.athleteLastName,
      Country: r.athleteCountry,
      NationalRank: r.athleteNationalRank,
      WorldRank: r.athleteWorldRank,
      Club: r.athleteClub,
      Division: r.division,
      WeightClass: r.weightCategory,
      Grip: r.athleteGrip,
      MatchType: r.matchType,
      Attacks: (r.athleteAttacks || []).join(", "),
      Notes: r.athleteAttackNotes || "",
      VideoLinks: (r.videos || []).map((v) => v.url).join(", "),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reports");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const file = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(file, `scouting-reports-${slug}.xlsx`);
  };

  const columns = [
    { accessorKey: "matchType", header: "Type" },
    { accessorKey: "athleteFirstName", header: "First Name" },
    { accessorKey: "athleteLastName", header: "Last Name" },
    { accessorKey: "athleteNationalRank", header: "Nat. Rank" },
    { accessorKey: "athleteWorldRank", header: "World Rank" },
    { accessorKey: "athleteCountry", header: "Country" },
    {
      accessorKey: "division",
      header: "Division",
      meta: { className: "hidden md:table-cell" },
    },
    {
      accessorKey: "weightCategory",
      header: "Weight Class",
      meta: { className: "hidden md:table-cell" },
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

  return (
    <div>
      {/* ✅ Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold">Scouting Reports</h1>
        <div className="flex flex-wrap gap-3">
          {/* Add Report Button */}
          <button
            className="btn-primary px-4 py-2 rounded-md"
            onClick={() => {
              setSelectedReport(null);
              setOpen(true); // ✅ This opens your ModalLayout
            }}
          >
            ➕ Add Scouting Report
          </button>

          {/* Export Button */}
          <button
            className="btn-secondary px-4 py-2 rounded-md"
            onClick={exportReportsToExcel}
          >
            Export to Excel
          </button>
        </div>
      </div>

      {/* ✅ Modal for Add/Edit */}
      <ModalLayout
        isOpen={open}
        onClose={() => setOpen(false)}
        title={selectedReport ? "Edit Scouting Report" : "Add Scouting Report"}
        description="Fill out all scouting details below."
        withCard={true}
      >
        <ScoutingReportForm
          key={selectedReport?._id}
          team={team}
          user={user}
          userStyles={user?.user.userStyles || []}
          report={selectedReport}
          setOpen={setOpen}
          onSuccess={fetchReports}
        />
      </ModalLayout>

      {/* ✅ Mobile Cards */}
      <div className="grid grid-cols-1 sm:hidden gap-4 mb-6">
        {reports.length > 0 ? (
          reports.map((report) => (
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
                <strong>Division:</strong> {report.division}
              </p>
              <p>
                <strong>Weight Class:</strong> {report.weightCategory}
              </p>

              <div className="flex justify-end gap-4 mt-4">
                <button
                  onClick={() => {
                    setSelectedReport(report);
                    setPreviewOpen(true);
                  }}
                  className="text-blue-400 hover:text-blue-300"
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={() => {
                    setSelectedReport(report);
                    setOpen(true);
                  }}
                  className="text-green-400 hover:text-green-300"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => handleDeleteReport(report)}
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

      {/* ✅ Desktop Table */}
      {!loading && reports.length > 0 && (
        <div className="hidden md:block overflow-x-auto">
          <div className="min-w-[800px]">
            <ReportDataTable
              columns={columns}
              data={reports}
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
        </div>
      )}

      {/* ✅ Preview Modal */}
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
