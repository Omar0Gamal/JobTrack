"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { requireUser } from "@/server/auth/require-user";
import {
  CreateNoteSchema,
  DeleteNoteSchema,
  type CreateNoteInput,
} from "@/schemas/note.schema";
import type { ActionResult } from "@/server/actions/application.actions";

function safeRevalidate(path: string): void {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op when executed outside a Next.js server request context
  }
}

/**
 * Creates a new note for an application owned by the authenticated user.
 */
export async function createNoteAction(
  input: CreateNoteInput
): Promise<ActionResult<{ id: string; content: string; createdAt: Date; applicationId: string }>> {
  try {
    const user = await requireUser();

    const parsed = CreateNoteSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.errors[0]?.message ?? "Invalid note input",
      };
    }
    const { applicationId, content } = parsed.data;

    const ownsApplication = await prisma.application.count({
      where: {
        id: applicationId,
        userId: user.id,
      },
    });

    if (ownsApplication === 0) {
      return { ok: false, error: "Application not found or unauthorized" };
    }

    const note = await prisma.note.create({
      data: {
        applicationId,
        content,
      },
    });

    safeRevalidate("/board");

    return {
      ok: true,
      data: {
        id: note.id,
        content: note.content,
        createdAt: note.createdAt,
        applicationId: note.applicationId,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create note",
    };
  }
}

/**
 * Deletes a note verifying parent application ownership by authenticated user.
 */
export async function deleteNoteAction(
  noteId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();

    const parsed = DeleteNoteSchema.safeParse({ noteId });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.errors[0]?.message ?? "Invalid note ID",
      };
    }

    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        application: {
          userId: user.id,
        },
      },
    });

    if (!note) {
      return { ok: false, error: "Note not found or access denied" };
    }

    await prisma.note.delete({
      where: { id: noteId },
    });

    safeRevalidate("/board");

    return { ok: true, data: { id: noteId } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to delete note",
    };
  }
}
