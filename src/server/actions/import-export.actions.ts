"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { requireUser } from "@/server/auth/require-user";
import {
  CsvImportRowSchema,
  FullBackupJsonSchema,
  type CsvImportRowInput,
  type FullBackupJsonPayload,
} from "@/schemas/import-export.schema";
import { generateApplicationsCsv } from "@/lib/csv/parser";
import type { ActionResult } from "@/server/actions/application.actions";

function safeRevalidate(path: string): void {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op when executed outside a Next.js server request context
  }
}

export async function exportApplicationsCsvAction(): Promise<
  ActionResult<{
    csv: string;
    filename: string;
    count: number;
    lastExportedAt: string;
  }>
> {
  try {
    const user = await requireUser();
    const applications = await prisma.application.findMany({
      where: { userId: user.id, deletedAt: null },
      include: {
        resumeVersion: true,
        interviews: { orderBy: { scheduledAt: "asc" } },
        notes: { orderBy: { createdAt: "desc" } },
        contacts: { orderBy: { createdAt: "asc" } },
        statusHistory: { orderBy: { changedAt: "desc" } },
      },
      orderBy: { position: "asc" },
    });

    const csv = generateApplicationsCsv(applications);
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0] ?? "backup";
    const filename = `jobtrack-applications-${dateStr}.csv`;

    await prisma.user.update({
      where: { id: user.id },
      data: { lastExportedAt: now },
    });

    safeRevalidate("/settings");

    return {
      ok: true,
      data: {
        csv,
        filename,
        count: applications.length,
        lastExportedAt: now.toISOString(),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Failed to export applications CSV",
    };
  }
}

export async function importCsvRowsAction(
  rows: CsvImportRowInput[]
): Promise<ActionResult<{ importedCount: number; skippedCount: number }>> {
  try {
    const user = await requireUser();

    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        ok: true,
        data: { importedCount: 0, skippedCount: 0 },
      };
    }

    const validRows: CsvImportRowInput[] = [];
    let skippedCount = 0;

    for (const raw of rows) {
      const parsed = CsvImportRowSchema.safeParse(raw);
      if (parsed.success) {
        validRows.push(parsed.data);
      } else {
        skippedCount++;
      }
    }

    if (validRows.length === 0) {
      return {
        ok: true,
        data: { importedCount: 0, skippedCount },
      };
    }

    await prisma.$transaction(async (tx) => {
      const maxPos = await tx.application.aggregate({
        where: { userId: user.id },
        _max: { position: true },
      });
      let nextPosition = (maxPos._max.position ?? 0) + 1000;

      for (const row of validRows) {
        const createdApp = await tx.application.create({
          data: {
            userId: user.id,
            company: row.company,
            role: row.role,
            status: row.status,
            priority: row.priority,
            locationType: row.locationType,
            location: row.location ?? null,
            salaryMin: row.salaryMin ?? null,
            salaryMax: row.salaryMax ?? null,
            currency: row.currency,
            source: row.source,
            jobUrl:
              row.jobUrl && row.jobUrl.trim() !== "" ? row.jobUrl.trim() : null,
            appliedDate: row.appliedDate ?? new Date(),
            followUpDate: row.followUpDate ?? null,
            position: nextPosition,
          },
        });
        nextPosition += 1000;

        await tx.statusHistory.create({
          data: {
            applicationId: createdApp.id,
            fromStatus: null,
            toStatus: createdApp.status,
            changedAt: createdApp.appliedDate,
          },
        });
      }
    });

    safeRevalidate("/board");
    safeRevalidate("/dashboard");
    safeRevalidate("/calendar");
    safeRevalidate("/interviews");
    safeRevalidate("/settings");

    return {
      ok: true,
      data: {
        importedCount: validRows.length,
        skippedCount,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Failed to import applications CSV",
    };
  }
}

export async function exportFullJsonBackupAction(): Promise<
  ActionResult<{
    json: string;
    filename: string;
    lastExportedAt: string;
  }>
> {
  try {
    const user = await requireUser();
    const [resumeVersions, applications] = await Promise.all([
      prisma.resumeVersion.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.application.findMany({
        where: { userId: user.id, deletedAt: null },
        include: {
          interviews: { orderBy: { scheduledAt: "asc" } },
          notes: { orderBy: { createdAt: "desc" } },
          contacts: { orderBy: { createdAt: "asc" } },
          statusHistory: { orderBy: { changedAt: "desc" } },
        },
        orderBy: { position: "asc" },
      }),
    ]);

    const now = new Date();

    const payload: FullBackupJsonPayload = {
      version: 1,
      exportedAt: now,
      resumeVersions: resumeVersions.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        fileName: r.fileName,
        createdAt: r.createdAt,
      })),
      applications: applications.map((app) => ({
        id: app.id,
        company: app.company,
        role: app.role,
        status: app.status,
        priority: app.priority,
        locationType: app.locationType,
        location: app.location,
        salaryMin: app.salaryMin,
        salaryMax: app.salaryMax,
        currency: app.currency,
        source: app.source,
        jobUrl: app.jobUrl,
        appliedDate: app.appliedDate,
        followUpDate: app.followUpDate,
        resumeVersionId: app.resumeVersionId,
        position: app.position,
        archivedAt: app.archivedAt,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        interviews: app.interviews.map((i) => ({
          id: i.id,
          round: i.round,
          type: i.type,
          scheduledAt: i.scheduledAt,
          durationMinutes: i.durationMinutes,
          prepNotes: i.prepNotes,
          outcome: i.outcome,
          feedback: i.feedback,
          createdAt: i.createdAt,
          updatedAt: i.updatedAt,
        })),
        notes: app.notes.map((n) => ({
          id: n.id,
          content: n.content,
          createdAt: n.createdAt,
        })),
        contacts: app.contacts.map((c) => ({
          id: c.id,
          name: c.name,
          title: c.title,
          email: c.email,
          linkedinUrl: c.linkedinUrl,
          createdAt: c.createdAt,
        })),
        statusHistory: app.statusHistory.map((s) => ({
          id: s.id,
          fromStatus: s.fromStatus,
          toStatus: s.toStatus,
          changedAt: s.changedAt,
        })),
      })),
    };

    const json = JSON.stringify(payload, null, 2);
    const dateStr = now.toISOString().split("T")[0] ?? "backup";
    const filename = `jobtrack-backup-${dateStr}.json`;

    await prisma.user.update({
      where: { id: user.id },
      data: { lastExportedAt: now },
    });

    safeRevalidate("/settings");

    return {
      ok: true,
      data: {
        json,
        filename,
        lastExportedAt: now.toISOString(),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Failed to export JSON backup",
    };
  }
}

