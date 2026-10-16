import { describe, it, expect } from "vitest";
import {
  parseBoardFilterParams,
  serializeBoardFilterParams,
  countActiveFilters,
  filterAndSortApplications,
  DEFAULT_BOARD_FILTER_PARAMS,
  type BoardFilterParams,
} from "@/lib/filters/application-filters";
import type { ApplicationWithRelations } from "@/server/actions/application.actions";
import type {
  ApplicationStatus,
  ApplicationSource,
  Priority,
  LocationType,
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
    appliedDate: overrides.appliedDate ?? new Date("2026-02-15T12:00:00.000Z"),
    followUpDate: overrides.followUpDate !== undefined ? overrides.followUpDate : new Date("2026-02-22T12:00:00.000Z"),
    resumeVersionId: overrides.resumeVersionId !== undefined ? overrides.resumeVersionId : "res_v1",
    position: overrides.position ?? 1000,
    archivedAt: overrides.archivedAt !== undefined ? overrides.archivedAt : null,
    deletedAt: overrides.deletedAt !== undefined ? overrides.deletedAt : null,
    createdAt: overrides.createdAt ?? new Date("2026-02-15T12:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-02-15T12:00:00.000Z"),
    resumeVersion: overrides.resumeVersion !== undefined ? overrides.resumeVersion : null,
    interviews: overrides.interviews ?? [],
    notes: overrides.notes ?? [],
    contacts: overrides.contacts ?? [],
    statusHistory: overrides.statusHistory ?? [],
  };
}

