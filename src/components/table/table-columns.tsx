import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { format, differenceInCalendarDays, startOfDay } from "date-fns";
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import type { ApplicationWithRelations } from "@/server/actions/application.actions";
import { isFollowUpOverdue, formatDateInTimezone } from "@/lib/dates/timezone";
import { Badge } from "@/components/ui/badge";
import {
  cn,
  formatSalaryRange,
  getCompanyInitials,
  getCompanyAvatarColor,
} from "@/lib/utils";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  LOCATION_TYPE_LABELS,
  LOCATION_TYPE_COLORS,
  APPLICATION_SOURCE_LABELS,
  APPLICATION_SOURCE_COLORS,
} from "@/schemas/enums";

export type SortableColumnId =
  | "company"
  | "role"
  | "status"
  | "priority"
  | "salaryMax"
  | "appliedDate"
  | "followUpDate";

export interface ApplicationTableColumnsOptions {
  sortBy: string;
  sortDir: "asc" | "desc";
  onSort: (columnId: SortableColumnId) => void;
  userTimezone?: string | null;
}

function formatRelativeDays(date: Date): string {
  const days = differenceInCalendarDays(startOfDay(new Date()), startOfDay(date));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days > 1) return `${days} days ago`;
  if (days === -1) return "In 1 day";
  return `In ${Math.abs(days)} days`;
}

