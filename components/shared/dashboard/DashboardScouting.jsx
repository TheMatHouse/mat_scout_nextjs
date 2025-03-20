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
import { useEffect, useRef, useState } from "react";
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

export const columns = ({
  setSelectedReport,
  setOpen,
  setPreviewOpen,
  handleDeleteReport,
  reportType,
}) => [
  {
    accessorKey: "matchType",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <div className="text-center">Type</div>
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "athleteFirstName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <div className="text-center">First Name</div>
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "athleteLastName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <div className="text-center">Last Name</div>
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "division",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <div className="text-center">Division</div>
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "weightCategory",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <div className="text-center">Weight Class</div>
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "athleteCountry",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <div className="text-center">Country</div>
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    id: "actions",
    header: <div className="text-center">Actions</div>,
    cell: ({ row }) => {
      const report = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Open menu</span>
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
              View Full Report
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
              onClick={() => {
                setSelectedReport(report);
                handleDeleteReport(report);
              }}
            >
              Delete Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

const DashboardScouting = ({ user, styles, techniques }) => {
  const router = useRouter();
  const data = user.scoutingReports;

  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const modalRef = useRef(null);

  const handleDialogClose = (openState) => {
    setOpen(openState); // Update dialog open state
    if (!openState) {
      // Reset the form when the dialog is closed (either by clicking outside or cancel)
      setSelectedReport(null); // Reset selected report to avoid showing stale data
    }
  };

  const openPreviewModal = (newReport) => {
    setSelectedReport(newReport); // Set new report data when opening modal
    setPreviewOpen(true);
  };

  const closePreviewModal = () => {
    setPreviewOpen(false); // Close the modal
    setSelectedReport(null); // Reset the report data when modal closes
  };

  const handleDeleteReport = async (report) => {
    if (
      window.confirm(`This report will be permanently deleted!  Are you sure?`)
    ) {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${user._id}/scoutingReports/${report._id}`,
        {
          method: "DELETE",
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Content-type": "application/json; charset=UTF-8",
          },
        }
      );
      const data = await response.json();

      if (response.ok) {
        const timer = setTimeout(() => {
          setSelectedReport(null);
          router.refresh();
          toast.success(data.message, {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "light",
          });
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        toast.error(data.message);
        console.log(data.message);
      }
    }
  };

  return (
    <div>
      <div className="flex items-center">
        <h1 className="2xl">My Scouting Reports</h1>
        <Dialog
          open={open}
          onOpenChange={handleDialogClose}
        >
          <DialogTrigger asChild>
            <Button className="bg-gray-900 hover:bg-gray-500  border-gray-500 dark:border-gray-100 border-2 drop-shadow-md text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ml-6">
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
                athlete={user}
                styles={styles && styles.styles}
                techniques={techniques}
                type="user"
                setOpen={setOpen}
                report={selectedReport}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div>
        <ReportDataTable
          columns={columns({
            setSelectedReport,
            setOpen,
            setPreviewOpen,
            handleDeleteReport,
          })}
          data={data}
          setSelectedReport={setSelectedReport}
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
