import { subDays, subWeeks, startOfWeek, endOfWeek, format } from "date-fns";
import type {
  ApplicationStatus,
  ApplicationSource,
} from "@/schemas/enums";
import {
  APPLICATION_STATUS_ORDER,
  APPLICATION_STATUS_LABELS,
  APPLICATION_SOURCE_LABELS,
} from "@/schemas/enums";
import type { ApplicationWithRelations } from "@/server/actions/application.actions";
import {
  isFollowUpOverdue,
  isInterviewWithinNext48Hours,
  isApplicationStale,
} from "@/lib/dates/timezone";

export type AnalyticsDateRange = "30d" | "90d" | "all";

/**
 * Filters a list of applications according to the selected date range.
 * Soft-deleted applications are always excluded.
 */
export function filterApplicationsByDateRange(
  applications: ApplicationWithRelations[],
  range: AnalyticsDateRange,
  now?: Date
): ApplicationWithRelations[] {
  const nonDeleted = applications.filter((app) => !app.deletedAt);

  if (range === "all") {
    return nonDeleted;
  }

  const baseDate = now ?? new Date();
  const daysToSubtract = range === "30d" ? 30 : 90;
  const threshold = subDays(baseDate, daysToSubtract);
  const thresholdMs = threshold.getTime();

  return nonDeleted.filter((app) => {
    const appliedMs = new Date(app.appliedDate).getTime();
    return appliedMs >= thresholdMs;
  });
}

export interface DashboardKpiStats {
  totalApplications: number;
  submittedCount: number;
  wishlistCount: number;
  activePipelineCount: number;
  responseCount: number;
  responseRate: number;
  interviewCount: number;
  interviewRate: number;
  offersCount: number;
  offerRate: number;
  rejectedCount: number;
}

/**
 * Checks whether an application has progressed beyond the initial APPLIED stage.
 */
