import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireAgent } from "@/server/auth/require-agent";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const auth = await requireAgent(request);
  if (!auth.ok) {
    return auth.response;
  }
  const { user } = auth.context;

  const resumes = await prisma.resumeVersion.findMany({
    where: { userId: user.id },
    include: {
      _count: {
        select: { applications: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formatted = resumes.map((r) => ({
    ...r,
    applicationCount: r._count.applications,
  }));

  return NextResponse.json({
    ok: true,
    data: formatted,
    resumes: formatted,
  });
}

const SingleResumeSchema = z.object({
  name: z.string().trim().min(1, "Resume name is required").max(100),
  description: z.string().trim().max(500).optional().nullable(),
  fileName: z.string().trim().max(255).optional().nullable(),
});

const BatchResumeSchema = z.object({
  resumes: z.array(SingleResumeSchema).min(1, "At least one resume is required"),
});

const PostResumeSchema = z.union([SingleResumeSchema, BatchResumeSchema]);

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

  const parsed = PostResumeSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.errors[0]?.message ?? "Invalid resume data",
        details: parsed.error.format(),
      },
      { status: 400 }
    );
  }

  const isBatch = "resumes" in parsed.data;
  const items = "resumes" in parsed.data ? parsed.data.resumes : [parsed.data];

  try {
    const results = await prisma.$transaction(async (tx) => {
      const processed = [];

      for (const item of items) {
        const nameTrimmed = item.name.trim();
        const existing = await tx.resumeVersion.findFirst({
          where: {
            userId: user.id,
            name: { equals: nameTrimmed, mode: "insensitive" },
          },
        });

        if (existing) {
          const updated = await tx.resumeVersion.update({
            where: { id: existing.id },
            data: {
              description:
                item.description !== undefined
                  ? item.description?.trim() || null
                  : existing.description,
              fileName:
                item.fileName !== undefined
                  ? item.fileName?.trim() || null
                  : existing.fileName,
            },
            include: {
              _count: { select: { applications: true } },
            },
          });
          processed.push({
            ...updated,
            applicationCount: updated._count.applications,
          });
        } else {
          const created = await tx.resumeVersion.create({
            data: {
              userId: user.id,
              name: nameTrimmed,
              description: item.description?.trim() || null,
              fileName: item.fileName?.trim() || null,
            },
            include: {
              _count: { select: { applications: true } },
            },
          });
          processed.push({
            ...created,
            applicationCount: created._count.applications,
          });
        }
      }

      return processed;
    });

    const responseData = isBatch ? results : results[0];
    return NextResponse.json({ ok: true, data: responseData }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process resume(s)",
      },
      { status: 500 }
    );
  }
}
