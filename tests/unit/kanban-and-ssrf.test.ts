import { describe, it, expect, beforeEach } from "vitest";
import {
  POSITION_STEP,
  MIN_POSITION_GAP,
  calculateNewCardPosition,
  calculateMovePosition,
  generateRebalancedPositions,
} from "@/lib/kanban/positioning";
import {
  isPrivateOrReservedIp,
  validateSafeExternalUrl,
} from "@/server/security/ssrf-guard";
import {
  checkRateLimit,
  resetRateLimitStore,
} from "@/server/security/rate-limiter";
import {
  QuickAddApplicationSchema,
  FullApplicationSchema,
  UpdateApplicationSchema,
  MoveApplicationCardSchema,
} from "@/schemas/application.schema";
import { CreateNoteSchema, DeleteNoteSchema } from "@/schemas/note.schema";
import { CreateContactSchema, UpdateContactSchema } from "@/schemas/contact.schema";

describe("Kanban, SSRF Guard, Rate Limiter & CRUD Schemas", () => {
  describe("Kanban Positioning Logic", () => {
    it("should export correct constants", () => {
      expect(POSITION_STEP).toBe(1000);
      expect(MIN_POSITION_GAP).toBe(0.001);
    });

    it("should calculate new card position at column bottom", () => {
      expect(calculateNewCardPosition([])).toBe(1000);
      expect(calculateNewCardPosition([1000])).toBe(2000);
      expect(calculateNewCardPosition([1000, 2000, 3000])).toBe(4000);
      expect(calculateNewCardPosition([500, 1500])).toBe(2500);
    });

    it("should calculate move position for empty column (both null)", () => {
      const res = calculateMovePosition(null, null);
      expect(res.position).toBe(1000);
      expect(res.needsRebalance).toBe(false);
    });

    it("should calculate move position for insertion at top (prev null, next non-null)", () => {
      const res = calculateMovePosition(null, 1000);
      expect(res.position).toBe(500);
      expect(res.needsRebalance).toBe(false);
    });

    it("should calculate move position for insertion at bottom (prev non-null, next null)", () => {
      const res = calculateMovePosition(2000, null);
      expect(res.position).toBe(3000);
      expect(res.needsRebalance).toBe(false);
    });

    it("should calculate move position between two cards (both non-null)", () => {
      const res = calculateMovePosition(1000, 2000);
      expect(res.position).toBe(1500);
      expect(res.needsRebalance).toBe(false);
    });

    it("should flag needsRebalance when gap is less than MIN_POSITION_GAP", () => {
      const tinyGapRes = calculateMovePosition(1000.0001, 1000.0006);
      expect(tinyGapRes.position).toBeCloseTo(1000.00035, 5);
      expect(tinyGapRes.needsRebalance).toBe(true);

      const tinyTopRes = calculateMovePosition(null, 0.001);
      expect(tinyTopRes.position).toBe(0.0005);
      expect(tinyTopRes.needsRebalance).toBe(true);
    });

    it("should generate rebalanced sequential positions (1000, 2000, 3000, ...)", () => {
      const ids = ["app-1", "app-2", "app-3", "app-4"];
      const rebalanced = generateRebalancedPositions(ids);
      expect(rebalanced).toEqual([
        { id: "app-1", position: 1000 },
        { id: "app-2", position: 2000 },
        { id: "app-3", position: 3000 },
        { id: "app-4", position: 4000 },
      ]);
    });
  });

  describe("SSRF Protection & IP Range Validation", () => {
    it("should detect and block IPv4 loopback and private ranges", () => {
      // Loopback
      expect(isPrivateOrReservedIp("127.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("127.255.255.255")).toBe(true);

      // RFC 1918 Private
      expect(isPrivateOrReservedIp("10.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("10.255.255.255")).toBe(true);
      expect(isPrivateOrReservedIp("172.16.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("172.31.255.255")).toBe(true);
      expect(isPrivateOrReservedIp("192.168.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("192.168.1.100")).toBe(true);

      // Link-local / Cloud metadata (AWS, GCP, Azure)
      expect(isPrivateOrReservedIp("169.254.169.254")).toBe(true);
      expect(isPrivateOrReservedIp("169.254.1.1")).toBe(true);

      // 0.0.0.0/8
      expect(isPrivateOrReservedIp("0.0.0.0")).toBe(true);

      // CGNAT 100.64.0.0/10
      expect(isPrivateOrReservedIp("100.64.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("100.127.255.255")).toBe(true);

      // 192.0.0.0/24 & 198.18.0.0/15
      expect(isPrivateOrReservedIp("192.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("198.18.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("198.19.0.1")).toBe(true);

      // Multicast & Reserved
      expect(isPrivateOrReservedIp("224.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("239.255.255.255")).toBe(true);
      expect(isPrivateOrReservedIp("240.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("255.255.255.255")).toBe(true);
    });

    it("should detect and block IPv6 loopback, private, and reserved ranges", () => {
      // Loopback & Unspecified
      expect(isPrivateOrReservedIp("::1")).toBe(true);
      expect(isPrivateOrReservedIp("::")).toBe(true);

      // Unique Local Addresses (fc00::/7)
      expect(isPrivateOrReservedIp("fc00::1")).toBe(true);
      expect(isPrivateOrReservedIp("fd12:3456:789a::1")).toBe(true);

      // Link-Local (fe80::/10)
      expect(isPrivateOrReservedIp("fe80::1")).toBe(true);

      // Multicast (ff00::/8)
      expect(isPrivateOrReservedIp("ff02::1")).toBe(true);

      // IPv4-mapped IPv6
      expect(isPrivateOrReservedIp("::ffff:127.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("::ffff:10.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("::ffff:192.168.1.1")).toBe(true);
      expect(isPrivateOrReservedIp("::ffff:169.254.169.254")).toBe(true);
    });

    it("should permit legitimate public IP addresses", () => {
      expect(isPrivateOrReservedIp("8.8.8.8")).toBe(false);
      expect(isPrivateOrReservedIp("1.1.1.1")).toBe(false);
      expect(isPrivateOrReservedIp("93.184.216.34")).toBe(false);
      expect(isPrivateOrReservedIp("104.16.132.229")).toBe(false);
      expect(isPrivateOrReservedIp("2607:f8b0:4005:805::200e")).toBe(false);
    });

    it("should validate and block unsafe external URLs", async () => {
      // Localhost & private IPs
      const localhostRes = await validateSafeExternalUrl("http://localhost:3000/api");
      expect(localhostRes.safe).toBe(false);

      const loopbackIpRes = await validateSafeExternalUrl("http://127.0.0.1:8080");
      expect(loopbackIpRes.safe).toBe(false);

      const privateIpRes = await validateSafeExternalUrl("http://192.168.1.1/admin");
      expect(privateIpRes.safe).toBe(false);

      const awsMetadataRes = await validateSafeExternalUrl("http://169.254.169.254/latest/meta-data/");
      expect(awsMetadataRes.safe).toBe(false);

      const ipv6LoopbackRes = await validateSafeExternalUrl("http://[::1]/secret");
      expect(ipv6LoopbackRes.safe).toBe(false);

      // Disallowed protocols
      const ftpRes = await validateSafeExternalUrl("ftp://files.example.com/data");
      expect(ftpRes.safe).toBe(false);

      const fileRes = await validateSafeExternalUrl("file:///etc/passwd");
      expect(fileRes.safe).toBe(false);

      // Internal domains
      const localDomainRes = await validateSafeExternalUrl("http://database.local");
      expect(localDomainRes.safe).toBe(false);

      const internalDomainRes = await validateSafeExternalUrl("http://auth.internal");
      expect(internalDomainRes.safe).toBe(false);

      // Safe external URL
      const safeRes = await validateSafeExternalUrl("https://example.com/job/123");
      expect(safeRes.safe).toBe(true);
      if (safeRes.safe) {
        expect(safeRes.url.hostname).toBe("example.com");
      }
    });
  });

  describe("Rate Limiter (Sliding Window)", () => {
    beforeEach(() => {
      resetRateLimitStore();
    });

    it("should allow requests up to the defined limit", () => {
      const key = "test-user-rate-limit";
      for (let i = 1; i <= 10; i++) {
        const res = checkRateLimit(key, 10, 60_000);
        expect(res.allowed).toBe(true);
        expect(res.remaining).toBe(10 - i);
      }

      // 11th request exceeds limit
      const blockedRes = checkRateLimit(key, 10, 60_000);
      expect(blockedRes.allowed).toBe(false);
      expect(blockedRes.remaining).toBe(0);
      expect(blockedRes.resetAt).toBeGreaterThan(Date.now());
    });

    it("should isolate limits across different keys", () => {
      const keyA = "user-a";
      const keyB = "user-b";

      for (let i = 0; i < 5; i++) {
        checkRateLimit(keyA, 5, 60_000);
      }
      expect(checkRateLimit(keyA, 5, 60_000).allowed).toBe(false);

      // keyB is unaffected
      expect(checkRateLimit(keyB, 5, 60_000).allowed).toBe(true);
    });
  });

  describe("Application Zod Schemas", () => {
    it("should validate valid QuickAdd application input", () => {
      const valid = {
        company: "Stripe",
        role: "Senior Software Engineer",
      };
      const result = QuickAddApplicationSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.company).toBe("Stripe");
        expect(result.data.role).toBe("Senior Software Engineer");
        expect(result.data.status).toBe("APPLIED");
      }
    });

    it("should reject QuickAdd application with empty fields", () => {
      const invalid = { company: "   ", role: "" };
      const result = QuickAddApplicationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject FullApplication when salaryMax is less than salaryMin", () => {
      const invalid = {
        company: "Netflix",
        role: "Staff Engineer",
        salaryMin: 180000,
        salaryMax: 150000, // Invalid: max < min
      };
      const result = FullApplicationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        const message = result.error.errors[0]?.message;
        expect(message).toBe("Maximum salary must be greater than or equal to minimum salary");
      }
    });

    it("should accept FullApplication when salaryMax >= salaryMin", () => {
      const valid = {
        company: "Netflix",
        role: "Staff Engineer",
        status: "PHONE_SCREEN" as const,
        priority: "HIGH" as const,
        locationType: "HYBRID" as const,
        salaryMin: 150000,
        salaryMax: 200000,
        currency: "USD",
        source: "LINKEDIN" as const,
        jobUrl: "https://netflix.jobs/postings/12345",
      };
      const result = FullApplicationSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should validate UpdateApplicationSchema with partial fields and valid ID", () => {
      const valid = {
        id: "cuid_app_123",
        company: "Updated Company Name",
        priority: "LOW" as const,
      };
      const result = UpdateApplicationSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should validate MoveApplicationCardSchema", () => {
      const valid = {
        applicationId: "app_123",
        toStatus: "INTERVIEW" as const,
        newPosition: 2500,
        orderedColumnIds: ["app_1", "app_123", "app_2"],
      };
      const result = MoveApplicationCardSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe("Note and Contact Zod Schemas", () => {
    it("should validate CreateNoteSchema and DeleteNoteSchema", () => {
      const validNote = {
        applicationId: "app_123",
        content: "Completed recruiter screen. Follow up next Monday.",
      };
      expect(CreateNoteSchema.safeParse(validNote).success).toBe(true);

      const emptyNote = { applicationId: "app_123", content: "   " };
      expect(CreateNoteSchema.safeParse(emptyNote).success).toBe(false);

      expect(DeleteNoteSchema.safeParse({ noteId: "note_123" }).success).toBe(true);
      expect(DeleteNoteSchema.safeParse({ noteId: "" }).success).toBe(false);
    });

    it("should validate CreateContactSchema and UpdateContactSchema", () => {
      const validContact = {
        applicationId: "app_123",
        name: "Jane Doe",
        title: "Engineering Director",
        email: "jane.doe@example.com",
        linkedinUrl: "https://linkedin.com/in/janedoe",
      };
      expect(CreateContactSchema.safeParse(validContact).success).toBe(true);

      const emptyEmailContact = {
        applicationId: "app_123",
        name: "John Smith",
        email: "",
        linkedinUrl: "",
      };
      expect(CreateContactSchema.safeParse(emptyEmailContact).success).toBe(true);

      const updateContact = {
        contactId: "contact_123",
        title: "VP of Engineering",
      };
      expect(UpdateContactSchema.safeParse(updateContact).success).toBe(true);
    });
  });
});
