"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  FilterX,
  Briefcase,
  Plus,
} from "lucide-react";
import type { ApplicationWithRelations } from "@/server/actions/application.actions";
import {
  BoardFilterParams,
  countActiveFilters,
} from "@/lib/filters/application-filters";
import {
  createApplicationTableColumns,
  type SortableColumnId,
} from "./table-columns";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface ApplicationsTableProps {
  applications: ApplicationWithRelations[];
  params: BoardFilterParams;
  onSortChange: (columnId: SortableColumnId) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSelectApp: (id: string) => void;
  onResetFilters: () => void;
  onNewApplication: () => void;
}

const SORTABLE_COLUMNS: readonly string[] = [
  "company",
  "role",
  "status",
  "priority",
  "salaryMax",
  "appliedDate",
  "followUpDate",
];

export function ApplicationsTable({
  applications,
  params,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onSelectApp,
  onResetFilters,
  onNewApplication,
}: ApplicationsTableProps) {
  const totalItems = applications.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / params.pageSize));
  const currentPage = Math.min(Math.max(1, params.page), totalPages);

  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * params.pageSize;
    return applications.slice(start, start + params.pageSize);
  }, [applications, currentPage, params.pageSize]);

  const columns = React.useMemo(
    () =>
      createApplicationTableColumns({
        sortBy: params.sortBy,
        sortDir: params.sortDir,
        onSort: onSortChange,
      }),
    [params.sortBy, params.sortDir, onSortChange]
  );

  const table = useReactTable({
    data: paginatedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const hasActiveFilters = countActiveFilters(params) > 0;
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * params.pageSize + 1;
  const endIndex = Math.min(currentPage * params.pageSize, totalItems);

  if (totalItems === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 p-12 text-center shadow-2xs min-h-[380px]">
        {hasActiveFilters ? (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
              <FilterX className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              No matching applications found
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
              None of your applications matched the current search or filter criteria. Try adjusting or clearing your filters.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="text-xs h-8 gap-1.5"
            >
              <FilterX className="h-3.5 w-3.5" />
              Reset all filters
            </Button>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
              <Briefcase className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              No applications yet
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
              Get started by tracking your first job application.
            </p>
            <Button
              size="sm"
              onClick={onNewApplication}
              className="text-xs h-8 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              New Application
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table Container */}
      <div className="relative w-full overflow-x-auto rounded-xl border border-border bg-card shadow-2xs">
        <table className="w-full caption-bottom text-sm border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isCompany = header.column.id === "company";
                  const isSortable = SORTABLE_COLUMNS.includes(header.column.id);

                  const sortAria = !isSortable
                    ? undefined
                    : params.sortBy === header.column.id
                      ? params.sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none";

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={sortAria}
                      className={cn(
                        "h-10 px-3 text-left align-middle font-medium text-muted-foreground whitespace-nowrap border-b border-border text-xs",
                        isCompany
                          ? "sticky start-0 z-20 bg-muted/95 backdrop-blur"
                          : "bg-muted/95 backdrop-blur"
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="bg-card">
            {table.getRowModel().rows.map((row) => {
              const app = row.original;
              return (
                <tr
                  key={row.id}
                  tabIndex={0}
                  role="row"
                  onClick={() => onSelectApp(app.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectApp(app.id);
                    }
                  }}
                  className="group cursor-pointer transition-colors hover:bg-muted/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                >
                  {row.getVisibleCells().map((cell) => {
                    if (cell.column.id === "company") {
                      return (
                        <th
                          key={cell.id}
                          scope="row"
                          className="sticky start-0 z-[1] bg-card group-hover:bg-muted/60 font-medium text-left p-3 align-middle whitespace-nowrap border-b border-border/60"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </th>
                      );
                    }
                    return (
                      <td
                        key={cell.id}
                        className="p-3 align-middle whitespace-nowrap border-b border-border/60"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-1">
        <div className="text-xs text-muted-foreground order-2 sm:order-1">
          Showing <span className="font-medium text-foreground">{startIndex}</span> to{" "}
          <span className="font-medium text-foreground">{endIndex}</span> of{" "}
          <span className="font-medium text-foreground">{totalItems}</span> applications
        </div>

        <div className="flex items-center gap-4 order-1 sm:order-2">
          {/* Rows per page selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Rows per page
            </span>
            <Select
              value={String(params.pageSize)}
              onValueChange={(val) => onPageSizeChange(Number(val))}
            >
              <SelectTrigger className="h-8 w-[72px] text-xs">
                <SelectValue placeholder={String(params.pageSize)} />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectItem value="10" className="text-xs">
                  10
                </SelectItem>
                <SelectItem value="20" className="text-xs">
                  20
                </SelectItem>
                <SelectItem value="50" className="text-xs">
                  50
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Navigation buttons and page count */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground whitespace-nowrap font-medium px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              aria-label="Next page"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
