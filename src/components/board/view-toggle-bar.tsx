"use client";

import * as React from "react";
import {
  Search,
  Plus,
  Kanban,
  Table2,
  Filter,
  FilterX,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  APPLICATION_STATUS_ORDER,
  APPLICATION_STATUS_LABELS,
  PRIORITY_ORDER,
  PRIORITY_LABELS,
  LOCATION_TYPE_ORDER,
  LOCATION_TYPE_LABELS,
  APPLICATION_SOURCE_ORDER,
  APPLICATION_SOURCE_LABELS,
  type ApplicationStatus,
  type Priority,
  type LocationType,
  type ApplicationSource,
} from "@/schemas/enums";
import {
  DEFAULT_BOARD_FILTER_PARAMS,
  countActiveFilters,
  type BoardFilterParams,
} from "@/lib/filters/application-filters";
import { cn } from "@/lib/utils";

export interface ResumeVersionOption {
  id: string;
  name: string;
  fileName: string | null;
}

export interface ViewToggleBarProps {
  params?: BoardFilterParams;
  onFilterChange?: (updates: Partial<BoardFilterParams>) => void;
  onResetFilters?: () => void;
  onNewApplication: () => void;
  resumeVersions?: ResumeVersionOption[];
  // Optional legacy props for backwards compatibility
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  showArchived?: boolean;
  onShowArchivedChange?: (show: boolean) => void;
  currentView?: "board" | "table";
}

