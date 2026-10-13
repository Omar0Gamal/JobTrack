import { addDays } from "date-fns";
import type { ApplicationStatus, InterviewOutcome } from "@/schemas/enums";

/**
 * Validates an IANA timezone string using Intl.DateTimeFormat,
 * falling back to "UTC" if invalid, null, or empty.
 */
export function normalizeTimezone(tz?: string | null): string {
  if (!tz || typeof tz !== "string" || tz.trim() === "") {
    return "UTC";
  }
  const trimmed = tz.trim();
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return trimmed;
  } catch {
    return "UTC";
  }
}

/**
 * Converts a date to a calendar date string (YYYY-MM-DD) in the specified timezone.
 */
export function getCalendarDateStringInTimezone(
  date: Date | string,
  timezone?: string | null
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const timeZone = normalizeTimezone(timezone);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Formats a date in the user's timezone (defaults to "MMM d, yyyy").
 */
export function formatDateInTimezone(
  date: Date | string,
  timezone?: string | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const timeZone = normalizeTimezone(timezone);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    ...(options ?? defaultOptions),
  }).format(d);
}

/**
 * Formats date + time in the user's timezone (e.g. "Oct 17, 2026, 2:00 PM").
 */
export function formatDateTimeInTimezone(
  date: Date | string,
  timezone?: string | null
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const timeZone = normalizeTimezone(timezone);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Checks whether an application's follow-up date is overdue in the specified timezone.
 * Returns false if follow-up date is not set, status is OFFER or REJECTED,
 * or if application is archived or soft-deleted.
 */
export function isFollowUpOverdue(params: {
  followUpDate: Date | string | null | undefined;
  status: ApplicationStatus;
  archivedAt?: Date | string | null;
  deletedAt?: Date | string | null;
  timezone?: string | null;
  now?: Date;
}): boolean {
  if (!params.followUpDate) return false;
  if (params.status === "OFFER" || params.status === "REJECTED") return false;
  if (params.archivedAt !== null && params.archivedAt !== undefined) return false;
  if (params.deletedAt !== null && params.deletedAt !== undefined) return false;

  const followUpStr = getCalendarDateStringInTimezone(
    params.followUpDate,
    params.timezone
  );
  const nowStr = getCalendarDateStringInTimezone(
    params.now ?? new Date(),
    params.timezone
  );
  return followUpStr < nowStr;
}

/**
 * Checks whether a pending interview is scheduled within the next 48 hours.
 */
export function isInterviewWithinNext48Hours(params: {
  scheduledAt: Date | string;
  outcome: InterviewOutcome;
  now?: Date;
}): boolean {
  if (params.outcome !== "PENDING") return false;
  const scheduledMs = new Date(params.scheduledAt).getTime();
  const nowMs = (params.now ?? new Date()).getTime();
  return scheduledMs >= nowMs && scheduledMs <= nowMs + 48 * 60 * 60 * 1000;
}

/**
 * Checks whether an application is stale (no updates in 14+ days),
 * excluding OFFER/REJECTED or archived/deleted applications.
 */
export function isApplicationStale(params: {
  updatedAt: Date | string;
  status: ApplicationStatus;
  archivedAt?: Date | string | null;
  deletedAt?: Date | string | null;
  now?: Date;
}): boolean {
  if (params.status === "OFFER" || params.status === "REJECTED") return false;
  if (params.archivedAt !== null && params.archivedAt !== undefined) return false;
  if (params.deletedAt !== null && params.deletedAt !== undefined) return false;

  const updatedMs = new Date(params.updatedAt).getTime();
  const nowMs = (params.now ?? new Date()).getTime();
  return nowMs - updatedMs >= 14 * 24 * 60 * 60 * 1000;
}

/**
 * Computes preset follow-up dates (in 3 days or next week / 7 days).
 */
export function getFollowUpPresetDate(
  preset: "in_3_days" | "next_week",
  now?: Date
): Date {
  const base = now ?? new Date();
  if (preset === "in_3_days") {
    return addDays(base, 3);
  }
  return addDays(base, 7);
}
