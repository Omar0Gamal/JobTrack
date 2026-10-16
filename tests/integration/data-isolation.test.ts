import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { subDays } from "date-fns";
import { prisma } from "@/server/db/prisma";
import {
  scopedDb,
  verifyApplicationOwnership,
  verifyResumeVersionOwnership,
  UnauthorizedResourceError,
} from "@/server/db/scoped-queries";
import {
  updateApplicationAction,
  moveApplicationCardAction,
  softDeleteApplicationAction,
  restoreApplicationAction,
  permanentDeleteApplicationAction,
  toggleArchiveApplicationAction,
  markFollowedUpAction,
} from "@/server/actions/application.actions";
import {
  createInterviewAction,
  updateInterviewAction,
  deleteInterviewAction,
} from "@/server/actions/interview.actions";
import {
  createNoteAction,
  deleteNoteAction,
} from "@/server/actions/note.actions";
import {
  createContactAction,
  updateContactAction,
  deleteContactAction,
} from "@/server/actions/contact.actions";
import {
  cleanupStaleGuestsAction,
  resetDemoDataAction,
} from "@/server/actions/demo.actions";
import {
  updateResumeVersionAction,
  deleteResumeVersionAction,
} from "@/server/actions/resume.actions";
import {
  importCsvRowsAction,
  exportFullJsonBackupAction,
  restoreFullJsonBackupAction,
} from "@/server/actions/import-export.actions";
import type {
  CsvImportRowInput,
  FullBackupJsonPayload,
} from "@/schemas/import-export.schema";
import type { AuthenticatedUser } from "@/server/auth/require-user";

const { mockSessionUserHolder } = vi.hoisted(() => {
  return {
    mockSessionUserHolder: {
      current: null as AuthenticatedUser | null,
    },
  };
});

vi.mock("@/auth", () => ({
  auth: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/server/auth/require-user", () => {
  class UnauthorizedError extends Error {
    constructor(message = "Authentication required") {
      super(message);
      this.name = "UnauthorizedError";
    }
  }

  return {
    UnauthorizedError,
    requireUser: vi.fn(async () => {
      if (mockSessionUserHolder.current) {
        return mockSessionUserHolder.current;
      }
      throw new UnauthorizedError();
    }),
    getCurrentUserOrNull: vi.fn(async () => {
      return mockSessionUserHolder.current;
    }),
    getEffectiveAppMode: vi.fn(async () => {
      return process.env.APP_MODE === "personal" ? "personal" : "demo";
    }),
    verifyPersonalUser: vi.fn(),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

interface TestUserRecord {
  id: string;
  email: string;
  name: string;
  isGuest: boolean;
  timezone: string;
  lastExportedAt: Date | null;
}

const createdUserIds = new Set<string>();

async function createTestUser(opts?: {
  name?: string;
  isGuest?: boolean;
  createdAt?: Date;
}): Promise<TestUserRecord> {
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const email = `test-user-${uniqueId}@isolation-test.local`;
  const user = await prisma.user.create({
    data: {
      name: opts?.name ?? `Test User ${uniqueId}`,
      email,
      isGuest: opts?.isGuest ?? false,
      createdAt: opts?.createdAt ?? new Date(),
    },
  });
  createdUserIds.add(user.id);
  return {
    id: user.id,
    email: user.email!,
    name: user.name ?? "",
    isGuest: user.isGuest,
    timezone: user.timezone,
    lastExportedAt: user.lastExportedAt,
  };
}

async function cleanupTestUsers(): Promise<void> {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { endsWith: "@isolation-test.local" } },
        { id: { in: Array.from(createdUserIds) } },
      ],
    },
    select: { id: true },
  });

  if (users.length > 0) {
    const ids = users.map((u) => u.id);
    await prisma.user.deleteMany({
      where: { id: { in: ids } },
    });
  }
  createdUserIds.clear();
}

