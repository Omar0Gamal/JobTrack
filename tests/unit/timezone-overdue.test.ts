import { describe, it, expect } from "vitest";
import {
  normalizeTimezone,
  getCalendarDateStringInTimezone,
  formatDateInTimezone,
  formatDateTimeInTimezone,
  isFollowUpOverdue,
  isInterviewWithinNext48Hours,
  isApplicationStale,
  getFollowUpPresetDate,
} from "@/lib/dates/timezone";
import {
  CreateInterviewSchema,
  UpdateInterviewSchema,
} from "@/schemas/interview.schema";
import type { ApplicationStatus, InterviewOutcome } from "@/schemas/enums";

describe("Timezone Normalization and Calendar Date Conversions", () => {
  it("normalizes standard IANA timezone strings", () => {
    expect(normalizeTimezone("America/New_York")).toBe("America/New_York");
    expect(normalizeTimezone("Europe/London")).toBe("Europe/London");
    expect(normalizeTimezone("Asia/Tokyo")).toBe("Asia/Tokyo");
    expect(normalizeTimezone("UTC")).toBe("UTC");
    expect(normalizeTimezone("America/Los_Angeles")).toBe("America/Los_Angeles");
  });

  it("trims whitespace around valid timezone strings", () => {
    expect(normalizeTimezone("  America/New_York  ")).toBe("America/New_York");
    expect(normalizeTimezone("  UTC  ")).toBe("UTC");
  });

  it("falls back to UTC for invalid or empty timezone inputs", () => {
    expect(normalizeTimezone(null)).toBe("UTC");
    expect(normalizeTimezone(undefined)).toBe("UTC");
    expect(normalizeTimezone("")).toBe("UTC");
    expect(normalizeTimezone("   ")).toBe("UTC");
    expect(normalizeTimezone("Invalid/Timezone")).toBe("UTC");
    expect(normalizeTimezone("Mars/Curiosity")).toBe("UTC");
    expect(normalizeTimezone("random_string")).toBe("UTC");
  });

  it("computes calendar date string YYYY-MM-DD across timezone boundaries", () => {
    // 2026-10-17T02:00:00.000Z:
    // In UTC: Oct 17, 2026 02:00 -> "2026-10-17"
    // In Tokyo (UTC+9): Oct 17, 2026 11:00 -> "2026-10-17"
    // In Los Angeles (UTC-7 during DST): Oct 16, 2026 19:00 -> "2026-10-16"
    const boundaryUtcDate = new Date("2026-10-17T02:00:00.000Z");

    expect(getCalendarDateStringInTimezone(boundaryUtcDate, "UTC")).toBe(
      "2026-10-17"
    );
    expect(getCalendarDateStringInTimezone(boundaryUtcDate, "Asia/Tokyo")).toBe(
      "2026-10-17"
    );
    expect(
      getCalendarDateStringInTimezone(boundaryUtcDate, "America/Los_Angeles")
    ).toBe("2026-10-16");
  });

  it("handles string dates and defaults to UTC when timezone is missing", () => {
    expect(
      getCalendarDateStringInTimezone("2026-12-31T23:30:00.000Z", undefined)
    ).toBe("2026-12-31");
    expect(
      getCalendarDateStringInTimezone("2026-12-31T23:30:00.000Z", "Europe/London")
    ).toBe("2026-12-31");
    expect(
      getCalendarDateStringInTimezone("2026-12-31T23:30:00.000Z", "Asia/Tokyo")
    ).toBe("2027-01-01");
  });

  it("formats dates and date-times in the specified timezone", () => {
    const testDate = new Date("2026-10-17T18:30:00.000Z");
    const formattedDate = formatDateInTimezone(testDate, "America/New_York");
    expect(formattedDate).toContain("Oct 17, 2026");

    const formattedTime = formatDateTimeInTimezone(testDate, "UTC");
    expect(formattedTime).toContain("Oct 17, 2026");
    expect(formattedTime).toMatch(/6:30\s*PM/i);
  });
});

