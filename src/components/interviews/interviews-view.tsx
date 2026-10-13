"use client";

import * as React from "react";
import {
  CalendarCheck,
  Calendar,
  Clock,
  Search,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  FilterX,
  FileText,
  Info,
  Loader2,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDrawerUrl } from "@/hooks/use-drawer-url";
import {
  InterviewFormDialog,
  type InterviewFormData,
} from "./interview-form-dialog";
import {
  deleteInterviewAction,
  type InterviewWithApplication,
} from "@/server/actions/interview.actions";
import type { ApplicationWithRelations } from "@/server/actions/application.actions";
import {
  INTERVIEW_TYPE_ORDER,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_TYPE_COLORS,
  INTERVIEW_OUTCOME_ORDER,
  INTERVIEW_OUTCOME_LABELS,
  INTERVIEW_OUTCOME_COLORS,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
} from "@/schemas/enums";
import {
  formatDateInTimezone,
  formatDateTimeInTimezone,
  getCalendarDateStringInTimezone,
  isInterviewWithinNext48Hours,
} from "@/lib/dates/timezone";
import {
  getCompanyAvatarColor,
  getCompanyInitials,
  cn,
} from "@/lib/utils";

export interface InterviewsViewProps {
  initialInterviews: InterviewWithApplication[];
  applications: ApplicationWithRelations[];
  userTimezone?: string | null;
}