export async function restoreFullJsonBackupAction(
  rawJson: string
): Promise<ActionResult<{ restoredApplications: number; restoredResumes: number }>> {
  try {
    const user = await requireUser();

    if (!rawJson || typeof rawJson !== "string") {
      return { ok: false, error: "Empty or invalid backup data" };
    }

    const existingCount = await prisma.application.count({
      where: { userId: user.id, deletedAt: null },
    });
    if (existingCount > 0) {
      return {
        ok: false,
        error:
          "Account must have 0 active applications before restoring a full JSON backup.",
      };
    }

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(rawJson);
    } catch {
      return { ok: false, error: "Malformed JSON file" };
    }

    const validation = FullBackupJsonSchema.safeParse(parsedData);
    if (!validation.success) {
      const errorMsg = validation.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      return {
        ok: false,
        error: `Invalid backup schema: ${errorMsg}`,
      };
    }

    const payload = validation.data;

    await prisma.$transaction(async (tx) => {
      const resumeIdMap = new Map<string, string>();

      for (const res of payload.resumeVersions) {
        const createdResume = await tx.resumeVersion.create({
          data: {
            userId: user.id,
            name: res.name,
            description: res.description ?? null,
            fileName: res.fileName ?? null,
            createdAt: res.createdAt,
          },
        });
        resumeIdMap.set(res.id, createdResume.id);
      }

      for (const app of payload.applications) {
        const mappedResumeId = app.resumeVersionId
          ? resumeIdMap.get(app.resumeVersionId) ?? null
          : null;

        const createdApp = await tx.application.create({
          data: {
            userId: user.id,
            company: app.company,
            role: app.role,
            status: app.status,
            priority: app.priority,
            locationType: app.locationType,
            location: app.location ?? null,
            salaryMin: app.salaryMin ?? null,
            salaryMax: app.salaryMax ?? null,
            currency: app.currency,
            source: app.source,
            jobUrl: app.jobUrl && app.jobUrl.trim() !== "" ? app.jobUrl.trim() : null,
            appliedDate: app.appliedDate,
            followUpDate: app.followUpDate ?? null,
            resumeVersionId: mappedResumeId,
            position: app.position,
            archivedAt: app.archivedAt ?? null,
            createdAt: app.createdAt,
          },
        });

        if (app.statusHistory && app.statusHistory.length > 0) {
          for (const sh of app.statusHistory) {
            await tx.statusHistory.create({
              data: {
                applicationId: createdApp.id,
                fromStatus: sh.fromStatus ?? null,
                toStatus: sh.toStatus,
                changedAt: sh.changedAt,
              },
            });
          }
        } else {
          await tx.statusHistory.create({
            data: {
              applicationId: createdApp.id,
              fromStatus: null,
              toStatus: createdApp.status,
              changedAt: createdApp.appliedDate,
            },
          });
        }

        if (app.interviews && app.interviews.length > 0) {
          for (const iv of app.interviews) {
            await tx.interview.create({
              data: {
                applicationId: createdApp.id,
                round: iv.round,
                type: iv.type,
                scheduledAt: iv.scheduledAt,
                durationMinutes: iv.durationMinutes,
                prepNotes: iv.prepNotes ?? null,
                outcome: iv.outcome,
                feedback: iv.feedback ?? null,
                createdAt: iv.createdAt,
              },
            });
          }
        }

        if (app.notes && app.notes.length > 0) {
          for (const n of app.notes) {
            await tx.note.create({
              data: {
                applicationId: createdApp.id,
                content: n.content,
                createdAt: n.createdAt,
              },
            });
          }
        }

        if (app.contacts && app.contacts.length > 0) {
          for (const c of app.contacts) {
            await tx.contact.create({
              data: {
                applicationId: createdApp.id,
                name: c.name,
                title: c.title ?? null,
                email: c.email && c.email.trim() !== "" ? c.email.trim() : null,
                linkedinUrl:
                  c.linkedinUrl && c.linkedinUrl.trim() !== ""
                    ? c.linkedinUrl.trim()
                    : null,
                createdAt: c.createdAt,
              },
            });
          }
        }
      }
    });

    safeRevalidate("/board");
    safeRevalidate("/dashboard");
    safeRevalidate("/calendar");
    safeRevalidate("/interviews");
    safeRevalidate("/settings");

    return {
      ok: true,
      data: {
        restoredApplications: payload.applications.length,
        restoredResumes: payload.resumeVersions.length,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Failed to restore JSON backup",
    };
  }
}
