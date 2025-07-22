"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CirclePlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PreviewReportModal from "@/components/shared/PreviewReportModal";
import ScoutingReportForm from "@/components/teams/forms/ScoutingReportForm";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { ReportDataTable } from "@/components/shared/report-data-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

export default function TeamScoutingReportsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug;

  const [team, setTeam] = useState(null);
  const [reports, setReports] = useState([]);
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Fetch team data
  useEffect(() => {
    if (!slug) return;

    const fetchTeam = async () => {
      try {
        const res = await fetch(`/api/teams/${slug}`);
        if (!res.ok) throw new Error("Failed to fetch team");
        const data = await res.json();
        setTeam(data.team);
      } catch (err) {
        console.error("Error fetching team:", err);
        toast.error("Error loading team data");
      }
    };

    fetchTeam();
  }, [slug]);

  // Fetch scouting reports
  const fetchReports = async () => {
    try {
      const res = await fetch(
        `/api/teams/${slug}/scouting-reports?ts=${Date.now()}`
      );
      if (!res.ok) throw new Error("Failed to load scouting reports");
      const data = await res.json();
      setReports(data.scoutingReports || []);
    } catch (error) {
      console.error(error);
      toast.error("Error loading scouting reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!slug) return;
    fetchReports();
  }, [slug]);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) throw new Error("Failed to fetch user");
        const userData = await res.json();
        setUser(userData);
      } catch (err) {
        console.error("Failed to load user:", err);
      }
    };

    fetchUser();
  }, []);

  const handleDeleteReport = async (report) => {
    if (
      window.confirm(`This report will be permanently deleted! Are you sure?`)
    ) {
      const response = await fetch(
        `/api/teams/${slug}/scouting-reports/${report._id}`,
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
        setReports((prev) => prev.filter((r) => r._id !== report._id));

        // Clear selected report if needed
        setSelectedReport(null);

        // Refresh in case server state matters
        router.refresh();
      } else {
        toast.error(data.message || "Failed to delete report");
      }
    }
  };

  const exportReportsToExcel = () => {
    const dataToExport = reports.map((r) => ({
      FirstName: r.athleteFirstName,
      LastName: r.athleteLastName,
      Country: r.athleteCountry,
      NationalRank: r.athleteNationalRank,
      WorldRank: r.athleteWorldRank,
      Club: r.athleteClub,
      Division: r.division,
      WeightClass: r.weightCategory,
      Grip: r.athleteGrip,
      MatchType: r.matchType,
      Attacks: (r.athleteAttacks || []).join(", "),
      Notes: r.athleteAttackNotes || "",
      VideoLinks: (r.videos || []).map((v) => v.url).join(", "),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reports");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const file = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(file, `scouting-reports-${slug}.xlsx`);
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
                View Report Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedReport(report);
                  setOpen(true);
                }}
              >
                Edit Report
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-ms-dark-red"
                onClick={() => handleDeleteReport(report)}
              >
                Delete Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Scouting Reports</h1>

        <Dialog
          open={open}
          onOpenChange={setOpen}
        >
          <DialogHeader>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setSelectedReport(null); // ✅ clear old report
                  setOpen(true); // ✅ open dialog manually
                }}
              >
                <CirclePlus className="w-4 h-4 mr-2" />
                Add New Report
              </Button>
            </DialogTrigger>
            <Button
              variant="outline"
              size="sm"
              onClick={exportReportsToExcel}
            >
              Export to Excel
            </Button>
          </DialogHeader>

          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Scouting Report</DialogTitle>
            </DialogHeader>
            <ScoutingReportForm
              key={selectedReport?._id}
              team={team}
              user={user}
              userStyles={user?.user.userStyles || []}
              report={selectedReport}
              setOpen={setOpen}
              onSuccess={fetchReports}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : !Array.isArray(reports) || reports.length === 0 ? (
        <p>No reports found.</p>
      ) : (
        <div className="overflow-x-auto">
          <ReportDataTable
            columns={columns}
            data={reports}
          />
        </div>
      )}

      {selectedReport && (
        <PreviewReportModal
          previewOpen={previewOpen}
          setPreviewOpen={setPreviewOpen}
          report={selectedReport}
          reportType="scouting"
        />
      )}
    </div>
  );
}
