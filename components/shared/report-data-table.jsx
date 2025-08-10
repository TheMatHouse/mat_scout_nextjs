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
//mport { Button } from "react-day-picker";

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

  return (
    <div>
      <div className="items-center py-4">
        <h4 className="text-lg font-bold">Filter by:</h4>
        <br />
        <div className="flex gap-3 flex-wrap">
          <Input
            placeholder="Match type..."
            value={table.getColumn("matchType")?.getFilterValue() ?? ""}
            onChange={(e) =>
              table.getColumn("matchType")?.setFilterValue(e.target.value)
            }
            className="max-w-xs"
          />
          {columns.some((c) => c.accessorKey === "eventName") && (
            <Input
              placeholder="Event name..."
              value={table.getColumn("eventName")?.getFilterValue() ?? ""}
              onChange={(e) =>
                table.getColumn("eventName")?.setFilterValue(e.target.value)
              }
              className="max-w-xs"
            />
          )}
          {columns.some((c) => c.accessorKey === "matchDate") && (
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

      <div className="rounded-md border border-[color:var(--tbl-border)] overflow-hidden">
        <Table className="table-auto my-4">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="bg-[var(--tbl-header-bg)] hover:bg-[var(--tbl-header-bg)]"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-[var(--tbl-header-fg)] text-center font-semibold tracking-wide
                 border-r border-[color:var(--tbl-border)] last:border-r-0"
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
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={`border-b border-[color:var(--tbl-border)]
                          hover:bg-[var(--tbl-row-hover-bg)] transition-colors`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="border-r border-[color:var(--tbl-border)] last:border-r-0"
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
                  className="h-24 text-center border-t border-[color:var(--tbl-border)]"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-center space-x-3 py-4">
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
}
