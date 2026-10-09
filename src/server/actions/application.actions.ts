"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { requireUser } from "@/server/auth/require-user";
import {
  QuickAddApplicationSchema,
  FullApplicationSchema,
  UpdateApplicationSchema,
  MoveApplicationCardSchema,
  type QuickAddApplicationInput,
  type FullApplicationInput,
  type UpdateApplicationInput,
  type MoveApplicationCardInput,
} from "@/schemas/application.schema";
import {
  calculateNewCardPosition,
  generateRebalancedPositions,
} from "@/lib/kanban/positioning";
import { getFollowUpPresetDate } from "@/lib/dates/timezone";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const applicationWithRelationsInclude = {
  resumeVersion: true,
  interviews: {
    orderBy: { scheduledAt: "asc" as const },
  },
  notes: {
    orderBy: { createdAt: "desc" as const },
  },
  contacts: {
    orderBy: { createdAt: "asc" as const },
  },
  statusHistory: {
    orderBy: { changedAt: "desc" as const },
  },
} as const;

export type ApplicationWithRelations = Prisma.ApplicationGetPayload<{
  include: typeof applicationWithRelationsInclude;
}>;

function safeRevalidate(path: string): void {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op when executed outside a Next.js server request context (e.g. tests)
  }
}

/**
 * Retrieves all active applications belonging to the authenticated user.
 */
export async function getApplicationsAction(options?: {
  includeArchived?: boolean;
  search?: string;
}): Promise<ApplicationWithRelations[]> {
  const user = await requireUser();

  const where: Prisma.ApplicationWhereInput = {
    userId: user.id,
    deletedAt: null,
  };

  if (!options?.includeArchived) {
    where.archivedAt = null;
  }

  if (options?.search && options.search.trim().length > 0) {
    const search = options.search.trim();
    where.OR = [
      { company: { contains: search, mode: "insensitive" } },
      { role: { contains: search, mode: "insensitive" } },
    ];
  }

  return prisma.application.findMany({
    where,
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    include: applicationWithRelationsInclude,
  });
}

/**
 * Retrieves a single application with relations by ID, verifying user ownership.
 */
export async function getApplicationByIdAction(
  applicationId: string
): Promise<ApplicationWithRelations | null> {
  const user = await requireUser();
  if (!applicationId) return null;

  return prisma.application.findFirst({
    where: {
      id: applicationId,
      userId: user.id,
      deletedAt: null,
    },
    include: applicationWithRelationsInclude,
  });
}

/**
 * Retrieves user's resume versions for dropdown select options.
 */
export async function getResumeVersionsForSelectAction(): Promise<
  Array<{ id: string; name: string; fileName: string | null }>
> {
  const user = await requireUser();
  return prisma.resumeVersion.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      fileName: true,
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Creates an application (Quick-Add or Full Form) with transactional initial StatusHistory record.
 */
export async function createApplicationAction(
  input: QuickAddApplicationInput | FullApplicationInput
): Promise<ActionResult<ApplicationWithRelations>> {
  try {
    const user = await requireUser();

    const hasFullFields =
      "priority" in input ||
      "locationType" in input ||
      "salaryMin" in input ||
      "salaryMax" in input ||
      "currency" in input ||
      "source" in input ||
      "jobUrl" in input ||
      "followUpDate" in input ||
      "resumeVersionId" in input;

    let parsedData: FullApplicationInput;

    if (hasFullFields) {
      const parsed = FullApplicationSchema.safeParse(input);
      if (!parsed.success) {
        return {
          ok: false,
          error: parsed.error.errors[0]?.message ?? "Invalid application input",
        };
      }
      parsedData = parsed.data;
    } else {
      const parsed = QuickAddApplicationSchema.safeParse(input);
      if (!parsed.success) {
        return {
          ok: false,
          error: parsed.error.errors[0]?.message ?? "Invalid application input",
        };
      }
      parsedData = {
        ...parsed.data,
        priority: "MEDIUM",
        locationType: "REMOTE",
        location: null,
        salaryMin: null,
        salaryMax: null,
        currency: "USD",
        source: "LINKEDIN",
        jobUrl: null,
        appliedDate: new Date(),
        followUpDate: null,
        resumeVersionId: null,
      };
    }

    const created = await prisma.$transaction(async (tx) => {
      // Find current positions in this status column
      const existing = await tx.application.findMany({
        where: {
          userId: user.id,
          status: parsedData.status,
          deletedAt: null,
        },
        select: { position: true },
      });

      const position = calculateNewCardPosition(existing.map((e) => e.position));

      const app = await tx.application.create({
        data: {
          userId: user.id,
          company: parsedData.company,
          role: parsedData.role,
          status: parsedData.status,
          priority: parsedData.priority,
          locationType: parsedData.locationType,
          location: parsedData.location?.trim() || null,
          salaryMin: parsedData.salaryMin ?? null,
          salaryMax: parsedData.salaryMax ?? null,
          currency: parsedData.currency || "USD",
          source: parsedData.source,
          jobUrl: parsedData.jobUrl?.trim() || null,
          appliedDate: parsedData.appliedDate ?? new Date(),
          followUpDate: parsedData.followUpDate ?? null,
          resumeVersionId: parsedData.resumeVersionId?.trim() || null,
          position,
        },
      });

      await tx.statusHistory.create({
        data: {
          applicationId: app.id,
          fromStatus: null,
          toStatus: parsedData.status,
        },
      });

      return tx.application.findUniqueOrThrow({
        where: { id: app.id },
        include: applicationWithRelationsInclude,
      });
    });

    safeRevalidate("/board");
    safeRevalidate("/dashboard");

    return { ok: true, data: created };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create application",
    };
  }
}

