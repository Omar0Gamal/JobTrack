import { describe, it, expect } from "vitest";
import {
  buildCalendarEvents,
  buildMonthGridDays,
  groupEventsForAgenda,
  type CalendarEventItem,
} from "@/lib/calendar/calendar-events";
import type { ApplicationWithRelations } from "@/server/actions/application.actions";
import type { InterviewWithApplication } from "@/server/actions/interview.actions";
import type {
  ApplicationStatus,
  ApplicationSource,
  Priority,
  LocationType,
  InterviewType,
  InterviewOutcome,
} from "@/schemas/enums";

function createMockApplication(
  overrides: Partial<ApplicationWithRelations> = {}
): ApplicationWithRelations {
  return {
    id: overrides.id ?? "app_test_1",
    userId: overrides.userId ?? "user_test_1",
    company: overrides.company ?? "Acme Corp",
    role: overrides.role ?? "Software Engineer",
    status: overrides.status ?? ("APPLIED" as ApplicationStatus),
    priority: overrides.priority ?? ("MEDIUM" as Priority),
    locationType: overrides.locationType ?? ("REMOTE" as LocationType),
    location: overrides.location !== undefined ? overrides.location : "San Francisco, CA",
    salaryMin: overrides.salaryMin !== undefined ? overrides.salaryMin : 120000,
    salaryMax: overrides.salaryMax !== undefined ? overrides.salaryMax : 160000,
    currency: overrides.currency ?? "USD",
    source: overrides.source ?? ("LINKEDIN" as ApplicationSource),
    jobUrl: overrides.jobUrl !== undefined ? overrides.jobUrl : "https://example.com/job/1",
    appliedDate: overrides.appliedDate ?? new Date("2026-10-01T12:00:00.000Z"),
    followUpDate: overrides.followUpDate !== undefined ? overrides.followUpDate : new Date("2026-10-20T12:00:00.000Z"),
    resumeVersionId: overrides.resumeVersionId !== undefined ? overrides.resumeVersionId : null,
    position: overrides.position ?? 1000,
    archivedAt: overrides.archivedAt !== undefined ? overrides.archivedAt : null,
    deletedAt: overrides.deletedAt !== undefined ? overrides.deletedAt : null,
    createdAt: overrides.createdAt ?? new Date("2026-10-01T12:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-10-01T12:00:00.000Z"),
    resumeVersion: overrides.resumeVersion !== undefined ? overrides.resumeVersion : null,
    interviews: overrides.interviews ?? [],
    notes: overrides.notes ?? [],
    contacts: overrides.contacts ?? [],
    statusHistory: overrides.statusHistory ?? [],
  };
}

function createMockInterview(
  overrides: Partial<InterviewWithApplication> = {}
): InterviewWithApplication {
  const appId = overrides.applicationId ?? overrides.application?.id ?? "app_test_1";
  return {
    id: overrides.id ?? "int_test_1",
    applicationId: appId,
    round: overrides.round ?? 1,
    type: overrides.type ?? ("TECHNICAL" as InterviewType),
    scheduledAt: overrides.scheduledAt ?? new Date("2026-10-18T14:00:00.000Z"),
    durationMinutes: overrides.durationMinutes ?? 45,
    prepNotes: overrides.prepNotes !== undefined ? overrides.prepNotes : null,
    outcome: overrides.outcome ?? ("PENDING" as InterviewOutcome),
    feedback: overrides.feedback !== undefined ? overrides.feedback : null,
    createdAt: overrides.createdAt ?? new Date("2026-10-15T12:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-10-15T12:00:00.000Z"),
    application: overrides.application ?? {
      id: appId,
      company: "Acme Corp",
      role: "Software Engineer",
      status: "INTERVIEW",
      locationType: "REMOTE",
      location: "San Francisco, CA",
      jobUrl: "https://example.com/job/1",
      archivedAt: null,
      deletedAt: null,
    },
  };
}

