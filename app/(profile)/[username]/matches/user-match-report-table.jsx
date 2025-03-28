import React, { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Input } from "@/components/ui/input";

const UserMatchReportTable = ({ columns, data }) => {
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  return (
    <div>
      <div className="items-center py-4">
        <h4 className="text-lg font-bold">Filter by:</h4>
        <br />
        <div className="flex">
          <Input
            placeholder="Match type..."
            value={table.getColumn("matchType")?.getFilterValue() ?? ""} // Ensure it's always a string
            onChange={(event) =>
              table.getColumn("matchType")?.setFilterValue(event.target.value)
            }
            className="max-w-fit"
          />
          {columns.some((col) => col.accessorKey === "eventName") && (
            <Input
              placeholder="Event name..."
              value={table.getColumn("eventName")?.getFilterValue() ?? ""} // Ensure it's always a string
              onChange={(event) =>
                table.getColumn("eventName")?.setFilterValue(event.target.value)
              }
              className="max-w-fit"
            />
          )}
          {columns.some((col) => col.accessorKey === "matchDate") && (
            <Input
              placeholder="Match date (YYYY-MM-DD)"
              value={table.getColumn("matchDate")?.getFilterValue() ?? ""}
              onChange={(event) =>
                table.getColumn("matchDate")?.setFilterValue(event.target.value)
              }
              className="max-w-fit"
            />
          )}
        </div>
      </div>
      <div className="rounded-md border">
        <Table className="table-auto my-4 border border-gray-900 dark:border-white border-collapse">
          <TableHeader className="border-b-2 border-gray-900 dark:border-white">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="bg-ms-blue hover:bg-ms-blue dark:bg-ms-blue-gray border-b-2 border-gray-900 dark:border-white"
              >
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="text-gray-100 dark:text-gray-900 text-center font-bold border-r-2 border-gray-900 dark:border-white"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={`border-b-2 border-gray-900 dark:border-white hover:bg-gray-400 ${
                    index === 0 ? "border-t-2" : ""
                  } ${
                    index === table.getRowModel().rows.length - 1
                      ? "border-b-2"
                      : ""
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="border-gray-900 dark:border-white"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center border-t-2 border-b-2 border-gray-900 dark:border-white"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-center space-x-10 py-4">
        <button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </button>
        <button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default UserMatchReportTable;
