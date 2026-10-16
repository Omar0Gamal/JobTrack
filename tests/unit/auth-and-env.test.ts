import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  signGuestUserId,
  verifyGuestCookieValue,
  GUEST_COOKIE_NAME,
} from "@/server/auth/guest-cookie";
import {
  getAppMode,
  isDemoMode,
  isPersonalMode,
  getAllowedEmails,
  getAuthSecret,
  getCronSecret,
} from "@/lib/env";
import {
  APPLICATION_STATUS_ORDER,
  ApplicationStatusSchema,
  PRIORITY_ORDER,
  PrioritySchema,
  LOCATION_TYPE_ORDER,
  LocationTypeSchema,
  APPLICATION_SOURCE_ORDER,
  ApplicationSourceSchema,
  INTERVIEW_TYPE_ORDER,
  InterviewTypeSchema,
  INTERVIEW_OUTCOME_ORDER,
  InterviewOutcomeSchema,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  LOCATION_TYPE_LABELS,
  LOCATION_TYPE_COLORS,
  APPLICATION_SOURCE_LABELS,
  APPLICATION_SOURCE_COLORS,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_TYPE_COLORS,
  INTERVIEW_OUTCOME_LABELS,
  INTERVIEW_OUTCOME_COLORS,
} from "@/schemas/enums";