describe("isFollowUpOverdue Calculations and Edge Cases", () => {
  const activeStatuses: ApplicationStatus[] = [
    "WISHLIST",
    "APPLIED",
    "PHONE_SCREEN",
    "INTERVIEW",
  ];

  it("returns true when followUpDate calendar day is strictly before now in user timezone", () => {
    const fixedNow = new Date("2026-10-17T12:00:00.000Z");
    const pastFollowUp = new Date("2026-10-16T10:00:00.000Z");

    for (const status of activeStatuses) {
      const overdue = isFollowUpOverdue({
        followUpDate: pastFollowUp,
        status,
        timezone: "UTC",
        now: fixedNow,
      });
      expect(overdue).toBe(true);
    }
  });

  it("returns false when followUpDate is today in the user timezone", () => {
    const fixedNow = new Date("2026-10-17T14:00:00.000Z");
    const todayFollowUpEarlier = new Date("2026-10-17T08:00:00.000Z");
    const todayFollowUpLater = new Date("2026-10-17T20:00:00.000Z");

    expect(
      isFollowUpOverdue({
        followUpDate: todayFollowUpEarlier,
        status: "APPLIED",
        timezone: "UTC",
        now: fixedNow,
      })
    ).toBe(false);

    expect(
      isFollowUpOverdue({
        followUpDate: todayFollowUpLater,
        status: "INTERVIEW",
        timezone: "UTC",
        now: fixedNow,
      })
    ).toBe(false);
  });

  it("returns false when followUpDate is in the future in the user timezone", () => {
    const fixedNow = new Date("2026-10-17T12:00:00.000Z");
    const futureFollowUp = new Date("2026-10-18T09:00:00.000Z");

    expect(
      isFollowUpOverdue({
        followUpDate: futureFollowUp,
        status: "PHONE_SCREEN",
        timezone: "UTC",
        now: fixedNow,
      })
    ).toBe(false);
  });

  it("respects timezone boundary edge cases between East and West hemispheres", () => {
    // followUpDate is 2026-10-16 10:00 UTC
    // fixedNow is 2026-10-17 02:00 UTC
    // In Tokyo (UTC+9):
    //   followUpDate = 2026-10-16 19:00 -> "2026-10-16"
    //   now          = 2026-10-17 11:00 -> "2026-10-17"
    //   "2026-10-16" < "2026-10-17" => OVERDUE in Tokyo
    // In Los Angeles (UTC-7 DST):
    //   followUpDate = 2026-10-16 03:00 -> "2026-10-16"
    //   now          = 2026-10-16 19:00 -> "2026-10-16"
    //   "2026-10-16" < "2026-10-16" => NOT OVERDUE in Los Angeles (it is still today)
    const followUpDate = new Date("2026-10-16T10:00:00.000Z");
    const fixedNow = new Date("2026-10-17T02:00:00.000Z");

    const overdueInTokyo = isFollowUpOverdue({
      followUpDate,
      status: "APPLIED",
      timezone: "Asia/Tokyo",
      now: fixedNow,
    });
    expect(overdueInTokyo).toBe(true);

    const overdueInLA = isFollowUpOverdue({
      followUpDate,
      status: "APPLIED",
      timezone: "America/Los_Angeles",
      now: fixedNow,
    });
    expect(overdueInLA).toBe(false);
  });

  it("always returns false when status is OFFER or REJECTED", () => {
    const fixedNow = new Date("2026-10-17T12:00:00.000Z");
    const veryOldFollowUp = new Date("2026-09-01T12:00:00.000Z");

    expect(
      isFollowUpOverdue({
        followUpDate: veryOldFollowUp,
        status: "OFFER",
        timezone: "UTC",
        now: fixedNow,
      })
    ).toBe(false);

    expect(
      isFollowUpOverdue({
        followUpDate: veryOldFollowUp,
        status: "REJECTED",
        timezone: "UTC",
        now: fixedNow,
      })
    ).toBe(false);
  });

  it("always returns false when archivedAt or deletedAt is set", () => {
    const fixedNow = new Date("2026-10-17T12:00:00.000Z");
    const pastFollowUp = new Date("2026-10-10T12:00:00.000Z");

    // Archived application
    expect(
      isFollowUpOverdue({
        followUpDate: pastFollowUp,
        status: "APPLIED",
        archivedAt: new Date("2026-10-15T00:00:00.000Z"),
        timezone: "UTC",
        now: fixedNow,
      })
    ).toBe(false);

    // Soft-deleted application
    expect(
      isFollowUpOverdue({
        followUpDate: pastFollowUp,
        status: "PHONE_SCREEN",
        deletedAt: new Date("2026-10-15T00:00:00.000Z"),
        timezone: "UTC",
        now: fixedNow,
      })
    ).toBe(false);

    // Both archived and deleted
    expect(
      isFollowUpOverdue({
        followUpDate: pastFollowUp,
        status: "INTERVIEW",
        archivedAt: new Date("2026-10-14T00:00:00.000Z"),
        deletedAt: new Date("2026-10-15T00:00:00.000Z"),
        timezone: "UTC",
        now: fixedNow,
      })
    ).toBe(false);
  });

  it("returns false when followUpDate is null or undefined", () => {
    expect(
      isFollowUpOverdue({
        followUpDate: null,
        status: "APPLIED",
        timezone: "UTC",
      })
    ).toBe(false);

    expect(
      isFollowUpOverdue({
        followUpDate: undefined,
        status: "INTERVIEW",
        timezone: "UTC",
      })
    ).toBe(false);
  });
});

