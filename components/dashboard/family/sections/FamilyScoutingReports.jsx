"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import moment from "moment";
import { toast } from "react-toastify";
import { ReportDataTable } from "@/components/dashboard/data/report-data-table";
import ScoutingReportForm from "@/components/dashboard/forms/ScoutingReportForm";
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

const FamilyScoutingReports = ({ member }) => {
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
      if (!res.ok) throw new Error("Failed to fetch match reports");
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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${member.userId}/family/${member._id}/scoutingReports/${report._id}`,
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

        // Optional: update your table UI immediately
        setScoutingReports((prev) => prev.filter((r) => r._id !== report._id));

        // Clear selected report if needed
        setSelectedReport(null);

        // Refresh in case server state matters
        router.refresh();
      } else {
        toast.error(data.message || "Failed to delete report");
        console.log("Delete error:", data.message);
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
      accessorKey: "athleteFirstName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Athlete First Name <ArrowUpDown className="ml-2 h-4 w-4" />
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
          Athlete Last Name <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "athleteNationalRank",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          National Ranking <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "athleteWorldRank",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          World Ranking <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "athleteClub",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Club <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
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
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const report = row.original;

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
                  setSelectedReport(report);
                  setPreviewOpen(true);
                }}
              >
                View Match Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedReport(report);
                  setOpen(true);
                }}
              >
                Edit Match
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-ms-dark-red"
                onClick={() => handleDeleteReport(report)}
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
        <h1 className="text-2xl">Family Member Scouting</h1>
        <Dialog
          open={open}
          onOpenChange={setOpen}
        >
          <DialogTrigger asChild>
            <Button
              className="ml-6 bg-gray-900 hover:bg-gray-500 text-white border-2 border-gray-500 dark:border-gray-100"
              onClick={() => {
                setSelectedReport(null);
                setOpen(true);
              }}
            >
              Add Scouting Report
            </Button>
          </DialogTrigger>
          <DialogContent className="overflow-y-scroll max-h-[90%]">
            <DialogHeader>
              <DialogTitle>
                {selectedReport
                  ? "Edit Scouting Report"
                  : "Add Scouting Report"}
              </DialogTitle>
              <DialogDescription>
                Fill out all scouting details below.
              </DialogDescription>
            </DialogHeader>
            <ScoutingReportForm
              key={selectedReport?._id}
              athlete={member}
              report={selectedReport}
              setOpen={setOpen}
              onSuccess={fetchReports}
              userType="family"
            />
          </DialogContent>
        </Dialog>
      </div>

      <ReportDataTable
        columns={columns}
        data={scoutingReports}
      />

      {previewOpen && selectedReport && (
        <PreviewReportModal
          previewOpen={previewOpen}
          setPreviewOpen={setPreviewOpen}
          report={selectedReport}
          reportType="scouting"
          onSuccess={fetchReports}
        />
      )}
    </div>
  );
};

export default FamilyScoutingReports;
