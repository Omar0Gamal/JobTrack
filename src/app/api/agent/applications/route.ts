import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireAgent } from "@/server/auth/require-agent";
import { FullApplicationBaseSchema } from "@/schemas/application.schema";
import { ApplicationStatusSchema, type ApplicationStatus } from "@/schemas/enums";
import { calculateNewCardPosition } from "@/lib/kanban/positioning";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const agentApplicationInclude = {
  resumeVersion: true,
  contacts: {
    orderBy: { createdAt: "asc" as const },
  },
  interviews: {
    orderBy: { scheduledAt: "asc" as const },
  },
  notes: {
    orderBy: { createdAt: "desc" as const },
    take: 3,
  },
  statusHistory: {
    orderBy: { changedAt: "desc" as const },
    take: 3,
  },
} as const;

export async function GET(request: NextRequest) {
  const auth = await requireAgent(request);
  if (!auth.ok) {
    return auth.response;
  }
  const { user } = auth.context;

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search")?.trim();
  const company = searchParams.get("company")?.trim();
  const role = searchParams.get("role")?.trim();
  const jobUrl = searchParams.get("jobUrl")?.trim();
  const status = searchParams.get("status")?.trim();
  const overdueOnly = searchParams.get("overdueOnly") === "true";
  const compact = searchParams.get("compact") === "true";
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const limit = limitParam
    ? Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 200)
    : 50;
  const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10) || 0) : 0;

  const andConditions: Prisma.ApplicationWhereInput[] = [
    { userId: user.id, deletedAt: null },
  ];

  if (search) {
    andConditions.push({
      OR: [
        { company: { contains: search, mode: "insensitive" } },
        { role: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (company) {
    andConditions.push({
      company: { contains: company, mode: "insensitive" },
    });
  }

  if (role) {
    andConditions.push({
      role: { contains: role, mode: "insensitive" },
    });
  }

  if (jobUrl) {
    andConditions.push({
      jobUrl: { contains: jobUrl, mode: "insensitive" },
    });
  }

  if (status && ApplicationStatusSchema.safeParse(status).success) {
    andConditions.push({
      status: status as ApplicationStatus,
    });
  }

  if (overdueOnly) {
    andConditions.push({
      followUpDate: { lte: new Date() },
      status: { notIn: ["OFFER", "REJECTED"] },
      archivedAt: null,
    });
  }

  const applications = compact
    ? await prisma.application.findMany({
        where: { AND: andConditions },
        orderBy: [{ createdAt: "desc" }],
        skip: offset,
        take: limit,
        select: {
          id: true,
          company: true,
          role: true,
          status: true,
          priority: true,
          locationType: true,
          location: true,
          salaryMin: true,
          salaryMax: true,
          currency: true,
          source: true,
          jobUrl: true,
          appliedDate: true,
          followUpDate: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    : await prisma.application.findMany({
        where: { AND: andConditions },
        orderBy: [{ createdAt: "desc" }],
        skip: offset,
        take: limit,
        include: agentApplicationInclude,
      });

  return NextResponse.json({
    ok: true,
    applications,
    count: applications.length,
    isDuplicate: applications.length > 0,
  });
}

const AgentCreateContactSchema = z.object({
  name: z.string().trim().min(1, "Contact name is required"),
  title: z.string().trim().optional().nullable(),
  email: z.string().trim().email("Invalid email").optional().nullable().or(z.literal("")),
  linkedinUrl: z.string().trim().url("Invalid URL").optional().nullable().or(z.literal("")),
});

const AgentCreateApplicationSchema = FullApplicationBaseSchema.extend({
  resumeName: z.string().trim().optional().nullable(),
  resumeFileName: z.string().trim().optional().nullable(),
  fileName: z.string().trim().optional().nullable(),
  note: z.string().trim().optional().nullable(),
  contact: AgentCreateContactSchema.optional().nullable(),
}).refine(
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

export async function POST(request: NextRequest) {
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

  const parsed = AgentCreateApplicationSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.errors[0]?.message ?? "Invalid application input",
        details: parsed.error.format(),
      },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const isFollowUpExplicitlyProvided =
    rawBody !== null &&
    typeof rawBody === "object" &&
    "followUpDate" in rawBody &&
    (rawBody as Record<string, unknown>).followUpDate !== undefined;

  let finalFollowUpDate = data.followUpDate ?? null;
  if (!isFollowUpExplicitlyProvided && data.status === "APPLIED") {
    finalFollowUpDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      // Resolve resume version if resumeName is provided and resumeVersionId is not
      let resolvedResumeVersionId = data.resumeVersionId?.trim() || null;
      if (!resolvedResumeVersionId && data.resumeName && data.resumeName.trim().length > 0) {
        const resumeNameTrimmed = data.resumeName.trim();
        const existingResume = await tx.resumeVersion.findFirst({
          where: {
            userId: user.id,
            name: { equals: resumeNameTrimmed, mode: "insensitive" },
          },
        });

        if (existingResume) {
          resolvedResumeVersionId = existingResume.id;
        } else {
          const newResume = await tx.resumeVersion.create({
            data: {
              userId: user.id,
              name: resumeNameTrimmed,
              fileName: data.resumeFileName?.trim() || data.fileName?.trim() || null,
            },
          });
          resolvedResumeVersionId = newResume.id;
        }
      }

      // Calculate Kanban position
      const existingInColumn = await tx.application.findMany({
        where: {
          userId: user.id,
          status: data.status,
          deletedAt: null,
        },
        select: { position: true },
      });

      const position = calculateNewCardPosition(existingInColumn.map((c) => c.position));

      // Create Application
      const app = await tx.application.create({
        data: {
          userId: user.id,
          company: data.company,
          role: data.role,
          status: data.status,
          priority: data.priority,
          locationType: data.locationType,
          location: data.location?.trim() || null,
          salaryMin: data.salaryMin ?? null,
          salaryMax: data.salaryMax ?? null,
          currency: data.currency || "USD",
          source: data.source,
          jobUrl: data.jobUrl?.trim() || null,
          appliedDate: data.appliedDate ?? new Date(),
          followUpDate: finalFollowUpDate,
          resumeVersionId: resolvedResumeVersionId,
          position,
        },
      });

      // Create initial StatusHistory
      await tx.statusHistory.create({
        data: {
          applicationId: app.id,
          fromStatus: null,
          toStatus: data.status,
        },
      });

      // Create optional Note
      if (data.note && data.note.trim().length > 0) {
        await tx.note.create({
          data: {
            applicationId: app.id,
            content: data.note.trim(),
          },
        });
      }

      // Create optional Contact
      if (data.contact && data.contact.name && data.contact.name.trim().length > 0) {
        await tx.contact.create({
          data: {
            applicationId: app.id,
            name: data.contact.name.trim(),
            title: data.contact.title?.trim() || null,
            email: data.contact.email?.trim() || null,
            linkedinUrl: data.contact.linkedinUrl?.trim() || null,
          },
        });
      }

      return tx.application.findUniqueOrThrow({
        where: { id: app.id },
        include: {
          resumeVersion: true,
          notes: { orderBy: { createdAt: "desc" } },
          contacts: { orderBy: { createdAt: "asc" } },
          interviews: { orderBy: { scheduledAt: "asc" } },
          statusHistory: { orderBy: { changedAt: "desc" } },
        },
      });
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create application",
      },
      { status: 500 }
    );
  }
}