/**
 * Updates an application's fields with transactional StatusHistory row if status changed.
 */
export async function updateApplicationAction(
  input: UpdateApplicationInput
): Promise<ActionResult<ApplicationWithRelations>> {
  try {
    const user = await requireUser();

    const parsed = UpdateApplicationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.errors[0]?.message ?? "Invalid update input",
      };
    }
    const validData = parsed.data;

    const existing = await prisma.application.findFirst({
      where: {
        id: validData.id,
        userId: user.id,
      },
    });

    if (!existing) {
      return { ok: false, error: "Application not found or unauthorized" };
    }

    const updated = await prisma.$transaction(async (tx) => {
      // If status changed, record transition in StatusHistory
      if (validData.status && validData.status !== existing.status) {
        await tx.statusHistory.create({
          data: {
            applicationId: existing.id,
            fromStatus: existing.status,
            toStatus: validData.status,
          },
        });
      }

      const updatePayload: Prisma.ApplicationUpdateInput = {};

      if (validData.company !== undefined) updatePayload.company = validData.company;
      if (validData.role !== undefined) updatePayload.role = validData.role;
      if (validData.status !== undefined) updatePayload.status = validData.status;
      if (validData.priority !== undefined) updatePayload.priority = validData.priority;
      if (validData.locationType !== undefined) updatePayload.locationType = validData.locationType;
      if (validData.location !== undefined) updatePayload.location = validData.location?.trim() || null;
      if (validData.salaryMin !== undefined) updatePayload.salaryMin = validData.salaryMin;
      if (validData.salaryMax !== undefined) updatePayload.salaryMax = validData.salaryMax;
      if (validData.currency !== undefined) updatePayload.currency = validData.currency;
      if (validData.source !== undefined) updatePayload.source = validData.source;
      if (validData.jobUrl !== undefined) updatePayload.jobUrl = validData.jobUrl?.trim() || null;
      if (validData.appliedDate !== undefined) updatePayload.appliedDate = validData.appliedDate;
      if (validData.followUpDate !== undefined) updatePayload.followUpDate = validData.followUpDate;
      if (validData.resumeVersionId !== undefined) {
        const cleanResumeId = validData.resumeVersionId?.trim();
        updatePayload.resumeVersion = cleanResumeId
          ? { connect: { id: cleanResumeId } }
          : { disconnect: true };
      }

      return tx.application.update({
        where: { id: existing.id },
        data: updatePayload,
        include: applicationWithRelationsInclude,
      });
    });

    safeRevalidate("/board");
    safeRevalidate("/dashboard");

    return { ok: true, data: updated };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update application",
    };
  }
}

/**
 * Moves a Kanban card, updates status & position inside $transaction,
 * logs StatusHistory if column changed, and optionally rebalances column items.
 */
export async function moveApplicationCardAction(
  input: MoveApplicationCardInput
): Promise<ActionResult<ApplicationWithRelations>> {
  try {
    const user = await requireUser();

    const parsed = MoveApplicationCardSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.errors[0]?.message ?? "Invalid card move input",
      };
    }
    const validData = parsed.data;

    const existing = await prisma.application.findFirst({
      where: {
        id: validData.applicationId,
        userId: user.id,
      },
    });

    if (!existing) {
      return { ok: false, error: "Application not found or unauthorized" };
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Record status transition if column changed
      if (existing.status !== validData.toStatus) {
        await tx.statusHistory.create({
          data: {
            applicationId: existing.id,
            fromStatus: existing.status,
            toStatus: validData.toStatus,
          },
        });
      }

      // Update moving card
      await tx.application.update({
        where: { id: existing.id },
        data: {
          status: validData.toStatus,
          position: validData.newPosition,
        },
      });

      // If orderedColumnIds is provided, apply rebalanced clean positions (1000, 2000, ...)
      if (validData.orderedColumnIds && validData.orderedColumnIds.length > 0) {
        const rebalanced = generateRebalancedPositions(validData.orderedColumnIds);
        for (const item of rebalanced) {
          await tx.application.updateMany({
            where: {
              id: item.id,
              userId: user.id,
            },
            data: {
              position: item.position,
              status: validData.toStatus,
            },
          });
        }
      }

      return tx.application.findUniqueOrThrow({
        where: { id: existing.id },
        include: applicationWithRelationsInclude,
      });
    });

    safeRevalidate("/board");
    safeRevalidate("/dashboard");

    return { ok: true, data: updated };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to move application card",
    };
  }
}