describe("isInterviewWithinNext48Hours Window Checks", () => {
  const fixedNow = new Date("2026-10-17T12:00:00.000Z");

  it("returns true for PENDING interviews scheduled between now and now + 48 hours", () => {
    // Exactly at now
    expect(
      isInterviewWithinNext48Hours({
        scheduledAt: fixedNow,
        outcome: "PENDING",
        now: fixedNow,
      })
    ).toBe(true);

    // In 2 hours
    expect(
      isInterviewWithinNext48Hours({
        scheduledAt: new Date(fixedNow.getTime() + 2 * 60 * 60 * 1000),
        outcome: "PENDING",
        now: fixedNow,
      })
    ).toBe(true);

    // In 24 hours
    expect(
      isInterviewWithinNext48Hours({
        scheduledAt: new Date(fixedNow.getTime() + 24 * 60 * 60 * 1000),
        outcome: "PENDING",
        now: fixedNow,
      })
    ).toBe(true);

    // Exactly at 48 hours boundary
    expect(
      isInterviewWithinNext48Hours({
        scheduledAt: new Date(fixedNow.getTime() + 48 * 60 * 60 * 1000),
        outcome: "PENDING",
        now: fixedNow,
      })
    ).toBe(true);
  });

  it("returns false for past interviews", () => {
    // 1 millisecond in the past
    expect(
      isInterviewWithinNext48Hours({
        scheduledAt: new Date(fixedNow.getTime() - 1),
        outcome: "PENDING",
        now: fixedNow,
      })
    ).toBe(false);

    // 2 hours in the past
    expect(
      isInterviewWithinNext48Hours({
        scheduledAt: new Date(fixedNow.getTime() - 2 * 60 * 60 * 1000),
        outcome: "PENDING",
        now: fixedNow,
      })
    ).toBe(false);

    // 2 days in the past
    expect(
      isInterviewWithinNext48Hours({
        scheduledAt: new Date(fixedNow.getTime() - 48 * 60 * 60 * 1000),
        outcome: "PENDING",
        now: fixedNow,
      })
    ).toBe(false);
  });

  it("returns false for interviews scheduled beyond 48 hours in the future", () => {
    // 48 hours + 1 millisecond
    expect(
      isInterviewWithinNext48Hours({
        scheduledAt: new Date(fixedNow.getTime() + 48 * 60 * 60 * 1000 + 1),
        outcome: "PENDING",
        now: fixedNow,
      })
    ).toBe(false);

    // 3 days away
    expect(
      isInterviewWithinNext48Hours({
        scheduledAt: new Date(fixedNow.getTime() + 72 * 60 * 60 * 1000),
        outcome: "PENDING",
        now: fixedNow,
      })
    ).toBe(false);
  });

  it("returns false for non-PENDING interview outcomes regardless of scheduled time", () => {
    const upcomingTime = new Date(fixedNow.getTime() + 4 * 60 * 60 * 1000);
    const nonPendingOutcomes: InterviewOutcome[] = [
      "PASSED",
      "FAILED",
      "CANCELLED",
    ];

    for (const outcome of nonPendingOutcomes) {
      expect(
        isInterviewWithinNext48Hours({
          scheduledAt: upcomingTime,
          outcome,
          now: fixedNow,
        })
      ).toBe(false);
    }
  });
});

