"use client";

import * as React from "react";
import { AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeTimezone } from "@/lib/dates/timezone";
import type { CalendarDayCell, CalendarEventItem } from "@/lib/calendar/calendar-events";

export interface CalendarMonthGridProps {
  days: CalendarDayCell[];
  userTimezone?: string | null;
  onSelectApplication: (applicationId: string) => void;
  className?: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function formatEventTime(isoTimestamp: string, timezone?: string | null): string {
  try {
    const tz = normalizeTimezone(timezone);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(isoTimestamp));
  } catch {
    return "";
  }
}

export function CalendarMonthGrid({
  days,
  userTimezone,
  onSelectApplication,
  className,
}: CalendarMonthGridProps) {
  return (
    <div
      role="grid"
      aria-label="Calendar month grid"
      className={cn("w-full select-none overflow-hidden rounded-xl border border-border bg-card shadow-xs", className)}
    >
      {/* 7-column weekday header */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-semibold text-muted-foreground">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            role="columnheader"
            className="py-2.5 text-center tracking-wide uppercase text-[11px]"
          >
            {weekday}
          </div>
        ))}
      </div>

      {/* 7-column month grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-border/60 bg-muted/15">
        {days.map((cell) => {
          return (
            <div
              key={cell.dateKey}
              role="gridcell"
              aria-label={`${cell.dateKey}${cell.events.length > 0 ? `, ${cell.events.length} events` : ""}`}
              className={cn(
                "group relative flex min-h-[110px] sm:min-h-[125px] flex-col p-1.5 transition-colors",
                cell.isCurrentMonth
                  ? "bg-card hover:bg-muted/20"
                  : "bg-muted/30 text-muted-foreground/60",
                cell.isToday && "bg-primary/5 dark:bg-primary/10"
              )}
            >
              {/* Day header: Day number & count */}
              <div className="flex items-center justify-between pb-1">
                <time
                  dateTime={cell.dateKey}
                  className={cn(
                    "tabular-nums text-xs font-medium leading-none",
                    cell.isToday
                      ? "flex h-6 w-6 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground shadow-xs"
                      : cell.isCurrentMonth
                        ? "text-foreground group-hover:text-primary"
                        : "text-muted-foreground/50"
                  )}
                >
                  {cell.dayNumber}
                </time>

                {cell.events.length > 0 && (
                  <span className="text-[10px] font-medium text-muted-foreground/80 tabular-nums">
                    {cell.events.length} {cell.events.length === 1 ? "event" : "events"}
                  </span>
                )}
              </div>

              {/* Event pills container */}
              <div className="flex-1 space-y-1 overflow-y-auto max-h-[120px] pr-0.5 scrollbar-thin">
                {cell.events.map((event) => (
                  <CalendarEventPill
                    key={event.id}
                    event={event}
                    userTimezone={userTimezone}
                    onSelectApplication={onSelectApplication}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface CalendarEventPillProps {
  event: CalendarEventItem;
  userTimezone?: string | null;
  onSelectApplication: (applicationId: string) => void;
}

function CalendarEventPill({
  event,
  userTimezone,
  onSelectApplication,
}: CalendarEventPillProps) {
  if (event.kind === "interview") {
    const formattedTime = formatEventTime(event.timestamp, userTimezone);

    return (
      <button
        type="button"
        onClick={() => onSelectApplication(event.applicationId)}
        aria-label={`Open ${event.company} application drawer`}
        className={cn(
          "w-full text-left rounded-md px-1.5 py-1 text-[11px] leading-tight transition-all",
          "border border-indigo-200/90 bg-indigo-50/90 text-indigo-950 hover:bg-indigo-100 hover:border-indigo-300",
          "dark:border-indigo-800/80 dark:bg-indigo-950/70 dark:text-indigo-200 dark:hover:bg-indigo-900/90",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500",
          "flex flex-col gap-0.5 shadow-2xs"
        )}
      >
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0">
            {event.isWithin48h && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse"
                title="Upcoming in next 48 hours"
              />
            )}
            <time dateTime={event.timestamp} className="tabular-nums font-mono text-[10px] text-indigo-700 dark:text-indigo-300 shrink-0">
              {formattedTime}
            </time>
          </div>
          <span className="truncate text-[10px] font-semibold text-indigo-700/90 dark:text-indigo-300/90">
            R{event.round ?? 1}{" "}
            {event.interviewType === "SYSTEM_DESIGN"
              ? "Sys Design"
              : event.interviewType === "TECHNICAL"
                ? "Tech"
                : event.interviewType === "BEHAVIORAL"
                  ? "Behavioral"
                  : event.interviewType ?? "HR"}
          </span>
        </div>
        <div className="truncate font-semibold text-indigo-950 dark:text-indigo-100">
          {event.company}
        </div>
      </button>
    );
  }

  // Follow-up event pill
  const isOverdue = Boolean(event.isOverdue);

  return (
    <button
      type="button"
      onClick={() => onSelectApplication(event.applicationId)}
      aria-label={`Open ${event.company} application drawer`}
      className={cn(
        "w-full text-left rounded-md px-1.5 py-1 text-[11px] leading-tight transition-all",
        "focus-visible:outline-none focus-visible:ring-1 shadow-2xs flex items-center gap-1.5",
        isOverdue
          ? "border border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100 hover:border-rose-400 dark:border-rose-800/80 dark:bg-rose-950/70 dark:text-rose-200 dark:hover:bg-rose-900/90 focus-visible:ring-rose-500"
          : "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:border-amber-400 dark:border-amber-800/80 dark:bg-amber-950/70 dark:text-amber-200 dark:hover:bg-amber-900/90 focus-visible:ring-amber-500"
      )}
    >
      {isOverdue ? (
        <AlertCircle className="h-3 w-3 shrink-0 text-rose-600 dark:text-rose-400" />
      ) : (
        <Clock className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
      )}
      <div className="truncate font-medium">
        <span className="font-semibold">
          {isOverdue ? "Overdue: " : "Follow-up: "}
        </span>
        {event.company}
      </div>
    </button>
  );
}