export function ViewToggleBar({
  params,
  onFilterChange,
  onResetFilters,
  onNewApplication,
  resumeVersions = [],
  searchQuery,
  onSearchChange,
  showArchived,
  onShowArchivedChange,
  currentView,
}: ViewToggleBarProps) {
  // Determine effective filter params
  const effectiveParams: BoardFilterParams = React.useMemo(() => {
    if (params) {
      return params;
    }
    return {
      ...DEFAULT_BOARD_FILTER_PARAMS,
      view: currentView ?? DEFAULT_BOARD_FILTER_PARAMS.view,
      q: searchQuery ?? DEFAULT_BOARD_FILTER_PARAMS.q,
      archived: showArchived ?? DEFAULT_BOARD_FILTER_PARAMS.archived,
    };
  }, [params, currentView, searchQuery, showArchived]);

  const handleFilterUpdate = React.useCallback(
    (updates: Partial<BoardFilterParams>) => {
      onFilterChange?.(updates);
      if (updates.q !== undefined && onSearchChange) {
        onSearchChange(updates.q);
      }
      if (updates.archived !== undefined && onShowArchivedChange) {
        onShowArchivedChange(updates.archived);
      }
    },
    [onFilterChange, onSearchChange, onShowArchivedChange]
  );

  const handleReset = React.useCallback(() => {
    if (onResetFilters) {
      onResetFilters();
    } else {
      handleFilterUpdate({
        q: "",
        status: "ALL",
        source: "ALL",
        priority: "ALL",
        locationType: "ALL",
        resumeVersionId: "ALL",
        from: "",
        to: "",
        archived: false,
      });
    }
  }, [onResetFilters, handleFilterUpdate]);

  // Local state for debounced search input
  const [localSearch, setLocalSearch] = React.useState(effectiveParams.q);

  React.useEffect(() => {
    setLocalSearch(effectiveParams.q);
  }, [effectiveParams.q]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== effectiveParams.q) {
        handleFilterUpdate({ q: localSearch });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [localSearch, effectiveParams.q, handleFilterUpdate]);

  const activeFilterCount = countActiveFilters(effectiveParams);

  return (
    <div className="space-y-3 py-1">
      {/* Top Row: Search input + View Switcher + Show Archived + New App button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search by company, role, or location..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs"
            aria-label="Search applications"
          />
          {localSearch ? (
            <button
              type="button"
              onClick={() => {
                setLocalSearch("");
                handleFilterUpdate({ q: "" });
              }}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {/* Right Controls: View Switcher, Archived Switch, New App */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Segmented View Toggle Buttons */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 shadow-2xs">
            <Button
              type="button"
              variant={effectiveParams.view === "board" ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={effectiveParams.view === "board"}
              onClick={() => handleFilterUpdate({ view: "board" })}
              className={cn(
                "h-7 px-2.5 text-xs font-medium gap-1.5 transition-all",
                effectiveParams.view === "board"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Board</span>
            </Button>
            <Button
              type="button"
              variant={effectiveParams.view === "table" ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={effectiveParams.view === "table"}
              onClick={() => handleFilterUpdate({ view: "table" })}
              className={cn(
                "h-7 px-2.5 text-xs font-medium gap-1.5 transition-all",
                effectiveParams.view === "table"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Table2 className="h-3.5 w-3.5" />
              <span>Table</span>
            </Button>
          </div>

          {/* Show Archived Switch */}
          <div className="flex items-center space-x-2">
            <Switch
              id="show-archived"
              checked={effectiveParams.archived}
              onCheckedChange={(checked) => handleFilterUpdate({ archived: checked })}
              aria-label="Show archived applications"
            />
            <Label
              htmlFor="show-archived"
              className="text-xs font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap"
            >
              Show archived
            </Label>
          </div>

          {/* New Application Button */}
          <Button
            onClick={onNewApplication}
            size="sm"
            className="h-8 gap-1.5 text-xs font-semibold shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>New Application</span>
          </Button>
        </div>
      </div>

      {/* Bottom Filter Controls Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
        {/* Status Dropdown */}
        <Select
          value={effectiveParams.status}
          onValueChange={(val) =>
            handleFilterUpdate({ status: val as ApplicationStatus | "ALL" })
          }
        >
          <SelectTrigger className="h-8 text-xs w-[130px]" aria-label="Filter by status">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">
              All Statuses
            </SelectItem>
            {APPLICATION_STATUS_ORDER.map((status) => (
              <SelectItem key={status} value={status} className="text-xs">
                {APPLICATION_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority Dropdown */}
        <Select
          value={effectiveParams.priority}
          onValueChange={(val) =>
            handleFilterUpdate({ priority: val as Priority | "ALL" })
          }
        >
          <SelectTrigger className="h-8 text-xs w-[120px]" aria-label="Filter by priority">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">
              All Priorities
            </SelectItem>
            {PRIORITY_ORDER.map((priority) => (
              <SelectItem key={priority} value={priority} className="text-xs">
                {PRIORITY_LABELS[priority]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Location Type Dropdown */}
        <Select
          value={effectiveParams.locationType}
          onValueChange={(val) =>
            handleFilterUpdate({ locationType: val as LocationType | "ALL" })
          }
        >
          <SelectTrigger className="h-8 text-xs w-[125px]" aria-label="Filter by location type">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">
              All Locations
            </SelectItem>
            {LOCATION_TYPE_ORDER.map((loc) => (
              <SelectItem key={loc} value={loc} className="text-xs">
                {LOCATION_TYPE_LABELS[loc]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Source Dropdown */}
        <Select
          value={effectiveParams.source}
          onValueChange={(val) =>
            handleFilterUpdate({ source: val as ApplicationSource | "ALL" })
          }
        >
          <SelectTrigger className="h-8 text-xs w-[120px]" aria-label="Filter by application source">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">
              All Sources
            </SelectItem>
            {APPLICATION_SOURCE_ORDER.map((src) => (
              <SelectItem key={src} value={src} className="text-xs">
                {APPLICATION_SOURCE_LABELS[src]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Resume Version Dropdown */}
        <Select
          value={effectiveParams.resumeVersionId}
          onValueChange={(val) => handleFilterUpdate({ resumeVersionId: val })}
        >
          <SelectTrigger className="h-8 text-xs w-[130px]" aria-label="Filter by resume version">
            <SelectValue placeholder="All Resumes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">
              All Resumes
            </SelectItem>
            {resumeVersions.map((rv) => (
              <SelectItem key={rv.id} value={rv.id} className="text-xs">
                {rv.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range Inputs */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">From:</span>
            <Input
              type="date"
              value={effectiveParams.from}
              onChange={(e) => handleFilterUpdate({ from: e.target.value })}
              className="h-8 w-[125px] text-xs px-2"
              title="Applied from date"
              aria-label="Applied from date"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">To:</span>
            <Input
              type="date"
              value={effectiveParams.to}
              onChange={(e) => handleFilterUpdate({ to: e.target.value })}
              className="h-8 w-[125px] text-xs px-2"
              title="Applied to date"
              aria-label="Applied to date"
            />
          </div>
        </div>

        {/* Active Filter Count Badge & Reset Button */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 ml-auto">
            <Badge variant="secondary" className="h-7 px-2 text-xs font-semibold gap-1">
              <Filter className="h-3 w-3" />
              <span>{activeFilterCount} active</span>
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <FilterX className="h-3.5 w-3.5 mr-1" />
              Reset filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