/**
 * Soft deletes an application by setting deletedAt timestamp.
 */
export async function softDeleteApplicationAction(
  applicationId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();

    const existing = await prisma.application.findFirst({
      where: { id: applicationId, userId: user.id },
    });

    if (!existing) {
      return { ok: false, error: "Application not found or unauthorized" };
    }

    await prisma.application.update({
      where: { id: applicationId },
      data: { deletedAt: new Date() },
    });

    safeRevalidate("/board");
    safeRevalidate("/trash");
    safeRevalidate("/dashboard");

    return { ok: true, data: { id: applicationId } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to soft delete application",
    };
  }
}

/**
 * Restores a soft-deleted application by clearing deletedAt timestamp.
 */
export async function restoreApplicationAction(
  applicationId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();

    const existing = await prisma.application.findFirst({
      where: { id: applicationId, userId: user.id },
    });

    if (!existing) {
      return { ok: false, error: "Application not found or unauthorized" };
    }

    await prisma.application.update({
      where: { id: applicationId },
      data: { deletedAt: null },
    });

    safeRevalidate("/board");
    safeRevalidate("/trash");
    safeRevalidate("/dashboard");

    return { ok: true, data: { id: applicationId } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to restore application",
    };
  }
}

/**
 * Permanently deletes an application from the database, scoped to userId.
 */
export async function permanentDeleteApplicationAction(
  applicationId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();

    const existing = await prisma.application.findFirst({
      where: { id: applicationId, userId: user.id },
    });

    if (!existing) {
      return { ok: false, error: "Application not found or unauthorized" };
    }

    await prisma.application.delete({
      where: { id: applicationId },
    });

    safeRevalidate("/board");
    safeRevalidate("/trash");
    safeRevalidate("/dashboard");

    return { ok: true, data: { id: applicationId } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to permanently delete application",
    };
  }
}

/**
 * Toggles the archived state of an application.
 */
export async function toggleArchiveApplicationAction(
  applicationId: string,
  archive: boolean
): Promise<ActionResult<{ id: string; archivedAt: Date | null }>> {
  try {
    const user = await requireUser();

    const existing = await prisma.application.findFirst({
      where: { id: applicationId, userId: user.id },
    });

    if (!existing) {
      return { ok: false, error: "Application not found or unauthorized" };
    }

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { archivedAt: archive ? new Date() : null },
    });

    safeRevalidate("/board");
    safeRevalidate("/dashboard");

    return {
      ok: true,
      data: { id: applicationId, archivedAt: updated.archivedAt },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to toggle archive state",
    };
  }
}

/**
 * Updates or clears the follow-up date for an application.
 */
export async function markFollowedUpAction(
  applicationId: string,
  action: "clear" | "in_3_days" | "next_week" | { customDate: string }
): Promise<ActionResult<ApplicationWithRelations>> {
  try {
    const user = await requireUser();

    if (!applicationId) {
      return { ok: false, error: "Application ID is required" };
    }

    const existing = await prisma.application.findFirst({
      where: { id: applicationId, userId: user.id },
    });

    if (!existing) {
      return { ok: false, error: "Application not found or unauthorized" };
    }

    let newFollowUpDate: Date | null = null;
    if (action === "clear") {
      newFollowUpDate = null;
    } else if (action === "in_3_days") {
      newFollowUpDate = getFollowUpPresetDate("in_3_days");
    } else if (action === "next_week") {
      newFollowUpDate = getFollowUpPresetDate("next_week");
    } else if (typeof action === "object" && action.customDate) {
      newFollowUpDate = new Date(action.customDate);
    }

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { followUpDate: newFollowUpDate },
      include: applicationWithRelationsInclude,
    });

    safeRevalidate("/board");
    safeRevalidate("/dashboard");
    safeRevalidate("/calendar");

    return { ok: true, data: updated };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update follow-up date",
    };
  }
}

