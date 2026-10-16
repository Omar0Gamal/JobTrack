import { describe, it, expect } from "vitest";
import { subDays, subHours, subWeeks, addHours, addDays, startOfWeek } from "date-fns";
import {
  filterApplicationsByDateRange,
  calculateKpiStats,
  calculatePipelineFunnel,
  calculateWeeklyApplicationVolume,
  calculateSourceBreakdown,
  calculateAverageDaysInStage,
  calculateResumePerformance,
  calculateNeedsAttention,
  hasProgressedPastApplied,
  hasReachedInterviewStage,
  hasReachedOfferStage,
} from "@/lib/analytics/calculations";
import {
  CreateResumeVersionSchema,
  UpdateResumeVersionSchema,
} from "@/schemas/resume-version.schema";
import type { ApplicationWithRelations } from "@/server/actions/application.actions";
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
    followUpDate: overrides.followUpDate !== undefined ? overrides.followUpDate : null,
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

describe("Resume Version Zod Schemas Validation", () => {
  describe("CreateResumeVersionSchema", () => {
    it("accepts valid input with only name", () => {
      const result = CreateResumeVersionSchema.safeParse({
        name: "Full-Stack TypeScript v3",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Full-Stack TypeScript v3");
        expect(result.data.description).toBeUndefined();
        expect(result.data.fileName).toBeUndefined();
      }
    });

    it("accepts complete valid input with trimmed strings", () => {
      const result = CreateResumeVersionSchema.safeParse({
        name: "  Systems & Infra v1  ",
        description: "  Tailored for distributed systems roles  ",
        fileName: "  resume_systems_2026.pdf  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Systems & Infra v1");
        expect(result.data.description).toBe("Tailored for distributed systems roles");
        expect(result.data.fileName).toBe("resume_systems_2026.pdf");
      }
    });

    it("accepts null for optional description and fileName", () => {
      const result = CreateResumeVersionSchema.safeParse({
        name: "Frontend v2",
        description: null,
        fileName: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Frontend v2");
        expect(result.data.description).toBeNull();
        expect(result.data.fileName).toBeNull();
      }
    });

    it("rejects empty or whitespace-only name", () => {
      const emptyResult = CreateResumeVersionSchema.safeParse({ name: "" });
      expect(emptyResult.success).toBe(false);

      const whitespaceResult = CreateResumeVersionSchema.safeParse({ name: "   " });
      expect(whitespaceResult.success).toBe(false);
    });

    it("rejects name exceeding 100 characters", () => {
      const longName = "A".repeat(101);
      const result = CreateResumeVersionSchema.safeParse({ name: longName });
      expect(result.success).toBe(false);
    });

    it("rejects description exceeding 500 characters", () => {
      const longDesc = "D".repeat(501);
      const result = CreateResumeVersionSchema.safeParse({
        name: "Valid Name",
        description: longDesc,
      });
      expect(result.success).toBe(false);
    });

    it("rejects fileName exceeding 255 characters", () => {
      const longFileName = `${"F".repeat(252)}.pdf`;
      const result = CreateResumeVersionSchema.safeParse({
        name: "Valid Name",
        fileName: longFileName,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("UpdateResumeVersionSchema", () => {
    it("validates id presence and partial updates", () => {
      const result = UpdateResumeVersionSchema.safeParse({
        id: "cuid_resume_123",
        name: "Renamed Resume",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("cuid_resume_123");
        expect(result.data.name).toBe("Renamed Resume");
      }
    });

    it("rejects when id is missing or empty", () => {
      const missingIdResult = UpdateResumeVersionSchema.safeParse({
        name: "Renamed Resume",
      });
      expect(missingIdResult.success).toBe(false);

      const emptyIdResult = UpdateResumeVersionSchema.safeParse({
        id: "",
        name: "Renamed Resume",
      });
      expect(emptyIdResult.success).toBe(false);
    });
  });
});

describe("filterApplicationsByDateRange", () => {
  const fixedNow = new Date("2026-10-17T12:00:00.000Z");

  const app10DaysAgo = createMockApplication({
    id: "app-10d",
    appliedDate: subDays(fixedNow, 10),
  });
  const app45DaysAgo = createMockApplication({
    id: "app-45d",
    appliedDate: subDays(fixedNow, 45),
  });
  const app100DaysAgo = createMockApplication({
    id: "app-100d",
    appliedDate: subDays(fixedNow, 100),
  });
  const deletedApp5DaysAgo = createMockApplication({
    id: "app-del-5d",
    appliedDate: subDays(fixedNow, 5),
    deletedAt: subDays(fixedNow, 1),
  });

  const dataset = [app10DaysAgo, app45DaysAgo, app100DaysAgo, deletedApp5DaysAgo];

  it("filters 30d range and excludes soft-deleted applications", () => {
    const result = filterApplicationsByDateRange(dataset, "30d", fixedNow);
    expect(result.map((a) => a.id)).toEqual(["app-10d"]);
  });

  it("filters 90d range and excludes soft-deleted applications", () => {
    const result = filterApplicationsByDateRange(dataset, "90d", fixedNow);
    expect(result.map((a) => a.id)).toEqual(["app-10d", "app-45d"]);
  });

  it("returns all non-deleted applications when range is all", () => {
    const result = filterApplicationsByDateRange(dataset, "all", fixedNow);
    expect(result.map((a) => a.id)).toEqual(["app-10d", "app-45d", "app-100d"]);
  });

  it("returns an empty array when input is empty", () => {
    expect(filterApplicationsByDateRange([], "30d", fixedNow)).toEqual([]);
    expect(filterApplicationsByDateRange([], "all", fixedNow)).toEqual([]);
  });
});

describe("Progression Helper Functions", () => {
  it("detects progressed past applied via direct status", () => {
    expect(hasProgressedPastApplied(createMockApplication({ status: "PHONE_SCREEN" }))).toBe(true);
    expect(hasProgressedPastApplied(createMockApplication({ status: "INTERVIEW" }))).toBe(true);
    expect(hasProgressedPastApplied(createMockApplication({ status: "OFFER" }))).toBe(true);
    expect(hasProgressedPastApplied(createMockApplication({ status: "APPLIED" }))).toBe(false);
    expect(hasProgressedPastApplied(createMockApplication({ status: "WISHLIST" }))).toBe(false);
  });

  it("detects progressed past applied via interviews array", () => {
    const appWithInterview = createMockApplication({
      status: "REJECTED",
      interviews: [
        {
          id: "int-1",
          applicationId: "app-1",
          round: 1,
          type: "HR",
          scheduledAt: new Date("2026-10-05T10:00:00.000Z"),
          durationMinutes: 30,
          prepNotes: null,
          outcome: "PASSED",
          feedback: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    expect(hasProgressedPastApplied(appWithInterview)).toBe(true);
  });

  it("detects progressed past applied via statusHistory", () => {
    const appWithHistory = createMockApplication({
      status: "REJECTED",
      statusHistory: [
        {
          id: "h-1",
          applicationId: "app-1",
          fromStatus: "APPLIED",
          toStatus: "PHONE_SCREEN",
          changedAt: new Date("2026-10-02T10:00:00.000Z"),
        },
        {
          id: "h-2",
          applicationId: "app-1",
          fromStatus: "PHONE_SCREEN",
          toStatus: "REJECTED",
          changedAt: new Date("2026-10-08T10:00:00.000Z"),
        },
      ],
    });
    expect(hasProgressedPastApplied(appWithHistory)).toBe(true);
  });

  it("detects reached interview stage via status, interviews or statusHistory", () => {
    expect(hasReachedInterviewStage(createMockApplication({ status: "INTERVIEW" }))).toBe(true);
    expect(hasReachedInterviewStage(createMockApplication({ status: "OFFER" }))).toBe(true);
    expect(hasReachedInterviewStage(createMockApplication({ status: "PHONE_SCREEN" }))).toBe(false);

    const appWithScreenOnly = createMockApplication({
      status: "REJECTED",
      statusHistory: [
        {
          id: "h-1",
          applicationId: "app-1",
          fromStatus: "APPLIED",
          toStatus: "PHONE_SCREEN",
          changedAt: new Date("2026-10-02T10:00:00.000Z"),
        },
      ],
    });
    expect(hasReachedInterviewStage(appWithScreenOnly)).toBe(false);

    const appWithInterviewHistory = createMockApplication({
      status: "REJECTED",
      statusHistory: [
        {
          id: "h-1",
          applicationId: "app-1",
          fromStatus: "PHONE_SCREEN",
          toStatus: "INTERVIEW",
          changedAt: new Date("2026-10-05T10:00:00.000Z"),
        },
      ],
    });
    expect(hasReachedInterviewStage(appWithInterviewHistory)).toBe(true);
  });

  it("detects reached offer stage via status or statusHistory", () => {
    expect(hasReachedOfferStage(createMockApplication({ status: "OFFER" }))).toBe(true);
    expect(hasReachedOfferStage(createMockApplication({ status: "INTERVIEW" }))).toBe(false);

    const appOfferHistory = createMockApplication({
      status: "REJECTED",
      statusHistory: [
        {
          id: "h-1",
          applicationId: "app-1",
          fromStatus: "INTERVIEW",
          toStatus: "OFFER",
          changedAt: new Date("2026-10-08T10:00:00.000Z"),
        },
      ],
    });
    expect(hasReachedOfferStage(appOfferHistory)).toBe(true);
  });
});

describe("calculateKpiStats", () => {
  it("computes accurate KPI metrics with integer percentages", () => {
    const apps: ApplicationWithRelations[] = [
      createMockApplication({ id: "w-1", status: "WISHLIST" }),
      createMockApplication({ id: "w-2", status: "WISHLIST" }),
      createMockApplication({ id: "a-1", status: "APPLIED" }),
      createMockApplication({ id: "a-2", status: "APPLIED" }),
      createMockApplication({ id: "s-1", status: "PHONE_SCREEN" }),
      createMockApplication({ id: "i-1", status: "INTERVIEW" }),
      createMockApplication({ id: "o-1", status: "OFFER" }),
      createMockApplication({
        id: "r-1",
        status: "REJECTED",
        statusHistory: [
          {
            id: "h-r1",
            applicationId: "r-1",
            fromStatus: "APPLIED",
            toStatus: "PHONE_SCREEN",
            changedAt: new Date("2026-10-02T10:00:00.000Z"),
          },
        ],
      }),
      createMockApplication({ id: "del-1", status: "OFFER", deletedAt: new Date() }),
    ];

    const stats = calculateKpiStats(apps);

    expect(stats.totalApplications).toBe(8);
    expect(stats.wishlistCount).toBe(2);
    expect(stats.submittedCount).toBe(6);
    expect(stats.rejectedCount).toBe(1);

    // Active in pipeline: non-archived, status in APPLIED, PHONE_SCREEN, INTERVIEW
    // a-1, a-2, s-1, i-1 = 4
    expect(stats.activePipelineCount).toBe(4);

    // Progressed past applied: s-1, i-1, o-1, r-1 (had PHONE_SCREEN history) = 4
    expect(stats.responseCount).toBe(4);
    // 4 / 6 * 100 = 66.67% -> 67%
    expect(stats.responseRate).toBe(67);

    // Reached interview stage: i-1, o-1 = 2
    expect(stats.interviewCount).toBe(2);
    // 2 / 6 * 100 = 33.33% -> 33%
    expect(stats.interviewRate).toBe(33);

    // Offers reached: o-1 = 1
    expect(stats.offersCount).toBe(1);
    // 1 / 6 * 100 = 16.67% -> 17%
    expect(stats.offerRate).toBe(17);
  });

  it("handles empty arrays gracefully without NaN", () => {
    const stats = calculateKpiStats([]);
    expect(stats.totalApplications).toBe(0);
    expect(stats.submittedCount).toBe(0);
    expect(stats.wishlistCount).toBe(0);
    expect(stats.activePipelineCount).toBe(0);
    expect(stats.responseCount).toBe(0);
    expect(stats.responseRate).toBe(0);
    expect(stats.interviewCount).toBe(0);
    expect(stats.interviewRate).toBe(0);
    expect(stats.offersCount).toBe(0);
    expect(stats.offerRate).toBe(0);
    expect(stats.rejectedCount).toBe(0);
    expect(Number.isNaN(stats.responseRate)).toBe(false);
    expect(Number.isNaN(stats.interviewRate)).toBe(false);
    expect(Number.isNaN(stats.offerRate)).toBe(false);
  });

  it("handles scenario where all applications are in WISHLIST without division by zero", () => {
    const apps = [
      createMockApplication({ id: "w-1", status: "WISHLIST" }),
      createMockApplication({ id: "w-2", status: "WISHLIST" }),
    ];
    const stats = calculateKpiStats(apps);
    expect(stats.totalApplications).toBe(2);
    expect(stats.wishlistCount).toBe(2);
    expect(stats.submittedCount).toBe(0);
    expect(stats.responseRate).toBe(0);
    expect(stats.interviewRate).toBe(0);
    expect(stats.offerRate).toBe(0);
    expect(Number.isNaN(stats.responseRate)).toBe(false);
  });
});

describe("calculatePipelineFunnel", () => {
  it("accurately counts historical progressions and computes conversion rates", () => {
    // 4 submitted applications:
    // app1: applied only
    // app2: applied -> screen -> interview -> rejected
    // app3: applied -> screen -> interview -> offer
    // app4: applied -> screen -> rejected
    const app1 = createMockApplication({ id: "app-1", status: "APPLIED" });
    const app2 = createMockApplication({
      id: "app-2",
      status: "REJECTED",
      statusHistory: [
        { id: "h1", applicationId: "app-2", fromStatus: "APPLIED", toStatus: "PHONE_SCREEN", changedAt: new Date("2026-09-02") },
        { id: "h2", applicationId: "app-2", fromStatus: "PHONE_SCREEN", toStatus: "INTERVIEW", changedAt: new Date("2026-09-10") },
        { id: "h3", applicationId: "app-2", fromStatus: "INTERVIEW", toStatus: "REJECTED", changedAt: new Date("2026-09-20") },
      ],
    });
    const app3 = createMockApplication({
      id: "app-3",
      status: "OFFER",
      statusHistory: [
        { id: "h4", applicationId: "app-3", fromStatus: "APPLIED", toStatus: "PHONE_SCREEN", changedAt: new Date("2026-09-05") },
        { id: "h5", applicationId: "app-3", fromStatus: "PHONE_SCREEN", toStatus: "INTERVIEW", changedAt: new Date("2026-09-15") },
        { id: "h6", applicationId: "app-3", fromStatus: "INTERVIEW", toStatus: "OFFER", changedAt: new Date("2026-09-25") },
      ],
    });
    const app4 = createMockApplication({
      id: "app-4",
      status: "REJECTED",
      statusHistory: [
        { id: "h7", applicationId: "app-4", fromStatus: "APPLIED", toStatus: "PHONE_SCREEN", changedAt: new Date("2026-09-08") },
        { id: "h8", applicationId: "app-4", fromStatus: "PHONE_SCREEN", toStatus: "REJECTED", changedAt: new Date("2026-09-16") },
      ],
    });
    const wishlistApp = createMockApplication({ id: "app-w", status: "WISHLIST" });

    const funnel = calculatePipelineFunnel([app1, app2, app3, app4, wishlistApp]);

    expect(funnel).toHaveLength(4);

    const appliedStage = funnel.find((s) => s.stage === "APPLIED")!;
    expect(appliedStage.count).toBe(4);
    expect(appliedStage.conversionFromApplied).toBe(100);
    expect(appliedStage.conversionFromPrevious).toBe(100);

    const screenStage = funnel.find((s) => s.stage === "PHONE_SCREEN")!;
    // app2, app3, app4 reached phone screen
    expect(screenStage.count).toBe(3);
    // 3 / 4 * 100 = 75%
    expect(screenStage.conversionFromApplied).toBe(75);
    expect(screenStage.conversionFromPrevious).toBe(75);

    const interviewStage = funnel.find((s) => s.stage === "INTERVIEW")!;
    // app2 and app3 reached interview
    expect(interviewStage.count).toBe(2);
    // 2 / 4 * 100 = 50%
    expect(interviewStage.conversionFromApplied).toBe(50);
    // 2 / 3 * 100 = 66.67% -> 67%
    expect(interviewStage.conversionFromPrevious).toBe(67);

    const offerStage = funnel.find((s) => s.stage === "OFFER")!;
    // app3 reached offer
    expect(offerStage.count).toBe(1);
    // 1 / 4 * 100 = 25%
    expect(offerStage.conversionFromApplied).toBe(25);
    // 1 / 2 * 100 = 50%
    expect(offerStage.conversionFromPrevious).toBe(50);
  });

  it("handles empty dataset safely", () => {
    const funnel = calculatePipelineFunnel([]);
    expect(funnel).toHaveLength(4);
    for (const stage of funnel) {
      expect(stage.count).toBe(0);
      expect(stage.conversionFromApplied).toBe(0);
      expect(stage.conversionFromPrevious).toBe(0);
    }
  });
});

describe("calculateWeeklyApplicationVolume", () => {
  const fixedNow = new Date("2026-10-17T12:00:00.000Z");

  it("buckets applications into weekly intervals accurately", () => {
    const currentWeekStart = startOfWeek(fixedNow);
    const oneWeekAgo = subWeeks(currentWeekStart, 1);
    const twoWeeksAgo = subWeeks(currentWeekStart, 2);

    const apps: ApplicationWithRelations[] = [
      createMockApplication({
        id: "app-w0-a",
        appliedDate: new Date(currentWeekStart.getTime() + 1000 * 60 * 60),
      }),
      createMockApplication({
        id: "app-w0-b",
        appliedDate: new Date(currentWeekStart.getTime() + 1000 * 60 * 60 * 24),
      }),
      createMockApplication({
        id: "app-w1",
        appliedDate: new Date(oneWeekAgo.getTime() + 1000 * 60 * 60 * 12),
      }),
      createMockApplication({
        id: "app-w2",
        appliedDate: new Date(twoWeeksAgo.getTime() + 1000 * 60 * 60 * 12),
      }),
      createMockApplication({
        id: "app-deleted",
        appliedDate: new Date(currentWeekStart.getTime() + 1000 * 60 * 60),
        deletedAt: new Date(),
      }),
    ];

    const volume = calculateWeeklyApplicationVolume(apps, 3, fixedNow);

    expect(volume).toHaveLength(3);
    // Chronological order: 2 weeks ago, 1 week ago, current week
    expect(volume[0]?.count).toBe(1);
    expect(volume[1]?.count).toBe(1);
    expect(volume[2]?.count).toBe(2);

    expect(volume[0]?.weekKey).toBeDefined();
    expect(volume[0]?.label).toBeDefined();
  });

  it("returns default 12 points for empty applications list", () => {
    const volume = calculateWeeklyApplicationVolume([], 12, fixedNow);
    expect(volume).toHaveLength(12);
    for (const point of volume) {
      expect(point.count).toBe(0);
    }
  });
});

describe("calculateSourceBreakdown", () => {
  it("groups by ApplicationSource, calculates percentage share and response rate", () => {
    const apps: ApplicationWithRelations[] = [
      // LINKEDIN: 3 apps, 2 responded (67% response rate)
      createMockApplication({ id: "l-1", source: "LINKEDIN", status: "APPLIED" }),
      createMockApplication({ id: "l-2", source: "LINKEDIN", status: "PHONE_SCREEN" }),
      createMockApplication({ id: "l-3", source: "LINKEDIN", status: "INTERVIEW" }),
      // REFERRAL: 2 apps, 2 responded (100% response rate)
      createMockApplication({ id: "r-1", source: "REFERRAL", status: "INTERVIEW" }),
      createMockApplication({ id: "r-2", source: "REFERRAL", status: "OFFER" }),
      // COMPANY_SITE: 1 app, 0 responded (0% response rate)
      createMockApplication({ id: "c-1", source: "COMPANY_SITE", status: "APPLIED" }),
    ];

    const breakdown = calculateSourceBreakdown(apps);

    expect(breakdown).toHaveLength(3);
    // Sorted descending by count
    expect(breakdown[0]?.source).toBe("LINKEDIN");
    expect(breakdown[0]?.count).toBe(3);
    // 3 / 6 = 50%
    expect(breakdown[0]?.percentage).toBe(50);
    expect(breakdown[0]?.responseCount).toBe(2);
    expect(breakdown[0]?.responseRate).toBe(67);

    expect(breakdown[1]?.source).toBe("REFERRAL");
    expect(breakdown[1]?.count).toBe(2);
    // 2 / 6 = 33%
    expect(breakdown[1]?.percentage).toBe(33);
    expect(breakdown[1]?.responseCount).toBe(2);
    expect(breakdown[1]?.responseRate).toBe(100);

    expect(breakdown[2]?.source).toBe("COMPANY_SITE");
    expect(breakdown[2]?.count).toBe(1);
    // 1 / 6 = 17%
    expect(breakdown[2]?.percentage).toBe(17);
    expect(breakdown[2]?.responseCount).toBe(0);
    expect(breakdown[2]?.responseRate).toBe(0);
  });

  it("handles empty applications list without error", () => {
    const breakdown = calculateSourceBreakdown([]);
    expect(breakdown).toEqual([]);
  });
});

describe("calculateAverageDaysInStage", () => {
  const fixedNow = new Date("2026-10-17T12:00:00.000Z");

  it("computes exact day durations from StatusHistory transition timestamps", () => {
    // App 1:
    // APPLIED on Oct 1 -> PHONE_SCREEN on Oct 5 (4 days in APPLIED)
    // PHONE_SCREEN on Oct 5 -> INTERVIEW on Oct 10 (5 days in PHONE_SCREEN)
    // INTERVIEW on Oct 10 -> current active on Oct 17 (7 days in INTERVIEW)
    const app1 = createMockApplication({
      id: "app-1",
      status: "INTERVIEW",
      statusHistory: [
        {
          id: "h1",
          applicationId: "app-1",
          fromStatus: null,
          toStatus: "APPLIED",
          changedAt: new Date("2026-10-01T12:00:00.000Z"),
        },
        {
          id: "h2",
          applicationId: "app-1",
          fromStatus: "APPLIED",
          toStatus: "PHONE_SCREEN",
          changedAt: new Date("2026-10-05T12:00:00.000Z"),
        },
        {
          id: "h3",
          applicationId: "app-1",
          fromStatus: "PHONE_SCREEN",
          toStatus: "INTERVIEW",
          changedAt: new Date("2026-10-10T12:00:00.000Z"),
        },
      ],
    });

    // App 2:
    // APPLIED on Oct 1 -> REJECTED on Oct 7 (6 days in APPLIED)
    const app2 = createMockApplication({
      id: "app-2",
      status: "REJECTED",
      statusHistory: [
        {
          id: "h4",
          applicationId: "app-2",
          fromStatus: null,
          toStatus: "APPLIED",
          changedAt: new Date("2026-10-01T12:00:00.000Z"),
        },
        {
          id: "h5",
          applicationId: "app-2",
          fromStatus: "APPLIED",
          toStatus: "REJECTED",
          changedAt: new Date("2026-10-07T12:00:00.000Z"),
        },
      ],
    });

    const stageAverages = calculateAverageDaysInStage([app1, app2], fixedNow);

    // APPLIED: (4 + 6) / 2 = 5.0 days, sampleCount = 2
    const appliedStat = stageAverages.find((s) => s.status === "APPLIED")!;
    expect(appliedStat.averageDays).toBe(5.0);
    expect(appliedStat.sampleCount).toBe(2);

    // PHONE_SCREEN: 5.0 days, sampleCount = 1
    const screenStat = stageAverages.find((s) => s.status === "PHONE_SCREEN")!;
    expect(screenStat.averageDays).toBe(5.0);
    expect(screenStat.sampleCount).toBe(1);

    // INTERVIEW: 7.0 days, sampleCount = 1
    const interviewStat = stageAverages.find((s) => s.status === "INTERVIEW")!;
    expect(interviewStat.averageDays).toBe(7.0);
    expect(interviewStat.sampleCount).toBe(1);
  });

  it("handles applications without statusHistory gracefully", () => {
    const app = createMockApplication({ status: "APPLIED", statusHistory: [] });
    const averages = calculateAverageDaysInStage([app], fixedNow);
    for (const stat of averages) {
      expect(stat.averageDays).toBe(0);
      expect(stat.sampleCount).toBe(0);
    }
  });
});

describe("calculateResumePerformance", () => {
  it("computes callback, interview, and offer rates and marks small sample flags", () => {
    const resumeVersions = [
      { id: "rv-staff", name: "Staff Engineer v3", fileName: "staff_v3.pdf" },
      { id: "rv-frontend", name: "Frontend v2", fileName: "frontend_v2.pdf" },
    ];

    // Staff Resume: 6 applications (>= 5 -> isSmallSample: false)
    // 3 response, 2 interview, 1 offer
    const staffApps: ApplicationWithRelations[] = [
      createMockApplication({ id: "s-1", resumeVersionId: "rv-staff", status: "APPLIED" }),
      createMockApplication({ id: "s-2", resumeVersionId: "rv-staff", status: "APPLIED" }),
      createMockApplication({ id: "s-3", resumeVersionId: "rv-staff", status: "APPLIED" }),
      createMockApplication({ id: "s-4", resumeVersionId: "rv-staff", status: "PHONE_SCREEN" }),
      createMockApplication({ id: "s-5", resumeVersionId: "rv-staff", status: "INTERVIEW" }),
      createMockApplication({ id: "s-6", resumeVersionId: "rv-staff", status: "OFFER" }),
    ];

    // Frontend Resume: 3 applications (< 5 -> isSmallSample: true)
    // 1 response, 1 interview, 0 offer
    const frontendApps: ApplicationWithRelations[] = [
      createMockApplication({ id: "f-1", resumeVersionId: "rv-frontend", status: "APPLIED" }),
      createMockApplication({ id: "f-2", resumeVersionId: "rv-frontend", status: "APPLIED" }),
      createMockApplication({ id: "f-3", resumeVersionId: "rv-frontend", status: "INTERVIEW" }),
    ];

    const results = calculateResumePerformance(
      [...staffApps, ...frontendApps],
      resumeVersions
    );

    expect(results).toHaveLength(2);

    const staffResult = results.find((r) => r.resumeVersionId === "rv-staff")!;
    expect(staffResult.totalApplications).toBe(6);
    expect(staffResult.isSmallSample).toBe(false);
    expect(staffResult.responsesCount).toBe(3);
    // 3 / 6 * 100 = 50%
    expect(staffResult.callbackRate).toBe(50);
    // 2 / 6 * 100 = 33.3% -> 33%
    expect(staffResult.interviewRate).toBe(33);
    // 1 / 6 * 100 = 16.7% -> 17%
    expect(staffResult.offerRate).toBe(17);

    const frontendResult = results.find((r) => r.resumeVersionId === "rv-frontend")!;
    expect(frontendResult.totalApplications).toBe(3);
    expect(frontendResult.isSmallSample).toBe(true);
    expect(frontendResult.responsesCount).toBe(1);
    // 1 / 3 * 100 = 33.3% -> 33%
    expect(frontendResult.callbackRate).toBe(33);
    expect(frontendResult.interviewRate).toBe(33);
    expect(frontendResult.offerRate).toBe(0);
  });

  it("handles empty lists safely", () => {
    const results = calculateResumePerformance([]);
    expect(results).toEqual([]);
  });
});

describe("calculateNeedsAttention", () => {
  const fixedNow = new Date("2026-10-17T12:00:00.000Z");

  it("identifies overdue follow-ups, upcoming interviews within 48h, and stale applications", () => {
    // 1. Overdue follow-up: active app with followUpDate in the past
    const overdueApp = createMockApplication({
      id: "app-overdue",
      company: "Google",
      status: "APPLIED",
      followUpDate: subDays(fixedNow, 2),
      updatedAt: fixedNow,
    });

    // 2. Upcoming interview within 48h: scheduled in 24 hours
    const interviewApp = createMockApplication({
      id: "app-interview",
      company: "Stripe",
      status: "INTERVIEW",
      updatedAt: fixedNow,
      interviews: [
        {
          id: "int-stripe-1",
          applicationId: "app-interview",
          round: 2,
          type: "SYSTEM_DESIGN",
          scheduledAt: addHours(fixedNow, 24),
          durationMinutes: 60,
          prepNotes: "Review system architecture",
          outcome: "PENDING",
          feedback: null,
          createdAt: fixedNow,
          updatedAt: fixedNow,
        },
      ],
    });

    // 3. Stale application: updated 20 days ago, status in active pipeline
    const staleApp = createMockApplication({
      id: "app-stale",
      company: "Datadog",
      status: "APPLIED",
      updatedAt: subDays(fixedNow, 20),
    });

    // 4. Healthy application: updated today, future follow-up
    const healthyApp = createMockApplication({
      id: "app-healthy",
      company: "Apple",
      status: "APPLIED",
      followUpDate: addDays(fixedNow, 5),
      updatedAt: fixedNow,
    });

    const summary = calculateNeedsAttention(
      [overdueApp, interviewApp, staleApp, healthyApp],
      "UTC",
      fixedNow
    );

    expect(summary.totalCount).toBe(3);
    expect(summary.overdueFollowUps.map((a) => a.id)).toEqual(["app-overdue"]);
    expect(summary.upcomingInterviews48h).toHaveLength(1);
    expect(summary.upcomingInterviews48h[0]?.application.id).toBe("app-interview");
    expect(summary.upcomingInterviews48h[0]?.interview.id).toBe("int-stripe-1");
    expect(summary.staleApplications.map((a) => a.id)).toEqual(["app-stale"]);
  });

  it("excludes soft-deleted and archived applications from attention", () => {
    const deletedOverdueApp = createMockApplication({
      id: "app-del-overdue",
      followUpDate: subDays(fixedNow, 3),
      deletedAt: subDays(fixedNow, 1),
    });
    const archivedStaleApp = createMockApplication({
      id: "app-arch-stale",
      status: "APPLIED",
      updatedAt: subDays(fixedNow, 30),
      archivedAt: subDays(fixedNow, 10),
    });

    const summary = calculateNeedsAttention(
      [deletedOverdueApp, archivedStaleApp],
      "UTC",
      fixedNow
    );

    expect(summary.totalCount).toBe(0);
    expect(summary.overdueFollowUps).toHaveLength(0);
    expect(summary.upcomingInterviews48h).toHaveLength(0);
    expect(summary.staleApplications).toHaveLength(0);
  });
});
