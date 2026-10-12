"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useApplicationsQuery,
  useMoveCardMutation,
} from "@/hooks/use-applications";
import { useDrawerUrl } from "@/hooks/use-drawer-url";
import { KanbanBoard } from "@/components/board/kanban-board";
import { ViewToggleBar, type ResumeVersionOption } from "@/components/board/view-toggle-bar";
import { ApplicationsTable } from "@/components/table/applications-table";
import type { SortableColumnId } from "@/components/table/table-columns";
import { ApplicationFormDialog } from "@/components/applications/application-form-dialog";
import {
  parseBoardFilterParams,
  serializeBoardFilterParams,
  filterAndSortApplications,
  DEFAULT_BOARD_FILTER_PARAMS,
  countActiveFilters,
  type BoardFilterParams,
} from "@/lib/filters/application-filters";
import type { ApplicationStatus } from "@/schemas/enums";
import type { ApplicationWithRelations } from "@/server/actions/application.actions";

export interface BoardViewProps {
  initialApplications: ApplicationWithRelations[];
  resumeVersions?: ResumeVersionOption[];
}

export function BoardView({
  initialApplications,
  resumeVersions = [],
}: BoardViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [addModalOpen, setAddModalOpen] = React.useState<boolean>(false);
  const [defaultStatus, setDefaultStatus] = React.useState<ApplicationStatus>("APPLIED");

  const { openDrawer } = useDrawerUrl();
  const moveCardMutation = useMoveCardMutation();

  // Load all applications from query / initialData
  const { data: applications = initialApplications, isLoading } = useApplicationsQuery(
    {
      includeArchived: true,
    },
    initialApplications
  );

  // Parse typed URL-synced filter params
  const params: BoardFilterParams = React.useMemo(() => {
    return parseBoardFilterParams(searchParams);
  }, [searchParams]);

  // Sync updates back to URL
  const handleFilterChange = React.useCallback(
    (updates: Partial<BoardFilterParams>) => {
      const shouldResetPage =
        updates.page === undefined &&
        (updates.q !== undefined ||
          updates.status !== undefined ||
          updates.source !== undefined ||
          updates.priority !== undefined ||
          updates.locationType !== undefined ||
          updates.resumeVersionId !== undefined ||
          updates.from !== undefined ||
          updates.to !== undefined ||
          updates.archived !== undefined ||
          updates.sortBy !== undefined ||
          updates.sortDir !== undefined ||
          updates.pageSize !== undefined);

      const merged: BoardFilterParams = {
        ...params,
        ...updates,
        ...(shouldResetPage ? { page: 1 } : {}),
      };

      const queryString = serializeBoardFilterParams(merged, searchParams ?? undefined);
      router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [params, pathname, router, searchParams]
  );

  const handleResetFilters = React.useCallback(() => {
    const resetParams: Partial<BoardFilterParams> = {
      q: "",
      status: "ALL",
      source: "ALL",
      priority: "ALL",
      locationType: "ALL",
      resumeVersionId: "ALL",
      from: "",
      to: "",
      archived: false,
      sortBy: DEFAULT_BOARD_FILTER_PARAMS.sortBy,
      sortDir: DEFAULT_BOARD_FILTER_PARAMS.sortDir,
      page: 1,
    };
    const queryString = serializeBoardFilterParams(resetParams, searchParams ?? undefined);
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleSortChange = React.useCallback(
    (columnId: SortableColumnId) => {
      if (params.sortBy === columnId) {
        handleFilterChange({
          sortDir: params.sortDir === "asc" ? "desc" : "asc",
        });
      } else {
        handleFilterChange({
          sortBy: columnId,
          sortDir: "asc",
        });
      }
    },
    [params.sortBy, params.sortDir, handleFilterChange]
  );

  // Filter and sort applications for both Board and Table views
  const filteredApplications = React.useMemo(() => {
    return filterAndSortApplications(applications, params);
  }, [applications, params]);

  const handleQuickAdd = (status: ApplicationStatus) => {
    setDefaultStatus(status);
    setAddModalOpen(true);
  };

  const handleOpenNewApp = () => {
    setDefaultStatus("APPLIED");
    setAddModalOpen(true);
  };

  const activeCount = React.useMemo(() => {
    return applications.filter((a) => !a.archivedAt).length;
  }, [applications]);

  const activeFiltersCount = countActiveFilters(params);

  return (
    <div className="space-y-4">
      {/* Page Title & Active Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Application Pipeline
            </h1>
            <Badge variant="secondary" className="font-semibold text-xs">
              {activeCount} Active
            </Badge>
            {activeFiltersCount > 0 && (
              <span className="text-xs text-muted-foreground">
                ({filteredApplications.length} shown)
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {params.view === "table"
              ? "Comprehensive tabular overview of your applications with sorting and quick drawer access."
              : "Drag and drop applications across hiring stages. Click any card to view detailed notes, contacts, and timeline."}
          </p>
        </div>
      </div>

      {/* Filter and View Toggle Controls */}
      <ViewToggleBar
        params={params}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        onNewApplication={handleOpenNewApp}
        resumeVersions={resumeVersions}
      />

      {/* Main Board or Table View */}
      {isLoading && applications.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[500px] rounded-xl border border-border bg-card/40 p-4 space-y-3"
            >
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : params.view === "table" ? (
        <ApplicationsTable
          applications={filteredApplications}
          params={params}
          onSortChange={handleSortChange}
          onPageChange={(page) => handleFilterChange({ page })}
          onPageSizeChange={(pageSize) => handleFilterChange({ pageSize, page: 1 })}
          onSelectApp={(id) => openDrawer(id)}
          onResetFilters={handleResetFilters}
          onNewApplication={handleOpenNewApp}
        />
      ) : (
        <KanbanBoard
          applications={filteredApplications}
          onMoveCard={(input) => moveCardMutation.mutate(input)}
          onSelectCard={(id) => openDrawer(id)}
          onQuickAdd={handleQuickAdd}
        />
      )}

      {/* Add / Edit Application Dialog */}
      <ApplicationFormDialog
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        defaultStatus={defaultStatus}
      />
    </div>
  );
}
