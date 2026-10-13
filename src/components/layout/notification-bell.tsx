"use client";

import * as React from "react";
import {
  Bell,
  CalendarCheck,
  AlertCircle,
  Clock,
  Check,
  CalendarPlus,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useApplicationsQuery } from "@/hooks/use-applications";
import { useDrawerUrl } from "@/hooks/use-drawer-url";
import {
  isFollowUpOverdue,
  isInterviewWithinNext48Hours,
  formatDateInTimezone,
  formatDateTimeInTimezone,
} from "@/lib/dates/timezone";
import {
  markFollowedUpAction,
  type ApplicationWithRelations,
} from "@/server/actions/application.actions";
import {
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_TYPE_COLORS,
  type InterviewType,
  type InterviewOutcome,
} from "@/schemas/enums";
import { cn } from "@/lib/utils";

export interface NotificationBellProps {
  userTimezone?: string | null;
  initialApplications?: ApplicationWithRelations[];
}

interface InterviewSummaryItem {
  id: string;
  round: number;
  type: InterviewType;
  scheduledAt: Date | string;
  outcome: InterviewOutcome;
  durationMinutes: number;
}

export function NotificationBell({
  userTimezone,
  initialApplications,
}: NotificationBellProps) {
  const queryClient = useQueryClient();
  const { openDrawer } = useDrawerUrl();
  const [open, setOpen] = React.useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(
    null
  );

  const { data: applications = [] } = useApplicationsQuery(
    { includeArchived: false },
    initialApplications
  );

  const overdueApplications = React.useMemo(() => {
    return applications.filter((app) =>
      isFollowUpOverdue({
        followUpDate: app.followUpDate,
        status: app.status,
        archivedAt: app.archivedAt,
        deletedAt: app.deletedAt,
        timezone: userTimezone,
      })
    );
  }, [applications, userTimezone]);

  const upcomingInterviews48h = React.useMemo(() => {
    const list: Array<{
      interview: InterviewSummaryItem;
      application: { id: string; company: string; role: string };
    }> = [];

    for (const app of applications) {
      if (app.archivedAt || app.deletedAt) continue;
      for (const interview of app.interviews || []) {
        if (
          isInterviewWithinNext48Hours({
            scheduledAt: interview.scheduledAt,
            outcome: interview.outcome,
          })
        ) {
          list.push({
            interview: {
              id: interview.id,
              round: interview.round,
              type: interview.type,
              scheduledAt: interview.scheduledAt,
              outcome: interview.outcome,
              durationMinutes: interview.durationMinutes,
            },
            application: { id: app.id, company: app.company, role: app.role },
          });
        }
      }
    }

    list.sort(
      (a, b) =>
        new Date(a.interview.scheduledAt).getTime() -
        new Date(b.interview.scheduledAt).getTime()
    );

    return list;
  }, [applications]);

  const totalCount = overdueApplications.length + upcomingInterviews48h.length;

  const handleMarkFollowedUp = async (applicationId: string) => {
    setActionLoadingId(`clear-${applicationId}`);
    try {
      const res = await markFollowedUpAction(applicationId, "clear");
      if (res.ok) {
        toast.success("Follow-up marked as completed");
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
      setActionLoadingId(null);
    }
  };

  const handleSnooze = async (applicationId: string) => {
    setActionLoadingId(`snooze-${applicationId}`);
    try {
      const res = await markFollowedUpAction(applicationId, "in_3_days");
      if (res.ok) {
        toast.success("Follow-up snoozed +3 days");
        void queryClient.invalidateQueries({ queryKey: ["applications"] });
        void queryClient.invalidateQueries({
          queryKey: ["application", applicationId],
        });
      } else {
        toast.error(res.error || "Failed to snooze follow-up");
      }
    } catch {
      toast.error("Failed to snooze follow-up");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenApp = (applicationId: string) => {
    setOpen(false);
    openDrawer(applicationId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label={
            totalCount > 0
              ? `${totalCount} alerts requiring attention`
              : "Notifications"
          }
        >
          <Bell className="h-4 w-4" />
          {totalCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-xs">
              {totalCount > 9 ? "9+" : totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[340px] sm:w-[380px] p-0 shadow-lg border border-border"
      >
        <div className="flex items-center justify-between p-3.5 pb-2.5">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-foreground">Notifications</h4>
            {totalCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {totalCount} new
              </Badge>
            )}
          </div>
          {userTimezone && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {userTimezone}
            </span>
          )}
        </div>

        <Separator />

        <ScrollArea className="max-h-[380px]">
          {totalCount === 0 ? (
            <div className="p-6 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold text-foreground">
                All caught up!
              </p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                No overdue follow-ups or upcoming interviews in the next 48 hours.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Overdue Follow-ups Section */}
              {overdueApplications.length > 0 && (
                <div className="p-3 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Overdue Follow-ups ({overdueApplications.length})</span>
                  </div>

                  <div className="space-y-2">
                    {overdueApplications.map((app) => {
                      const dueFormatted = app.followUpDate
                        ? formatDateInTimezone(app.followUpDate, userTimezone)
                        : "Past due";

                      return (
                        <div
                          key={app.id}
                          className="rounded-lg border border-rose-200/80 bg-rose-50/50 dark:border-rose-900/60 dark:bg-rose-950/20 p-2.5 space-y-2"
                        >
                          <div
                            onClick={() => handleOpenApp(app.id)}
                            className="cursor-pointer group flex items-start justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                {app.company}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {app.role}
                              </p>
                            </div>
                            <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400 whitespace-nowrap shrink-0">
                              Due: {dueFormatted}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 pt-0.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void handleMarkFollowedUp(app.id)}
                              disabled={actionLoadingId === `clear-${app.id}`}
                              className="h-6 px-2 text-[10px] gap-1 text-foreground"
                            >
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span>Mark followed up</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void handleSnooze(app.id)}
                              disabled={actionLoadingId === `snooze-${app.id}`}
                              className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                            >
                              <CalendarPlus className="h-3 w-3" />
                              <span>Snooze +3d</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upcoming Interviews in 48h Section */}
              {upcomingInterviews48h.length > 0 && (
                <div className="p-3 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <CalendarCheck className="h-3.5 w-3.5" />
                    <span>Interviews in Next 48h ({upcomingInterviews48h.length})</span>
                  </div>

                  <div className="space-y-2">
                    {upcomingInterviews48h.map((item) => {
                      const timeStr = formatDateTimeInTimezone(
                        item.interview.scheduledAt,
                        userTimezone
                      );

                      return (
                        <div
                          key={item.interview.id}
                          onClick={() => handleOpenApp(item.application.id)}
                          className="rounded-lg border border-border bg-card p-2.5 hover:border-primary/50 cursor-pointer transition-colors space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {item.application.company}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {item.application.role}
                              </p>
                            </div>

                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] px-1.5 py-0 border font-semibold shrink-0",
                                INTERVIEW_TYPE_COLORS[item.interview.type]
                              )}
                            >
                              Round {item.interview.round}:{" "}
                              {INTERVIEW_TYPE_LABELS[item.interview.type]}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                            <Clock className="h-3 w-3 text-primary shrink-0" />
                            <span className="truncate">{timeStr}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
