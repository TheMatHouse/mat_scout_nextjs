import {
  Table,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MatchDataTable } from "./data/match-data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import MatchReportForm from "./forms/MatchReportForm";
import { useState } from "react";

export const columns = [
  {
    accessorKey: "matchType",
    header: "Type",
  },
  {
    accessorKey: "eventName",
    header: "Event",
  },
  {
    accessorKey: "matchDate",
    header: "Match Date",
  },
  {
    accessorKey: "division",
    header: "Division",
  },
  {
    accessorKey: "opponentName",
    header: "Opponent's Name",
  },
  {
    accessorKey: "opponentCountry",
    header: "Opponent's Country",
  },
  {
    accessorKey: "result",
    header: "Result",
  },
];
const DashboardMatches = ({ user, styles, techniques }) => {
  const data = user.matchReports;

  const [open, setOpen] = useState(false);

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
              <DialogTitle>Add a Match Report</DialogTitle>
              <DialogDescription>
                Add a new report here. You can edit this report at any time.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 min-width-full">
              <MatchReportForm
                athlete={user}
                styles={styles && styles.styles}
                techniques={techniques}
                type="user"
                setOpen={setOpen}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div>
        <MatchDataTable
          columns={columns}
          data={data}
        />
      </div>
    </div>
  );
};

export default DashboardMatches;
