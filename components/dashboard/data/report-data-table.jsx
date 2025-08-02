"use client";

import { useState } from "react";
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

export function ReportDataTable({ columns, data }) {
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

  // ✅ Check if a column exists
  const hasColumn = (id) =>
    table.getAllLeafColumns().some((col) => col.id === id);

  return (
    <div>
      {/* ✅ Dynamic Filters */}
      <div className="items-center py-4">
        <h4 className="text-lg font-bold mb-2">Filter by:</h4>
        <div className="flex flex-wrap gap-3">
          {hasColumn("matchType") && (
            <Input
              placeholder="Match type..."
              value={table.getColumn("matchType")?.getFilterValue() ?? ""}
              onChange={(e) =>
                table.getColumn("matchType")?.setFilterValue(e.target.value)
              }
              className="max-w-xs"
            />
          )}

          {hasColumn("eventName") && (
            <Input
              placeholder="Event name..."
              value={table.getColumn("eventName")?.getFilterValue() ?? ""}
              onChange={(e) =>
                table.getColumn("eventName")?.setFilterValue(e.target.value)
              }
              className="max-w-xs"
            />
          )}

          {hasColumn("matchDate") && (
            <Input
              placeholder="Match date (YYYY-MM-DD)"
              value={table.getColumn("matchDate")?.getFilterValue() ?? ""}
              onChange={(e) =>
                table.getColumn("matchDate")?.setFilterValue(e.target.value)
              }
              className="max-w-xs"
            />
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table className="table-auto w-full border border-gray-300 dark:border-gray-700">
          <TableHeader className="bg-gray-900 text-white dark:bg-gray-900">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="px-4 py-3 font-semibold text-left border-b border-gray-700"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="px-4 py-3"
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
                  className="text-center py-6"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center space-x-6 py-4">
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="px-3 py-2 bg-gray-200 dark:bg-gray-800 rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </span>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="px-3 py-2 bg-gray-200 dark:bg-gray-800 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
