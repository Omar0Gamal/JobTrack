import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireAgent } from "@/server/auth/require-agent";
import { ApplicationStatusSchema } from "@/schemas/enums";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const BatchUpdateItemSchema = z.object({
  id: z.string().trim().min(1, "Application ID is required"),
  status: ApplicationStatusSchema.optional(),
  followUpDate: z.coerce.date().optional().nullable(),
  addNote: z.string().trim().optional().nullable(),
});

const BatchUpdateSchema = z.object({
  updates: z.array(BatchUpdateItemSchema).min(1, "At least one update is required").max(50),
});

export async function PATCH(request: NextRequest) {
  const auth = await requireAgent(request);
  if (!auth.ok) {
    return auth.response;
  }
  const { user } = auth.context;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BatchUpdateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.errors[0]?.message ?? "Invalid batch update payload",
        details: parsed.error.format(),
      },
      { status: 400 }
    );
  }

  const { updates } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updatedIds: string[] = [];
      const failed: Array<{ id: string; error: string }> = [];

      for (const item of updates) {
        const existing = await tx.application.findFirst({
          where: {
            id: item.id,
            userId: user.id,
            deletedAt: null,
          },
        });

        if (!existing) {
          failed.push({ id: item.id, error: "Application not found" });
          continue;
        }

        if (item.status && item.status !== existing.status) {
          await tx.statusHistory.create({
            data: {
              applicationId: existing.id,
              fromStatus: existing.status,
              toStatus: item.status,
            },
          });
        }

        const updatePayload: Prisma.ApplicationUpdateInput = {};
        if (item.status !== undefined) updatePayload.status = item.status;
        if (item.followUpDate !== undefined) updatePayload.followUpDate = item.followUpDate;

        if (Object.keys(updatePayload).length > 0) {
          await tx.application.update({
            where: { id: existing.id },
            data: updatePayload,
          });
        }

        if (item.addNote && item.addNote.trim().length > 0) {
          await tx.note.create({
            data: {
              applicationId: existing.id,
              content: item.addNote.trim(),
            },
          });
        }

        updatedIds.push(existing.id);
      }

      return { updatedIds, failed };
    });

    return NextResponse.json({
      ok: true,
      updatedCount: result.updatedIds.length,
      updatedIds: result.updatedIds,
      failed: result.failed,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to batch update applications",
      },
      { status: 500 }
    );
  }
}
