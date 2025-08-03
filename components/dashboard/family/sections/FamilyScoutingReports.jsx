"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { ReportDataTable } from "@/components/shared/report-data-table";
import ScoutingReportForm from "@/components/dashboard/forms/ScoutingReportForm";
import PreviewReportModal from "@/components/dashboard/PreviewReportModal";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Eye, Edit, Trash } from "lucide-react";
import ModalLayout from "@/components/shared/ModalLayout";

const FamilyScoutingReports = ({ member, onSwitchToStyles }) => {
  const router = useRouter();
  const [scoutingReports, setScoutingReports] = useState([]);
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    if (!member?.userId) return;
    fetchReports();
  }, [member]);

  const fetchReports = async () => {
    try {
      const res = await fetch(
        `/api/dashboard/${member.userId}/family/${member._id}/scoutingReports`
      );
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
          `/api/dashboard/${member.userId}/family/${member._id}/scoutingReports/${report._id}`,
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
    { accessorKey: "matchType", header: "Type" },
    { accessorKey: "athleteFirstName", header: "First Name" },
    { accessorKey: "athleteLastName", header: "Last Name" },
    { accessorKey: "athleteNationalRank", header: "Nat. Rank" },
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
  ];

  const hasStyles = member?.styles && member.styles.length > 0;

  return (
    <div>
      {/* Header with Add Button */}
      <div className="flex flex-col items-start gap-4 mb-4">
        <h1 className="text-2xl font-bold">Family Member Scouting</h1>
        <Button
          className="bg-gray-900 hover:bg-gray-500 text-white border-2 border-gray-500 dark:border-gray-100"
          onClick={() => {
            setSelectedReport(null);
            setOpen(true);
          }}
        >
          Add Scouting Report
        </Button>
      </div>

      {/* Modal */}
      <ModalLayout
        isOpen={open}
        onClose={() => setOpen(false)}
        title={selectedReport ? "Edit Scouting Report" : "Add Scouting Report"}
        description="Fill out all scouting details below."
        withCard={true}
      >
        {hasStyles ? (
          <ScoutingReportForm
            key={selectedReport?._id}
            athlete={member}
            report={selectedReport}
            setOpen={setOpen}
            onSuccess={fetchReports}
            userType="family"
          />
        ) : (
          <div className="p-6 text-center">
            <p className="text-base text-muted-foreground mb-4">
              You must add a style/sport to this profile before creating a
              scouting report.
            </p>
            <Button
              onClick={() => {
                setOpen(false);
                if (typeof onSwitchToStyles === "function") {
                  onSwitchToStyles();
                }
              }}
              className="bg-ms-blue-gray hover:bg-ms-blue text-white"
            >
              Add Style
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