describe("Data Isolation & Cross-User Security Integration Tests", () => {
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    process.env = { ...originalEnv };
    mockSessionUserHolder.current = null;
    await cleanupTestUsers();
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    mockSessionUserHolder.current = null;
  });

  afterAll(async () => {
    process.env = { ...originalEnv };
    await cleanupTestUsers();
    await prisma.$disconnect();
  });

  describe("Cross-User Read Isolation", () => {
    it("prevents User B from discovering or reading User A applications and resume versions", async () => {
      const userA = await createTestUser({ name: "User A" });
      const userB = await createTestUser({ name: "User B" });

      const appA = await prisma.application.create({
        data: {
          userId: userA.id,
          company: "Stripe",
          role: "Senior Staff Infrastructure Engineer",
          status: "APPLIED",
          priority: "HIGH",
          locationType: "REMOTE",
          salaryMin: 220000,
          salaryMax: 260000,
          position: 1000,
        },
      });

      const resumeA = await prisma.resumeVersion.create({
        data: {
          userId: userA.id,
          name: "Infrastructure Resume v2",
          fileName: "infra-resume.pdf",
        },
      });

      const noteA = await prisma.note.create({
        data: {
          applicationId: appA.id,
          content: "Spoke with hiring manager on Monday",
        },
      });

      const contactA = await prisma.contact.create({
        data: {
          applicationId: appA.id,
          name: "Recruiter Bob",
          email: "bob@stripe.test",
          title: "Senior Technical Recruiter",
        },
      });

      const interviewA = await prisma.interview.create({
        data: {
          applicationId: appA.id,
          round: 1,
          type: "HR",
          scheduledAt: new Date(Date.now() + 86400000),
          durationMinutes: 45,
        },
      });

      await prisma.statusHistory.create({
        data: {
          applicationId: appA.id,
          fromStatus: null,
          toStatus: "APPLIED",
        },
      });

      // User B scoped queries for applications
      const userBApps = await scopedDb(userB.id).applications.findMany();
      expect(userBApps).toHaveLength(0);

      const userBAppDirect = await scopedDb(userB.id).applications.findById(appA.id);
      expect(userBAppDirect).toBeNull();

      const userBAppFirst = await scopedDb(userB.id).applications.findFirst();
      expect(userBAppFirst).toBeNull();

      const userBAppCount = await scopedDb(userB.id).applications.count();
      expect(userBAppCount).toBe(0);

      // User B scoped queries for resume versions
      const userBResumes = await scopedDb(userB.id).resumeVersions.findMany();
      expect(userBResumes).toHaveLength(0);

      const userBResumeDirect = await scopedDb(userB.id).resumeVersions.findById(resumeA.id);
      expect(userBResumeDirect).toBeNull();

      // User B scoped queries for child entities
      const userBNotes = await scopedDb(userB.id).notes.findMany();
      expect(userBNotes).toHaveLength(0);
      const userBNoteDirect = await scopedDb(userB.id).notes.findById(noteA.id);
      expect(userBNoteDirect).toBeNull();

      const userBContacts = await scopedDb(userB.id).contacts.findMany();
      expect(userBContacts).toHaveLength(0);
      const userBContactDirect = await scopedDb(userB.id).contacts.findById(contactA.id);
      expect(userBContactDirect).toBeNull();

      const userBInterviews = await scopedDb(userB.id).interviews.findMany();
      expect(userBInterviews).toHaveLength(0);
      const userBInterviewDirect = await scopedDb(userB.id).interviews.findById(interviewA.id);
      expect(userBInterviewDirect).toBeNull();

      const userBHistory = await scopedDb(userB.id).statusHistory.findMany();
      expect(userBHistory).toHaveLength(0);

      await expect(
        scopedDb(userB.id).statusHistory.findByApplicationId(appA.id)
      ).rejects.toThrow(UnauthorizedResourceError);

      // User A can access own records
      const userAApps = await scopedDb(userA.id).applications.findMany();
      expect(userAApps).toHaveLength(1);
      expect(userAApps[0]?.id).toBe(appA.id);

      const userAResumes = await scopedDb(userA.id).resumeVersions.findMany();
      expect(userAResumes).toHaveLength(1);
      expect(userAResumes[0]?.id).toBe(resumeA.id);
    });
  });

  describe("Cross-User Mutation & Ownership Isolation via Scoped DB", () => {
    it("refuses unauthorized mutation requests and leaves User A data untouched", async () => {
      const userA = await createTestUser({ name: "User A" });
      const userB = await createTestUser({ name: "User B" });

      const appA = await prisma.application.create({
        data: {
          userId: userA.id,
          company: "Airbnb",
          role: "Staff Backend Engineer",
          status: "APPLIED",
          priority: "HIGH",
          position: 1000,
        },
      });

      const resumeA = await prisma.resumeVersion.create({
        data: {
          userId: userA.id,
          name: "Original Resume A",
          fileName: "original-a.pdf",
        },
      });

      const noteA = await prisma.note.create({
        data: {
          applicationId: appA.id,
          content: "Original note from User A",
        },
      });

      const contactA = await prisma.contact.create({
        data: {
          applicationId: appA.id,
          name: "Sarah Recruiter",
          email: "sarah@airbnb.test",
        },
      });

      const interviewA = await prisma.interview.create({
        data: {
          applicationId: appA.id,
          round: 1,
          type: "TECHNICAL",
          scheduledAt: new Date(Date.now() + 86400000),
          durationMinutes: 60,
        },
      });

      // 1. verifyApplicationOwnership throws for User B
      await expect(
        verifyApplicationOwnership(userB.id, appA.id)
      ).rejects.toThrow(UnauthorizedResourceError);

      await expect(
        scopedDb(userB.id).verifyApplicationOwnership(appA.id)
      ).rejects.toThrow(UnauthorizedResourceError);

      // 2. verifyResumeVersionOwnership throws for User B
      await expect(
        verifyResumeVersionOwnership(userB.id, resumeA.id)
      ).rejects.toThrow(UnauthorizedResourceError);

      await expect(
        scopedDb(userB.id).verifyResumeVersionOwnership(resumeA.id)
      ).rejects.toThrow(UnauthorizedResourceError);

      // 3. User B attempting application updates via scopedDb
      await expect(
        scopedDb(userB.id).applications.update(appA.id, {
          data: { company: "Malicious Company" },
        })
      ).rejects.toThrow(UnauthorizedResourceError);

      await expect(
        scopedDb(userB.id).applications.moveCard(appA.id, "OFFER", 9999)
      ).rejects.toThrow(UnauthorizedResourceError);

      await expect(
        scopedDb(userB.id).applications.archive(appA.id)
      ).rejects.toThrow(UnauthorizedResourceError);

      await expect(
        scopedDb(userB.id).applications.softDelete(appA.id)
      ).rejects.toThrow(UnauthorizedResourceError);

      await expect(
        scopedDb(userB.id).applications.restore(appA.id)
      ).rejects.toThrow(UnauthorizedResourceError);

      await expect(
        scopedDb(userB.id).applications.delete(appA.id)
      ).rejects.toThrow(UnauthorizedResourceError);

      // Verify appA remains completely unchanged in the database
      const unchangedApp = await prisma.application.findUniqueOrThrow({
        where: { id: appA.id },
      });
      expect(unchangedApp.company).toBe("Airbnb");
      expect(unchangedApp.status).toBe("APPLIED");
      expect(unchangedApp.position).toBe(1000);
      expect(unchangedApp.archivedAt).toBeNull();
      expect(unchangedApp.deletedAt).toBeNull();

      // 4. User B attempting resume updates via scopedDb
      await expect(
        scopedDb(userB.id).resumeVersions.update(resumeA.id, {
          data: { name: "Malicious Resume" },
        })
      ).rejects.toThrow(UnauthorizedResourceError);

      await expect(
        scopedDb(userB.id).resumeVersions.delete(resumeA.id)
      ).rejects.toThrow(UnauthorizedResourceError);

      const unchangedResume = await prisma.resumeVersion.findUniqueOrThrow({
        where: { id: resumeA.id },
      });
      expect(unchangedResume.name).toBe("Original Resume A");

      // 5. User B attempting child entity mutations on appA
      await expect(
        scopedDb(userB.id).notes.create(appA.id, "Unauthorized note content")
      ).rejects.toThrow(UnauthorizedResourceError);

      await expect(
        scopedDb(userB.id).notes.update(noteA.id, "Tampered note content")
      ).rejects.toThrow(UnauthorizedResourceError);

      await expect(
        scopedDb(userB.id).notes.delete(noteA.id)
      ).rejects.toThrow(UnauthorizedResourceError);

      await expect(
        scopedDb(userB.id).contacts.create(appA.id, {
          name: "Malicious Contact",
          email: "bad@evil.test",
        })
      ).rejects.toThrow(UnauthorizedResourceError);

      await expect(
        scopedDb(userB.id).contacts.update(contactA.id, {
          name: "Tampered Contact",
        })
      ).rejects.toThrow(UnauthorizedResourceError);

      await expect(
        scopedDb(userB.id).contacts.delete(contactA.id)
      ).rejects.toThrow(UnauthorizedResourceError);

      await expect(
        scopedDb(userB.id).interviews.create(appA.id, {
          round: 2,
          scheduledAt: new Date(),
        })
      ).rejects.toThrow(UnauthorizedResourceError);

      await expect(
        scopedDb(userB.id).interviews.update(interviewA.id, {
          prepNotes: "Tampered interview prep",
        })
      ).rejects.toThrow(UnauthorizedResourceError);

      await expect(
        scopedDb(userB.id).interviews.delete(interviewA.id)
      ).rejects.toThrow(UnauthorizedResourceError);

      // Verify all child records for appA are still pristine
      const noteCount = await prisma.note.count({ where: { applicationId: appA.id } });
      expect(noteCount).toBe(1);
      const unchangedNote = await prisma.note.findUniqueOrThrow({ where: { id: noteA.id } });
      expect(unchangedNote.content).toBe("Original note from User A");

      const contactCount = await prisma.contact.count({ where: { applicationId: appA.id } });
      expect(contactCount).toBe(1);
      const unchangedContact = await prisma.contact.findUniqueOrThrow({ where: { id: contactA.id } });
      expect(unchangedContact.name).toBe("Sarah Recruiter");

      const interviewCount = await prisma.interview.count({ where: { applicationId: appA.id } });
      expect(interviewCount).toBe(1);
      const unchangedInterview = await prisma.interview.findUniqueOrThrow({ where: { id: interviewA.id } });
      expect(unchangedInterview.round).toBe(1);
    });
  });

  describe("Server Action Isolation with Authenticated User Context", () => {
    it("rejects mutations when authenticated session targets another user's records", async () => {
      const userA = await createTestUser({ name: "User A" });
      const userB = await createTestUser({ name: "User B" });

      const appA = await prisma.application.create({
        data: {
          userId: userA.id,
          company: "Netflix",
          role: "Senior Distributed Systems Engineer",
          status: "APPLIED",
          priority: "HIGH",
          position: 2500,
        },
      });

      const noteA = await prisma.note.create({
        data: {
          applicationId: appA.id,
          content: "Netflix initial application submitted",
        },
      });

      const contactA = await prisma.contact.create({
        data: {
          applicationId: appA.id,
          name: "Dave Recruiter",
          email: "dave@netflix.test",
        },
      });

      const interviewA = await prisma.interview.create({
        data: {
          applicationId: appA.id,
          round: 1,
          type: "HR",
          scheduledAt: new Date(Date.now() + 86400000),
          durationMinutes: 45,
        },
      });

      const resumeA = await prisma.resumeVersion.create({
        data: {
          userId: userA.id,
          name: "User A Resume v1",
          fileName: "usera_v1.pdf",
        },
      });

      // Simulate authenticated session as User B
      mockSessionUserHolder.current = {
        id: userB.id,
        name: userB.name,
        email: userB.email,
        isGuest: false,
        timezone: "UTC",
        lastExportedAt: null,
      };

      // 1. updateApplicationAction targeting User A app
      const updateResult = await updateApplicationAction({
        id: appA.id,
        company: "Hijacked Netflix",
      });
      expect(updateResult.ok).toBe(false);
      if (!updateResult.ok) {
        expect(updateResult.error).toMatch(/not found or unauthorized/i);
      }

      // 2. moveApplicationCardAction targeting User A app
      const moveResult = await moveApplicationCardAction({
        applicationId: appA.id,
        toStatus: "REJECTED",
        newPosition: 8000,
      });
      expect(moveResult.ok).toBe(false);
      if (!moveResult.ok) {
        expect(moveResult.error).toMatch(/not found or unauthorized/i);
      }

      // 3. softDeleteApplicationAction targeting User A app
      const softDeleteResult = await softDeleteApplicationAction(appA.id);
      expect(softDeleteResult.ok).toBe(false);
      if (!softDeleteResult.ok) {
        expect(softDeleteResult.error).toMatch(/not found or unauthorized/i);
      }

      // 4. restoreApplicationAction targeting User A app
      const restoreResult = await restoreApplicationAction(appA.id);
      expect(restoreResult.ok).toBe(false);
      if (!restoreResult.ok) {
        expect(restoreResult.error).toMatch(/not found or unauthorized/i);
      }

      // 5. permanentDeleteApplicationAction targeting User A app
      const permanentDeleteResult = await permanentDeleteApplicationAction(appA.id);
      expect(permanentDeleteResult.ok).toBe(false);
      if (!permanentDeleteResult.ok) {
        expect(permanentDeleteResult.error).toMatch(/not found or unauthorized/i);
      }

      // 6. toggleArchiveApplicationAction targeting User A app
      const archiveResult = await toggleArchiveApplicationAction(appA.id, true);
      expect(archiveResult.ok).toBe(false);
      if (!archiveResult.ok) {
        expect(archiveResult.error).toMatch(/not found or unauthorized/i);
      }

      // 7. createNoteAction targeting User A app
      const createNoteResult = await createNoteAction({
        applicationId: appA.id,
        content: "Intruder note content",
      });
      expect(createNoteResult.ok).toBe(false);
      if (!createNoteResult.ok) {
        expect(createNoteResult.error).toMatch(/not found or unauthorized/i);
      }

      // 8. deleteNoteAction targeting User A note
      const deleteNoteResult = await deleteNoteAction(noteA.id);
      expect(deleteNoteResult.ok).toBe(false);
      if (!deleteNoteResult.ok) {
        expect(deleteNoteResult.error).toMatch(/not found or access denied/i);
      }

      // 9. createContactAction targeting User A app
      const createContactResult = await createContactAction({
        applicationId: appA.id,
        name: "Intruder Contact",
        email: "intruder@evil.test",
      });
      expect(createContactResult.ok).toBe(false);
      if (!createContactResult.ok) {
        expect(createContactResult.error).toMatch(/not found or unauthorized/i);
      }

      // 10. updateContactAction targeting User A contact
      const updateContactResult = await updateContactAction({
        contactId: contactA.id,
        name: "Modified Contact Name",
      });
      expect(updateContactResult.ok).toBe(false);
      if (!updateContactResult.ok) {
        expect(updateContactResult.error).toMatch(/not found or access denied/i);
      }

      // 11. deleteContactAction targeting User A contact
      const deleteContactResult = await deleteContactAction(contactA.id);
      expect(deleteContactResult.ok).toBe(false);
      if (!deleteContactResult.ok) {
        expect(deleteContactResult.error).toMatch(/not found or access denied/i);
      }

      // 12. createInterviewAction targeting User A app
      const createInterviewResult = await createInterviewAction({
        applicationId: appA.id,
        round: 2,
        type: "TECHNICAL",
        scheduledAt: new Date(Date.now() + 172800000),
        durationMinutes: 60,
        outcome: "PENDING",
      });
      expect(createInterviewResult.ok).toBe(false);
      if (!createInterviewResult.ok) {
        expect(createInterviewResult.error).toMatch(/not found or unauthorized/i);
      }

      // 13. updateInterviewAction targeting User A interview
      const updateInterviewResult = await updateInterviewAction({
        interviewId: interviewA.id,
        prepNotes: "Unauthorized update by User B",
      });
      expect(updateInterviewResult.ok).toBe(false);
      if (!updateInterviewResult.ok) {
        expect(updateInterviewResult.error).toMatch(/not found or unauthorized/i);
      }

      // 14. deleteInterviewAction targeting User A interview
      const deleteInterviewResult = await deleteInterviewAction(interviewA.id);
      expect(deleteInterviewResult.ok).toBe(false);
      if (!deleteInterviewResult.ok) {
        expect(deleteInterviewResult.error).toMatch(/not found or unauthorized/i);
      }

      // 15. markFollowedUpAction targeting User A app
      const markFollowedUpResult = await markFollowedUpAction(
        appA.id,
        "in_3_days"
      );
      expect(markFollowedUpResult.ok).toBe(false);
      if (!markFollowedUpResult.ok) {
        expect(markFollowedUpResult.error).toMatch(/not found or unauthorized/i);
      }

      // 16. updateResumeVersionAction targeting User A resume
      const updateResumeResult = await updateResumeVersionAction({
        id: resumeA.id,
        name: "Hijacked Resume Name",
      });
      expect(updateResumeResult.ok).toBe(false);
      if (!updateResumeResult.ok) {
        expect(updateResumeResult.error).toMatch(/not found or access denied/i);
      }

      // 17. deleteResumeVersionAction targeting User A resume
      const deleteResumeResult = await deleteResumeVersionAction(resumeA.id);
      expect(deleteResumeResult.ok).toBe(false);
      if (!deleteResumeResult.ok) {
        expect(deleteResumeResult.error).toMatch(/not found or access denied/i);
      }

      // Verify all User A database rows are completely unmodified
      const appAfterAction = await prisma.application.findUniqueOrThrow({
        where: { id: appA.id },
      });
      expect(appAfterAction.company).toBe("Netflix");
      expect(appAfterAction.status).toBe("APPLIED");
      expect(appAfterAction.position).toBe(2500);
      expect(appAfterAction.deletedAt).toBeNull();
      expect(appAfterAction.archivedAt).toBeNull();
      expect(appAfterAction.followUpDate).toBeNull();

      const resumeAfterAction = await prisma.resumeVersion.findUniqueOrThrow({
        where: { id: resumeA.id },
      });
      expect(resumeAfterAction.name).toBe("User A Resume v1");
      expect(resumeAfterAction.userId).toBe(userA.id);

      const noteAfterAction = await prisma.note.findUniqueOrThrow({
        where: { id: noteA.id },
      });
      expect(noteAfterAction.content).toBe("Netflix initial application submitted");

      const contactAfterAction = await prisma.contact.findUniqueOrThrow({
        where: { id: contactA.id },
      });
      expect(contactAfterAction.name).toBe("Dave Recruiter");

      const interviewAfterAction = await prisma.interview.findUniqueOrThrow({
        where: { id: interviewA.id },
      });
      expect(interviewAfterAction.round).toBe(1);
      expect(interviewAfterAction.prepNotes).toBeNull();

      const interviewTotalCount = await prisma.interview.count({
        where: { applicationId: appA.id },
      });
      expect(interviewTotalCount).toBe(1);
    });
  });

  describe("Guest Cleanup Safety & Personal Mode Guards", () => {
    it("never purges users in personal mode, and purges only stale guests in demo mode", async () => {
      // Create test users representing different lifecycles
      const staleGuest = await createTestUser({
        name: "Stale Guest (10 days old)",
        isGuest: true,
        createdAt: subDays(new Date(), 10),
      });

      const freshGuest = await createTestUser({
        name: "Fresh Guest (1 day old)",
        isGuest: true,
        createdAt: subDays(new Date(), 1),
      });

      const personalUser = await createTestUser({
        name: "Personal User (30 days old)",
        isGuest: false,
        createdAt: subDays(new Date(), 30),
      });

      // 1. In Personal Mode (APP_MODE=personal):
      process.env.APP_MODE = "personal";

      // cleanupStaleGuestsAction must delete 0 users in personal mode
      const personalCleanupResult = await cleanupStaleGuestsAction();
      expect(personalCleanupResult.deletedGuests).toBe(0);

      // Verify ALL users still exist in the database
      const staleInPersonal = await prisma.user.findUnique({
        where: { id: staleGuest.id },
      });
      expect(staleInPersonal).not.toBeNull();

      const freshInPersonal = await prisma.user.findUnique({
        where: { id: freshGuest.id },
      });
      expect(freshInPersonal).not.toBeNull();

      const personalInPersonal = await prisma.user.findUnique({
        where: { id: personalUser.id },
      });
      expect(personalInPersonal).not.toBeNull();

      // resetDemoDataAction must refuse to run in personal mode
      await expect(resetDemoDataAction()).rejects.toThrow(
        /forbidden in personal mode/i
      );

      // 2. In Demo Mode (APP_MODE=demo):
      process.env.APP_MODE = "demo";

      // cleanupStaleGuestsAction deletes ONLY stale guest users (>7 days old)
      const demoCleanupResult = await cleanupStaleGuestsAction();
      expect(demoCleanupResult.deletedGuests).toBeGreaterThanOrEqual(1);

      // The 10-day-old guest must be purged
      const staleAfterDemoCleanup = await prisma.user.findUnique({
        where: { id: staleGuest.id },
      });
      expect(staleAfterDemoCleanup).toBeNull();

      // The 1-day-old fresh guest must NOT be purged
      const freshAfterDemoCleanup = await prisma.user.findUnique({
        where: { id: freshGuest.id },
      });
      expect(freshAfterDemoCleanup).not.toBeNull();

      // The 30-day-old personal user (isGuest: false) must NEVER be purged
      const personalAfterDemoCleanup = await prisma.user.findUnique({
        where: { id: personalUser.id },
      });
      expect(personalAfterDemoCleanup).not.toBeNull();
    });
  });

  describe("CSV/JSON Data Portability & Isolation Integration Tests", () => {
    it("creates imported CSV applications strictly under the authenticated user without polluting other users", async () => {
      const userA = await createTestUser({ name: "User A (Import Test)" });
      const userB = await createTestUser({ name: "User B (Import Test)" });

      // User A creates an application first
      await prisma.application.create({
        data: {
          userId: userA.id,
          company: "Initial User A Corp",
          role: "Original Role",
          status: "APPLIED",
          position: 1000,
        },
      });

      // User B imports 2 CSV rows
      mockSessionUserHolder.current = {
        id: userB.id,
        name: userB.name,
        email: userB.email,
        isGuest: false,
        timezone: "UTC",
        lastExportedAt: null,
      };

      const rowsToImport: CsvImportRowInput[] = [
        {
          company: "Figma",
          role: "Systems Architect",
          status: "PHONE_SCREEN",
          priority: "HIGH",
          locationType: "REMOTE",
          location: "San Francisco, CA",
          salaryMin: 200000,
          salaryMax: 240000,
          currency: "USD",
          source: "LINKEDIN",
          jobUrl: "https://figma.com/careers/systems",
          appliedDate: new Date("2026-10-01T00:00:00.000Z"),
          followUpDate: null,
        },
        {
          company: "Notion",
          role: "Infrastructure Lead",
          status: "APPLIED",
          priority: "MEDIUM",
          locationType: "HYBRID",
          location: "New York, NY",
          salaryMin: 180000,
          salaryMax: 220000,
          currency: "USD",
          source: "COMPANY_SITE",
          jobUrl: "https://notion.so/careers/infra",
          appliedDate: new Date("2026-10-05T00:00:00.000Z"),
          followUpDate: null,
        },
      ];

      const importResult = await importCsvRowsAction(rowsToImport);
      expect(importResult.ok).toBe(true);
      if (importResult.ok) {
        expect(importResult.data.importedCount).toBe(2);
        expect(importResult.data.skippedCount).toBe(0);
      }

      // Check User B applications in DB
      const userBApps = await prisma.application.findMany({
        where: { userId: userB.id },
        include: { statusHistory: true },
      });
      expect(userBApps).toHaveLength(2);
      expect(userBApps.map((a) => a.company).sort()).toEqual(["Figma", "Notion"]);
      for (const app of userBApps) {
        expect(app.userId).toBe(userB.id);
        expect(app.statusHistory.length).toBeGreaterThanOrEqual(1);
        expect(app.statusHistory[0]?.toStatus).toBe(app.status);
      }

      // User A applications must remain exactly 1, completely untouched
      const userAApps = await prisma.application.findMany({
        where: { userId: userA.id },
      });
      expect(userAApps).toHaveLength(1);
      expect(userAApps[0]?.company).toBe("Initial User A Corp");
    });

    it("only exports the authenticated user's applications and resumes, updating lastExportedAt", async () => {
      const userA = await createTestUser({ name: "User A (Export Test)" });
      const userB = await createTestUser({ name: "User B (Export Test)" });

      // User A has 1 application and 1 resume
      const resumeA = await prisma.resumeVersion.create({
        data: {
          userId: userA.id,
          name: "User A Secret Resume",
          fileName: "usera_secret.pdf",
        },
      });

      const appA = await prisma.application.create({
        data: {
          userId: userA.id,
          company: "User A Private Company",
          role: "Confidential Lead",
          status: "APPLIED",
          resumeVersionId: resumeA.id,
          position: 1000,
        },
      });

      await prisma.note.create({
        data: {
          applicationId: appA.id,
          content: "User A confidential interview prep",
        },
      });

      // User B has 1 application and 1 resume
      const resumeB = await prisma.resumeVersion.create({
        data: {
          userId: userB.id,
          name: "User B Classified Resume",
          fileName: "userb_classified.pdf",
        },
      });

      await prisma.application.create({
        data: {
          userId: userB.id,
          company: "User B Top Secret Corp",
          role: "Top Secret Lead",
          status: "OFFER",
          resumeVersionId: resumeB.id,
          position: 2000,
        },
      });

      // Authenticate as User A
      mockSessionUserHolder.current = {
        id: userA.id,
        name: userA.name,
        email: userA.email,
        isGuest: false,
        timezone: "UTC",
        lastExportedAt: null,
      };

      const exportResult = await exportFullJsonBackupAction();
      expect(exportResult.ok).toBe(true);
      if (exportResult.ok) {
        const payload: FullBackupJsonPayload = JSON.parse(exportResult.data.json);
        expect(payload.version).toBe(1);
        expect(payload.applications).toHaveLength(1);
        expect(payload.applications[0]?.company).toBe("User A Private Company");
        expect(payload.applications[0]?.notes).toHaveLength(1);
        expect(payload.applications[0]?.notes[0]?.content).toBe("User A confidential interview prep");

        expect(payload.resumeVersions).toHaveLength(1);
        expect(payload.resumeVersions[0]?.name).toBe("User A Secret Resume");

        // Verify User B records NEVER leaked into User A backup
        const rawJson = exportResult.data.json;
        expect(rawJson).not.toContain("User B Classified Resume");
        expect(rawJson).not.toContain("User B Top Secret Corp");
      }

      // Verify User A lastExportedAt was updated in database
      const userAUpdated = await prisma.user.findUniqueOrThrow({
        where: { id: userA.id },
      });
      expect(userAUpdated.lastExportedAt).not.toBeNull();

      // Verify User B lastExportedAt was NOT touched
      const userBUnchanged = await prisma.user.findUniqueOrThrow({
        where: { id: userB.id },
      });
      expect(userBUnchanged.lastExportedAt).toBeNull();
    });

    it("restores full JSON backup only on accounts with zero active applications, strictly assigning new records to that user", async () => {
      const userWithApps = await createTestUser({ name: "User With Apps" });
      const emptyUser = await createTestUser({ name: "Empty User" });

      // User With Apps already has 1 active application
      await prisma.application.create({
        data: {
          userId: userWithApps.id,
          company: "Existing Active Job",
          role: "Software Engineer",
          status: "APPLIED",
          position: 1000,
        },
      });

      const backupToRestore: FullBackupJsonPayload = {
        version: 1,
        exportedAt: new Date("2026-10-17T12:00:00.000Z"),
        resumeVersions: [
          {
            id: "old_resume_id_1",
            name: "Restored Engineering Resume",
            description: "Restored from backup",
            fileName: "restored.pdf",
            createdAt: new Date("2026-09-01T00:00:00.000Z"),
          },
        ],
        applications: [
          {
            id: "old_app_id_1",
            company: "Target Corp",
            role: "Principal Architect",
            status: "INTERVIEW",
            priority: "HIGH",
            locationType: "REMOTE",
            location: "Denver, CO",
            salaryMin: 210000,
            salaryMax: 260000,
            currency: "USD",
            source: "REFERRAL",
            jobUrl: "https://target.test/jobs/arch",
            appliedDate: new Date("2026-09-10T00:00:00.000Z"),
            followUpDate: null,
            resumeVersionId: "old_resume_id_1",
            position: 1000,
            archivedAt: null,
            createdAt: new Date("2026-09-10T00:00:00.000Z"),
            interviews: [
              {
                id: "old_iv_1",
                round: 1,
                type: "TECHNICAL",
                scheduledAt: new Date("2026-09-20T15:00:00.000Z"),
                durationMinutes: 60,
                prepNotes: "System design preparation",
                outcome: "PASSED",
                createdAt: new Date("2026-09-12T00:00:00.000Z"),
              },
            ],
            notes: [
              {
                id: "old_note_1",
                content: "Spoke with VP of Engineering",
                createdAt: new Date("2026-09-11T00:00:00.000Z"),
              },
            ],
            contacts: [
              {
                id: "old_contact_1",
                name: "Alice Recruiter",
                email: "alice@target.test",
                createdAt: new Date("2026-09-10T00:00:00.000Z"),
              },
            ],
            statusHistory: [
              {
                id: "old_sh_1",
                fromStatus: null,
                toStatus: "APPLIED",
                changedAt: new Date("2026-09-10T00:00:00.000Z"),
              },
              {
                id: "old_sh_2",
                fromStatus: "APPLIED",
                toStatus: "INTERVIEW",
                changedAt: new Date("2026-09-15T00:00:00.000Z"),
              },
            ],
          },
        ],
      };

      const backupJsonString = JSON.stringify(backupToRestore);

      // 1. Attempt to restore when user already has active applications
      mockSessionUserHolder.current = {
        id: userWithApps.id,
        name: userWithApps.name,
        email: userWithApps.email,
        isGuest: false,
        timezone: "UTC",
        lastExportedAt: null,
      };

      const failedRestore = await restoreFullJsonBackupAction(backupJsonString);
      expect(failedRestore.ok).toBe(false);
      if (!failedRestore.ok) {
        expect(failedRestore.error).toMatch(/0 active applications/i);
      }

      // Verify userWithApps still has only the original 1 application
      const userWithAppsCount = await prisma.application.count({
        where: { userId: userWithApps.id },
      });
      expect(userWithAppsCount).toBe(1);

      // 2. Restore into empty user account (0 applications)
      mockSessionUserHolder.current = {
        id: emptyUser.id,
        name: emptyUser.name,
        email: emptyUser.email,
        isGuest: false,
        timezone: "UTC",
        lastExportedAt: null,
      };

      const successfulRestore = await restoreFullJsonBackupAction(backupJsonString);
      expect(successfulRestore.ok).toBe(true);
      if (successfulRestore.ok) {
        expect(successfulRestore.data.restoredApplications).toBe(1);
        expect(successfulRestore.data.restoredResumes).toBe(1);
      }

      // Verify all restored records are strictly owned by emptyUser.id
      const restoredApps = await prisma.application.findMany({
        where: { userId: emptyUser.id },
        include: {
          resumeVersion: true,
          interviews: true,
          notes: true,
          contacts: true,
          statusHistory: true,
        },
      });
      expect(restoredApps).toHaveLength(1);
      const restoredApp = restoredApps[0]!;
      expect(restoredApp.userId).toBe(emptyUser.id);
      expect(restoredApp.company).toBe("Target Corp");
      expect(restoredApp.role).toBe("Principal Architect");
      expect(restoredApp.interviews).toHaveLength(1);
      expect(restoredApp.notes).toHaveLength(1);
      expect(restoredApp.contacts).toHaveLength(1);
      expect(restoredApp.statusHistory).toHaveLength(2);

      // Verify foreign key to restored resume version is correctly mapped
      expect(restoredApp.resumeVersion).not.toBeNull();
      expect(restoredApp.resumeVersion?.userId).toBe(emptyUser.id);
      expect(restoredApp.resumeVersion?.name).toBe("Restored Engineering Resume");
    });
  });
});
