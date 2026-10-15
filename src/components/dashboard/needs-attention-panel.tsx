"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarCheck2,
  Clock,
  CheckCircle2,
  Archive,
  ArrowUpRight,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDrawerUrl } from "@/hooks/use-drawer-url";
import {
  formatDateInTimezone,
  formatDateTimeInTimezone,
} from "@/lib/dates/timezone";
import {
  markFollowedUpAction,
  toggleArchiveApplicationAction,
} from "@/server/actions/application.actions";
import {
  APPLICATION_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
} from "@/schemas/enums";
import type { NeedsAttentionSummary } from "@/lib/analytics/calculations";

export interface NeedsAttentionPanelProps {
  needsAttention: NeedsAttentionSummary;
  userTimezone?: string | null;
}

export function NeedsAttentionPanel({
  needsAttention,
  userTimezone,
}: NeedsAttentionPanelProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { openDrawer } = useDrawerUrl();
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  const { overdueFollowUps, upcomingInterviews48h, staleApplications, totalCount } =
    needsAttention;

  const handleMarkFollowedUp = async (appId: string) => {
    setLoadingId(`followup-${appId}`);
    try {
      const result = await markFollowedUpAction(appId, "clear");
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Follow-up marked as completed");
      await queryClient.invalidateQueries({ queryKey: ["applications"] });
      router.refresh();
    } catch {
      toast.error("Failed to mark follow-up");
    } finally {
      setLoadingId(null);
    }
  };

  const handleSnooze = async (appId: string) => {
    setLoadingId(`snooze-${appId}`);
    try {
      const result = await markFollowedUpAction(appId, "in_3_days");
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Follow-up snoozed for 3 days");
      await queryClient.invalidateQueries({ queryKey: ["applications"] });
      router.refresh();
    } catch {
      toast.error("Failed to snooze follow-up");
    } finally {
      setLoadingId(null);
    }
  };

  const handleArchive = async (appId: string) => {
    setLoadingId(`archive-${appId}`);
    try {
      const result = await toggleArchiveApplicationAction(appId, true);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Application archived");
      await queryClient.invalidateQueries({ queryKey: ["applications"] });
      router.refresh();
    } catch {
      toast.error("Failed to archive application");
    } finally {
      setLoadingId(null);
    }
  };

  if (totalCount === 0) {
    return (
      <Card className="border-border bg-muted/20 shadow-xs">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              All caught up!
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              No overdue follow-ups, pending interviews within 48 hours, or stale applications.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine the default active tab based on which section has items
  const defaultTab =
    overdueFollowUps.length > 0
      ? "overdue"
      : upcomingInterviews48h.length > 0
      ? "interviews"
      : "stale";

  return (
    <Card className="border-amber-500/30 bg-amber-500/[0.02] shadow-xs">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <CardTitle className="text-sm font-semibold">
              Needs Attention
            </CardTitle>
            <Badge
              variant="outline"
              className="text-[11px] tabular-nums border-amber-500/40 text-amber-700 dark:text-amber-300"
            >
              {totalCount} {totalCount === 1 ? "item" : "items"}
            </Badge>
          </div>
          <CardDescription className="text-xs hidden sm:block">
            Urgent actions to keep your search pipeline moving
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid grid-cols-3 h-8 p-0.5 bg-muted/60">
            <TabsTrigger
              value="overdue"
              className="text-xs px-2 py-1 data-[state=active]:bg-background"
            >
              <span>Overdue</span>
              <span className="ml-1.5 tabular-nums text-[10px] font-semibold opacity-75">
                ({overdueFollowUps.length})
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="interviews"
              className="text-xs px-2 py-1 data-[state=active]:bg-background"
            >
              <span>Upcoming</span>
              <span className="ml-1.5 tabular-nums text-[10px] font-semibold opacity-75">
                ({upcomingInterviews48h.length})
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="stale"
              className="text-xs px-2 py-1 data-[state=active]:bg-background"
            >
              <span>Stale</span>
              <span className="ml-1.5 tabular-nums text-[10px] font-semibold opacity-75">
                ({staleApplications.length})
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Overdue Follow-ups */}
          <TabsContent value="overdue" className="mt-3 space-y-2">
            {overdueFollowUps.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">
                No overdue follow-ups.
              </p>
            ) : (
              overdueFollowUps.map((app) => {
                const dateStr = app.followUpDate
                  ? formatDateInTimezone(app.followUpDate, userTimezone)
                  : "";
                const isActionLoading =
                  loadingId === `followup-${app.id}` ||
                  loadingId === `snooze-${app.id}`;

                return (
                  <div
                    key={app.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-md border border-border bg-background/80"
                  >
                    <button
                      type="button"
                      onClick={() => openDrawer(app.id)}
                      className="text-left flex-1 min-w-0 group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {app.company}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {app.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-destructive">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>Due: {dateStr}</span>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2 gap-1"
                        onClick={() => handleMarkFollowedUp(app.id)}
                        disabled={isActionLoading}
                      >
                        {loadingId === `followup-${app.id}` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3 text-emerald-600" />
                        )}
                        <span>Followed up</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => handleSnooze(app.id)}
                        disabled={isActionLoading}
                      >
                        {loadingId === `snooze-${app.id}` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        <span>+3d</span>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* Upcoming Interviews in Next 48h */}
          <TabsContent value="interviews" className="mt-3 space-y-2">
            {upcomingInterviews48h.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">
                No upcoming interviews within the next 48 hours.
              </p>
            ) : (
              upcomingInterviews48h.map(({ interview, application: app }) => {
                const dateStr = formatDateTimeInTimezone(
                  interview.scheduledAt,
                  userTimezone
                );

                return (
                  <div
                    key={interview.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-md border border-border bg-background/80"
                  >
                    <button
                      type="button"
                      onClick={() => openDrawer(app.id)}
                      className="text-left flex-1 min-w-0 group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {app.company}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {app.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <CalendarCheck2 className="h-3 w-3 text-primary shrink-0" />
                        <span className="text-primary font-medium">{dateStr}</span>
                        <span>•</span>
                        <span>
                          Round {interview.round}:{" "}
                          {INTERVIEW_TYPE_LABELS[interview.type] ?? interview.type}
                        </span>
                      </div>
                    </button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2.5 gap-1 self-end sm:self-auto shrink-0"
                      onClick={() => openDrawer(app.id)}
                    >
                      <span>Prep</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* Stale Applications */}
          <TabsContent value="stale" className="mt-3 space-y-2">
            {staleApplications.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">
                No stale applications.
              </p>
            ) : (
              staleApplications.map((app) => {
                const daysInactive = Math.floor(
                  (Date.now() - new Date(app.updatedAt).getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                const isArchiving = loadingId === `archive-${app.id}`;

                return (
                  <div
                    key={app.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-md border border-border bg-background/80"
                  >
                    <button
                      type="button"
                      onClick={() => openDrawer(app.id)}
                      className="text-left flex-1 min-w-0 group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {app.company}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {app.role}
                        </span>
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          {APPLICATION_STATUS_LABELS[app.status] ?? app.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <span className="tabular-nums font-medium text-amber-600 dark:text-amber-400">
                          {daysInactive} days
                        </span>
                        <span>without activity</span>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2 gap-1"
                        onClick={() => handleArchive(app.id)}
                        disabled={isArchiving}
                      >
                        {isArchiving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Archive className="h-3 w-3" />
                        )}
                        <span>Archive</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2 gap-1"
                        onClick={() => openDrawer(app.id)}
                      >
                        <span>Open</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