describe("Authentication, Guest Session & Environment Unit Tests", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("Guest Cookie HMAC Security", () => {
    it("should export correct GUEST_COOKIE_NAME", () => {
      expect(GUEST_COOKIE_NAME).toBe("jt_guest_id");
    });

    it("should sign a userId and successfully verify it", () => {
      const userId = "cuid_test_123456789";
      const signed = signGuestUserId(userId);

      expect(signed).toContain(".");
      expect(signed.startsWith(`${userId}.`)).toBe(true);

      const verified = verifyGuestCookieValue(signed);
      expect(verified).toBe(userId);
    });

    it("should reject tampered userId in signed cookie", () => {
      const originalUserId = "user_abc_original";
      const signed = signGuestUserId(originalUserId);
      const parts = signed.split(".");
      expect(parts).toHaveLength(2);

      const tamperedCookie = `user_xyz_hacked.${parts[1]}`;
      const verified = verifyGuestCookieValue(tamperedCookie);
      expect(verified).toBeNull();
    });

    it("should reject tampered signature in signed cookie", () => {
      const userId = "user_secure_test";
      const signed = signGuestUserId(userId);
      const parts = signed.split(".");
      const sig = parts[1]!;

      // Change one character in the hex signature
      const tamperedSig = sig.startsWith("a") ? `b${sig.slice(1)}` : `a${sig.slice(1)}`;
      const tamperedCookie = `${userId}.${tamperedSig}`;

      const verified = verifyGuestCookieValue(tamperedCookie);
      expect(verified).toBeNull();
    });

    it("should reject invalid, missing, or malformed cookie values", () => {
      expect(verifyGuestCookieValue(undefined)).toBeNull();
      expect(verifyGuestCookieValue("")).toBeNull();
      expect(verifyGuestCookieValue("nodotsinthisvalue")).toBeNull();
      expect(verifyGuestCookieValue(".starts-with-dot")).toBeNull();
      expect(verifyGuestCookieValue("ends-with-dot.")).toBeNull();
      expect(verifyGuestCookieValue("short.1234")).toBeNull(); // signature too short
    });

    it("should throw when attempting to sign an empty userId", () => {
      expect(() => signGuestUserId("")).toThrow("Cannot sign empty userId");
    });
  });

  describe("Environment Configuration & Helpers", () => {
    it("should default to demo mode when APP_MODE is unset", () => {
      delete process.env.APP_MODE;
      expect(getAppMode()).toBe("demo");
      expect(isDemoMode()).toBe(true);
      expect(isPersonalMode()).toBe(false);
    });

    it("should detect personal mode when APP_MODE='personal'", () => {
      process.env.APP_MODE = "personal";
      expect(getAppMode()).toBe("personal");
      expect(isPersonalMode()).toBe(true);
      expect(isDemoMode()).toBe(false);
    });

    it("should handle case-insensitive or whitespace in APP_MODE", () => {
      process.env.APP_MODE = "  PERSONAL  ";
      expect(getAppMode()).toBe("personal");

      process.env.APP_MODE = "DEMO";
      expect(getAppMode()).toBe("demo");
    });

    it("should parse ALLOWED_EMAILS correctly with trimming and lowercasing", () => {
      process.env.ALLOWED_EMAILS = " Alice@Example.COM,  bob@work.io , Charlie@domain.org ";
      const emails = getAllowedEmails();
      expect(emails).toEqual(["alice@example.com", "bob@work.io", "charlie@domain.org"]);
    });

    it("should return empty array for empty or unset ALLOWED_EMAILS", () => {
      delete process.env.ALLOWED_EMAILS;
      expect(getAllowedEmails()).toEqual([]);

      process.env.ALLOWED_EMAILS = "   ";
      expect(getAllowedEmails()).toEqual([]);
    });

    it("should return fallback AUTH_SECRET in non-production", () => {
      delete process.env.AUTH_SECRET;
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "test",
        configurable: true,
        writable: true,
      });
      const secret = getAuthSecret();
      expect(secret).toBeDefined();
      expect(secret.length).toBeGreaterThanOrEqual(32);
    });

    it("should parse CRON_SECRET", () => {
      delete process.env.CRON_SECRET;
      expect(getCronSecret()).toBeUndefined();

      process.env.CRON_SECRET = "my-secret-cron-token";
      expect(getCronSecret()).toBe("my-secret-cron-token");
    });
  });

  describe("Enums & Status Schema Order", () => {
    it("should define APPLICATION_STATUS_ORDER with all 6 statuses in sequence", () => {
      expect(APPLICATION_STATUS_ORDER).toEqual([
        "WISHLIST",
        "APPLIED",
        "PHONE_SCREEN",
        "INTERVIEW",
        "OFFER",
        "REJECTED",
      ]);
    });

    it("should validate all application statuses", () => {
      for (const status of APPLICATION_STATUS_ORDER) {
        expect(ApplicationStatusSchema.parse(status)).toBe(status);
        expect(APPLICATION_STATUS_LABELS[status]).toBeDefined();
        expect(APPLICATION_STATUS_COLORS[status]).toBeDefined();
      }

      expect(() => ApplicationStatusSchema.parse("INVALID_STATUS")).toThrow();
    });

    it("should validate all priorities", () => {
      for (const priority of PRIORITY_ORDER) {
        expect(PrioritySchema.parse(priority)).toBe(priority);
        expect(PRIORITY_LABELS[priority]).toBeDefined();
        expect(PRIORITY_COLORS[priority]).toBeDefined();
      }

      expect(() => PrioritySchema.parse("CRITICAL")).toThrow();
    });

    it("should validate all location types", () => {
      for (const loc of LOCATION_TYPE_ORDER) {
        expect(LocationTypeSchema.parse(loc)).toBe(loc);
        expect(LOCATION_TYPE_LABELS[loc]).toBeDefined();
        expect(LOCATION_TYPE_COLORS[loc]).toBeDefined();
      }

      expect(() => LocationTypeSchema.parse("HYPOTHETICAL")).toThrow();
    });

    it("should validate all application sources", () => {
      for (const source of APPLICATION_SOURCE_ORDER) {
        expect(ApplicationSourceSchema.parse(source)).toBe(source);
        expect(APPLICATION_SOURCE_LABELS[source]).toBeDefined();
        expect(APPLICATION_SOURCE_COLORS[source]).toBeDefined();
      }

      expect(() => ApplicationSourceSchema.parse("NEWSPAPER")).toThrow();
    });

    it("should validate all interview types", () => {
      for (const itype of INTERVIEW_TYPE_ORDER) {
        expect(InterviewTypeSchema.parse(itype)).toBe(itype);
        expect(INTERVIEW_TYPE_LABELS[itype]).toBeDefined();
        expect(INTERVIEW_TYPE_COLORS[itype]).toBeDefined();
      }

      expect(() => InterviewTypeSchema.parse("COFFEE_CHAT")).toThrow();
    });

    it("should validate all interview outcomes", () => {
      for (const outcome of INTERVIEW_OUTCOME_ORDER) {
        expect(InterviewOutcomeSchema.parse(outcome)).toBe(outcome);
        expect(INTERVIEW_OUTCOME_LABELS[outcome]).toBeDefined();
        expect(INTERVIEW_OUTCOME_COLORS[outcome]).toBeDefined();
      }

      expect(() => InterviewOutcomeSchema.parse("MAYBE")).toThrow();
    });
  });
});