export function hasProgressedPastApplied(
  app: ApplicationWithRelations
): boolean {
  if (
    app.status === "PHONE_SCREEN" ||
    app.status === "INTERVIEW" ||
    app.status === "OFFER"
  ) {
    return true;
  }

  if (app.interviews && app.interviews.length > 0) {
    return true;
  }

  if (
    app.statusHistory &&
    app.statusHistory.some(
      (h) =>
        h.toStatus === "PHONE_SCREEN" ||
        h.toStatus === "INTERVIEW" ||
        h.toStatus === "OFFER"
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Checks whether an application reached the interview stage at any point.
 */
export function hasReachedInterviewStage(
  app: ApplicationWithRelations
): boolean {
  if (app.status === "INTERVIEW" || app.status === "OFFER") {
    return true;
  }

  if (app.interviews && app.interviews.length > 0) {
    return true;
  }

  if (
    app.statusHistory &&
    app.statusHistory.some(
      (h) => h.toStatus === "INTERVIEW" || h.toStatus === "OFFER"
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Checks whether an application reached the offer stage at any point.
 */
export function hasReachedOfferStage(
  app: ApplicationWithRelations
): boolean {
  if (app.status === "OFFER") {
    return true;
  }

  if (
    app.statusHistory &&
    app.statusHistory.some((h) => h.toStatus === "OFFER")
  ) {
    return true;
  }

  return false;
}

/**
 * Computes high-level KPI metrics across an application collection.
 */
export function calculateKpiStats(
  applications: ApplicationWithRelations[]
): DashboardKpiStats {
  const nonDeleted = applications.filter((a) => !a.deletedAt);
  const totalApplications = nonDeleted.length;
  const wishlistCount = nonDeleted.filter((a) => a.status === "WISHLIST").length;
  const rejectedCount = nonDeleted.filter((a) => a.status === "REJECTED").length;

  const submittedApps = nonDeleted.filter((a) => a.status !== "WISHLIST");
  const submittedCount = submittedApps.length;

  const responseCount = submittedApps.filter(hasProgressedPastApplied).length;
  const responseRate =
    submittedCount > 0 ? Math.round((responseCount / submittedCount) * 100) : 0;

  const interviewCount = submittedApps.filter(hasReachedInterviewStage).length;
  const interviewRate =
    submittedCount > 0 ? Math.round((interviewCount / submittedCount) * 100) : 0;

  const offersCount = submittedApps.filter(hasReachedOfferStage).length;
  const offerRate =
    submittedCount > 0 ? Math.round((offersCount / submittedCount) * 100) : 0;

  const activePipelineCount = nonDeleted.filter(
    (a) =>
      !a.archivedAt &&
      (a.status === "APPLIED" ||
        a.status === "PHONE_SCREEN" ||
        a.status === "INTERVIEW")
  ).length;

  return {
    totalApplications,
    submittedCount,
    wishlistCount,
    activePipelineCount,
    responseCount,
    responseRate,
    interviewCount,
    interviewRate,
    offersCount,
    offerRate,
    rejectedCount,
  };
}

export interface WeeklyVolumePoint {
  weekKey: string;
  label: string;
  count: number;
}

/**
 * Computes weekly application volume across a rolling number of weeks.
 */
export function calculateWeeklyApplicationVolume(
  applications: ApplicationWithRelations[],
  weeksCount: number = 12,
  now?: Date
): WeeklyVolumePoint[] {
  const nonDeleted = applications.filter((a) => !a.deletedAt);
  const baseDate = now ?? new Date();
  const currentWeekStart = startOfWeek(baseDate);
  const points: WeeklyVolumePoint[] = [];

  for (let i = weeksCount - 1; i >= 0; i--) {
    const weekStart = subWeeks(currentWeekStart, i);
    const weekEnd = endOfWeek(weekStart);
    const startMs = weekStart.getTime();
    const endMs = weekEnd.getTime();

    const count = nonDeleted.filter((app) => {
      const appliedMs = new Date(app.appliedDate).getTime();
      return appliedMs >= startMs && appliedMs <= endMs;
    }).length;

    points.push({
      weekKey: format(weekStart, "yyyy-MM-dd"),
      label: format(weekStart, "MMM d"),
      count,
    });
  }

  return points;
}

export interface FunnelStageStat {
  stage: "APPLIED" | "PHONE_SCREEN" | "INTERVIEW" | "OFFER";
  label: string;
  count: number;
  conversionFromApplied: number;
  conversionFromPrevious: number;
}

/**
 * Computes pipeline conversion funnel counts and percentages.
 */
export function calculatePipelineFunnel(
  applications: ApplicationWithRelations[]
): FunnelStageStat[] {
  const nonDeleted = applications.filter((a) => !a.deletedAt);
  const submittedApps = nonDeleted.filter((a) => a.status !== "WISHLIST");

  const appliedCount = submittedApps.length;
  const screenCount = submittedApps.filter(hasProgressedPastApplied).length;
  const interviewCount = submittedApps.filter(hasReachedInterviewStage).length;
  const offerCount = submittedApps.filter(hasReachedOfferStage).length;

  return [
    {
      stage: "APPLIED",
      label: "Applied",
      count: appliedCount,
      conversionFromApplied: appliedCount > 0 ? 100 : 0,
      conversionFromPrevious: appliedCount > 0 ? 100 : 0,
    },
    {
      stage: "PHONE_SCREEN",
      label: "Phone Screen",
      count: screenCount,
      conversionFromApplied:
        appliedCount > 0 ? Math.round((screenCount / appliedCount) * 100) : 0,
      conversionFromPrevious:
        appliedCount > 0 ? Math.round((screenCount / appliedCount) * 100) : 0,
    },
    {
      stage: "INTERVIEW",
      label: "Interview",
      count: interviewCount,
      conversionFromApplied:
        appliedCount > 0 ? Math.round((interviewCount / appliedCount) * 100) : 0,
      conversionFromPrevious:
        screenCount > 0 ? Math.round((interviewCount / screenCount) * 100) : 0,
    },
    {
      stage: "OFFER",
      label: "Offer",
      count: offerCount,
      conversionFromApplied:
        appliedCount > 0 ? Math.round((offerCount / appliedCount) * 100) : 0,
      conversionFromPrevious:
        interviewCount > 0 ? Math.round((offerCount / interviewCount) * 100) : 0,
    },
  ];
}

export interface SourceBreakdownItem {
  source: ApplicationSource;
  label: string;
  count: number;
  percentage: number;
  responseCount: number;
  responseRate: number;
}

/**
 * Computes channel breakdown including counts, total shares, and response rates.
 */
export function calculateSourceBreakdown(
  applications: ApplicationWithRelations[]
): SourceBreakdownItem[] {
  const nonDeleted = applications.filter((a) => !a.deletedAt);
  const total = nonDeleted.length;

  const sourceMap = new Map<ApplicationSource, ApplicationWithRelations[]>();
  for (const app of nonDeleted) {
    const list = sourceMap.get(app.source) ?? [];
    list.push(app);
    sourceMap.set(app.source, list);
  }

  const items: SourceBreakdownItem[] = [];
  for (const [source, sourceApps] of sourceMap.entries()) {
    const count = sourceApps.length;
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    const submitted = sourceApps.filter((a) => a.status !== "WISHLIST");
    const responseCount = submitted.filter(hasProgressedPastApplied).length;
    const responseRate =
      submitted.length > 0
        ? Math.round((responseCount / submitted.length) * 100)
        : 0;

    items.push({
      source,
      label: APPLICATION_SOURCE_LABELS[source] ?? source,
      count,
      percentage,
      responseCount,
      responseRate,
    });
  }

  items.sort((a, b) => b.count - a.count);
  return items;
}

export interface StageDurationStat {
  status: ApplicationStatus;
  label: string;
  averageDays: number;
  sampleCount: number;
}

/**
 * Computes average days spent in each stage using StatusHistory records.
 */
export function calculateAverageDaysInStage(
  applications: ApplicationWithRelations[],
  now?: Date
): StageDurationStat[] {
  const nonDeleted = applications.filter((a) => !a.deletedAt);

  const totals: Record<
    ApplicationStatus,
    { totalDays: number; sampleCount: number }
  > = {
    WISHLIST: { totalDays: 0, sampleCount: 0 },
    APPLIED: { totalDays: 0, sampleCount: 0 },
    PHONE_SCREEN: { totalDays: 0, sampleCount: 0 },
    INTERVIEW: { totalDays: 0, sampleCount: 0 },
    OFFER: { totalDays: 0, sampleCount: 0 },
    REJECTED: { totalDays: 0, sampleCount: 0 },
  };

  for (const app of nonDeleted) {
    const history = (app.statusHistory ?? [])
      .slice()
      .sort(
        (a, b) =>
          new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()
      );

    for (let i = 0; i < history.length; i++) {
      const entry = history[i]!;
      const startMs = new Date(entry.changedAt).getTime();
      const endMs =
        i + 1 < history.length
          ? new Date(history[i + 1]!.changedAt).getTime()
          : app.status === entry.toStatus && !app.archivedAt
          ? (now ?? new Date()).getTime()
          : null;

      if (endMs !== null && endMs >= startMs) {
        const durationDays = Math.max(
          0,
          (endMs - startMs) / (1000 * 60 * 60 * 24)
        );
        const acc = totals[entry.toStatus];
        if (acc) {
          acc.totalDays += durationDays;
          acc.sampleCount += 1;
        }
      }
    }
  }

  return APPLICATION_STATUS_ORDER.map((status) => {
    const acc = totals[status];
    const avg = acc.sampleCount > 0 ? acc.totalDays / acc.sampleCount : 0;
    return {
      status,
      label: APPLICATION_STATUS_LABELS[status],
      averageDays: Math.round(avg * 10) / 10,
      sampleCount: acc.sampleCount,
    };
  });
}

export interface ResumePerformanceStat {
  resumeVersionId: string | null;
  name: string;
  fileName: string | null;
  totalApplications: number;
  responsesCount: number;
  interviewsCount: number;
  offersCount: number;
  callbackRate: number;
  interviewRate: number;
  offerRate: number;
  isSmallSample: boolean;
}

/**
 * Computes A/B performance metrics per resume version.
 */
export function calculateResumePerformance(
  applications: ApplicationWithRelations[],
  resumeVersions?: Array<{ id: string; name: string; fileName?: string | null }>
): ResumePerformanceStat[] {
  const nonDeleted = applications.filter((a) => !a.deletedAt);
  const versionMap = new Map<
    string,
    { id: string; name: string; fileName: string | null }
  >();

  if (resumeVersions) {
    for (const rv of resumeVersions) {
      if (rv.id) {
        versionMap.set(rv.id, {
          id: rv.id,
          name: rv.name,
          fileName: rv.fileName ?? null,
        });
      }
    }
  }

  for (const app of nonDeleted) {
    if (app.resumeVersionId && !versionMap.has(app.resumeVersionId)) {
      versionMap.set(app.resumeVersionId, {
        id: app.resumeVersionId,
        name: app.resumeVersion?.name ?? "Unknown Resume",
        fileName: app.resumeVersion?.fileName ?? null,
      });
    }
  }

  const results: ResumePerformanceStat[] = [];
  for (const version of versionMap.values()) {
    const linkedApps = nonDeleted.filter(
      (a) => a.resumeVersionId === version.id
    );
    const total = linkedApps.length;
    const responsesCount = linkedApps.filter(hasProgressedPastApplied).length;
    const interviewsCount = linkedApps.filter(hasReachedInterviewStage).length;
    const offersCount = linkedApps.filter(hasReachedOfferStage).length;

    const callbackRate =
      total > 0 ? Math.round((responsesCount / total) * 100) : 0;
    const interviewRate =
      total > 0 ? Math.round((interviewsCount / total) * 100) : 0;
    const offerRate =
      total > 0 ? Math.round((offersCount / total) * 100) : 0;

    results.push({
      resumeVersionId: version.id,
      name: version.name,
      fileName: version.fileName,
      totalApplications: total,
      responsesCount,
      interviewsCount,
      offersCount,
      callbackRate,
      interviewRate,
      offerRate,
      isSmallSample: total < 5,
    });
  }

  results.sort((a, b) => b.totalApplications - a.totalApplications);
  return results;
}

export interface NeedsAttentionSummary {
  overdueFollowUps: ApplicationWithRelations[];
  upcomingInterviews48h: Array<{
    interview: ApplicationWithRelations["interviews"][number];
    application: ApplicationWithRelations;
  }>;
  staleApplications: ApplicationWithRelations[];
  totalCount: number;
}

/**
 * Identifies applications requiring immediate attention:
 * overdue follow-ups, interviews in the next 48 hours, and stale applications.
 */
export function calculateNeedsAttention(
  applications: ApplicationWithRelations[],
  timezone?: string | null,
  now?: Date
): NeedsAttentionSummary {
  const nonDeleted = applications.filter((app) => !app.deletedAt);

  const overdueFollowUps = nonDeleted.filter((app) =>
    isFollowUpOverdue({
      followUpDate: app.followUpDate,
      status: app.status,
      archivedAt: app.archivedAt,
      deletedAt: app.deletedAt,
      timezone,
      now,
    })
  );

  const upcomingInterviews48h: Array<{
    interview: ApplicationWithRelations["interviews"][number];
    application: ApplicationWithRelations;
  }> = [];

  for (const app of nonDeleted) {
    if (app.archivedAt) continue;
    for (const interview of app.interviews ?? []) {
      if (
        isInterviewWithinNext48Hours({
          scheduledAt: interview.scheduledAt,
          outcome: interview.outcome,
          now,
        })
      ) {
        upcomingInterviews48h.push({ interview, application: app });
      }
    }
  }

  upcomingInterviews48h.sort(
    (a, b) =>
      new Date(a.interview.scheduledAt).getTime() -
      new Date(b.interview.scheduledAt).getTime()
  );

  const staleApplications = nonDeleted.filter((app) =>
    isApplicationStale({
      updatedAt: app.updatedAt,
      status: app.status,
      archivedAt: app.archivedAt,
      deletedAt: app.deletedAt,
      now,
    })
  );

  const totalCount =
    overdueFollowUps.length +
    upcomingInterviews48h.length +
    staleApplications.length;

  return {
    overdueFollowUps,
    upcomingInterviews48h,
    staleApplications,
    totalCount,
  };
}
