import { useRouter } from "next/navigation";
import { MatchDataTable } from "./data/match-data-table";
import { ReportDataTable } from "./data/report-data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import MatchReportForm from "./forms/MatchReportForm";
import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import moment from "moment";

// ICONS
import { MoreHorizontal } from "lucide-react";
import { toast } from "react-toastify";
//import PreviewMatchReportModal from "./PreviewMatchReportModal";
import PreviewMatchReportModal from "./PreviewMatchReportModal";

export const columns = ({
  setSelectedMatch,
  setOpen,
  setPreviewOpen,
  handleDeleteMatch,
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
    accessorKey: "eventName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <div className="text-center">Event</div>
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "matchDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <div className="text-center">Match Date</div>
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ getValue }) => moment.utc(getValue()).format("MMMM D, YYYY"), // Ensure UTC handling
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
    accessorKey: "opponentName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <div className="text-center">Opponent's Name</div>
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "opponentCountry",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <div className="text-center">Opponent's Country</div>
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "result",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <div className="text-center">Result</div>
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    id: "actions",
    header: <div className="text-center">Actions</div>,
    cell: ({ row }) => {
      const match = row.original;

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
              onClick={() => {
                setSelectedMatch(match);
                handleDeleteMatch(match);
              }}
            >
              Delete Match
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
const DashboardMatches = ({ user, styles, techniques }) => {
  const router = useRouter();
  const data = user.matchReports;

  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const handleDeleteMatch = async (match) => {
    if (
      window.confirm(`This report will be permanently deleted!  Are you sure?`)
    ) {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${user._id}/matchReports/${match._id}`,
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
        <h1 className="text-2xl">My Matches</h1>
        <Dialog
          open={open}
          onOpenChange={setOpen}
        >
          <DialogTrigger asChild>
            <Button className="bg-gray-900 hover:bg-gray-500  border-gray-500 dark:border-gray-100 border-2 drop-shadow-md text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ml-6">
              Add Match Report
            </Button>
          </DialogTrigger>
          <DialogContent className="overflow-y-scroll max-h-[90%]">
            <DialogHeader>
              <DialogTitle>
                {selectedMatch ? "Edit this " : "Add a "} Match Report
              </DialogTitle>
              <DialogDescription>
                {selectedMatch
                  ? " "
                  : "Add a new report here. You can edit this report at any time."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 min-width-full">
              <MatchReportForm
                athlete={user}
                styles={styles && styles.styles}
                techniques={techniques}
                type="user"
                setOpen={setOpen}
                match={selectedMatch}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div>
        <ReportDataTable
          columns={columns({
            setSelectedMatch,
            setOpen,
            setPreviewOpen,
            handleDeleteMatch,
          })}
          data={data}
          user={user}
          setSelectedMatch={setSelectedMatch}
        />
      </div>
      {previewOpen && (
        <PreviewMatchReportModal
          previewOpen={previewOpen}
          setPreviewOpen={setPreviewOpen}
          report={selectedMatch}
        />
      )}
    </div>
  );
};

export default DashboardMatches;
