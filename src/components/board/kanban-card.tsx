"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  DollarSign,
  MapPin,
  Clock,
  FileText,
  AlertCircle,
  CalendarCheck2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatSalaryRange,
  getCompanyAvatarColor,
  getCompanyInitials,
  cn,
} from "@/lib/utils";
import { isFollowUpOverdue } from "@/lib/dates/timezone";
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  LOCATION_TYPE_COLORS,
  LOCATION_TYPE_LABELS,
  type ApplicationStatus,
  type Priority,
  type LocationType,
} from "@/schemas/enums";

export interface KanbanCardData {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  priority: Priority;
  locationType: LocationType;
  location?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  appliedDate: Date | string;
  followUpDate?: Date | string | null;
  position: number;
  resumeVersion?: {
    id: string;
    name: string;
  } | null;
  interviews?: Array<{
    id: string;
    round: number;
    type: string;
    scheduledAt: Date | string;
    outcome: string;
  }>;
}

interface KanbanCardProps {
  app: KanbanCardData;
  onSelect?: (id: string) => void;
  isOverlay?: boolean;
  userTimezone?: string | null;
}

function formatDaysSinceApplied(dateInput: Date | string): string {
  try {
    const date = new Date(dateInput);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Applied today";
    if (diffDays === 1) return "Applied 1d ago";
    return `Applied ${diffDays}d ago`;
  } catch {
    return "Applied";
  }
}

export function KanbanCard({
  app,
  onSelect,
  isOverlay = false,
  userTimezone,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: app.id,
    data: {
      type: "card",
      app,
    },
    disabled: isOverlay,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const avatarColor = getCompanyAvatarColor(app.company);
  const initials = getCompanyInitials(app.company);
  const salaryFormatted = formatSalaryRange(
    app.salaryMin,
    app.salaryMax,
    app.currency || "USD"
  );
  const daysAgo = formatDaysSinceApplied(app.appliedDate);

  const isOverdue = isFollowUpOverdue({
    followUpDate: app.followUpDate,
    status: app.status,
    timezone: userTimezone,
  });

  const nextInterview = app.interviews?.find((i) => i.outcome === "PENDING");

  const handleClick = () => {
    // Prevent drawer trigger if dragging or clicking drag handle
    if (isDragging) return;
    onSelect?.(app.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative touch-none outline-hidden",
        isOverlay && "cursor-grabbing shadow-xl scale-[1.02] rotate-1"
      )}
    >
      <Card
        onClick={handleClick}
        className={cn(
          "border-border bg-card shadow-2xs hover:shadow-md hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden",
          isDragging && "border-dashed border-primary/60 bg-muted/20"
        )}
      >
        <CardContent className="p-3.5 space-y-2.5">
          {/* Top row: Avatar, Company/Role, Drag handle & Priority */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-bold text-xs shadow-2xs",
                  avatarColor
                )}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-xs leading-tight text-foreground truncate">
                  {app.company}
                </h4>
                <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                  {app.role}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Priority Badge */}
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] px-1.5 py-0 uppercase font-semibold border",
                  PRIORITY_COLORS[app.priority]
                )}
              >
                {PRIORITY_LABELS[app.priority]}
              </Badge>

              {/* Drag Handle button */}
              <button
                type="button"
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
                className="cursor-grab active:cursor-grabbing p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                aria-label={`Drag ${app.company} ${app.role} card`}
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Overdue alert badge if follow-up date has passed */}
          {isOverdue && (
            <div className="flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              <AlertCircle className="h-3 w-3 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>Overdue Follow-up</span>
            </div>
          )}

          {/* Salary Range */}
          {salaryFormatted && (
            <div className="flex items-center gap-1 text-[11px] font-medium text-foreground">
              <DollarSign className="h-3 w-3 text-primary shrink-0" />
              <span className="truncate">{salaryFormatted}</span>
            </div>
          )}

          {/* Location & Type Badges */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] px-1.5 py-0 border font-medium",
                LOCATION_TYPE_COLORS[app.locationType]
              )}
            >
              {LOCATION_TYPE_LABELS[app.locationType]}
            </Badge>

            {app.location && (
              <span className="inline-flex items-center gap-0.5 text-muted-foreground truncate max-w-[130px]">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{app.location}</span>
              </span>
            )}
          </div>

          {/* Upcoming Interview indicator */}
          {nextInterview && (
            <div className="rounded bg-primary/10 px-2 py-1 text-[10px] text-primary font-medium flex items-center gap-1">
              <CalendarCheck2 className="h-3 w-3 shrink-0" />
              <span className="truncate">
                Round {nextInterview.round} ({nextInterview.type})
              </span>
            </div>
          )}

          {/* Footer: Resume Version chip & Days Since Applied */}
          <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {daysAgo}
            </span>

            {app.resumeVersion && (
              <span
                className="inline-flex items-center gap-1 truncate max-w-[110px] font-medium text-foreground bg-muted px-1.5 py-0.5 rounded text-[9px]"
                title={app.resumeVersion.name}
              >
                <FileText className="h-2.5 w-2.5 shrink-0 text-primary" />
                <span className="truncate">{app.resumeVersion.name}</span>
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
