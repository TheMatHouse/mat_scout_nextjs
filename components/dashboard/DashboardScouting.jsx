"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { ArrowUpDown, Eye, Edit, Trash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ReportDataTable } from "../shared/report-data-table";
import PreviewReportModal from "../shared/PreviewReportModal";
import ScoutingReportForm from "./forms/ScoutingReportForm";
import ModalLayout from "@/components/shared/ModalLayout";
import Spinner from "@/components/shared/Spinner";

const DashboardScouting = ({ user }) => {
  const router = useRouter();

  // table data
  const [scoutingReports, setScoutingReports] = useState([]);

  // modal state
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // styles for the form
  const [stylesLoading, setStylesLoading] = useState(false);
  const [stylesForForm, setStylesForForm] = useState([]);

  // techniques for the form
  const [techniquesLoading, setTechniquesLoading] = useState(false);
  const [techniquesForForm, setTechniquesForForm] = useState([]);

  useEffect(() => {
    if (!user?._id) return;
    fetchReports();
  }, [user?._id]);

  const fetchReports = async () => {
    try {
      const res = await fetch(`/api/dashboard/${user._id}/scoutingReports`);
      if (!res.ok) throw new Error("Failed to fetch scouting reports");
      const data = await res.json();
      setScoutingReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Could not load scouting reports.");
    }
  };

  // load styles fresh (same idea as DashboardMatches)
  const loadStylesForModal = useCallback(async () => {
    if (!user?._id) return;
    setStylesLoading(true);
    try {
      const res = await fetch(`/api/dashboard/${user._id}/userStyles`);
      if (!res.ok) throw new Error("Failed to load styles");
      const data = await res.json();
      setStylesForForm(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load styles:", e);
      setStylesForForm([]);
    } finally {
      setStylesLoading(false);
    }
  }, [user?._id]);

  // load techniques for the tag input suggestions
  const loadTechniquesForModal = useCallback(async () => {
    setTechniquesLoading(true);
    try {
      const res = await fetch("/api/techniques", {
        headers: { accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin",
      });
      console.log("res ", res);
      let data = [];
      try {
        data = await res.json();
      } catch {
        data = [];
      }
      // tolerate common response shapes
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.techniques)
        ? data.techniques
        : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.results)
        ? data.results
        : [];
      console.log(("DATA ", data));

      setTechniquesForForm(arr);
    } catch (e) {
      console.error("Failed to load techniques:", e);
      setTechniquesForForm([]);
    } finally {
      setTechniquesLoading(false);
    }
  }, []);

  const handleDeleteReport = async (report) => {
    if (
      !window.confirm(`This report will be permanently deleted! Are you sure?`)
    )
      return;
    try {
      const response = await fetch(
        `/api/dashboard/${user._id}/scoutingReports/${report._id}`,
        { method: "DELETE", headers: { "Content-Type": "application/json" } }
      );
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
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
              onClick={async () => {
                setSelectedReport(report);
                setOpen(true);
                // load styles + techniques for the modal
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
  ];

  const openingModal = stylesLoading || techniquesLoading;

  return (
    <div className="px-4 md:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col items-start gap-4 mb-4">
        <h1 className="text-2xl font-bold">My Scouting Reports</h1>
        <Button
          className="btn btn-primary"
          onClick={async () => {
            setSelectedReport(null);
            setOpen(true);
            await Promise.all([loadStylesForModal(), loadTechniquesForModal()]);
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
                router.push("/dashboard/styles");
              }}
              className="bg-ms-blue-gray hover:bg-ms-blue text-white"
            >
              Go to Styles
            </Button>
          </div>
        )}
      </ModalLayout>

      {/* Mobile cards */}
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
            data={scoutingReports}
          />
        </div>
      </div>

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
