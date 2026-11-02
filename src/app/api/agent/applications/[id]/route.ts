import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireAgent } from "@/server/auth/require-agent";
import {
  ApplicationStatusSchema,
  PrioritySchema,
  LocationTypeSchema,
  ApplicationSourceSchema,
  InterviewTypeSchema,
  InterviewOutcomeSchema,
} from "@/schemas/enums";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const applicationWithAllRelations = {
  resumeVersion: true,
  notes: {
    orderBy: { createdAt: "desc" as const },
  },
  contacts: {
    orderBy: { createdAt: "asc" as const },
  },
  interviews: {
    orderBy: { scheduledAt: "asc" as const },
  },
  statusHistory: {
    orderBy: { changedAt: "desc" as const },
  },
} as const;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAgent(request);
  if (!auth.ok) {
    return auth.response;
  }
  const { user } = auth.context;
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Missing application ID" }, { status: 400 });
  }

  const application = await prisma.application.findFirst({
    where: {
      id,
      userId: user.id,
      deletedAt: null,
    },
    include: applicationWithAllRelations,
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    data: application,
    application,
  });
}

const AgentPatchContactSchema = z.object({
  name: z.string().trim().min(1, "Contact name is required"),
  title: z.string().trim().optional().nullable(),
  email: z.string().trim().email("Invalid email").optional().nullable().or(z.literal("")),
  linkedinUrl: z.string().trim().url("Invalid URL").optional().nullable().or(z.literal("")),
});

const AgentPatchInterviewSchema = z.object({
  round: z.coerce.number().int().min(1).max(20).optional().default(1),
  type: InterviewTypeSchema.optional().default("HR"),
  scheduledAt: z.coerce.date(),
  durationMinutes: z.coerce.number().int().min(5).max(480).optional().default(45),
  prepNotes: z.string().trim().optional().nullable(),
  outcome: InterviewOutcomeSchema.optional().default("PENDING"),
});

const AgentPatchApplicationSchema = z
  .object({
    company: z.string().trim().min(1).max(120).optional(),
    role: z.string().trim().min(1).max(120).optional(),
    status: ApplicationStatusSchema.optional(),
    priority: PrioritySchema.optional(),
    locationType: LocationTypeSchema.optional(),
    location: z.string().trim().max(120).optional().nullable(),
    salaryMin: z.number().int().min(0).optional().nullable(),
    salaryMax: z.number().int().min(0).optional().nullable(),
    currency: z.string().trim().length(3).optional(),
    source: ApplicationSourceSchema.optional(),
    jobUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
    followUpDate: z.coerce.date().optional().nullable(),
    resumeVersionId: z.string().trim().optional().nullable().or(z.literal("")),
    addNote: z.string().trim().optional().nullable(),
    addContact: AgentPatchContactSchema.optional().nullable(),
    addInterview: AgentPatchInterviewSchema.optional().nullable(),
  })
  .refine(
    (data) => {
      if (
        data.salaryMin !== null &&
        data.salaryMin !== undefined &&
        data.salaryMax !== null &&
        data.salaryMax !== undefined
      ) {
        return data.salaryMax >= data.salaryMin;
      }
      return true;
    },
    {
      message: "Maximum salary must be greater than or equal to minimum salary",
      path: ["salaryMax"],
    }
  );

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAgent(request);
  if (!auth.ok) {
    return auth.response;
  }
  const { user } = auth.context;
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Missing application ID" }, { status: 400 });
  }

  const existing = await prisma.application.findFirst({
    where: {
      id,
      userId: user.id,
      deletedAt: null,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = AgentPatchApplicationSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.errors[0]?.message ?? "Invalid update payload",
        details: parsed.error.format(),
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // If status changed, create StatusHistory record
      if (data.status && data.status !== existing.status) {
        await tx.statusHistory.create({
          data: {
            applicationId: existing.id,
            fromStatus: existing.status,
            toStatus: data.status,
          },
        });
      }

      const updatePayload: Prisma.ApplicationUpdateInput = {};

      if (data.company !== undefined) updatePayload.company = data.company;
      if (data.role !== undefined) updatePayload.role = data.role;
      if (data.status !== undefined) updatePayload.status = data.status;
      if (data.priority !== undefined) updatePayload.priority = data.priority;
      if (data.locationType !== undefined) updatePayload.locationType = data.locationType;
      if (data.location !== undefined) updatePayload.location = data.location?.trim() || null;
      if (data.salaryMin !== undefined) updatePayload.salaryMin = data.salaryMin;
      if (data.salaryMax !== undefined) updatePayload.salaryMax = data.salaryMax;
      if (data.currency !== undefined) updatePayload.currency = data.currency;
      if (data.source !== undefined) updatePayload.source = data.source;
      if (data.jobUrl !== undefined) updatePayload.jobUrl = data.jobUrl?.trim() || null;
      if (data.followUpDate !== undefined) updatePayload.followUpDate = data.followUpDate;
      if (data.resumeVersionId !== undefined) {
        const cleanResumeId = data.resumeVersionId?.trim();
        updatePayload.resumeVersion = cleanResumeId
          ? { connect: { id: cleanResumeId } }
          : { disconnect: true };
      }

      // Perform application update
      await tx.application.update({
        where: { id: existing.id },
        data: updatePayload,
      });

      // Optional addNote
      if (data.addNote && data.addNote.trim().length > 0) {
        await tx.note.create({
          data: {
            applicationId: existing.id,
            content: data.addNote.trim(),
          },
        });
      }

      // Optional addContact
      if (data.addContact && data.addContact.name && data.addContact.name.trim().length > 0) {
        await tx.contact.create({
          data: {
            applicationId: existing.id,
            name: data.addContact.name.trim(),
            title: data.addContact.title?.trim() || null,
            email: data.addContact.email?.trim() || null,
            linkedinUrl: data.addContact.linkedinUrl?.trim() || null,
          },
        });
      }

      // Optional addInterview
      if (data.addInterview && data.addInterview.scheduledAt) {
        await tx.interview.create({
          data: {
            applicationId: existing.id,
            round: data.addInterview.round ?? 1,
            type: data.addInterview.type ?? "HR",
            scheduledAt: data.addInterview.scheduledAt,
            durationMinutes: data.addInterview.durationMinutes ?? 45,
            prepNotes: data.addInterview.prepNotes?.trim() || null,
            outcome: data.addInterview.outcome ?? "PENDING",
          },
        });
      }

      return tx.application.findUniqueOrThrow({
        where: { id: existing.id },
        include: applicationWithAllRelations,
      });
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update application",
      },
      { status: 500 }
    );
  }
}