describe("isApplicationStale Calculations", () => {
  const fixedNow = new Date("2026-10-17T12:00:00.000Z");

  it("returns true when updatedAt is 14 or more days ago and status is active", () => {
    const fourteenDaysAgo = new Date(
      fixedNow.getTime() - 14 * 24 * 60 * 60 * 1000
    );
    const twentyDaysAgo = new Date(
      fixedNow.getTime() - 20 * 24 * 60 * 60 * 1000
    );

    const activeStatuses: ApplicationStatus[] = [
      "WISHLIST",
      "APPLIED",
      "PHONE_SCREEN",
      "INTERVIEW",
    ];

    for (const status of activeStatuses) {
      expect(
        isApplicationStale({
          updatedAt: fourteenDaysAgo,
          status,
          now: fixedNow,
        })
      ).toBe(true);

      expect(
        isApplicationStale({
          updatedAt: twentyDaysAgo,
          status,
          now: fixedNow,
        })
      ).toBe(true);
    }
  });

  it("returns false when updatedAt is less than 14 days ago", () => {
    const thirteenDaysAgo = new Date(
      fixedNow.getTime() - 13 * 24 * 60 * 60 * 1000
    );
    const twoHoursAgo = new Date(fixedNow.getTime() - 2 * 60 * 60 * 1000);

    expect(
      isApplicationStale({
        updatedAt: thirteenDaysAgo,
        status: "APPLIED",
        now: fixedNow,
      })
    ).toBe(false);

    expect(
      isApplicationStale({
        updatedAt: twoHoursAgo,
        status: "INTERVIEW",
        now: fixedNow,
      })
    ).toBe(false);
  });

  it("returns false when status is OFFER or REJECTED", () => {
    const thirtyDaysAgo = new Date(
      fixedNow.getTime() - 30 * 24 * 60 * 60 * 1000
    );

    expect(
      isApplicationStale({
        updatedAt: thirtyDaysAgo,
        status: "OFFER",
        now: fixedNow,
      })
    ).toBe(false);

    expect(
      isApplicationStale({
        updatedAt: thirtyDaysAgo,
        status: "REJECTED",
        now: fixedNow,
      })
    ).toBe(false);
  });

  it("returns false when application is archived or soft-deleted", () => {
    const thirtyDaysAgo = new Date(
      fixedNow.getTime() - 30 * 24 * 60 * 60 * 1000
    );

    expect(
      isApplicationStale({
        updatedAt: thirtyDaysAgo,
        status: "APPLIED",
        archivedAt: new Date(),
        now: fixedNow,
      })
    ).toBe(false);

    expect(
      isApplicationStale({
        updatedAt: thirtyDaysAgo,
        status: "INTERVIEW",
        deletedAt: new Date(),
        now: fixedNow,
      })
    ).toBe(false);
  });
});

describe("getFollowUpPresetDate Helpers", () => {
  const fixedNow = new Date("2026-10-17T10:00:00.000Z");

  it("computes +3 days preset date accurately", () => {
    const preset = getFollowUpPresetDate("in_3_days", fixedNow);
    const expected = new Date("2026-10-20T10:00:00.000Z");
    expect(preset.toISOString()).toBe(expected.toISOString());
  });

  it("computes +7 days (next week) preset date accurately", () => {
    const preset = getFollowUpPresetDate("next_week", fixedNow);
    const expected = new Date("2026-10-24T10:00:00.000Z");
    expect(preset.toISOString()).toBe(expected.toISOString());
  });
});

