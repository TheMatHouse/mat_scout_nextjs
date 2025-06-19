"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import moment from "moment";
import { toast } from "react-toastify";
import { ReportDataTable } from "@/components/dashboard/data/report-data-table";
import MatchReportForm from "@/components/dashboard/forms/MatchReportForm";
import PreviewReportModal from "@/components/dashboard/PreviewReportModal";

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

const FamilyMatchReports = ({ member }) => {
  const router = useRouter();
  const [matchReports, setMatchReports] = useState([]);
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  useEffect(() => {
    if (!member?._id || !member?.userId) return;
    fetchMatches();
  }, [member]);

  const fetchMatches = async () => {
    try {
      const res = await fetch(
        `/api/dashboard/${member.userId}/family/${member._id}/matchReports`
      );

      if (!res.ok) {
        const error = await res.json();
        console.error("Server response:", res.status, error);
        throw new Error("Failed to fetch match reports");
      }

      const data = await res.json();
      setMatchReports(data);
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
      header: "Actions",
      enableSorting: false,
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
        <h1 className="text-2xl">Family Member Matches</h1>
        <Dialog
          open={open}
          onOpenChange={setOpen}
        >
          <DialogTrigger asChild>
            <Button
              className="ml-6 bg-gray-900 hover:bg-gray-500 text-white border-2 border-gray-500 dark:border-gray-100"
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
              athlete={member}
              match={selectedMatch}
              setOpen={setOpen}
              onSuccess={fetchMatches}
              userType="family"
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

export default FamilyMatchReports;
