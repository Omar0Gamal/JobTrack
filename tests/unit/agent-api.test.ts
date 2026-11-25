import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { requireAgent } from "@/server/auth/require-agent";
import { GET as getApplications, POST as postApplication } from "@/app/api/agent/applications/route";
import { GET as getApplicationById, PATCH as patchApplicationById } from "@/app/api/agent/applications/[id]/route";
import { PATCH as patchApplicationsBatch } from "@/app/api/agent/applications/batch/route";
import { GET as getStats } from "@/app/api/agent/stats/route";
import { GET as getResumes, POST as postResumes } from "@/app/api/agent/resumes/route";

const TEST_AGENT_KEY = "test-agent-secret-key-1234567890";
const TEST_USER = {
  id: "user_test_owner_1",
  email: "omargamal.dev@outlook.com",
  name: "Omar Gamal",
  timezone: "Africa/Cairo",
  isGuest: false,
};

const { mockDb } = vi.hoisted(() => {
  return {
    mockDb: {
      users: [] as any[],
      applications: [] as any[],
      resumeVersions: [] as any[],
      statusHistory: [] as any[],
      notes: [] as any[],
      contacts: [] as any[],
      interviews: [] as any[],
    },
  };
});

vi.mock("@/server/db/prisma", () => {
  const prismaMock: any = {
    user: {
      findFirst: vi.fn(async ({ where }: any) => {
        return (
          mockDb.users.find((u) => {
            if (where.email?.equals) {
              return u.email.toLowerCase() === where.email.equals.toLowerCase();
            }
            if (where.isGuest !== undefined) {
              return u.isGuest === where.isGuest;
            }
            return true;
          }) || null
        );
      }),
      create: vi.fn(async ({ data }: any) => {
        const newUser = { id: `user_${Date.now()}`, ...data };
        mockDb.users.push(newUser);
        return newUser;
      }),
    },
    application: {
      findMany: vi.fn(async (args: any) => {
        let results = [...mockDb.applications];
        if (args?.where) {
          const w = args.where;
          if (w.AND && Array.isArray(w.AND)) {
            for (const cond of w.AND) {
              if (cond.userId) results = results.filter((a) => a.userId === cond.userId);
              if (cond.deletedAt === null) results = results.filter((a) => a.deletedAt === null);
              if (cond.archivedAt === null) results = results.filter((a) => a.archivedAt === null);
              if (cond.status) {
                if (typeof cond.status === "string") {
                  results = results.filter((a) => a.status === cond.status);
                } else if (cond.status.notIn) {
                  results = results.filter((a) => !cond.status.notIn.includes(a.status));
                }
              }
              if (cond.company?.contains) {
                results = results.filter((a) =>
                  a.company.toLowerCase().includes(cond.company.contains.toLowerCase())
                );
              }
              if (cond.role?.contains) {
                results = results.filter((a) =>
                  a.role.toLowerCase().includes(cond.role.contains.toLowerCase())
                );
              }
              if (cond.jobUrl?.contains) {
                results = results.filter(
                  (a) => a.jobUrl && a.jobUrl.toLowerCase().includes(cond.jobUrl.contains.toLowerCase())
                );
              }
              if (cond.followUpDate?.lte) {
                results = results.filter(
                  (a) => a.followUpDate && new Date(a.followUpDate) <= cond.followUpDate.lte
                );
              }
            }
          }
          if (w.userId) results = results.filter((a) => a.userId === w.userId);
          if (w.deletedAt === null) results = results.filter((a) => a.deletedAt === null);
          if (w.archivedAt === null) results = results.filter((a) => a.archivedAt === null);
          if (w.status) results = results.filter((a) => a.status === w.status);
        }
        const skip = typeof args?.skip === "number" ? Math.max(0, args.skip) : 0;
        const take = typeof args?.take === "number" ? Math.max(0, args.take) : results.length;
        results = results.slice(skip, skip + take);
        return results.map((app) => ({
          ...app,
          resumeVersion: mockDb.resumeVersions.find((r) => r.id === app.resumeVersionId) || null,
          contacts: mockDb.contacts.filter((c) => c.applicationId === app.id),
          interviews: mockDb.interviews.filter((i) => i.applicationId === app.id),
          notes: mockDb.notes.filter((n) => n.applicationId === app.id),
          statusHistory: mockDb.statusHistory.filter((s) => s.applicationId === app.id),
        }));
      }),
      findFirst: vi.fn(async ({ where }: any) => {
        const found = mockDb.applications.find((a) => {
          if (where.id && a.id !== where.id) return false;
          if (where.userId && a.userId !== where.userId) return false;
          if (where.deletedAt === null && a.deletedAt !== null) return false;
          return true;
        });
        if (!found) return null;
        return {
          ...found,
          resumeVersion: mockDb.resumeVersions.find((r) => r.id === found.resumeVersionId) || null,
          contacts: mockDb.contacts.filter((c) => c.applicationId === found.id),
          interviews: mockDb.interviews.filter((i) => i.applicationId === found.id),
          notes: mockDb.notes.filter((n) => n.applicationId === found.id),
          statusHistory: mockDb.statusHistory.filter((s) => s.applicationId === found.id),
        };
      }),
      findUniqueOrThrow: vi.fn(async ({ where }: any) => {
        const found = mockDb.applications.find((a) => a.id === where.id);
        if (!found) throw new Error("Not found");
        return {
          ...found,
          resumeVersion: mockDb.resumeVersions.find((r) => r.id === found.resumeVersionId) || null,
          contacts: mockDb.contacts.filter((c) => c.applicationId === found.id),
          interviews: mockDb.interviews.filter((i) => i.applicationId === found.id),
          notes: mockDb.notes.filter((n) => n.applicationId === found.id),
          statusHistory: mockDb.statusHistory.filter((s) => s.applicationId === found.id),
        };
      }),
      create: vi.fn(async ({ data }: any) => {
        const newApp = {
          id: `app_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
          deletedAt: null,
          ...data,
        };
        mockDb.applications.push(newApp);
        return newApp;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const idx = mockDb.applications.findIndex((a) => a.id === where.id);
        if (idx === -1) throw new Error("Application not found");
        const app = mockDb.applications[idx];
        const updated = {
          ...app,
          ...data,
          resumeVersionId:
            data.resumeVersion?.connect?.id !== undefined
              ? data.resumeVersion.connect.id
              : data.resumeVersion?.disconnect
                ? null
                : app.resumeVersionId,
          updatedAt: new Date(),
        };
        delete (updated as any).resumeVersion;
        mockDb.applications[idx] = updated;
        return {
          ...updated,
          resumeVersion: mockDb.resumeVersions.find((r) => r.id === updated.resumeVersionId) || null,
          contacts: mockDb.contacts.filter((c) => c.applicationId === updated.id),
          interviews: mockDb.interviews.filter((i) => i.applicationId === updated.id),
          notes: mockDb.notes.filter((n) => n.applicationId === updated.id),
          statusHistory: mockDb.statusHistory.filter((s) => s.applicationId === updated.id),
        };
      }),
    },
    resumeVersion: {
      findMany: vi.fn(async ({ where }: any) => {
        const res = mockDb.resumeVersions.filter((r) => !where?.userId || r.userId === where.userId);
        return res.map((r) => ({
          ...r,
          _count: {
            applications: mockDb.applications.filter(
              (a) => a.resumeVersionId === r.id && a.deletedAt === null
            ).length,
          },
        }));
      }),
      findFirst: vi.fn(async ({ where }: any) => {
        return (
          mockDb.resumeVersions.find((r) => {
            if (where.userId && r.userId !== where.userId) return false;
            if (where.name?.equals && r.name.toLowerCase() !== where.name.equals.toLowerCase()) {
              return false;
            }
            return true;
          }) || null
        );
      }),
      create: vi.fn(async ({ data }: any) => {
        const newResume = {
          id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          createdAt: new Date(),
          ...data,
        };
        mockDb.resumeVersions.push(newResume);
        return {
          ...newResume,
          _count: { applications: 0 },
        };
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const idx = mockDb.resumeVersions.findIndex((r) => r.id === where.id);
        if (idx === -1) throw new Error("Resume not found");
        const updated = { ...mockDb.resumeVersions[idx], ...data };
        mockDb.resumeVersions[idx] = updated;
        return {
          ...updated,
          _count: {
            applications: mockDb.applications.filter(
              (a) => a.resumeVersionId === updated.id && a.deletedAt === null
            ).length,
          },
        };
      }),
    },
    statusHistory: {
      create: vi.fn(async ({ data }: any) => {
        const entry = { id: `sh_${Date.now()}`, changedAt: new Date(), ...data };
        mockDb.statusHistory.push(entry);
        return entry;
      }),
    },
    note: {
      create: vi.fn(async ({ data }: any) => {
        const entry = { id: `note_${Date.now()}`, createdAt: new Date(), ...data };
        mockDb.notes.push(entry);
        return entry;
      }),
    },
    contact: {
      create: vi.fn(async ({ data }: any) => {
        const entry = { id: `ct_${Date.now()}`, createdAt: new Date(), ...data };
        mockDb.contacts.push(entry);
        return entry;
      }),
    },
    interview: {
      create: vi.fn(async ({ data }: any) => {
        const entry = {
          id: `int_${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        mockDb.interviews.push(entry);
        return entry;
      }),
    },
    $transaction: vi.fn(async (callback: any) => {
      return callback(prismaMock);
    }),
  };

  return { prisma: prismaMock };
});

function createNextRequest(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: any } = {}
) {
  const headers = new Headers(options.headers || {});
  if (options.body) {
    headers.set("content-type", "application/json");
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

describe("Agent API & requireAgent Token Verification", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.AGENT_API_KEY = TEST_AGENT_KEY;
    process.env.AGENT_USER_EMAIL = TEST_USER.email;

    mockDb.users = [{ ...TEST_USER }];
    mockDb.applications = [];
    mockDb.resumeVersions = [];
    mockDb.statusHistory = [];
    mockDb.notes = [];
    mockDb.contacts = [];
    mockDb.interviews = [];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("requireAgent Authentication Guard", () => {
    it("returns 500 when AGENT_API_KEY is not configured on server", async () => {
      delete process.env.AGENT_API_KEY;
      const req = createNextRequest("/api/agent/stats", {
        headers: { authorization: `Bearer ${TEST_AGENT_KEY}` },
      });
      const res = await requireAgent(req);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.response.status).toBe(500);
        const data = await res.response.json();
        expect(data.error).toContain("AGENT_API_KEY is not configured");
      }
    });

    it("returns 401 when Authorization header is missing", async () => {
      const req = createNextRequest("/api/agent/stats");
      const res = await requireAgent(req);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.response.status).toBe(401);
        const data = await res.response.json();
        expect(data.error).toContain("Missing Bearer token");
      }
    });

    it("returns 401 when Bearer token is invalid", async () => {
      const req = createNextRequest("/api/agent/stats", {
        headers: { authorization: "Bearer wrong-token-xyz" },
      });
      const res = await requireAgent(req);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.response.status).toBe(401);
        const data = await res.response.json();
        expect(data.error).toContain("Invalid Bearer token");
      }
    });

    it("succeeds with ok: true and user context on valid Bearer token", async () => {
      const req = createNextRequest("/api/agent/stats", {
        headers: { authorization: `Bearer ${TEST_AGENT_KEY}` },
      });
      const res = await requireAgent(req);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.context.user.email).toBe(TEST_USER.email);
        expect(res.context.user.id).toBe(TEST_USER.id);
        expect(res.context.db).toBeDefined();
      }
    });
  });

  describe("/api/agent/applications GET & POST", () => {
    const authHeaders = { authorization: `Bearer ${TEST_AGENT_KEY}` };

    it("GET: rejects unauthenticated requests with 401", async () => {
      const req = createNextRequest("/api/agent/applications");
      const res = await getApplications(req);
      expect(res.status).toBe(401);
    });

    it("POST: creates an application with auto-scheduled 4d follow-up, resume creation, note, and contact", async () => {
      const req = createNextRequest("/api/agent/applications", {
        method: "POST",
        headers: authHeaders,
        body: {
          company: "Acme Cloud",
          role: "Senior Distributed Systems Engineer",
          status: "APPLIED",
          locationType: "REMOTE",
          resumeName: "Backend / Distributed Systems",
          resumeFileName: "Omar_Gamal_CV_Backend.pdf",
          note: "Applied via Greenhouse. Customized intro highlighting high-throughput services.",
          contact: {
            name: "Sarah Recruiter",
            title: "Talent Partner",
            email: "sarah@acme.com",
            linkedinUrl: "https://linkedin.com/in/sarah-recruiter",
          },
        },
      });

      const res = await postApplication(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.company).toBe("Acme Cloud");
      expect(json.data.role).toBe("Senior Distributed Systems Engineer");
      expect(json.data.status).toBe("APPLIED");

      // Verify 4-day follow-up
      expect(json.data.followUpDate).toBeDefined();
      const followUpDate = new Date(json.data.followUpDate);
      const now = Date.now();
      const diffDays = Math.round((followUpDate.getTime() - now) / (24 * 60 * 60 * 1000));
      expect(diffDays).toBe(4);

      // Verify resume creation
      expect(json.data.resumeVersion).toBeDefined();
      expect(json.data.resumeVersion.name).toBe("Backend / Distributed Systems");

      // Verify Note & Contact
      expect(json.data.notes).toHaveLength(1);
      expect(json.data.notes[0].content).toContain("Applied via Greenhouse");
      expect(json.data.contacts).toHaveLength(1);
      expect(json.data.contacts[0].name).toBe("Sarah Recruiter");

      // Verify StatusHistory
      expect(json.data.statusHistory).toHaveLength(1);
      expect(json.data.statusHistory[0].toStatus).toBe("APPLIED");
    });

    it("GET: detects duplicates when company or jobUrl matches existing application", async () => {
      // Seed existing application
      mockDb.applications.push({
        id: "app_existing_1",
        userId: TEST_USER.id,
        company: "Stripe",
        role: "Software Engineer",
        status: "APPLIED",
        jobUrl: "https://stripe.com/jobs/12345",
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
        deletedAt: null,
        followUpDate: null,
        position: 1000,
        priority: "HIGH",
        locationType: "REMOTE",
        location: null,
        salaryMin: null,
        salaryMax: null,
        currency: "USD",
        source: "COMPANY_SITE",
        resumeVersionId: null,
      });

      // Query with matching company
      const reqCompany = createNextRequest("/api/agent/applications?company=Stripe", {
        headers: authHeaders,
      });
      const resCompany = await getApplications(reqCompany);
      const jsonCompany = await resCompany.json();
      expect(jsonCompany.ok).toBe(true);
      expect(jsonCompany.count).toBe(1);
      expect(jsonCompany.isDuplicate).toBe(true);
      expect(jsonCompany.applications[0].company).toBe("Stripe");

      // Query with matching jobUrl
      const reqUrl = createNextRequest("/api/agent/applications?jobUrl=https://stripe.com/jobs/12345", {
        headers: authHeaders,
      });
      const resUrl = await getApplications(reqUrl);
      const jsonUrl = await resUrl.json();
      expect(jsonUrl.isDuplicate).toBe(true);

      // Query with non-matching company
      const reqNone = createNextRequest("/api/agent/applications?company=UnknownCorp", {
        headers: authHeaders,
      });
      const resNone = await getApplications(reqNone);
      const jsonNone = await resNone.json();
      expect(jsonNone.count).toBe(0);
      expect(jsonNone.isDuplicate).toBe(false);
    });

    it("POST: rejects invalid salary ranges (salaryMin > salaryMax)", async () => {
      const req = createNextRequest("/api/agent/applications", {
        method: "POST",
        headers: authHeaders,
        body: {
          company: "BadSalary Corp",
          role: "Engineer",
          salaryMin: 150000,
          salaryMax: 100000,
        },
      });
      const res = await postApplication(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Maximum salary must be greater than or equal to minimum salary");
    });
  });

  describe("/api/agent/applications/[id] GET & PATCH", () => {
    const authHeaders = { authorization: `Bearer ${TEST_AGENT_KEY}` };
    const appId = "app_target_detail";

    beforeEach(() => {
      mockDb.applications.push({
        id: appId,
        userId: TEST_USER.id,
        company: "Datadog",
        role: "Site Reliability Engineer",
        status: "APPLIED",
        jobUrl: "https://datadog.com/jobs/999",
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
        deletedAt: null,
        followUpDate: null,
        position: 1000,
        priority: "MEDIUM",
        locationType: "REMOTE",
        location: null,
        salaryMin: 130000,
        salaryMax: 160000,
        currency: "USD",
        source: "LINKEDIN",
        resumeVersionId: null,
      });
    });

    it("GET: returns application by id with full relations", async () => {
      const req = createNextRequest(`/api/agent/applications/${appId}`, {
        headers: authHeaders,
      });
      const res = await getApplicationById(req, {
        params: Promise.resolve({ id: appId }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.id).toBe(appId);
      expect(json.data.company).toBe("Datadog");
    });

    it("GET: returns 404 for non-existent application", async () => {
      const req = createNextRequest("/api/agent/applications/non_existent_id", {
        headers: authHeaders,
      });
      const res = await getApplicationById(req, {
        params: Promise.resolve({ id: "non_existent_id" }),
      });
      expect(res.status).toBe(404);
    });

    it("PATCH: updates status to PHONE_SCREEN, logs StatusHistory, and adds interview", async () => {
      const scheduledDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const req = createNextRequest(`/api/agent/applications/${appId}`, {
        method: "PATCH",
        headers: authHeaders,
        body: {
          status: "PHONE_SCREEN",
          addNote: "Recruiter reached out to schedule initial 30m phone screen.",
          addInterview: {
            round: 1,
            type: "HR",
            scheduledAt: scheduledDate.toISOString(),
            durationMinutes: 30,
            prepNotes: "Review past distributed system architecture milestones.",
          },
        },
      });

      const res = await patchApplicationById(req, {
        params: Promise.resolve({ id: appId }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.status).toBe("PHONE_SCREEN");

      // Verify StatusHistory recorded transition
      expect(mockDb.statusHistory).toHaveLength(1);
      expect(mockDb.statusHistory[0].fromStatus).toBe("APPLIED");
      expect(mockDb.statusHistory[0].toStatus).toBe("PHONE_SCREEN");

      // Verify added Note
      expect(mockDb.notes).toHaveLength(1);
      expect(mockDb.notes[0].content).toContain("Recruiter reached out");

      // Verify added Interview
      expect(mockDb.interviews).toHaveLength(1);
      expect(mockDb.interviews[0].round).toBe(1);
      expect(mockDb.interviews[0].type).toBe("HR");
    });
  });

  describe("/api/agent/stats GET", () => {
    const authHeaders = { authorization: `Bearer ${TEST_AGENT_KEY}` };

    it("computes active counts, appliedToday, appliedThisWeek, byStatus breakdown, and overdue follow-ups", async () => {
      const now = new Date();
      const pastFollowUp = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago (overdue)
      const futureFollowUp = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

      // App 1: Overdue follow-up
      mockDb.applications.push({
        id: "app_1",
        userId: TEST_USER.id,
        company: "Company Overdue",
        role: "Engineer",
        status: "APPLIED",
        appliedDate: now,
        createdAt: now,
        followUpDate: pastFollowUp,
        deletedAt: null,
        archivedAt: null,
      });

      // App 2: Active phone screen with future follow-up
      mockDb.applications.push({
        id: "app_2",
        userId: TEST_USER.id,
        company: "Company Future",
        role: "Lead",
        status: "PHONE_SCREEN",
        appliedDate: now,
        createdAt: now,
        followUpDate: futureFollowUp,
        deletedAt: null,
        archivedAt: null,
      });

      // App 3: Rejected (should NOT be considered overdue even if followUpDate was in past)
      mockDb.applications.push({
        id: "app_3",
        userId: TEST_USER.id,
        company: "Company Rejected",
        role: "Dev",
        status: "REJECTED",
        appliedDate: now,
        createdAt: now,
        followUpDate: pastFollowUp,
        deletedAt: null,
        archivedAt: null,
      });

      const req = createNextRequest("/api/agent/stats", {
        headers: authHeaders,
      });
      const res = await getStats(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.ok).toBe(true);
      expect(json.totalActive).toBe(3);
      expect(json.appliedToday).toBe(3);
      expect(json.appliedThisWeek).toBe(3);
      expect(json.byStatus.APPLIED).toBe(1);
      expect(json.byStatus.PHONE_SCREEN).toBe(1);
      expect(json.byStatus.REJECTED).toBe(1);
      expect(json.byStatus.OFFER).toBe(0);

      // Overdue list should only contain active non-rejected/non-offer application
      expect(json.overdueFollowUps).toHaveLength(1);
      expect(json.overdueFollowUps[0].id).toBe("app_1");
    });

    it("compact=true caps overdueFollowUps, sets overdueFollowUpsTotal, and omits duplicate data envelope", async () => {
      const now = new Date();
      const pastFollowUp = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      mockDb.applications.push(
        {
          id: "app_c1",
          userId: TEST_USER.id,
          company: "Co One",
          role: "Backend Engineer",
          status: "APPLIED",
          appliedDate: now,
          createdAt: now,
          followUpDate: pastFollowUp,
          deletedAt: null,
          archivedAt: null,
        },
        {
          id: "app_c2",
          userId: TEST_USER.id,
          company: "Co Two",
          role: "Go Engineer",
          status: "APPLIED",
          appliedDate: now,
          createdAt: now,
          followUpDate: pastFollowUp,
          deletedAt: null,
          archivedAt: null,
        }
      );

      const req = createNextRequest("/api/agent/stats?compact=true&followUpLimit=1", {
        headers: authHeaders,
      });
      const res = await getStats(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.compact).toBe(true);
      expect(json.overdueFollowUpsTotal).toBe(2);
      expect(json.overdueFollowUps).toHaveLength(1);
      expect(json.data).toBeUndefined();
    });
  });

  describe("/api/agent/applications pagination & /batch PATCH", () => {
    const authHeaders = { authorization: `Bearer ${TEST_AGENT_KEY}` };

    it("GET supports limit + offset + compact pagination", async () => {
      mockDb.applications.push(
        { id: "p_1", userId: TEST_USER.id, company: "A", role: "R1", status: "APPLIED", deletedAt: null, archivedAt: null, createdAt: new Date() },
        { id: "p_2", userId: TEST_USER.id, company: "B", role: "R2", status: "APPLIED", deletedAt: null, archivedAt: null, createdAt: new Date() }
      );
      const req = createNextRequest("/api/agent/applications?limit=1&offset=1&compact=true", {
        headers: authHeaders,
      });
      const res = await getApplications(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.applications).toHaveLength(1);
      expect(json.applications[0].id).toBe("p_2");
    });

    it("PATCH /batch updates multiple applications, logs statusHistory + notes, and reports missing IDs", async () => {
      mockDb.applications.push(
        { id: "b_1", userId: TEST_USER.id, company: "Alpha", role: "BE", status: "APPLIED", deletedAt: null, archivedAt: null },
        { id: "b_2", userId: TEST_USER.id, company: "Beta", role: "FS", status: "APPLIED", deletedAt: null, archivedAt: null }
      );

      const req = createNextRequest("/api/agent/applications/batch", {
        method: "PATCH",
        headers: authHeaders,
        body: {
          updates: [
            { id: "b_1", status: "REJECTED", addNote: "Email rejection" },
            { id: "b_2", status: "INTERVIEW", addNote: "Phone invite" },
            { id: "missing_id", status: "REJECTED" },
          ],
        },
      });
      const res = await patchApplicationsBatch(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.updatedCount).toBe(2);
      expect(json.updatedIds).toEqual(["b_1", "b_2"]);
      expect(json.failed).toHaveLength(1);
      expect(json.failed[0].id).toBe("missing_id");
      expect(mockDb.statusHistory).toHaveLength(2);
      expect(mockDb.notes).toHaveLength(2);
    });

    it("PATCH /batch rejects invalid empty payload with 400 and missing auth with 401", async () => {
      const unauthReq = createNextRequest("/api/agent/applications/batch", {
        method: "PATCH",
        body: { updates: [{ id: "b_1", status: "REJECTED" }] },
      });
      expect((await patchApplicationsBatch(unauthReq)).status).toBe(401);

      const badReq = createNextRequest("/api/agent/applications/batch", {
        method: "PATCH",
        headers: authHeaders,
        body: { updates: [] },
      });
      expect((await patchApplicationsBatch(badReq)).status).toBe(400);
    });
  });

  describe("/api/agent/resumes GET & POST", () => {
    const authHeaders = { authorization: `Bearer ${TEST_AGENT_KEY}` };

    it("GET: lists resume versions with application counts", async () => {
      mockDb.resumeVersions.push({
        id: "res_backend",
        userId: TEST_USER.id,
        name: "Backend Specialist",
        fileName: "resume_backend.pdf",
        createdAt: new Date(),
      });

      const req = createNextRequest("/api/agent/resumes", {
        headers: authHeaders,
      });
      const res = await getResumes(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].name).toBe("Backend Specialist");
      expect(json.data[0].applicationCount).toBe(0);
    });

    it("POST: creates single resume version or batch resumes", async () => {
      // Single resume
      const singleReq = createNextRequest("/api/agent/resumes", {
        method: "POST",
        headers: authHeaders,
        body: {
          name: "Cloud Architect",
          description: "AWS, Kubernetes, Terraform",
          fileName: "architect.pdf",
        },
      });
      const singleRes = await postResumes(singleReq);
      expect(singleRes.status).toBe(200);
      const singleJson = await singleRes.json();
      expect(singleJson.ok).toBe(true);
      expect(singleJson.data.name).toBe("Cloud Architect");

      // Batch resumes
      const batchReq = createNextRequest("/api/agent/resumes", {
        method: "POST",
        headers: authHeaders,
        body: {
          resumes: [
            { name: "FullStack Next.js", fileName: "fullstack.pdf" },
            { name: "DevOps & CI/CD", fileName: "devops.pdf" },
          ],
        },
      });
      const batchRes = await postResumes(batchReq);
      expect(batchRes.status).toBe(200);
      const batchJson = await batchRes.json();
      expect(batchJson.ok).toBe(true);
      expect(batchJson.data).toHaveLength(2);
    });
  });
});