export function InterviewsView({
  initialInterviews,
  applications,
  userTimezone,
}: InterviewsViewProps) {
  const queryClient = useQueryClient();
  const { openDrawer } = useDrawerUrl();

  const [interviews, setInterviews] =
    React.useState<InterviewWithApplication[]>(initialInterviews);
  const [search, setSearch] = React.useState<string>("");
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");
  const [outcomeFilter, setOutcomeFilter] = React.useState<string>("ALL");
  const [activeTab, setActiveTab] = React.useState<"all" | "upcoming" | "past">(
    "all"
  );

  const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);
  const [selectedInterview, setSelectedInterview] =
    React.useState<InterviewFormData | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Sync if initialInterviews update
  React.useEffect(() => {
    setInterviews(initialInterviews);
  }, [initialInterviews]);

  const applicationOptions = React.useMemo(() => {
    return applications.map((a) => ({
      id: a.id,
      company: a.company,
      role: a.role,
    }));
  }, [applications]);

  // Summary counts
  const now = React.useMemo(() => new Date(), []);
  const nowMs = now.getTime();

  const upcomingCount = React.useMemo(() => {
    return interviews.filter(
      (i) =>
        new Date(i.scheduledAt).getTime() >= nowMs && i.outcome === "PENDING"
    ).length;
  }, [interviews, nowMs]);

  const next48hCount = React.useMemo(() => {
    return interviews.filter((i) =>
      isInterviewWithinNext48Hours({
        scheduledAt: i.scheduledAt,
        outcome: i.outcome,
        now,
      })
    ).length;
  }, [interviews, now]);

  const passedCount = React.useMemo(() => {
    return interviews.filter((i) => i.outcome === "PASSED").length;
  }, [interviews]);

  // Filtering
  const filteredInterviews = React.useMemo(() => {
    return interviews.filter((item) => {
      // Search
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const companyMatch = item.application.company
          .toLowerCase()
          .includes(query);
        const roleMatch = item.application.role.toLowerCase().includes(query);
        if (!companyMatch && !roleMatch) return false;
      }

      // Type filter
      if (typeFilter !== "ALL" && item.type !== typeFilter) {
        return false;
      }

      // Outcome filter
      if (outcomeFilter !== "ALL" && item.outcome !== outcomeFilter) {
        return false;
      }

      // Tab filter
      const itemTime = new Date(item.scheduledAt).getTime();
      if (activeTab === "upcoming") {
        return itemTime >= nowMs && item.outcome === "PENDING";
      }
      if (activeTab === "past") {
        return itemTime < nowMs || item.outcome !== "PENDING";
      }

      return true;
    });
  }, [interviews, search, typeFilter, outcomeFilter, activeTab, nowMs]);

  // Partition into upcoming and past
  const { upcomingList, pastList } = React.useMemo(() => {
    const upcoming: InterviewWithApplication[] = [];
    const past: InterviewWithApplication[] = [];

    for (const item of filteredInterviews) {
      const itemTime = new Date(item.scheduledAt).getTime();
      if (itemTime >= nowMs && item.outcome === "PENDING") {
        upcoming.push(item);
      } else {
        past.push(item);
      }
    }

    upcoming.sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
    past.sort(
      (a, b) =>
        new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    );

    return { upcomingList: upcoming, pastList: past };
  }, [filteredInterviews, nowMs]);

  // Group items by calendar date in user's timezone
  const groupInterviewsByDate = React.useCallback(
    (items: InterviewWithApplication[]) => {
      const map = new Map<
        string,
        {
          displayDate: string;
          items: InterviewWithApplication[];
        }
      >();

      for (const item of items) {
        const key = getCalendarDateStringInTimezone(
          item.scheduledAt,
          userTimezone
        );
        const existing = map.get(key);
        if (existing) {
          existing.items.push(item);
        } else {
          const displayDate = formatDateInTimezone(item.scheduledAt, userTimezone, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          map.set(key, { displayDate, items: [item] });
        }
      }

      return Array.from(map.entries());
    },
    [userTimezone]
  );

  const upcomingGroups = React.useMemo(
    () => groupInterviewsByDate(upcomingList),
    [upcomingList, groupInterviewsByDate]
  );
  const pastGroups = React.useMemo(
    () => groupInterviewsByDate(pastList),
    [pastList, groupInterviewsByDate]
  );

  const handleOpenAdd = () => {
    setSelectedInterview(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: InterviewWithApplication) => {
    setSelectedInterview({
      id: item.id,
      applicationId: item.applicationId,
      round: item.round,
      type: item.type,
      scheduledAt: item.scheduledAt,
      durationMinutes: item.durationMinutes,
      prepNotes: item.prepNotes,
      outcome: item.outcome,
      feedback: item.feedback,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (interviewId: string) => {
    setDeletingId(interviewId);
    try {
      const res = await deleteInterviewAction(interviewId);
      if (!res.ok) {
        toast.error(res.error || "Failed to delete interview");
        return;
      }

      toast.success("Interview deleted");
      setInterviews((prev) => prev.filter((i) => i.id !== interviewId));
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      void queryClient.invalidateQueries({ queryKey: ["interviews"] });
    } catch {
      toast.error("Failed to delete interview");
    } finally {
      setDeletingId(null);
    }
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    typeFilter !== "ALL" ||
    outcomeFilter !== "ALL" ||
    activeTab !== "all";

  const handleResetFilters = () => {
    setSearch("");
    setTypeFilter("ALL");
    setOutcomeFilter("ALL");
    setActiveTab("all");
  };

  const renderInterviewCard = (item: InterviewWithApplication) => {
    const initials = getCompanyInitials(item.application.company);
    const avatarColor = getCompanyAvatarColor(item.application.company);
    const timeFormatted = formatDateTimeInTimezone(
      item.scheduledAt,
      userTimezone
    );
    const isWithin48h = isInterviewWithinNext48Hours({
      scheduledAt: item.scheduledAt,
      outcome: item.outcome,
      now,
    });

    return (
      <Card
        key={item.id}
        className={cn(
          "border-border shadow-2xs hover:border-primary/50 transition-all",
          isWithin48h && "border-primary/40 bg-primary/[0.02]"
        )}
      >
        <CardContent className="p-4 space-y-3">
          {/* Top row: Avatar, Company & Role, Status, Round badge, Outcome badge */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold text-xs shadow-2xs",
                  avatarColor
                )}
              >
                {initials}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-foreground truncate">
                    {item.application.company}
                  </h4>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] px-1.5 py-0 uppercase font-semibold border",
                      APPLICATION_STATUS_COLORS[item.application.status]
                    )}
                  >
                    {APPLICATION_STATUS_LABELS[item.application.status]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {item.application.role}
                </p>
              </div>
            </div>

            {/* Badges: Type & Outcome */}
            <div className="flex items-center gap-1.5 flex-wrap sm:self-start">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-2 py-0.5 border font-semibold",
                  INTERVIEW_TYPE_COLORS[item.type]
                )}
              >
                Round {item.round}: {INTERVIEW_TYPE_LABELS[item.type]}
              </Badge>

              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-2 py-0.5 border font-semibold",
                  INTERVIEW_OUTCOME_COLORS[item.outcome]
                )}
              >
                {INTERVIEW_OUTCOME_LABELS[item.outcome]}
              </Badge>

              {isWithin48h && (
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0.5 shadow-none">
                  In 48h
                </Badge>
              )}
            </div>
          </div>

          {/* Time & Duration */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/60">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{timeFormatted}</span>
            </span>
            <span className="text-[11px] text-muted-foreground">
              ({item.durationMinutes} min)
            </span>
            {item.application.location && (
              <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                • {item.application.location}
              </span>
            )}
          </div>

          {/* Prep Notes Preview */}
          {item.prepNotes && (
            <div className="rounded-md bg-muted/40 p-2.5 text-xs text-foreground space-y-1">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span>Prep Notes</span>
              </div>
              <p className="text-xs whitespace-pre-wrap line-clamp-3 leading-relaxed">
                {item.prepNotes}
              </p>
            </div>
          )}

          {/* Feedback Preview */}
          {item.feedback && (
            <div className="rounded-md bg-muted/40 p-2.5 text-xs text-foreground space-y-1">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Info className="h-3 w-3" />
                <span>Post-Interview Feedback</span>
              </div>
              <p className="text-xs whitespace-pre-wrap line-clamp-3 leading-relaxed">
                {item.feedback}
              </p>
            </div>
          )}

          {/* Action Buttons Footer */}
          <div className="flex items-center justify-between pt-1 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDrawer(item.applicationId)}
              className="h-7 text-xs gap-1 font-medium text-foreground"
            >
              <span>Open Application</span>
              <ExternalLink className="h-3 w-3" />
            </Button>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenEdit(item)}
                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3 w-3" />
                <span>Edit</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleDelete(item.id)}
                disabled={deletingId === item.id}
                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                {deletingId === item.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                <span>Delete</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Interviews
            </h1>
            <Badge variant="secondary" className="font-semibold text-xs">
              {interviews.length} Total
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track interview rounds across your pipeline, upcoming dates, and post-interview feedback.
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleOpenAdd}
          className="h-9 gap-1.5 font-medium shadow-xs shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Log Interview</span>
        </Button>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card shadow-2xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Upcoming Rounds</p>
            <p className="text-xl font-bold text-foreground">{upcomingCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card shadow-2xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">In Next 48 Hours</p>
            <p className="text-xl font-bold text-foreground">{next48hCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card shadow-2xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Passed / Completed</p>
            <p className="text-xl font-bold text-foreground">{passedCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search & Select Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search company or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                All Types
              </SelectItem>
              {INTERVIEW_TYPE_ORDER.map((t) => (
                <SelectItem key={t} value={t} className="text-xs">
                  {INTERVIEW_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="All Outcomes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                All Outcomes
              </SelectItem>
              {INTERVIEW_OUTCOME_ORDER.map((o) => (
                <SelectItem key={o} value={o} className="text-xs">
                  {INTERVIEW_OUTCOME_LABELS[o]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <FilterX className="h-3 w-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>

        {/* View Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(val) =>
            setActiveTab(val as "all" | "upcoming" | "past")
          }
          className="w-auto shrink-0"
        >
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs px-3">
              All ({filteredInterviews.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="text-xs px-3">
              Upcoming ({upcomingList.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="text-xs px-3">
              Past ({pastList.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Empty State */}
      {filteredInterviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 p-12 text-center shadow-2xs min-h-[300px]">
          {hasActiveFilters ? (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3 text-muted-foreground">
                <FilterX className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                No matching interviews
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                No interviews match the current filters. Try resetting search or dropdown filters.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs h-8 gap-1.5"
              >
                <FilterX className="h-3.5 w-3.5" />
                Reset filters
              </Button>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3 text-muted-foreground">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                No interviews logged yet
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                Keep track of recruiter screens, technical assessments, and onsite loops all in one place.
              </p>
              <Button
                size="sm"
                onClick={handleOpenAdd}
                className="text-xs h-8 gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Log First Interview
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming Section */}
          {(activeTab === "all" || activeTab === "upcoming") &&
            upcomingGroups.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-border">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                    Upcoming Interviews
                  </h3>
                  <Badge variant="secondary" className="text-[10px]">
                    {upcomingList.length}
                  </Badge>
                </div>

                <div className="space-y-6">
                  {upcomingGroups.map(([dateKey, group]) => (
                    <div key={dateKey} className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span>{group.displayDate}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {group.items.map(renderInterviewCard)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Past Section */}
          {(activeTab === "all" || activeTab === "past") &&
            pastGroups.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-border">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Past Interviews & Feedback
                  </h3>
                  <Badge variant="secondary" className="text-[10px]">
                    {pastList.length}
                  </Badge>
                </div>

                <div className="space-y-6">
                  {pastGroups.map(([dateKey, group]) => (
                    <div key={dateKey} className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{group.displayDate}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {group.items.map(renderInterviewCard)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <InterviewFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        interview={selectedInterview}
        applicationsList={applicationOptions}
        onSuccess={() => {
          // Interviews are refreshed via queryClient or server actions
        }}
      />
    </div>
  );
}