describe("Table View, URL Filter Parsing & Data Sorting Engine", () => {
  describe("parseBoardFilterParams", () => {
    it("returns default filter parameters when input is empty or nullish", () => {
      expect(parseBoardFilterParams(null)).toEqual(DEFAULT_BOARD_FILTER_PARAMS);
      expect(parseBoardFilterParams(undefined)).toEqual(DEFAULT_BOARD_FILTER_PARAMS);
      expect(parseBoardFilterParams(new URLSearchParams())).toEqual(
        DEFAULT_BOARD_FILTER_PARAMS
      );
      expect(parseBoardFilterParams({})).toEqual(DEFAULT_BOARD_FILTER_PARAMS);
    });

    it("parses view correctly and falls back to board for unknown values", () => {
      expect(parseBoardFilterParams(new URLSearchParams("view=table")).view).toBe(
        "table"
      );
      expect(parseBoardFilterParams(new URLSearchParams("view=board")).view).toBe(
        "board"
      );
      expect(
        parseBoardFilterParams(new URLSearchParams("view=invalid_view")).view
      ).toBe("board");
    });

    it("parses search query q and trims whitespace", () => {
      expect(
        parseBoardFilterParams(new URLSearchParams("q=%20%20Stripe%20%20")).q
      ).toBe("Stripe");
      expect(parseBoardFilterParams(new URLSearchParams("q=")).q).toBe("");
    });

    it("parses status filter and falls back to ALL for invalid status", () => {
      expect(
        parseBoardFilterParams(new URLSearchParams("status=INTERVIEW")).status
      ).toBe("INTERVIEW");
      expect(
        parseBoardFilterParams(new URLSearchParams("status=OFFER")).status
      ).toBe("OFFER");
      expect(
        parseBoardFilterParams(new URLSearchParams("status=UNKNOWN_STATUS")).status
      ).toBe("ALL");
      expect(parseBoardFilterParams(new URLSearchParams("status=")).status).toBe(
        "ALL"
      );
    });

    it("parses source filter and falls back to ALL for invalid source", () => {
      expect(
        parseBoardFilterParams(new URLSearchParams("source=REFERRAL")).source
      ).toBe("REFERRAL");
      expect(
        parseBoardFilterParams(new URLSearchParams("source=COMPANY_SITE")).source
      ).toBe("COMPANY_SITE");
      expect(
        parseBoardFilterParams(new URLSearchParams("source=INVALID_SOURCE")).source
      ).toBe("ALL");
    });

    it("parses priority filter and falls back to ALL for invalid priority", () => {
      expect(
        parseBoardFilterParams(new URLSearchParams("priority=HIGH")).priority
      ).toBe("HIGH");
      expect(
        parseBoardFilterParams(new URLSearchParams("priority=LOW")).priority
      ).toBe("LOW");
      expect(
        parseBoardFilterParams(new URLSearchParams("priority=SUPER_HIGH")).priority
      ).toBe("ALL");
    });

    it("parses locationType filter and falls back to ALL for invalid type", () => {
      expect(
        parseBoardFilterParams(new URLSearchParams("locationType=REMOTE"))
          .locationType
      ).toBe("REMOTE");
      expect(
        parseBoardFilterParams(new URLSearchParams("locationType=HYBRID"))
          .locationType
      ).toBe("HYBRID");
      expect(
        parseBoardFilterParams(new URLSearchParams("locationType=UNKNOWN"))
          .locationType
      ).toBe("ALL");
    });

    it("parses resumeVersionId and falls back to ALL when empty", () => {
      expect(
        parseBoardFilterParams(new URLSearchParams("resumeVersionId=cuid_res_123"))
          .resumeVersionId
      ).toBe("cuid_res_123");
      expect(
        parseBoardFilterParams(new URLSearchParams("resumeVersionId=%20%20"))
          .resumeVersionId
      ).toBe("ALL");
      expect(
        parseBoardFilterParams(new URLSearchParams("")).resumeVersionId
      ).toBe("ALL");
    });

    it("parses date ranges from and to with whitespace trimmed", () => {
      const parsed = parseBoardFilterParams(
        new URLSearchParams("from=%202026-01-01%20&to=%202026-03-31%20")
      );
      expect(parsed.from).toBe("2026-01-01");
      expect(parsed.to).toBe("2026-03-31");
    });

    it("parses archived flag from boolean string or 1", () => {
      expect(
        parseBoardFilterParams(new URLSearchParams("archived=true")).archived
      ).toBe(true);
      expect(
        parseBoardFilterParams(new URLSearchParams("archived=1")).archived
      ).toBe(true);
      expect(
        parseBoardFilterParams(new URLSearchParams("archived=false")).archived
      ).toBe(false);
      expect(
        parseBoardFilterParams(new URLSearchParams("archived=0")).archived
      ).toBe(false);
      expect(parseBoardFilterParams(new URLSearchParams("")).archived).toBe(
        false
      );
    });

    it("parses sort parameter as combined col:dir format", () => {
      const parsed1 = parseBoardFilterParams(
        new URLSearchParams("sort=salaryMax:asc")
      );
      expect(parsed1.sortBy).toBe("salaryMax");
      expect(parsed1.sortDir).toBe("asc");

      const parsed2 = parseBoardFilterParams(
        new URLSearchParams("sort=company:desc")
      );
      expect(parsed2.sortBy).toBe("company");
      expect(parsed2.sortDir).toBe("desc");

      const parsedOnlyKey = parseBoardFilterParams(
        new URLSearchParams("sort=role")
      );
      expect(parsedOnlyKey.sortBy).toBe("role");
      expect(parsedOnlyKey.sortDir).toBe("desc");

      const parsedInvalidKey = parseBoardFilterParams(
        new URLSearchParams("sort=notAColumn:asc")
      );
      expect(parsedInvalidKey.sortBy).toBe("appliedDate");
      expect(parsedInvalidKey.sortDir).toBe("asc");

      const parsedInvalidBoth = parseBoardFilterParams(
        new URLSearchParams("sort=notAColumn:notADir")
      );
      expect(parsedInvalidBoth.sortBy).toBe("appliedDate");
      expect(parsedInvalidBoth.sortDir).toBe("desc");
    });

    it("parses separate sortBy and sortDir params", () => {
      const parsed = parseBoardFilterParams(
        new URLSearchParams("sortBy=priority&sortDir=asc")
      );
      expect(parsed.sortBy).toBe("priority");
      expect(parsed.sortDir).toBe("asc");
    });

    it("parses page and pageSize with numeric clamping and fallback", () => {
      const valid = parseBoardFilterParams(
        new URLSearchParams("page=2&pageSize=20")
      );
      expect(valid.page).toBe(2);
      expect(valid.pageSize).toBe(20);

      const invalid = parseBoardFilterParams(
        new URLSearchParams("page=-5&pageSize=notANum")
      );
      expect(invalid.page).toBe(1);
      expect(invalid.pageSize).toBe(10);
    });

    it("parses plain record objects and array values accurately", () => {
      const parsed = parseBoardFilterParams({
        view: ["table"],
        q: ["OpenAI"],
        status: "INTERVIEW",
        page: "3",
        pageSize: "50",
      });
      expect(parsed.view).toBe("table");
      expect(parsed.q).toBe("OpenAI");
      expect(parsed.status).toBe("INTERVIEW");
      expect(parsed.page).toBe(3);
      expect(parsed.pageSize).toBe(50);
    });
  });

  describe("serializeBoardFilterParams", () => {
    it("returns empty string when serializing empty partial or defaults", () => {
      const serialized = serializeBoardFilterParams({});
      expect(serialized).toBe("");

      const serializedDefaults = serializeBoardFilterParams(
        DEFAULT_BOARD_FILTER_PARAMS
      );
      expect(serializedDefaults).toBe("");
    });

    it("serializes view=table and omits view=board", () => {
      expect(serializeBoardFilterParams({ view: "table" })).toBe("view=table");
      expect(serializeBoardFilterParams({ view: "board" })).toBe("");
    });

    it("serializes search query q and deletes when empty string", () => {
      expect(serializeBoardFilterParams({ q: "Google" })).toBe("q=Google");
      expect(serializeBoardFilterParams({ q: "" })).toBe("");
    });

    it("serializes filter criteria and omits ALL", () => {
      expect(serializeBoardFilterParams({ status: "PHONE_SCREEN" })).toBe(
        "status=PHONE_SCREEN"
      );
      expect(serializeBoardFilterParams({ status: "ALL" })).toBe("");

      expect(serializeBoardFilterParams({ source: "REFERRAL" })).toBe(
        "source=REFERRAL"
      );
      expect(serializeBoardFilterParams({ source: "ALL" })).toBe("");

      expect(serializeBoardFilterParams({ priority: "HIGH" })).toBe(
        "priority=HIGH"
      );
      expect(serializeBoardFilterParams({ priority: "ALL" })).toBe("");

      expect(serializeBoardFilterParams({ locationType: "REMOTE" })).toBe(
        "locationType=REMOTE"
      );
      expect(serializeBoardFilterParams({ locationType: "ALL" })).toBe("");

      expect(serializeBoardFilterParams({ resumeVersionId: "res_abc" })).toBe(
        "resumeVersionId=res_abc"
      );
      expect(serializeBoardFilterParams({ resumeVersionId: "ALL" })).toBe("");
    });

    it("serializes from, to, and archived flags accurately", () => {
      const res = serializeBoardFilterParams({
        from: "2026-01-01",
        to: "2026-03-31",
        archived: true,
      });
      const params = new URLSearchParams(res);
      expect(params.get("from")).toBe("2026-01-01");
      expect(params.get("to")).toBe("2026-03-31");
      expect(params.get("archived")).toBe("true");
    });

    it("serializes custom sort as col:dir and omits default sort", () => {
      const customSort = serializeBoardFilterParams({
        sortBy: "salaryMax",
        sortDir: "asc",
      });
      const params = new URLSearchParams(customSort);
      expect(params.get("sort")).toBe("salaryMax:asc");

      const defaultSort = serializeBoardFilterParams({
        sortBy: "appliedDate",
        sortDir: "desc",
      });
      expect(defaultSort).toBe("");
    });

    it("serializes page and pageSize only when non-default", () => {
      expect(serializeBoardFilterParams({ page: 2 })).toBe("page=2");
      expect(serializeBoardFilterParams({ page: 1 })).toBe("");

      expect(serializeBoardFilterParams({ pageSize: 25 })).toBe("pageSize=25");
      expect(serializeBoardFilterParams({ pageSize: 10 })).toBe("");
    });

    it("preserves existing query parameters such as app=ID", () => {
      const existing = new URLSearchParams("app=app_seed_42&other=value");
      const serialized = serializeBoardFilterParams(
        { view: "table", status: "OFFER" },
        existing
      );

      const params = new URLSearchParams(serialized);
      expect(params.get("app")).toBe("app_seed_42");
      expect(params.get("other")).toBe("value");
      expect(params.get("view")).toBe("table");
      expect(params.get("status")).toBe("OFFER");
    });
  });

  describe("countActiveFilters", () => {
    it("returns 0 for default parameters", () => {
      expect(countActiveFilters(DEFAULT_BOARD_FILTER_PARAMS)).toBe(0);
    });

    it("returns 0 when changing non-filter settings like view, page, pageSize, and sort", () => {
      const params: BoardFilterParams = {
        ...DEFAULT_BOARD_FILTER_PARAMS,
        view: "table",
        page: 4,
        pageSize: 50,
        sortBy: "salaryMax",
        sortDir: "asc",
      };
      expect(countActiveFilters(params)).toBe(0);
    });

    it("increments count accurately for each active filter dimension", () => {
      expect(
        countActiveFilters({ ...DEFAULT_BOARD_FILTER_PARAMS, q: "Stripe" })
      ).toBe(1);
      expect(
        countActiveFilters({ ...DEFAULT_BOARD_FILTER_PARAMS, status: "OFFER" })
      ).toBe(1);
      expect(
        countActiveFilters({
          ...DEFAULT_BOARD_FILTER_PARAMS,
          source: "COMPANY_SITE",
        })
      ).toBe(1);
      expect(
        countActiveFilters({ ...DEFAULT_BOARD_FILTER_PARAMS, priority: "HIGH" })
      ).toBe(1);
      expect(
        countActiveFilters({
          ...DEFAULT_BOARD_FILTER_PARAMS,
          locationType: "HYBRID",
        })
      ).toBe(1);
      expect(
        countActiveFilters({
          ...DEFAULT_BOARD_FILTER_PARAMS,
          resumeVersionId: "res_42",
        })
      ).toBe(1);
      expect(
        countActiveFilters({
          ...DEFAULT_BOARD_FILTER_PARAMS,
          from: "2026-01-01",
        })
      ).toBe(1);
      expect(
        countActiveFilters({ ...DEFAULT_BOARD_FILTER_PARAMS, to: "2026-03-31" })
      ).toBe(1);
      expect(
        countActiveFilters({ ...DEFAULT_BOARD_FILTER_PARAMS, archived: true })
      ).toBe(1);
    });

    it("returns 9 when all filter dimensions are active", () => {
      const allActive: BoardFilterParams = {
        view: "table",
        q: "Engineer",
        status: "INTERVIEW",
        source: "REFERRAL",
        priority: "HIGH",
        locationType: "REMOTE",
        resumeVersionId: "res_frontend",
        from: "2026-01-01",
        to: "2026-03-01",
        archived: true,
        sortBy: "appliedDate",
        sortDir: "desc",
        page: 1,
        pageSize: 10,
      };
      expect(countActiveFilters(allActive)).toBe(9);
    });
  });

  describe("filterAndSortApplications", () => {
    const app1 = createMockApplication({
      id: "app_1",
      company: "Anthropic",
      role: "Prompt Engineer",
      status: "INTERVIEW",
      priority: "HIGH",
      locationType: "REMOTE",
      location: "San Francisco, CA",
      source: "REFERRAL",
      resumeVersionId: "res_ml",
      salaryMax: 210000,
      appliedDate: new Date("2026-01-10T10:00:00.000Z"),
      followUpDate: new Date("2026-01-20T10:00:00.000Z"),
      archivedAt: null,
    });

    const app2 = createMockApplication({
      id: "app_2",
      company: "Google",
      role: "Senior Distributed Systems Engineer",
      status: "PHONE_SCREEN",
      priority: "MEDIUM",
      locationType: "HYBRID",
      location: "Mountain View, CA",
      source: "COMPANY_SITE",
      resumeVersionId: "res_backend",
      salaryMax: 240000,
      appliedDate: new Date("2026-01-25T10:00:00.000Z"),
      followUpDate: new Date("2026-02-05T10:00:00.000Z"),
      archivedAt: null,
    });

    const app3 = createMockApplication({
      id: "app_3",
      company: "Apple",
      role: "iOS Engineer",
      status: "APPLIED",
      priority: "LOW",
      locationType: "ONSITE",
      location: "Cupertino, CA",
      source: "LINKEDIN",
      resumeVersionId: "res_mobile",
      salaryMax: 175000,
      appliedDate: new Date("2026-02-10T10:00:00.000Z"),
      followUpDate: null,
      archivedAt: null,
    });

    const appArchived = createMockApplication({
      id: "app_4",
      company: "Legacy Startup",
      role: "Full Stack Engineer",
      status: "REJECTED",
      priority: "LOW",
      locationType: "REMOTE",
      location: "Remote, US",
      source: "OTHER",
      resumeVersionId: "res_general",
      salaryMax: 140000,
      appliedDate: new Date("2025-12-01T10:00:00.000Z"),
      followUpDate: null,
      archivedAt: new Date("2026-01-01T10:00:00.000Z"),
    });

    const testApps = [app1, app2, app3, appArchived];

    it("excludes archived applications by default and includes them when archived: true", () => {
      const defaultResult = filterAndSortApplications(
        testApps,
        DEFAULT_BOARD_FILTER_PARAMS
      );
      expect(defaultResult.map((a) => a.id)).toEqual(["app_3", "app_2", "app_1"]);

      const withArchivedResult = filterAndSortApplications(testApps, {
        ...DEFAULT_BOARD_FILTER_PARAMS,
        archived: true,
      });
      expect(withArchivedResult.map((a) => a.id)).toContain("app_4");
      expect(withArchivedResult.length).toBe(4);
    });

    it("filters by search query q across company, role, and location (case-insensitive)", () => {
      // By Company
      const byCompany = filterAndSortApplications(testApps, {
        ...DEFAULT_BOARD_FILTER_PARAMS,
        q: "google",
      });
      expect(byCompany.map((a) => a.id)).toEqual(["app_2"]);

      // By Role
      const byRole = filterAndSortApplications(testApps, {
        ...DEFAULT_BOARD_FILTER_PARAMS,
        q: "prompt",
      });
      expect(byRole.map((a) => a.id)).toEqual(["app_1"]);

      // By Location
      const byLocation = filterAndSortApplications(testApps, {
        ...DEFAULT_BOARD_FILTER_PARAMS,
        q: "cupertino",
      });
      expect(byLocation.map((a) => a.id)).toEqual(["app_3"]);

      // No match
      const noMatch = filterAndSortApplications(testApps, {
        ...DEFAULT_BOARD_FILTER_PARAMS,
        q: "NonExistentCompany",
      });
      expect(noMatch).toEqual([]);
    });

    it("filters by status, priority, locationType, source, and resumeVersionId", () => {
      // Status
      const byStatus = filterAndSortApplications(testApps, {
        ...DEFAULT_BOARD_FILTER_PARAMS,
        status: "INTERVIEW",
      });
      expect(byStatus.map((a) => a.id)).toEqual(["app_1"]);

      // Priority
      const byPriority = filterAndSortApplications(testApps, {
        ...DEFAULT_BOARD_FILTER_PARAMS,
        priority: "HIGH",
      });
      expect(byPriority.map((a) => a.id)).toEqual(["app_1"]);

      // LocationType
      const byLocationType = filterAndSortApplications(testApps, {
        ...DEFAULT_BOARD_FILTER_PARAMS,
        locationType: "ONSITE",
      });
      expect(byLocationType.map((a) => a.id)).toEqual(["app_3"]);

      // Source
      const bySource = filterAndSortApplications(testApps, {
        ...DEFAULT_BOARD_FILTER_PARAMS,
        source: "COMPANY_SITE",
      });
      expect(bySource.map((a) => a.id)).toEqual(["app_2"]);

      // ResumeVersionId
      const byResume = filterAndSortApplications(testApps, {
        ...DEFAULT_BOARD_FILTER_PARAMS,
        resumeVersionId: "res_mobile",
      });
      expect(byResume.map((a) => a.id)).toEqual(["app_3"]);
    });

    it("filters by from and to appliedDate range", () => {
      // Between Jan 20 and Feb 28 -> app2 and app3
      const ranged = filterAndSortApplications(testApps, {
        ...DEFAULT_BOARD_FILTER_PARAMS,
        from: "2026-01-20",
        to: "2026-02-28",
      });
      expect(ranged.map((a) => a.id)).toEqual(["app_3", "app_2"]);

      // After Feb 01 -> app3
      const afterFeb = filterAndSortApplications(testApps, {
        ...DEFAULT_BOARD_FILTER_PARAMS,
        from: "2026-02-01",
      });
      expect(afterFeb.map((a) => a.id)).toEqual(["app_3"]);

      // Before Jan 15 -> app1 (excluding archived app4)
      const beforeJan15 = filterAndSortApplications(testApps, {
        ...DEFAULT_BOARD_FILTER_PARAMS,
        to: "2026-01-15",
      });
      expect(beforeJan15.map((a) => a.id)).toEqual(["app_1"]);
    });

    it("sorts accurately by company asc and desc", () => {
      const asc = filterAndSortApplications(testApps, {
        ...DEFAULT_BOARD_FILTER_PARAMS,
        sortBy: "company",
        sortDir: "asc",
      });
      expect(asc.map((a) => a.company)).toEqual(["Anthropic", "Apple", "Google"]);

      const desc = filterAndSortApplications(testApps, {
        ...DEFAULT_BOARD_FILTER_PARAMS,
        sortBy: "company",
        sortDir: "desc",
      });
      expect(desc.map((a) => a.company)).toEqual(["Google", "Apple", "Anthropic"]);
    });

    it("sorts accurately by salaryMax asc and desc", () => {
      const asc = filterAndSortApplications(testApps, {
        ...DEFAULT_BOARD_FILTER_PARAMS,
        sortBy: "salaryMax",
        sortDir: "asc",
      });
      expect(asc.map((a) => a.salaryMax)).toEqual([175000, 210000, 240000]);

      const desc = filterAndSortApplications(testApps, {
        ...DEFAULT_BOARD_FILTER_PARAMS,
        sortBy: "salaryMax",
        sortDir: "desc",
      });
      expect(desc.map((a) => a.salaryMax)).toEqual([240000, 210000, 175000]);
    });

    it("sorts accurately by appliedDate asc and desc", () => {
      const asc = filterAndSortApplications(testApps, {
        ...DEFAULT_BOARD_FILTER_PARAMS,
        sortBy: "appliedDate",
        sortDir: "asc",
      });
      expect(asc.map((a) => a.id)).toEqual(["app_1", "app_2", "app_3"]);

      const desc = filterAndSortApplications(testApps, {
        ...DEFAULT_BOARD_FILTER_PARAMS,
        sortBy: "appliedDate",
        sortDir: "desc",
      });
      expect(desc.map((a) => a.id)).toEqual(["app_3", "app_2", "app_1"]);
    });

    it("sorts accurately by followUpDate asc and desc handling null values", () => {
      const asc = filterAndSortApplications(testApps, {
        ...DEFAULT_BOARD_FILTER_PARAMS,
        sortBy: "followUpDate",
        sortDir: "asc",
      });
      // null followUpDate gets 0 so app_3 comes first in asc
      expect(asc.map((a) => a.id)).toEqual(["app_3", "app_1", "app_2"]);

      const desc = filterAndSortApplications(testApps, {
        ...DEFAULT_BOARD_FILTER_PARAMS,
        sortBy: "followUpDate",
        sortDir: "desc",
      });
      expect(desc.map((a) => a.id)).toEqual(["app_2", "app_1", "app_3"]);
    });
  });
});
