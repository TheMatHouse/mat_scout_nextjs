"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import moment from "moment";
import { ArrowUpDown, Eye, Edit, Trash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ReportDataTable } from "../shared/report-data-table";
import PreviewReportModal from "../shared/PreviewReportModal";
import ScoutingReportForm from "./forms/ScoutingReportForm";
import ModalLayout from "@/components/shared/ModalLayout";

const DashboardScouting = ({ user, styles, techniques }) => {
  const router = useRouter();
  const [scoutingReports, setScoutingReports] = useState([]);
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    if (!user?._id) return;
    fetchReports();
  }, [user]);

  const fetchReports = async () => {
    try {
      const res = await fetch(`/api/dashboard/${user._id}/scoutingReports`);
      if (!res.ok) throw new Error("Failed to fetch scouting reports");
      const data = await res.json();
      setScoutingReports(data);
    } catch (err) {
      console.error(err);
      toast.error("Could not load scouting reports.");
    }
  };

  const handleDeleteReport = async (report) => {
    if (
      window.confirm(`This report will be permanently deleted! Are you sure?`)
    ) {
      try {
        const response = await fetch(
          `/api/dashboard/${user._id}/scoutingReports/${report._id}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          }
        );

        const data = await response.json();

        if (response.ok) {
          toast.success(data.message);
          setScoutingReports((prev) =>
            prev.filter((r) => r._id !== report._id)
          );
          setSelectedReport(null);
          router.refresh();
        } else {
          toast.error(data.message || "Failed to delete report");
        }
      } catch (err) {
        console.error(err);
        toast.error("Error deleting report");
      }
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
    { accessorKey: "athleteFirstName", header: "Athlete First" },
    { accessorKey: "athleteLastName", header: "Athlete Last" },
    { accessorKey: "athleteNationalRank", header: "National Rank" },
    { accessorKey: "athleteWorldRank", header: "World Rank" },
    {
      accessorKey: "athleteClub",
      header: "Club",
      meta: { className: "hidden md:table-cell" },
    },
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
              title="View Details"
              className="icon-btn"
            >
              <Eye className="w-5 h-5 text-blue-500" />
            </button>
            <button
              onClick={() => {
                setSelectedReport(report);
                setOpen(true);
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
  ];

  const hasStyles = user?.userStyles && user.userStyles.length > 0;

  return (
    <div className="px-4 md:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col items-start gap-4 mb-4">
        <h1 className="text-2xl font-bold">My Scouting Reports</h1>
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

      {/* Modal using ModalLayout */}
      <ModalLayout
        isOpen={open}
        onClose={() => setOpen(false)}
        title={selectedReport ? "Edit Scouting Report" : "Add Scouting Report"}
        description="Fill out all scouting details below."
        withCard={true}
      >
        {hasStyles ? (
          <ScoutingReportForm
            athlete={user}
            styles={styles?.styles}
            techniques={techniques}
            userType="user"
            report={selectedReport}
            setOpen={setOpen}
            onSuccess={fetchReports}
          />
        ) : (
          <div className="p-6 text-center">
            <p className="text-base text-muted-foreground mb-4">
              You must add a style/sport before creating a scouting report.
            </p>
            <Button
              onClick={() => {
                setOpen(false);
                router.push("/dashboard/styles"); // ✅ Redirect to Styles page
              }}
              className="bg-ms-blue-gray hover:bg-ms-blue text-white"
            >
              Go to Styles
            </Button>
          </div>
        )}
      </ModalLayout>

      {/* Mobile Cards */}
      <div className="grid grid-cols-1 sm:hidden gap-4 mb-6">
        {scoutingReports.length > 0 ? (
          scoutingReports.map((report) => (
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
                  title="View Details"
                  className="text-blue-400 hover:text-blue-300"
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={() => {
                    setSelectedReport(report);
                    setOpen(true);
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
            data={scoutingReports}
          />
        </div>
      </div>

      {/* Preview Modal */}
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