describe("Calendar Events Engine — buildCalendarEvents", () => {
  const fixedNow = new Date("2026-10-17T12:00:00.000Z");

  it("extracts both interview and follow-up events from active applications and interviews", () => {
    const mockApp = createMockApplication({
      id: "app_1",
      company: "Stripe",
      role: "Backend Engineer",
      followUpDate: new Date("2026-10-22T09:00:00.000Z"),
    });

    const mockInterview = createMockInterview({
      id: "int_1",
      applicationId: "app_1",
      type: "TECHNICAL",
      scheduledAt: new Date("2026-10-19T15:00:00.000Z"),
      application: {
        id: "app_1",
        company: "Stripe",
        role: "Backend Engineer",
        status: "INTERVIEW",
        locationType: "REMOTE",
        location: null,
        jobUrl: null,
        archivedAt: null,
        deletedAt: null,
      },
    });

    const events = buildCalendarEvents({
      applications: [mockApp],
      interviews: [mockInterview],
      timezone: "UTC",
      now: fixedNow,
    });

    expect(events).toHaveLength(2);

    const interviewEvent = events.find((e) => e.kind === "interview");
    expect(interviewEvent).toBeDefined();
    expect(interviewEvent?.id).toBe("int_1");
    expect(interviewEvent?.company).toBe("Stripe");
    expect(interviewEvent?.role).toBe("Backend Engineer");
    expect(interviewEvent?.dateKey).toBe("2026-10-19");
    expect(interviewEvent?.round).toBe(1);
    expect(interviewEvent?.interviewType).toBe("TECHNICAL");

    const followUpEvent = events.find((e) => e.kind === "followup");
    expect(followUpEvent).toBeDefined();
    expect(followUpEvent?.id).toBe("app_1");
    expect(followUpEvent?.company).toBe("Stripe");
    expect(followUpEvent?.dateKey).toBe("2026-10-22");
    expect(followUpEvent?.isOverdue).toBe(false);
  });

  it("excludes soft-deleted and archived applications from follow-up events", () => {
    const deletedApp = createMockApplication({
      id: "app_del",
      deletedAt: new Date("2026-10-10T10:00:00.000Z"),
      followUpDate: new Date("2026-10-25T10:00:00.000Z"),
    });

    const archivedApp = createMockApplication({
      id: "app_arch",
      archivedAt: new Date("2026-10-12T10:00:00.000Z"),
      followUpDate: new Date("2026-10-25T10:00:00.000Z"),
    });

    const appWithoutFollowUp = createMockApplication({
      id: "app_no_followup",
      followUpDate: null,
    });

    const activeApp = createMockApplication({
      id: "app_active",
      deletedAt: null,
      archivedAt: null,
      followUpDate: new Date("2026-10-25T10:00:00.000Z"),
    });

    const events = buildCalendarEvents({
      applications: [deletedApp, archivedApp, appWithoutFollowUp, activeApp],
      interviews: [],
      timezone: "UTC",
      now: fixedNow,
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.id).toBe("app_active");
  });

  it("excludes interviews belonging to soft-deleted applications", () => {
    const activeInterview = createMockInterview({
      id: "int_active",
      application: {
        id: "app_active",
        company: "Vercel",
        role: "Frontend Engineer",
        status: "INTERVIEW",
        locationType: "REMOTE",
        location: null,
        jobUrl: null,
        archivedAt: null,
        deletedAt: null,
      },
    });

    const deletedAppInterview = createMockInterview({
      id: "int_deleted",
      application: {
        id: "app_deleted",
        company: "Legacy Corp",
        role: "Engineer",
        status: "REJECTED",
        locationType: "REMOTE",
        location: null,
        jobUrl: null,
        archivedAt: null,
        deletedAt: new Date("2026-10-10T00:00:00.000Z"),
      },
    });

    const events = buildCalendarEvents({
      applications: [],
      interviews: [activeInterview, deletedAppInterview],
      timezone: "UTC",
      now: fixedNow,
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.id).toBe("int_active");
  });

  it("computes dateKey accurately in user timezones (UTC, America/New_York, Asia/Tokyo)", () => {
    // 2026-10-20T02:30:00.000Z is:
    // UTC: 2026-10-20
    // America/New_York (EDT, UTC-4): 2026-10-19 22:30 -> 2026-10-19
    // Asia/Tokyo (JST, UTC+9): 2026-10-20 11:30 -> 2026-10-20
    const boundaryTime = new Date("2026-10-20T02:30:00.000Z");

    const interview = createMockInterview({
      id: "int_tz",
      scheduledAt: boundaryTime,
    });

    const utcEvents = buildCalendarEvents({
      applications: [],
      interviews: [interview],
      timezone: "UTC",
      now: fixedNow,
    });
    expect(utcEvents[0]?.dateKey).toBe("2026-10-20");

    const nyEvents = buildCalendarEvents({
      applications: [],
      interviews: [interview],
      timezone: "America/New_York",
      now: fixedNow,
    });
    expect(nyEvents[0]?.dateKey).toBe("2026-10-19");

    const tokyoEvents = buildCalendarEvents({
      applications: [],
      interviews: [interview],
      timezone: "Asia/Tokyo",
      now: fixedNow,
    });
    expect(tokyoEvents[0]?.dateKey).toBe("2026-10-20");
  });

  it("marks isOverdue: true for past follow-up dates on active statuses and false when OFFER/REJECTED or future", () => {
    const pastDate = new Date("2026-10-15T09:00:00.000Z"); // before fixedNow (2026-10-17)
    const futureDate = new Date("2026-10-25T09:00:00.000Z"); // after fixedNow

    const overdueActiveApp = createMockApplication({
      id: "app_overdue_applied",
      status: "APPLIED",
      followUpDate: pastDate,
    });

    const overdueInterviewApp = createMockApplication({
      id: "app_overdue_interview",
      status: "INTERVIEW",
      followUpDate: pastDate,
    });

    const pastOfferApp = createMockApplication({
      id: "app_past_offer",
      status: "OFFER",
      followUpDate: pastDate,
    });

    const pastRejectedApp = createMockApplication({
      id: "app_past_rejected",
      status: "REJECTED",
      followUpDate: pastDate,
    });

    const futureApp = createMockApplication({
      id: "app_future",
      status: "APPLIED",
      followUpDate: futureDate,
    });

    const events = buildCalendarEvents({
      applications: [
        overdueActiveApp,
        overdueInterviewApp,
        pastOfferApp,
        pastRejectedApp,
        futureApp,
      ],
      interviews: [],
      timezone: "UTC",
      now: fixedNow,
    });

    const eventMap = new Map(events.map((e) => [e.id, e]));

    expect(eventMap.get("app_overdue_applied")?.isOverdue).toBe(true);
    expect(eventMap.get("app_overdue_interview")?.isOverdue).toBe(true);
    expect(eventMap.get("app_past_offer")?.isOverdue).toBe(false);
    expect(eventMap.get("app_past_rejected")?.isOverdue).toBe(false);
    expect(eventMap.get("app_future")?.isOverdue).toBe(false);
  });

  it("marks isWithin48h: true for PENDING interviews within the next 48 hours", () => {
    // fixedNow is 2026-10-17T12:00:00.000Z
    // 48 hours is up to 2026-10-19T12:00:00.000Z
    const in24h = new Date("2026-10-18T12:00:00.000Z");
    const in72h = new Date("2026-10-20T12:00:00.000Z");
    const inPast = new Date("2026-10-16T12:00:00.000Z");

    const upcomingPending = createMockInterview({
      id: "int_upcoming",
      scheduledAt: in24h,
      outcome: "PENDING",
    });

    const farFuturePending = createMockInterview({
      id: "int_far",
      scheduledAt: in72h,
      outcome: "PENDING",
    });

    const pastPending = createMockInterview({
      id: "int_past",
      scheduledAt: inPast,
      outcome: "PENDING",
    });

    const passedWithin48h = createMockInterview({
      id: "int_passed_48h",
      scheduledAt: in24h,
      outcome: "PASSED",
    });

    const events = buildCalendarEvents({
      applications: [],
      interviews: [
        upcomingPending,
        farFuturePending,
        pastPending,
        passedWithin48h,
      ],
      timezone: "UTC",
      now: fixedNow,
    });

    const eventMap = new Map(events.map((e) => [e.id, e]));

    expect(eventMap.get("int_upcoming")?.isWithin48h).toBe(true);
    expect(eventMap.get("int_far")?.isWithin48h).toBe(false);
    expect(eventMap.get("int_past")?.isWithin48h).toBe(false);
    expect(eventMap.get("int_passed_48h")?.isWithin48h).toBe(false);
  });

  it("sorts events chronologically, then interviews before follow-ups, then by company name", () => {
    const timeA = new Date("2026-10-20T10:00:00.000Z");
    const timeB = new Date("2026-10-20T15:00:00.000Z");

    const appZebra = createMockApplication({
      id: "app_zebra",
      company: "Zebra Inc",
      followUpDate: timeA,
    });

    const interviewAlpha = createMockInterview({
      id: "int_alpha",
      scheduledAt: timeA,
      application: {
        id: "app_alpha",
        company: "Alpha Corp",
        role: "Engineer",
        status: "INTERVIEW",
        locationType: "REMOTE",
        location: null,
        jobUrl: null,
        archivedAt: null,
        deletedAt: null,
      },
    });

    const interviewBeta = createMockInterview({
      id: "int_beta",
      scheduledAt: timeA,
      application: {
        id: "app_beta",
        company: "Beta Corp",
        role: "Designer",
        status: "INTERVIEW",
        locationType: "REMOTE",
        location: null,
        jobUrl: null,
        archivedAt: null,
        deletedAt: null,
      },
    });

    const interviewLate = createMockInterview({
      id: "int_late",
      scheduledAt: timeB,
      application: {
        id: "app_late",
        company: "Early Corp",
        role: "DevOps",
        status: "INTERVIEW",
        locationType: "REMOTE",
        location: null,
        jobUrl: null,
        archivedAt: null,
        deletedAt: null,
      },
    });

    const events = buildCalendarEvents({
      applications: [appZebra],
      interviews: [interviewBeta, interviewAlpha, interviewLate],
      timezone: "UTC",
      now: fixedNow,
    });

    // Expected order:
    // 1. timeA interview Alpha
    // 2. timeA interview Beta
    // 3. timeA followup Zebra
    // 4. timeB interview Early
    expect(events.map((e) => e.id)).toEqual([
      "int_alpha",
      "int_beta",
      "app_zebra",
      "int_late",
    ]);
  });
});

describe("Calendar Month Grid — buildMonthGridDays", () => {
  const referenceDate = new Date("2026-10-15T00:00:00.000Z"); // October 2026
  const fixedNow = new Date("2026-10-17T12:00:00.000Z");

  it("generates a complete 7-column aligned array of day cells divisible by 7", () => {
    const days = buildMonthGridDays({
      referenceDate,
      events: [],
      timezone: "UTC",
      now: fixedNow,
    });

    // In October 2026: Oct 1 is Thursday, Oct 31 is Saturday.
    // Sunday start of week brings start to Sept 27.
    // Saturday end of week brings end to Oct 31.
    // Total days: Sept 27 - Oct 31 = 35 days (5 full weeks).
    expect(days.length % 7).toBe(0);
    expect(days.length).toBeGreaterThanOrEqual(35);
    expect(days.length).toBeLessThanOrEqual(42);
  });

  it("accurately sets isCurrentMonth, isToday, dayNumber, and attaches matching events", () => {
    const mockEvent: CalendarEventItem = {
      id: "int_test",
      kind: "interview",
      dateKey: "2026-10-17",
      timestamp: "2026-10-17T14:00:00.000Z",
      applicationId: "app_1",
      company: "GitHub",
      role: "Staff Engineer",
      applicationStatus: "INTERVIEW",
    };

    const days = buildMonthGridDays({
      referenceDate,
      events: [mockEvent],
      timezone: "UTC",
      now: fixedNow,
    });

    // Find October 17 cell
    const oct17 = days.find((d) => d.dateKey === "2026-10-17");
    expect(oct17).toBeDefined();
    expect(oct17?.dayNumber).toBe(17);
    expect(oct17?.isCurrentMonth).toBe(true);
    expect(oct17?.isToday).toBe(true);
    expect(oct17?.events).toHaveLength(1);
    expect(oct17?.events[0]?.id).toBe("int_test");

    // Days in September (outside October)
    const septDay = days.find((d) => d.dateKey.startsWith("2026-09"));
    if (septDay) {
      expect(septDay.isCurrentMonth).toBe(false);
      expect(septDay.isToday).toBe(false);
    }
  });
});

describe("Calendar Agenda List — groupEventsForAgenda", () => {
  const referenceDate = new Date("2026-10-01T00:00:00.000Z");
  const fixedNow = new Date("2026-10-17T12:00:00.000Z");

  const sampleEvents: CalendarEventItem[] = [
    {
      id: "e1",
      kind: "interview",
      dateKey: "2026-10-10",
      timestamp: "2026-10-10T10:00:00.000Z",
      applicationId: "app_1",
      company: "Apple",
      role: "iOS Engineer",
      applicationStatus: "INTERVIEW",
    },
    {
      id: "e2",
      kind: "followup",
      dateKey: "2026-10-17",
      timestamp: "2026-10-17T09:00:00.000Z",
      applicationId: "app_2",
      company: "Google",
      role: "SWE",
      applicationStatus: "APPLIED",
    },
    {
      id: "e3",
      kind: "interview",
      dateKey: "2026-10-25",
      timestamp: "2026-10-25T14:00:00.000Z",
      applicationId: "app_3",
      company: "Amazon",
      role: "SDE II",
      applicationStatus: "INTERVIEW",
    },
    {
      id: "e4_nov",
      kind: "interview",
      dateKey: "2026-11-02",
      timestamp: "2026-11-02T10:00:00.000Z",
      applicationId: "app_4",
      company: "Meta",
      role: "Staff SWE",
      applicationStatus: "INTERVIEW",
    },
  ];

  it("filters events strictly to the reference month and groups them chronologically", () => {
    const groups = groupEventsForAgenda({
      referenceDate,
      events: sampleEvents,
      timezone: "UTC",
      now: fixedNow,
    });

    expect(groups).toHaveLength(3); // Oct 10, Oct 17, Oct 25 (Nov 02 excluded)
    expect(groups[0]?.dateKey).toBe("2026-10-10");
    expect(groups[1]?.dateKey).toBe("2026-10-17");
    expect(groups[1]?.isToday).toBe(true);
    expect(groups[2]?.dateKey).toBe("2026-10-25");
  });

  it("filters by filterKind ('interview' vs 'followup')", () => {
    const interviewGroups = groupEventsForAgenda({
      referenceDate,
      events: sampleEvents,
      filterKind: "interview",
      timezone: "UTC",
      now: fixedNow,
    });

    expect(interviewGroups).toHaveLength(2); // Oct 10 and Oct 25
    expect(interviewGroups.every((g) => g.events.every((e) => e.kind === "interview"))).toBe(true);

    const followUpGroups = groupEventsForAgenda({
      referenceDate,
      events: sampleEvents,
      filterKind: "followup",
      timezone: "UTC",
      now: fixedNow,
    });

    expect(followUpGroups).toHaveLength(1); // Oct 17
    expect(followUpGroups[0]?.events[0]?.id).toBe("e2");
  });
});