describe("CreateInterviewSchema and UpdateInterviewSchema Validation", () => {
  it("validates valid CreateInterviewInput with default values", () => {
    const input = {
      applicationId: "app_123456",
      scheduledAt: "2026-10-20T14:00:00.000Z",
    };

    const parsed = CreateInterviewSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.applicationId).toBe("app_123456");
      expect(parsed.data.round).toBe(1);
      expect(parsed.data.type).toBe("HR");
      expect(parsed.data.durationMinutes).toBe(45);
      expect(parsed.data.outcome).toBe("PENDING");
      expect(parsed.data.prepNotes).toBeUndefined();
      expect(parsed.data.feedback).toBeUndefined();
      expect(parsed.data.scheduledAt).toBeInstanceOf(Date);
    }
  });

  it("validates complete CreateInterviewInput with custom fields", () => {
    const input = {
      applicationId: "app_custom",
      round: 3,
      type: "SYSTEM_DESIGN",
      scheduledAt: new Date("2026-10-25T16:00:00.000Z"),
      durationMinutes: 60,
      prepNotes: "Study distributed consensus and Raft algorithm",
      outcome: "PASSED",
      feedback: "Strong architecture and tradeoffs explanation",
    };

    const parsed = CreateInterviewSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.round).toBe(3);
      expect(parsed.data.type).toBe("SYSTEM_DESIGN");
      expect(parsed.data.durationMinutes).toBe(60);
      expect(parsed.data.outcome).toBe("PASSED");
      expect(parsed.data.prepNotes).toBe(
        "Study distributed consensus and Raft algorithm"
      );
      expect(parsed.data.feedback).toBe(
        "Strong architecture and tradeoffs explanation"
      );
    }
  });

  it("rejects invalid round numbers outside 1 to 20 range", () => {
    expect(
      CreateInterviewSchema.safeParse({
        applicationId: "app_test",
        scheduledAt: new Date(),
        round: 0,
      }).success
    ).toBe(false);

    expect(
      CreateInterviewSchema.safeParse({
        applicationId: "app_test",
        scheduledAt: new Date(),
        round: -1,
      }).success
    ).toBe(false);

    expect(
      CreateInterviewSchema.safeParse({
        applicationId: "app_test",
        scheduledAt: new Date(),
        round: 21,
      }).success
    ).toBe(false);
  });

  it("rejects invalid duration values outside 5 to 480 minutes range", () => {
    expect(
      CreateInterviewSchema.safeParse({
        applicationId: "app_test",
        scheduledAt: new Date(),
        durationMinutes: 4,
      }).success
    ).toBe(false);

    expect(
      CreateInterviewSchema.safeParse({
        applicationId: "app_test",
        scheduledAt: new Date(),
        durationMinutes: 481,
      }).success
    ).toBe(false);
  });

  it("rejects missing applicationId", () => {
    expect(
      CreateInterviewSchema.safeParse({
        applicationId: "",
        scheduledAt: new Date(),
      }).success
    ).toBe(false);

    expect(
      CreateInterviewSchema.safeParse({
        scheduledAt: new Date(),
      }).success
    ).toBe(false);
  });

  it("rejects prepNotes or feedback exceeding 10,000 characters", () => {
    const hugeText = "a".repeat(10001);
    expect(
      CreateInterviewSchema.safeParse({
        applicationId: "app_test",
        scheduledAt: new Date(),
        prepNotes: hugeText,
      }).success
    ).toBe(false);

    expect(
      CreateInterviewSchema.safeParse({
        applicationId: "app_test",
        scheduledAt: new Date(),
        feedback: hugeText,
      }).success
    ).toBe(false);
  });

  it("validates UpdateInterviewSchema requiring interviewId and permitting partial updates", () => {
    const validUpdate = {
      interviewId: "int_987654",
      outcome: "PASSED",
      feedback: "Candidate solved dynamic programming problem cleanly",
    };

    const parsed = UpdateInterviewSchema.safeParse(validUpdate);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.interviewId).toBe("int_987654");
      expect(parsed.data.outcome).toBe("PASSED");
      expect(parsed.data.round).toBeUndefined();
    }
  });

  it("rejects UpdateInterviewSchema missing interviewId", () => {
    expect(
      UpdateInterviewSchema.safeParse({
        interviewId: "",
        outcome: "FAILED",
      }).success
    ).toBe(false);

    expect(
      UpdateInterviewSchema.safeParse({
        outcome: "FAILED",
      }).success
    ).toBe(false);
  });
});