export function createApplicationTableColumns(
  options: ApplicationTableColumnsOptions
): ColumnDef<ApplicationWithRelations>[] {
  const { sortBy, sortDir, onSort } = options;

  function renderSortableHeader(id: SortableColumnId, title: string) {
    const isSorted = sortBy === id;
    return (
      <button
        type="button"
        onClick={() => onSort(id)}
        className="inline-flex items-center gap-1.5 font-semibold text-xs text-muted-foreground hover:text-foreground transition-colors group focus-visible:outline-hidden focus-visible:underline"
      >
        <span>{title}</span>
        {isSorted ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground" />
        )}
      </button>
    );
  }

  return [
    // 1. Company
    {
      id: "company",
      accessorKey: "company",
      header: () => renderSortableHeader("company", "Company"),
      cell: ({ row }) => {
        const app = row.original;
        const initials = getCompanyInitials(app.company);
        const avatarBg = getCompanyAvatarColor(app.company);

        return (
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "inline-flex items-center justify-center h-8 w-8 rounded-md text-xs font-bold shrink-0 select-none shadow-2xs",
                avatarBg
              )}
            >
              {initials}
            </span>
            <span className="font-semibold text-foreground text-sm truncate max-w-[180px]">
              {app.company}
            </span>
            {app.jobUrl && (
              <a
                href={app.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                title="Open job listing"
                aria-label="Open job listing"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        );
      },
    },

    // 2. Role
    {
      id: "role",
      accessorKey: "role",
      header: () => renderSortableHeader("role", "Role"),
      cell: ({ row }) => {
        const app = row.original;
        return (
          <div className="flex items-center gap-2 max-w-[220px]">
            <span className="font-medium text-foreground text-sm truncate">
              {app.role}
            </span>
            {app.archivedAt !== null && (
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-semibold text-muted-foreground border-dashed shrink-0"
              >
                Archived
              </Badge>
            )}
          </div>
        );
      },
    },

    // 3. Status
    {
      id: "status",
      accessorKey: "status",
      header: () => renderSortableHeader("status", "Status"),
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge
            className={cn(
              "text-xs font-semibold px-2 py-0.5 border shadow-none",
              APPLICATION_STATUS_COLORS[status]
            )}
          >
            {APPLICATION_STATUS_LABELS[status]}
          </Badge>
        );
      },
    },

    // 4. Priority
    {
      id: "priority",
      accessorKey: "priority",
      header: () => renderSortableHeader("priority", "Priority"),
      cell: ({ row }) => {
        const priority = row.original.priority;
        return (
          <Badge
            className={cn(
              "text-xs font-semibold px-2 py-0.5 border shadow-none",
              PRIORITY_COLORS[priority]
            )}
          >
            {PRIORITY_LABELS[priority]}
          </Badge>
        );
      },
    },

    // 5. Salary Range
    {
      id: "salaryMax",
      accessorKey: "salaryMax",
      header: () => renderSortableHeader("salaryMax", "Salary Range"),
      cell: ({ row }) => {
        const { salaryMin, salaryMax, currency } = row.original;
        const formatted = formatSalaryRange(salaryMin, salaryMax, currency);
        if (!formatted) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        return <span className="font-medium text-xs text-foreground">{formatted}</span>;
      },
    },

    // 6. Location
    {
      id: "locationType",
      accessorKey: "locationType",
      header: () => (
        <span className="font-semibold text-xs text-muted-foreground">Location</span>
      ),
      cell: ({ row }) => {
        const { locationType, location } = row.original;
        return (
          <div className="flex flex-col gap-0.5 items-start">
            <Badge
              className={cn(
                "text-[11px] font-medium px-1.5 py-0 border shadow-none",
                LOCATION_TYPE_COLORS[locationType]
              )}
            >
              {LOCATION_TYPE_LABELS[locationType]}
            </Badge>
            {location && (
              <span
                className="text-xs text-muted-foreground truncate max-w-[130px]"
                title={location}
              >
                {location}
              </span>
            )}
          </div>
        );
      },
    },

    // 7. Source
    {
      id: "source",
      accessorKey: "source",
      header: () => (
        <span className="font-semibold text-xs text-muted-foreground">Source</span>
      ),
      cell: ({ row }) => {
        const source = row.original.source;
        return (
          <Badge
            className={cn(
              "text-xs font-medium px-2 py-0.5 border shadow-none",
              APPLICATION_SOURCE_COLORS[source]
            )}
          >
            {APPLICATION_SOURCE_LABELS[source]}
          </Badge>
        );
      },
    },

    // 8. Resume
    {
      id: "resumeVersion",
      accessorKey: "resumeVersion",
      header: () => (
        <span className="font-semibold text-xs text-muted-foreground">Resume</span>
      ),
      cell: ({ row }) => {
        const resumeName = row.original.resumeVersion?.name;
        if (!resumeName) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        return (
          <span
            className="text-xs text-muted-foreground truncate max-w-[130px] block"
            title={resumeName}
          >
            {resumeName}
          </span>
        );
      },
    },

    // 9. Applied Date
    {
      id: "appliedDate",
      accessorKey: "appliedDate",
      header: () => renderSortableHeader("appliedDate", "Applied Date"),
      cell: ({ row }) => {
        const date = new Date(row.original.appliedDate);
        return (
          <div className="flex flex-col text-xs">
            <span className="text-foreground font-medium">
              {format(date, "MMM d, yyyy")}
            </span>
            <span className="text-muted-foreground text-[11px]">
              {formatRelativeDays(date)}
            </span>
          </div>
        );
      },
    },

    // 10. Follow-up
    {
      id: "followUpDate",
      accessorKey: "followUpDate",
      header: () => renderSortableHeader("followUpDate", "Follow-up"),
      cell: ({ row }) => {
        const app = row.original;
        if (!app.followUpDate) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }

        const isOverdue = isFollowUpOverdue({
          followUpDate: app.followUpDate,
          status: app.status,
          archivedAt: app.archivedAt,
          deletedAt: app.deletedAt,
          timezone: options.userTimezone,
        });

        const formattedDate = formatDateInTimezone(app.followUpDate, options.userTimezone);

        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-foreground">
              {formattedDate}
            </span>
            {isOverdue && (
              <Badge
                variant="destructive"
                className="text-[10px] font-bold px-1.5 py-0 bg-rose-600 hover:bg-rose-600 dark:bg-rose-700 text-white shadow-none"
              >
                Overdue
              </Badge>
            )}
          </div>
        );
      },
    },
  ];
}
