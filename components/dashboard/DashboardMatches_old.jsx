"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import moment from "moment";
import { toast } from "react-toastify";

import { ReportDataTable } from "../shared/report-data-table";
import MatchReportForm from "./forms/MatchReportForm";
import PreviewReportModal from "./PreviewReportModal";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Eye, Edit, Trash } from "lucide-react";

const DashboardMatches = ({ user }) => {
  const router = useRouter();
  const [matchReports, setMatchReports] = useState([]);
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

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

  const handleDeleteMatch = async (match) => {
    if (
      window.confirm(`This report will be permanently deleted! Are you sure?`)
    ) {
      try {
        const res = await fetch(
          `/api/dashboard/${user._id}/matchReports/${match._id}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
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
    {
      accessorKey: "opponentName",
      header: "Opponent",
    },
    {
      accessorKey: "opponentCountry",
      header: "Country",
      meta: { className: "hidden sm:table-cell" },
    },
    {
      accessorKey: "result",
      header: "Result",
    },
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
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <Eye className="w-5 h-5 text-blue-500" />
            </button>
            <button
              onClick={() => {
                setSelectedMatch(match);
                setOpen(true);
              }}
              title="Edit Match"
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <Edit className="w-5 h-5 text-green-500" />
            </button>
            <button
              onClick={() => handleDeleteMatch(match)}
              title="Delete Match"
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
      {/* Header with Add Button */}
      <div className="flex flex-col items-start gap-4 mb-4">
        <h1 className="text-2xl font-bold">My Matches</h1>
        <Dialog
          open={open}
          onOpenChange={setOpen}
        >
          <DialogTrigger asChild>
            <Button
              className="btn btn-primary"
              onClick={() => {
                setSelectedMatch(null);
                setOpen(true);
              }}
            >
              Add Match Report
            </Button>
          </DialogTrigger>
          <DialogContent className="overflow-y-scroll max-h-[90%]">
            <DialogHeader>
              <DialogTitle>
                {selectedMatch ? "Edit Match Report" : "Add Match Report"}
              </DialogTitle>
              <DialogDescription>
                Fill out all match details below.
              </DialogDescription>
            </DialogHeader>
            <MatchReportForm
              athlete={user}
              match={selectedMatch}
              setOpen={setOpen}
              onSuccess={fetchMatches}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards for Mobile */}
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

export default DashboardMatches;
