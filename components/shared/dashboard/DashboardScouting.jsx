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
import { useState } from "react";
import ScoutingReportForm from "./forms/ScoutingReportForm";

export const columns = ({
  setSelectedReport,
  setOpen,
  setPreviewOptn,
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
          <div className="text-center">
            {reportType === "match" ? "Opponent Name" : "Name"}
          </div>
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
          <div className="text-center">
            {" "}
            {reportType === "match" ? "Opponent's Country" : "Country"}
          </div>
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
];

const DashboardScouting = ({ user, styles, techniques }) => {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex items-center">
        <h1 className="2xl">My Scouting Reports</h1>
        <Dialog
          open={open}
          onOpenChange={setOpen}
        >
          <DialogTrigger asChild>
            <Button className="bg-gray-900 hover:bg-gray-500  border-gray-500 dark:border-gray-100 border-2 drop-shadow-md text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ml-6">
              Add Scouting Report
            </Button>
          </DialogTrigger>
          <DialogContent className="overflow-y-scroll max-h-[90%]">
            <DialogHeader>
              <DialogTitle>
                {/* {selectedMatch ? "Edit this " : "Add a "} Match Report */}
              </DialogTitle>
              <DialogDescription>
                {/* {selectedMatch
                    ? " "
                    : "Add a new report here. You can edit this report at any time."} */}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 min-width-full">
              <ScoutingReportForm
                athlete={user}
                styles={styles && styles.styles}
                techniques={techniques}
                type="user"
                setOpen={setOpen}
                //report={selectedReport}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DashboardScouting;
