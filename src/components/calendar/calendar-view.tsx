"use client";

import * as React from "react";
import { addMonths, format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarCheck,
  Clock,
  AlertCircle,
  Plus,
  LayoutGrid,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InterviewFormDialog } from "@/components/interviews/interview-form-dialog";
import { CalendarMonthGrid } from "@/components/calendar/calendar-month-grid";
import { CalendarAgendaList } from "@/components/calendar/calendar-agenda-list";
import { useDrawerUrl } from "@/hooks/use-drawer-url";
import { useApplicationsQuery } from "@/hooks/use-applications";
import { getAllInterviewsAction } from "@/server/actions/interview.actions";
import type { ApplicationWithRelations } from "@/server/actions/application.actions";
import type { InterviewWithApplication } from "@/server/actions/interview.actions";
import {
  buildCalendarEvents,
  buildMonthGridDays,
  groupEventsForAgenda,
  type CalendarEventType,
} from "@/lib/calendar/calendar-events";
import { cn } from "@/lib/utils";

export interface CalendarViewProps {
  initialApplications: ApplicationWithRelations[];
  initialInterviews: InterviewWithApplication[];
  userTimezone?: string | null;
}

export function CalendarView({
  initialApplications,
  initialInterviews,
  userTimezone,
}: CalendarViewProps) {
  const { openDrawer } = useDrawerUrl();

  const [currentDate, setCurrentDate] = React.useState<Date>(() => new Date());
  const [filterKind, setFilterKind] = React.useState<"ALL" | CalendarEventType>("ALL");
  const [desktopViewMode, setDesktopViewMode] = React.useState<"grid" | "agenda">("grid");
  const [isInterviewDialogOpen, setIsInterviewDialogOpen] = React.useState<boolean>(false);

  // TanStack queries with server-provided initial data for real-time reactivity
  const { data: applications = initialApplications } = useApplicationsQuery(
    { includeArchived: false },
    initialApplications
  );

  const { data: interviews = initialInterviews } = useQuery({
    queryKey: ["interviews"],
    queryFn: () => getAllInterviewsAction(),
    initialData: initialInterviews,
  });

  const applicationOptions = React.useMemo(() => {
    return applications
      .filter((app) => !app.deletedAt)
      .map((app) => ({
        id: app.id,
        company: app.company,
        role: app.role,
      }));
  }, [applications]);

  // Master events list
  const allEvents = React.useMemo(() => {
    return buildCalendarEvents({
      applications,
      interviews,
      timezone: userTimezone,
    });
  }, [applications, interviews, userTimezone]);

  // Events filtered by user-selected filterKind ("ALL" | "interview" | "followup")
  const displayEvents = React.useMemo(() => {
    if (filterKind === "ALL") return allEvents;
    return allEvents.filter((e) => e.kind === filterKind);
  }, [allEvents, filterKind]);

  // Month-scoped events for metrics (unfiltered by event type to reflect overall health)
  const monthPrefix = format(currentDate, "yyyy-MM");
  const monthEvents = React.useMemo(() => {
    return allEvents.filter((event) => event.dateKey.startsWith(monthPrefix));
  }, [allEvents, monthPrefix]);

  const monthInterviewsCount = React.useMemo(() => {
    return monthEvents.filter((e) => e.kind === "interview").length;
  }, [monthEvents]);

  const monthFollowUpsCount = React.useMemo(() => {
    return monthEvents.filter((e) => e.kind === "followup").length;
  }, [monthEvents]);

  const monthOverdueCount = React.useMemo(() => {
    return monthEvents.filter((e) => e.kind === "followup" && e.isOverdue).length;
  }, [monthEvents]);

  // Computed month grid and agenda groupings
  const gridDays = React.useMemo(() => {
    return buildMonthGridDays({
      referenceDate: currentDate,
      events: displayEvents,
      timezone: userTimezone,
    });
  }, [currentDate, displayEvents, userTimezone]);

  const agendaGroups = React.useMemo(() => {
    return groupEventsForAgenda({
      referenceDate: currentDate,
      events: displayEvents,
      filterKind: "ALL",
      timezone: userTimezone,
    });
  }, [currentDate, displayEvents, userTimezone]);

  const handlePrevMonth = () => {
    setCurrentDate((prev) => addMonths(prev, -1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => addMonths(prev, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const formattedMonthHeading = format(currentDate, "MMMM yyyy");

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Calendar
            </h1>
            {userTimezone && (
              <span className="hidden sm:inline-flex text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                {userTimezone}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track interview rounds and follow-up deadlines across your pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setIsInterviewDialogOpen(true)}
            className="gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Log Interview
          </Button>
        </div>
      </div>

      {/* Summary Metrics Bar for Selected Month */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border bg-card p-3 shadow-2xs">
          <CardContent className="p-0 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Total Events
              </span>
              <div className="text-xl font-bold text-foreground tabular-nums">
                {monthEvents.length}
              </div>
            </div>
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card p-3 shadow-2xs">
          <CardContent className="p-0 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Interviews
              </span>
              <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                {monthInterviewsCount}
              </div>
            </div>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card p-3 shadow-2xs">
          <CardContent className="p-0 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Follow-ups
              </span>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {monthFollowUpsCount}
              </div>
            </div>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "p-3 shadow-2xs border transition-colors",
            monthOverdueCount > 0
              ? "border-rose-300 bg-rose-50/40 dark:border-rose-900/60 dark:bg-rose-950/20"
              : "border-border bg-card"
          )}
        >
          <CardContent className="p-0 flex items-center justify-between">
            <div className="space-y-0.5">
              <span
                className={cn(
                  "text-[11px] font-medium uppercase tracking-wider",
                  monthOverdueCount > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-muted-foreground"
                )}
              >
                Overdue Follow-ups
              </span>
              <div
                className={cn(
                  "text-xl font-bold tabular-nums",
                  monthOverdueCount > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-foreground"
                )}
              >
                {monthOverdueCount}
              </div>
            </div>
            <div
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                monthOverdueCount > 0
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <AlertCircle className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Month Navigation & Controls Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
        {/* Navigation buttons + Heading */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-background p-0.5 shadow-2xs">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="h-8 px-2.5 text-xs font-semibold"
            >
              Today
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-foreground pl-1">
            {formattedMonthHeading}
          </h2>
        </div>

        {/* Filters and View mode toggles */}
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {/* Event Kind Filter */}
          <Tabs
            value={filterKind}
            onValueChange={(val) =>
              setFilterKind(val as "ALL" | CalendarEventType)
            }
          >
            <TabsList className="h-8 bg-muted/60 p-0.5">
              <TabsTrigger value="ALL" className="text-xs px-2.5 py-1">
                All Events
              </TabsTrigger>
              <TabsTrigger value="interview" className="text-xs px-2.5 py-1">
                Interviews
              </TabsTrigger>
              <TabsTrigger value="followup" className="text-xs px-2.5 py-1">
                Follow-ups
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* View Mode Toggle (Desktop only: Month Grid vs Agenda List) */}
          <Tabs
            value={desktopViewMode}
            onValueChange={(val) =>
              setDesktopViewMode(val as "grid" | "agenda")
            }
            className="hidden md:inline-flex"
          >
            <TabsList className="h-8 bg-muted/60 p-0.5">
              <TabsTrigger value="grid" className="text-xs px-2.5 py-1 gap-1">
                <LayoutGrid className="h-3.5 w-3.5" />
                Month Grid
              </TabsTrigger>
              <TabsTrigger value="agenda" className="text-xs px-2.5 py-1 gap-1">
                <List className="h-3.5 w-3.5" />
                Agenda List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Calendar Viewport */}
      {desktopViewMode === "agenda" ? (
        <CalendarAgendaList
          dayGroups={agendaGroups}
          userTimezone={userTimezone}
          onSelectApplication={openDrawer}
        />
      ) : (
        <div>
          {/* Responsive Month Grid on >= 768px */}
          <div className="hidden md:block">
            <CalendarMonthGrid
              days={gridDays}
              userTimezone={userTimezone}
              onSelectApplication={openDrawer}
            />
          </div>

          {/* Responsive Agenda List on < 768px */}
          <div className="md:hidden">
            <CalendarAgendaList
              dayGroups={agendaGroups}
              userTimezone={userTimezone}
              onSelectApplication={openDrawer}
            />
          </div>
        </div>
      )}

      {/* Interview Form Dialog */}
      <InterviewFormDialog
        open={isInterviewDialogOpen}
        onOpenChange={setIsInterviewDialogOpen}
        applicationsList={applicationOptions}
      />
    </div>
  );
}
