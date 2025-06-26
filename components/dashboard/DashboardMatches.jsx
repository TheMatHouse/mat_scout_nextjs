"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import moment from "moment";
import { toast } from "react-toastify";

import { ReportDataTable } from "./data/report-data-table";
import MatchReportForm from "./forms/MatchReportForm";
import PreviewMatchReportModal from "./PreviewMatchReportModal";
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
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DashboardMatches = ({ user, refreshUser }) => {
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

  console.log("matches ", matchReports);
  console.log("user ", user);
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
          fetchMatches(); // refresh after delete
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
      accessorKey: "opponentName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Opponent <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "opponentCountry",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Country <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "result",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Result <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      id: "actions",
      header: "Actions", // ❌ no sort controls here
      enableSorting: false, // explicitly prevent sorting (optional with custom id)
      cell: ({ row }) => {
        const match = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedMatch(match);
                  setPreviewOpen(true);
                }}
              >
                View Match Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedMatch(match);
                  setOpen(true);
                }}
              >
                Edit Match
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-ms-dark-red"
                onClick={() => handleDeleteMatch(match)}
              >
                Delete Match
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex items-center">
        <h1 className="text-2xl">My Matches</h1>
        <Dialog
          open={open}
          onOpenChange={setOpen}
        >
          <DialogTrigger asChild>
            <Button
              className="ml-6 bg-gray-900 hover:bg-gray-500 text-white border-2 border-gray-500 dark:border-gray-100"
              onClick={() => {
                setSelectedMatch(null); // ✅ Clear previous data
                setOpen(true); // ✅ Open dialog manually
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

      <ReportDataTable
        columns={columns}
        data={matchReports}
      />

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
