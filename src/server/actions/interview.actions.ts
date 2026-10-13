"use server";

import { revalidatePath } from "next/cache";
import type { Prisma, Interview, ApplicationStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { requireUser } from "@/server/auth/require-user";
import {
  CreateInterviewSchema,
  UpdateInterviewSchema,
  type CreateInterviewInput,
  type UpdateInterviewInput,
} from "@/schemas/interview.schema";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const interviewWithApplicationInclude = {
  application: {
    select: {
      id: true,
      company: true,
      role: true,
      status: true,
      locationType: true,
      location: true,
      jobUrl: true,
      archivedAt: true,
      deletedAt: true,
    },
  },
} as const;

export type InterviewWithApplication = Prisma.InterviewGetPayload<{
  include: typeof interviewWithApplicationInclude;
}>;

function safeRevalidate(path: string): void {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op when executed outside a Next.js server request context (e.g. tests)
  }
}

/**
 * Retrieves all interviews belonging to the authenticated user's active applications.
 */
export async function getAllInterviewsAction(): Promise<InterviewWithApplication[]> {
  const user = await requireUser();

  return prisma.interview.findMany({
    where: {
      application: {
        userId: user.id,
        deletedAt: null,
      },
    },
    include: interviewWithApplicationInclude,
    orderBy: { scheduledAt: "asc" },
  });
}

/**
 * Creates an interview round for an application, checking ownership and suggesting status move if applicable.
 */
export async function createInterviewAction(
  input: CreateInterviewInput
): Promise<
  ActionResult<{
    interview: Interview;
    applicationStatus: ApplicationStatus;
    shouldSuggestStatusMove: boolean;
  }>
> {
  try {
    const user = await requireUser();

    const parsed = CreateInterviewSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.errors[0]?.message ?? "Invalid interview input",
      };
    }
    const validData = parsed.data;

    const application = await prisma.application.findFirst({
      where: {
        id: validData.applicationId,
        userId: user.id,
        deletedAt: null,
      },
    });

    if (!application) {
      return { ok: false, error: "Application not found or unauthorized" };
    }

    const interview = await prisma.interview.create({
      data: {
        applicationId: validData.applicationId,
        round: validData.round,
        type: validData.type,
        scheduledAt: validData.scheduledAt,
        durationMinutes: validData.durationMinutes,
        prepNotes: validData.prepNotes?.trim() || null,
        outcome: validData.outcome,
        feedback: validData.feedback?.trim() || null,
      },
    });

    const shouldSuggestStatusMove =
      application.status === "WISHLIST" ||
      application.status === "APPLIED" ||
      application.status === "PHONE_SCREEN";

    safeRevalidate("/board");
    safeRevalidate("/interviews");
    safeRevalidate("/calendar");
    safeRevalidate("/dashboard");

    return {
      ok: true,
      data: {
        interview,
        applicationStatus: application.status,
        shouldSuggestStatusMove,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create interview",
    };
  }
}

/**
 * Updates an interview round, verifying user ownership through the parent application.
 */
export async function updateInterviewAction(
  input: UpdateInterviewInput
): Promise<ActionResult<Interview>> {
  try {
    const user = await requireUser();

    const parsed = UpdateInterviewSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.errors[0]?.message ?? "Invalid update input",
      };
    }
    const validData = parsed.data;

    const existing = await prisma.interview.findFirst({
      where: {
        id: validData.interviewId,
        application: {
          userId: user.id,
        },
      },
    });

    if (!existing) {
      return { ok: false, error: "Interview not found or unauthorized" };
    }

    const updateData: Prisma.InterviewUpdateInput = {};
    if (validData.round !== undefined) updateData.round = validData.round;
    if (validData.type !== undefined) updateData.type = validData.type;
    if (validData.scheduledAt !== undefined) updateData.scheduledAt = validData.scheduledAt;
    if (validData.durationMinutes !== undefined)
      updateData.durationMinutes = validData.durationMinutes;
    if (validData.prepNotes !== undefined)
      updateData.prepNotes = validData.prepNotes?.trim() || null;
    if (validData.outcome !== undefined) updateData.outcome = validData.outcome;
    if (validData.feedback !== undefined)
      updateData.feedback = validData.feedback?.trim() || null;

    const updated = await prisma.interview.update({
      where: { id: validData.interviewId },
      data: updateData,
    });

    safeRevalidate("/board");
    safeRevalidate("/interviews");
    safeRevalidate("/calendar");
    safeRevalidate("/dashboard");

    return { ok: true, data: updated };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update interview",
    };
  }
}

/**
 * Deletes an interview round, verifying user ownership through the parent application.
 */
export async function deleteInterviewAction(
  interviewId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();

    if (!interviewId) {
      return { ok: false, error: "Interview ID is required" };
    }

    const existing = await prisma.interview.findFirst({
      where: {
        id: interviewId,
        application: {
          userId: user.id,
        },
      },
    });

    if (!existing) {
      return { ok: false, error: "Interview not found or unauthorized" };
    }

    await prisma.interview.delete({
      where: { id: interviewId },
    });

    safeRevalidate("/board");
    safeRevalidate("/interviews");
    safeRevalidate("/calendar");
    safeRevalidate("/dashboard");

    return { ok: true, data: { id: interviewId } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to delete interview",
    };
  }
}
