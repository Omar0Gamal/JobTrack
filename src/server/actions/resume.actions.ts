"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { requireUser } from "@/server/auth/require-user";
import { scopedDb } from "@/server/db/scoped-queries";
import {
  CreateResumeVersionSchema,
  UpdateResumeVersionSchema,
  type CreateResumeVersionInput,
  type UpdateResumeVersionInput,
} from "@/schemas/resume-version.schema";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface ResumeVersionWithCount {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  fileName: string | null;
  createdAt: Date;
  applicationCount: number;
}

function safeRevalidate(path: string): void {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op when executed outside a Next.js server request context
  }
}

/**
 * Retrieves all resume versions belonging to the current user,
 * including the count of non-deleted applications referencing each version.
 */
export async function getResumeVersionsAction(): Promise<ResumeVersionWithCount[]> {
  const user = await requireUser();

  const records = await prisma.resumeVersion.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      applications: {
        where: { deletedAt: null },
        select: { id: true },
      },
    },
  });

  return records.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: r.name,
    description: r.description,
    fileName: r.fileName,
    createdAt: r.createdAt,
    applicationCount: r.applications.length,
  }));
}

/**
 * Creates a new resume version scoped to the authenticated user.
 */
export async function createResumeVersionAction(
  input: CreateResumeVersionInput
): Promise<ActionResult<ResumeVersionWithCount>> {
  try {
    const user = await requireUser();
    const parsed = CreateResumeVersionSchema.safeParse(input);

    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.errors[0]?.message ?? "Invalid resume version data",
      };
    }

    const created = await scopedDb(user.id).resumeVersions.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        fileName: parsed.data.fileName ?? null,
      },
    });

    safeRevalidate("/settings");
    safeRevalidate("/dashboard");
    safeRevalidate("/board");

    return {
      ok: true,
      data: {
        id: created.id,
        userId: created.userId,
        name: created.name,
        description: created.description,
        fileName: created.fileName,
        createdAt: created.createdAt,
        applicationCount: 0,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create resume version",
    };
  }
}

/**
 * Updates an existing resume version after verifying user ownership.
 */
export async function updateResumeVersionAction(
  input: UpdateResumeVersionInput
): Promise<ActionResult<ResumeVersionWithCount>> {
  try {
    const user = await requireUser();
    const parsed = UpdateResumeVersionSchema.safeParse(input);

    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.errors[0]?.message ?? "Invalid resume version data",
      };
    }

    const { id, ...data } = parsed.data;

    const existing = await prisma.resumeVersion.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return { ok: false, error: "Resume version not found or access denied" };
    }

    const updatePayload: {
      name?: string;
      description?: string | null;
      fileName?: string | null;
    } = {};

    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.description !== undefined) {
      updatePayload.description = data.description ?? null;
    }
    if (data.fileName !== undefined) {
      updatePayload.fileName = data.fileName ?? null;
    }

    const updated = await scopedDb(user.id).resumeVersions.update(id, {
      data: updatePayload,
    });

    const applicationCount = await prisma.application.count({
      where: { resumeVersionId: id, deletedAt: null },
    });

    safeRevalidate("/settings");
    safeRevalidate("/dashboard");
    safeRevalidate("/board");

    return {
      ok: true,
      data: {
        id: updated.id,
        userId: updated.userId,
        name: updated.name,
        description: updated.description,
        fileName: updated.fileName,
        createdAt: updated.createdAt,
        applicationCount,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update resume version",
    };
  }
}

/**
 * Deletes a resume version after verifying user ownership.
 * Linked applications have their resumeVersionId set to null via foreign key constraint.
 */
export async function deleteResumeVersionAction(
  resumeVersionId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();

    if (!resumeVersionId) {
      return { ok: false, error: "Resume version ID is required" };
    }

    const existing = await prisma.resumeVersion.findFirst({
      where: { id: resumeVersionId, userId: user.id },
    });

    if (!existing) {
      return { ok: false, error: "Resume version not found or access denied" };
    }

    await scopedDb(user.id).resumeVersions.delete(resumeVersionId);

    safeRevalidate("/settings");
    safeRevalidate("/dashboard");
    safeRevalidate("/board");

    return { ok: true, data: { id: resumeVersionId } };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete resume version",
    };
  }
}
