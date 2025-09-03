// components/dashboard/DashboardMatches.jsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import moment from "moment";
import { toast } from "react-toastify";

import { ReportDataTable } from "../shared/report-data-table";
import MatchReportForm from "./forms/MatchReportForm";
import PreviewReportModal from "./PreviewReportModal";

import { Button } from "@/components/ui/button";
import { ArrowUpDown, Eye, Edit, Trash } from "lucide-react";
import ModalLayout from "@/components/shared/ModalLayout";
import Spinner from "@/components/shared/Spinner";

const DashboardMatches = ({ user }) => {
  const router = useRouter();
  const [matchReports, setMatchReports] = useState([]);

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
    "https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png";

  useEffect(() => {
    if (!user?._id) return;
    fetchMatches();
  }, [user]);

  const fetchMatches = async () => {
    try {
      const res = await fetch(`/api/dashboard/${user._id}/matchReports`);
      if (!res.ok) throw new Error("Failed to fetch match reports");
      const data = await res.json();
      setMatchReports(data);
    } catch (err) {
      console.error(err);
      toast.error("Could not load match reports.");
    }
  };

  // Fetch the current user's styles specifically for the form (fresh, not from user object)
  const loadStylesForModal = useCallback(async () => {
    if (!user?._id) {
      setStylesForForm([]);
      return;
    }
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

  const handleDeleteMatch = async (match) => {
    if (
      window.confirm(`This report will be permanently deleted! Are you sure?`)
    ) {
      try {
        const res = await fetch(
          `/api/dashboard/${user._id}/matchReports/${match._id}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          }
        );
        const data = await res.json();
        if (res.ok) {
          toast.success(data.message);
          fetchMatches();
        } else {
          toast.error(data.message);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete match report.");
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
      accessorKey: "division",
      header: "Division",
      meta: { className: "hidden md:table-cell" },
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
        const match = row.original;
        return (
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setSelectedMatch(match);
                setPreviewOpen(true);
              }}
              title="View Match Details"
              className="icon-btn"
            >
              <Eye className="w-5 h-5 text-blue-500" />
            </button>
            <button
              onClick={async () => {
                setSelectedMatch(match);
                setOpen(true);
                await loadStylesForModal();
              }}
              title="Edit Match"
              className="icon-btn"
            >
              <Edit className="w-5 h-5 text-green-500" />
            </button>
            <button
              onClick={() => handleDeleteMatch(match)}
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

  const printAllHref = (() => {
    const qs = new URLSearchParams();
    if (logoUrl) qs.set("logo", logoUrl);
    return `/api/records/style/all${qs.toString() ? `?${qs.toString()}` : ""}`;
  })();

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
        ) : stylesForForm.length > 0 ? (
          <MatchReportForm
            athlete={user}
            styles={stylesForForm}
            match={selectedMatch}
            setOpen={setOpen}
            onSuccess={fetchMatches}
            userType="user"
          />
        ) : (
          <div className="p-6 text-center">
            <p className="text-base text-muted-foreground mb-4">
              You must add a style/sport before creating a match report.
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

      <div className="mb-4 flex justify-start md:justify-end">
        <a
          href={printAllHref}
          target="_blank"
          rel="noopener"
          className="btn-white-sm"
          title="Print all matches as a PDF"
        >
          Print All Matches (PDF)
        </a>
      </div>

      {/* Cards for Mobile */}
      <div className="block md:hidden space-y-4">
        {matchReports.length > 0 ? (
          matchReports.map((match) => (
            <div
              key={match._id}
              className="card p-4 rounded-lg shadow-md"
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
                <strong>Opponent:</strong> {match.opponentName}
              </p>
              <p>
                <strong>Result:</strong>{" "}
                {match.result === "Won" ? (
                  <span className="text-[var(--color-success)]">Win</span>
                ) : (
                  <span className="text-[var(--color-danger)]">Loss</span>
                )}
              </p>
              <div className="flex justify-end gap-3 mt-3">
                <button
                  onClick={() => {
                    setSelectedMatch(match);
                    setPreviewOpen(true);
                  }}
                  title="View Details"
                  className="icon-btn"
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={async () => {
                    setSelectedMatch(match);
                    setOpen(true);
                    await loadStylesForModal();
                  }}
                  title="Edit"
                  className="icon-btn"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => handleDeleteMatch(match)}
                  title="Delete"
                  className="icon-btn"
                >
                  <Trash size={18} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400">No match reports found.</p>
        )}
      </div>

      {/* Table for Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <div className="min-w-[800px]">
          <ReportDataTable
            columns={columns}
            data={matchReports}
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
