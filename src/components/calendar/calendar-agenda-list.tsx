"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  CalendarCheck,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, getCompanyAvatarColor, getCompanyInitials } from "@/lib/utils";
import {
  formatDateInTimezone,
  formatDateTimeInTimezone,
} from "@/lib/dates/timezone";
import { markFollowedUpAction } from "@/server/actions/application.actions";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_TYPE_COLORS,
  INTERVIEW_OUTCOME_LABELS,
  INTERVIEW_OUTCOME_COLORS,
} from "@/schemas/enums";
import type { AgendaDayGroup } from "@/lib/calendar/calendar-events";

export interface CalendarAgendaListProps {
  dayGroups: AgendaDayGroup[];
  userTimezone?: string | null;
  onSelectApplication: (applicationId: string) => void;
  className?: string;
}

export function CalendarAgendaList({
  dayGroups,
  userTimezone,
  onSelectApplication,
  className,
}: CalendarAgendaListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loadingActionId, setLoadingActionId] = React.useState<string | null>(
    null
  );

  const handleMarkFollowedUp = async (
    applicationId: string,
    action: "clear" | "in_3_days"
  ) => {
    const actionKey = `${applicationId}-${action}`;
    setLoadingActionId(actionKey);

    try {
      const res = await markFollowedUpAction(applicationId, action);
      if (res.ok) {
        toast.success(
          action === "clear"
            ? "Follow-up marked as completed"
            : "Follow-up snoozed +3 days"
        );
        router.refresh();
        void queryClient.invalidateQueries({ queryKey: ["applications"] });
        void queryClient.invalidateQueries({
          queryKey: ["application", applicationId],
        });
      } else {
        toast.error(res.error || "Failed to update follow-up");
      }
    } catch {
      toast.error("Failed to update follow-up");
    } finally {
      setLoadingActionId(null);
    }
  };

  if (dayGroups.length === 0) {
    return (
      <Card className={cn("border-dashed border-2 py-12 text-center", className)}>
        <CardContent className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <CalendarDays className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            No events scheduled
          </h3>
          <p className="mx-auto max-w-sm text-xs text-muted-foreground">
            No interviews or follow-up deadlines recorded for this period
            matching your current view filter.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {dayGroups.map((group) => {
        const headerLabel = formatDateInTimezone(group.date, userTimezone, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        return (
          <div key={group.dateKey} className="space-y-3">
            {/* Date Group Header */}
            <div className="flex items-center gap-2.5 px-0.5">
              <time
                dateTime={group.dateKey}
                className="text-xs font-bold tracking-tight text-foreground tabular-nums"
              >
                {headerLabel}
              </time>
              {group.isToday && (
                <Badge
                  variant="default"
                  className="h-5 px-2 text-[10px] font-semibold bg-primary text-primary-foreground"
                >
                  Today
                </Badge>
              )}
              <span className="text-xs text-muted-foreground tabular-nums">
                ({group.events.length}{" "}
                {group.events.length === 1 ? "event" : "events"})
              </span>
            </div>

            {/* List of event cards for this day */}
            <div className="space-y-2.5">
              {group.events.map((event) => {
                const avatarColor = getCompanyAvatarColor(event.company);
                const initials = getCompanyInitials(event.company);
                const statusColor =
                  APPLICATION_STATUS_COLORS[event.applicationStatus] ||
                  "bg-muted text-muted-foreground";
                const statusLabel =
                  APPLICATION_STATUS_LABELS[event.applicationStatus] ||
                  event.applicationStatus;

                if (event.kind === "interview") {
                  const formattedDateTime = formatDateTimeInTimezone(
                    event.timestamp,
                    userTimezone
                  );
                  const typeLabel =
                    event.interviewType &&
                    INTERVIEW_TYPE_LABELS[event.interviewType]
                      ? INTERVIEW_TYPE_LABELS[event.interviewType]
                      : "HR";
                  const typeColor =
                    event.interviewType &&
                    INTERVIEW_TYPE_COLORS[event.interviewType]
                      ? INTERVIEW_TYPE_COLORS[event.interviewType]
                      : "bg-indigo-50 text-indigo-700 border-indigo-200";
                  const outcomeLabel =
                    event.outcome && INTERVIEW_OUTCOME_LABELS[event.outcome]
                      ? INTERVIEW_OUTCOME_LABELS[event.outcome]
                      : "Pending";
                  const outcomeColor =
                    event.outcome && INTERVIEW_OUTCOME_COLORS[event.outcome]
                      ? INTERVIEW_OUTCOME_COLORS[event.outcome]
                      : "bg-amber-50 text-amber-700 border-amber-200";

                  return (
                    <Card
                      key={event.id}
                      className="border-border bg-card p-4 transition-all hover:border-border/80 hover:shadow-xs"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {/* Company info and role */}
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold shadow-xs",
                              avatarColor
                            )}
                          >
                            {initials}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">
                                {event.company}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn("text-[10px] h-5 px-1.5 font-medium border", statusColor)}
                              >
                                {statusLabel}
                              </Badge>
                              {event.isWithin48h && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-5 px-1.5 font-medium border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                >
                                  Within 48h
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {event.role}
                            </p>
                          </div>
                        </div>

                        {/* Interview badges and action */}
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <Badge
                            variant="secondary"
                            className="text-[11px] h-6 font-medium tabular-nums"
                          >
                            Round {event.round ?? 1}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn("text-[11px] h-6 font-medium border", typeColor)}
                          >
                            {typeLabel}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn("text-[11px] h-6 font-medium border", outcomeColor)}
                          >
                            {outcomeLabel}
                          </Badge>
                        </div>
                      </div>

                      {/* Time and Duration Footer */}
                      <div className="mt-3 flex flex-col gap-2 pt-3 border-t border-border/60 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <time
                            dateTime={event.timestamp}
                            className="flex items-center gap-1.5 font-medium text-foreground tabular-nums"
                          >
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            {formattedDateTime}
                          </time>
                          <span className="flex items-center gap-1 tabular-nums">
                            <Clock className="h-3.5 w-3.5" />
                            {event.durationMinutes ?? 45} mins
                          </span>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectApplication(event.applicationId)}
                          className="h-8 text-xs font-medium self-end sm:self-auto gap-1"
                        >
                          View Application
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </Card>
                  );
                }

                // Follow-up event card
                const isOverdue = Boolean(event.isOverdue);
                const isClearLoading =
                  loadingActionId === `${event.applicationId}-clear`;
                const isSnoozeLoading =
                  loadingActionId === `${event.applicationId}-in_3_days`;

                return (
                  <Card
                    key={event.id}
                    className={cn(
                      "p-4 transition-all hover:shadow-xs border",
                      isOverdue
                        ? "border-rose-200 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/10"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      {/* Company info and role */}
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold shadow-xs",
                            avatarColor
                          )}
                        >
                          {initials}
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">
                              {event.company}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] h-5 px-1.5 font-medium border", statusColor)}
                            >
                              {statusLabel}
                            </Badge>
                            {isOverdue ? (
                              <Badge
                                variant="destructive"
                                className="text-[10px] h-5 px-1.5 font-medium flex items-center gap-1"
                              >
                                <AlertCircle className="h-3 w-3" />
                                Overdue Follow-up
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5 px-1.5 font-medium border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 flex items-center gap-1"
                              >
                                <Clock className="h-3 w-3" />
                                Follow-up Due
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {event.role}
                          </p>
                        </div>
                      </div>

                      {/* Quick action buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isClearLoading || isSnoozeLoading}
                          onClick={() =>
                            handleMarkFollowedUp(event.applicationId, "clear")
                          }
                          className="h-8 text-xs font-medium gap-1"
                        >
                          {isClearLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          )}
                          Mark followed up
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isClearLoading || isSnoozeLoading}
                          onClick={() =>
                            handleMarkFollowedUp(event.applicationId, "in_3_days")
                          }
                          className="h-8 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
                        >
                          {isSnoozeLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CalendarCheck className="h-3 w-3" />
                          )}
                          Snooze +3d
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => onSelectApplication(event.applicationId)}
                          className="h-8 text-xs font-medium gap-1"
                        >
                          View Application
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
