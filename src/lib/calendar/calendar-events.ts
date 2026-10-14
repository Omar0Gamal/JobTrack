import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  format,
} from "date-fns";
import type { ApplicationStatus, InterviewOutcome, InterviewType } from "@/schemas/enums";
import type { ApplicationWithRelations } from "@/server/actions/application.actions";
import type { InterviewWithApplication } from "@/server/actions/interview.actions";
import {
  getCalendarDateStringInTimezone,
  isFollowUpOverdue,
  isInterviewWithinNext48Hours,
} from "@/lib/dates/timezone";

export type CalendarEventType = "interview" | "followup";

export interface CalendarEventItem {
  id: string;
  kind: CalendarEventType;
  dateKey: string; // YYYY-MM-DD in user's timezone
  timestamp: string; // ISO string
  applicationId: string;
  company: string;
  role: string;
  applicationStatus: ApplicationStatus;
  interviewId?: string;
  round?: number;
  interviewType?: InterviewType;
  durationMinutes?: number;
  outcome?: InterviewOutcome;
  isWithin48h?: boolean;
  isOverdue?: boolean;
}

export interface CalendarDayCell {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEventItem[];
}

export interface AgendaDayGroup {
  dateKey: string;
  date: Date;
  isToday: boolean;
  events: CalendarEventItem[];
}

/**
 * Builds unified calendar event items from applications and interviews.
 * Filters out deleted/archived entities and sorts chronologically.
 */
export function buildCalendarEvents(params: {
  applications: ApplicationWithRelations[];
  interviews: InterviewWithApplication[];
  timezone?: string | null;
  now?: Date;
}): CalendarEventItem[] {
  const events: CalendarEventItem[] = [];

  // Map active interviews belonging to non-deleted applications
  for (const interview of params.interviews) {
    if (interview.application.deletedAt) {
      continue;
    }

    const scheduledDate = new Date(interview.scheduledAt);
    const dateKey = getCalendarDateStringInTimezone(
      interview.scheduledAt,
      params.timezone
    );
    const timestamp = scheduledDate.toISOString();
    const isWithin48h = isInterviewWithinNext48Hours({
      scheduledAt: interview.scheduledAt,
      outcome: interview.outcome,
      now: params.now,
    });

    events.push({
      id: interview.id,
      kind: "interview",
      dateKey,
      timestamp,
      applicationId: interview.application.id,
      company: interview.application.company,
      role: interview.application.role,
      applicationStatus: interview.application.status,
      interviewId: interview.id,
      round: interview.round,
      interviewType: interview.type,
      durationMinutes: interview.durationMinutes,
      outcome: interview.outcome,
      isWithin48h,
    });
  }

  // Map active applications that have follow-up deadlines set
  for (const app of params.applications) {
    if (app.deletedAt || app.archivedAt || !app.followUpDate) {
      continue;
    }

    const followUpDate = new Date(app.followUpDate);
    const dateKey = getCalendarDateStringInTimezone(
      app.followUpDate,
      params.timezone
    );
    const timestamp = followUpDate.toISOString();
    const isOverdue = isFollowUpOverdue({
      followUpDate: app.followUpDate,
      status: app.status,
      archivedAt: app.archivedAt,
      deletedAt: app.deletedAt,
      timezone: params.timezone,
      now: params.now,
    });

    events.push({
      id: app.id,
      kind: "followup",
      dateKey,
      timestamp,
      applicationId: app.id,
      company: app.company,
      role: app.role,
      applicationStatus: app.status,
      isOverdue,
    });
  }

  // Sort events chronologically by timestamp (and then kind: "interview" before "followup", then company)
  events.sort((a, b) => {
    const timeCompare = a.timestamp.localeCompare(b.timestamp);
    if (timeCompare !== 0) return timeCompare;

    if (a.kind !== b.kind) {
      return a.kind === "interview" ? -1 : 1;
    }

    return a.company.localeCompare(b.company);
  });

  return events;
}

/**
 * Builds the 7-column calendar grid cells for a given reference month.
 * Computes Sunday-Saturday bounding intervals and attaches events matching each day.
 */
export function buildMonthGridDays(params: {
  referenceDate: Date;
  events: CalendarEventItem[];
  timezone?: string | null;
  now?: Date;
}): CalendarDayCell[] {
  const monthStart = startOfMonth(params.referenceDate);
  const monthEnd = endOfMonth(params.referenceDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const intervalDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const todayKey = getCalendarDateStringInTimezone(
    params.now ?? new Date(),
    params.timezone
  );

  const eventsByDate = new Map<string, CalendarEventItem[]>();
  for (const event of params.events) {
    const existing = eventsByDate.get(event.dateKey);
    if (existing) {
      existing.push(event);
    } else {
      eventsByDate.set(event.dateKey, [event]);
    }
  }

  return intervalDays.map((day) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const dayNumber = day.getDate();
    const isCurrentMonth = isSameMonth(day, params.referenceDate);
    const isToday = dateKey === todayKey;
    const dayEvents = eventsByDate.get(dateKey) ?? [];

    return {
      date: day,
      dateKey,
      dayNumber,
      isCurrentMonth,
      isToday,
      events: dayEvents,
    };
  });
}

/**
 * Filters and groups events for the chronological agenda list for a given month.
 */
export function groupEventsForAgenda(params: {
  referenceDate: Date;
  events: CalendarEventItem[];
  filterKind?: "ALL" | CalendarEventType;
  timezone?: string | null;
  now?: Date;
}): AgendaDayGroup[] {
  const monthPrefix = format(params.referenceDate, "yyyy-MM");
  const todayKey = getCalendarDateStringInTimezone(
    params.now ?? new Date(),
    params.timezone
  );

  const filteredEvents = params.events.filter((event) => {
    if (!event.dateKey.startsWith(monthPrefix)) {
      return false;
    }
    if (params.filterKind && params.filterKind !== "ALL") {
      return event.kind === params.filterKind;
    }
    return true;
  });

  const groupsMap = new Map<string, CalendarEventItem[]>();
  for (const event of filteredEvents) {
    const existing = groupsMap.get(event.dateKey);
    if (existing) {
      existing.push(event);
    } else {
      groupsMap.set(event.dateKey, [event]);
    }
  }

  const sortedDateKeys = Array.from(groupsMap.keys()).sort((a, b) =>
    a.localeCompare(b)
  );

  return sortedDateKeys.map((dateKey) => {
    const events = groupsMap.get(dateKey) ?? [];
    return {
      dateKey,
      date: new Date(`${dateKey}T00:00:00`),
      isToday: dateKey === todayKey,
      events,
    };
  });
}
