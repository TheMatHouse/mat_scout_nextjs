"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ScoutingReportForm from "./forms/ScoutingReportForm";
import { ReportDataTable } from "./data/report-data-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import moment from "moment";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PreviewReportModal from "./PreviewReportModal";
import { toast } from "react-toastify";

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
      if (!res.ok) throw new Error("Failed to fetch match reports");
      const data = await res.json();
      setScoutingReports(data);
    } catch (err) {
      console.error(err);
      toast.error("Could not load scouting reports.");
    }
  };

  const handleDialogClose = (openState) => {
    setOpen(openState);
    if (!openState) {
      setSelectedReport(null);
    }
  };

  const closePreviewModal = () => {
    setPreviewOpen(false);
    setSelectedReport(null);
  };

  const handleDeleteReport = async (report) => {
    if (
      window.confirm(`This report will be permanently deleted! Are you sure?`)
    ) {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${user._id}/scoutingReports/${report._id}`,
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
        <h1 className="2xl">My Scouting Reports</h1>
        <Dialog
          open={open}
          onOpenChange={handleDialogClose}
        >
          <DialogTrigger asChild>
            <Button className="ml-6 bg-gray-900 hover:bg-gray-500 border-gray-500 dark:border-gray-100 border-2 drop-shadow-md text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
              Add Scouting Report
            </Button>
          </DialogTrigger>
          <DialogContent className="overflow-y-scroll max-h-[90%]">
            <DialogHeader>
              <DialogTitle>
                {selectedReport ? "Edit this " : "Add a "} Scouting Report
              </DialogTitle>
              <DialogDescription>
                {selectedReport
                  ? " "
                  : "Add a new report here. You can edit this report at any time."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 min-width-full">
              <ScoutingReportForm
                key={selectedReport?._id}
                athlete={user}
                styles={styles?.styles}
                techniques={techniques}
                userType="user"
                setOpen={setOpen}
                report={selectedReport}
                onSuccess={fetchReports}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div>
        <ReportDataTable
          columns={columns}
          data={scoutingReports}
        />
      </div>
      {previewOpen && (
        <PreviewReportModal
          previewOpen={previewOpen}
          setPreviewOpen={closePreviewModal}
          report={selectedReport}
          reportType="scouting"
        />
      )}
    </div>
  );
};

export default DashboardScouting;
