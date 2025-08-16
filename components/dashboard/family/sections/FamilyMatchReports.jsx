"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import moment from "moment";
import { toast } from "react-toastify";
import { ReportDataTable } from "@/components/shared/report-data-table";
import MatchReportForm from "@/components/dashboard/forms/MatchReportForm";
import PreviewReportModal from "@/components/dashboard/PreviewReportModal";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Eye, Edit, Trash } from "lucide-react";
import ModalLayout from "@/components/shared/ModalLayout";
import { normalizeStyles } from "@/lib/normalizeStyles";

const FamilyMatchReports = ({ member, onSwitchToStyles }) => {
  const router = useRouter();
  const [matchReports, setMatchReports] = useState([]);
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  // ✅ Normalize styles for the *family member* from either source
  const stylesForMember = useMemo(() => {
    const raw = member?.styles?.length
      ? member.styles
      : member?.userStyles || [];
    return normalizeStyles(raw || []);
  }, [member?.styles, member?.userStyles]);

  const hasStyles = stylesForMember.length > 0;

  useEffect(() => {
    if (!member?._id || !member?.userId) return;
    fetchMatches();
  }, [member?._id, member?.userId]);

  const fetchMatches = async () => {
    try {
      const res = await fetch(
        `/api/dashboard/${member.userId}/family/${
          member._id
        }/matchReports?ts=${Date.now()}`
      );
      if (!res.ok) throw new Error("Failed to fetch match reports");

      const data = await res.json();
      setMatchReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Could not load match reports.");
    }
  };

  const handleDeleteMatch = async (match) => {
    if (
      window.confirm(`This report will be permanently deleted! Are you sure?`)
    ) {
      try {
        const res = await fetch(
          `/api/dashboard/${member.userId}/family/${member._id}/matchReports/${match._id}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          }
        );
        const data = await res.json();
        if (res.ok) {
          toast.success(data.message || "Deleted.");
          fetchMatches(); // refresh after delete
        } else {
          toast.error(data.message || "Failed to delete match report.");
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

    // ✅ Actions column (same controls as the user dashboard)
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
              onClick={() => {
                setSelectedMatch(match);
                setOpen(true);
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

  return (
    <div>
      {/* Header with Add Button */}
      <div className="flex flex-col items-start gap-4 mb-4">
        <h1 className="text-2xl font-bold">Family Member Matches</h1>
        <Button
          className="bg-gray-900 hover:bg-gray-500 text-white border-2 border-gray-500 dark:border-gray-100"
          onClick={() => {
            setSelectedMatch(null);
            setOpen(true);
          }}
        >
          Add Match Report
        </Button>
      </div>

      {/* Modal */}
      <ModalLayout
        isOpen={open}
        onClose={() => setOpen(false)}
        title={selectedMatch ? "Edit Match Report" : "Add Match Report"}
        description="Fill out all match details below."
        withCard={true}
      >
        {hasStyles ? (
          <MatchReportForm
            athlete={member}
            match={selectedMatch}
            setOpen={setOpen}
            onSuccess={fetchMatches}
            userType="family"
            styles={stylesForMember} // ✅ important
          />
        ) : (
          <div className="p-6 text-center">
            <p className="text-base text-muted-foreground mb-4">
              You must add a style/sport to this profile before creating a match
              report.
            </p>
            <Button
              onClick={() => {
                setOpen(false);
                if (typeof onSwitchToStyles === "function") onSwitchToStyles();
              }}
              className="bg-ms-blue-gray hover:bg-ms-blue text-white"
            >
              Add Style
            </Button>
          </div>
        )}
      </ModalLayout>

      {/* Mobile Cards */}
      <div className="block md:hidden space-y-4">
        {matchReports.length > 0 ? (
          matchReports.map((match) => (
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
                <strong>Opponent:</strong> {match.opponentName}
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
                  onClick={() => {
                    setSelectedMatch(match);
                    setPreviewOpen(true);
                  }}
                  title="View Details"
                  className="text-blue-400 hover:text-blue-300"
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={() => {
                    setSelectedMatch(match);
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
          ))
        ) : (
          <p className="text-gray-400">No match reports found.</p>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <div className="min-w-[800px]">
          <ReportDataTable
            columns={columns}
            data={matchReports}
            onView={(match) => {
              setSelectedMatch(match);
              setPreviewOpen(true);
            }}
            onEdit={(match) => {
              setSelectedMatch(match);
              setOpen(true);
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

export default FamilyMatchReports;
