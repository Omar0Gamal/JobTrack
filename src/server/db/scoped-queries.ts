import { prisma } from "@/server/db/prisma";
import type { Prisma, ApplicationStatus } from "@prisma/client";

export class UnauthorizedResourceError extends Error {
  constructor(message = "Resource not found or access denied") {
    super(message);
    this.name = "UnauthorizedResourceError";
  }
}

export async function verifyApplicationOwnership(
  userId: string,
  applicationId: string
): Promise<boolean> {
  const count = await prisma.application.count({
    where: {
      id: applicationId,
      userId,
    },
  });
  if (count === 0) {
    throw new UnauthorizedResourceError(
      `Application ${applicationId} not found or access denied for user ${userId}`
    );
  }
  return true;
}

export async function verifyResumeVersionOwnership(
  userId: string,
  resumeVersionId: string
): Promise<boolean> {
  const count = await prisma.resumeVersion.count({
    where: {
      id: resumeVersionId,
      userId,
    },
  });
  if (count === 0) {
    throw new UnauthorizedResourceError(
      `ResumeVersion ${resumeVersionId} not found or access denied for user ${userId}`
    );
  }
  return true;
}

export function scopedDb(userId: string) {
  if (!userId || typeof userId !== "string") {
    throw new Error("scopedDb requires a valid userId");
  }

  return {
    userId,

    async verifyApplicationOwnership(applicationId: string): Promise<boolean> {
      return verifyApplicationOwnership(userId, applicationId);
    },

    async verifyResumeVersionOwnership(resumeVersionId: string): Promise<boolean> {
      return verifyResumeVersionOwnership(userId, resumeVersionId);
    },

    applications: {
      async findMany(args?: Prisma.ApplicationFindManyArgs) {
        return prisma.application.findMany({
          ...args,
          where: {
            ...args?.where,
            userId,
          },
        });
      },

      async findFirst(args?: Prisma.ApplicationFindFirstArgs) {
        return prisma.application.findFirst({
          ...args,
          where: {
            ...args?.where,
            userId,
          },
        });
      },

      async findById(applicationId: string, selectOrInclude?: { select?: Prisma.ApplicationSelect; include?: Prisma.ApplicationInclude }) {
        return prisma.application.findFirst({
          where: {
            id: applicationId,
            userId,
          },
          ...selectOrInclude,
        });
      },

      async create(args: Prisma.ApplicationCreateArgs) {
        const raw = args.data as Record<string, unknown>;
        const { user: _user, userId: _userId, ...cleanData } = raw;
        return prisma.application.create({
          ...args,
          data: {
            ...cleanData,
            userId,
          } as Prisma.ApplicationUncheckedCreateInput,
        });
      },

      async update(applicationId: string, args: Omit<Prisma.ApplicationUpdateArgs, "where">) {
        await verifyApplicationOwnership(userId, applicationId);
        return prisma.application.update({
          ...args,
          where: { id: applicationId },
        });
      },

      async delete(applicationId: string) {
        await verifyApplicationOwnership(userId, applicationId);
        return prisma.application.delete({
          where: { id: applicationId },
        });
      },

      async softDelete(applicationId: string) {
        await verifyApplicationOwnership(userId, applicationId);
        return prisma.application.update({
          where: { id: applicationId },
          data: { deletedAt: new Date() },
        });
      },

      async restore(applicationId: string) {
        await verifyApplicationOwnership(userId, applicationId);
        return prisma.application.update({
          where: { id: applicationId },
          data: { deletedAt: null },
        });
      },

      async archive(applicationId: string, archive = true) {
        await verifyApplicationOwnership(userId, applicationId);
        return prisma.application.update({
          where: { id: applicationId },
          data: { archivedAt: archive ? new Date() : null },
        });
      },

      async moveCard(applicationId: string, toStatus: ApplicationStatus, newPosition: number) {
        await verifyApplicationOwnership(userId, applicationId);
        return prisma.$transaction(async (tx) => {
          const existing = await tx.application.findUniqueOrThrow({
            where: { id: applicationId },
          });
          if (existing.status !== toStatus) {
            await tx.statusHistory.create({
              data: {
                applicationId,
                fromStatus: existing.status,
                toStatus,
              },
            });
          }
          return tx.application.update({
            where: { id: applicationId },
            data: {
              status: toStatus,
              position: newPosition,
            },
          });
        });
      },

      async count(args?: Prisma.ApplicationCountArgs) {
        return prisma.application.count({
          ...args,
          where: {
            ...args?.where,
            userId,
          },
        });
      },
    },

    resumeVersions: {
      async findMany(args?: Prisma.ResumeVersionFindManyArgs) {
        return prisma.resumeVersion.findMany({
          ...args,
          where: {
            ...args?.where,
            userId,
          },
        });
      },

      async findFirst(args?: Prisma.ResumeVersionFindFirstArgs) {
        return prisma.resumeVersion.findFirst({
          ...args,
          where: {
            ...args?.where,
            userId,
          },
        });
      },

      async findById(id: string) {
        return prisma.resumeVersion.findFirst({
          where: {
            id,
            userId,
          },
        });
      },

      async create(args: Prisma.ResumeVersionCreateArgs) {
        const raw = args.data as Record<string, unknown>;
        const { user: _user, userId: _userId, ...cleanData } = raw;
        return prisma.resumeVersion.create({
          ...args,
          data: {
            ...cleanData,
            userId,
          } as Prisma.ResumeVersionUncheckedCreateInput,
        });
      },

      async update(id: string, args: Omit<Prisma.ResumeVersionUpdateArgs, "where">) {
        await verifyResumeVersionOwnership(userId, id);
        return prisma.resumeVersion.update({
          ...args,
          where: { id },
        });
      },

      async delete(id: string) {
        await verifyResumeVersionOwnership(userId, id);
        return prisma.resumeVersion.delete({
          where: { id },
        });
      },

      async count(args?: Prisma.ResumeVersionCountArgs) {
        return prisma.resumeVersion.count({
          ...args,
          where: {
            ...args?.where,
            userId,
          },
        });
      },
    },

    interviews: {
      async findMany(args?: Prisma.InterviewFindManyArgs) {
        return prisma.interview.findMany({
          ...args,
          where: {
            ...args?.where,
            application: {
              userId,
            },
          },
        });
      },

      async findFirst(args?: Prisma.InterviewFindFirstArgs) {
        return prisma.interview.findFirst({
          ...args,
          where: {
            ...args?.where,
            application: {
              userId,
            },
          },
        });
      },

      async findById(interviewId: string) {
        return prisma.interview.findFirst({
          where: {
            id: interviewId,
            application: { userId },
          },
        });
      },

      async create(applicationId: string, data: Omit<Prisma.InterviewUncheckedCreateInput, "applicationId">) {
        await verifyApplicationOwnership(userId, applicationId);
        return prisma.interview.create({
          data: {
            ...data,
            applicationId,
          },
        });
      },

      async update(interviewId: string, data: Omit<Prisma.InterviewUncheckedUpdateInput, "applicationId" | "id">) {
        const item = await prisma.interview.findFirst({
          where: {
            id: interviewId,
            application: { userId },
          },
        });
        if (!item) {
          throw new UnauthorizedResourceError(`Interview ${interviewId} not found or access denied`);
        }
        return prisma.interview.update({
          where: { id: interviewId },
          data,
        });
      },

      async delete(interviewId: string) {
        const item = await prisma.interview.findFirst({
          where: {
            id: interviewId,
            application: { userId },
          },
        });
        if (!item) {
          throw new UnauthorizedResourceError(`Interview ${interviewId} not found or access denied`);
        }
        return prisma.interview.delete({
          where: { id: interviewId },
        });
      },
    },

    notes: {
      async findMany(args?: Prisma.NoteFindManyArgs) {
        return prisma.note.findMany({
          ...args,
          where: {
            ...args?.where,
            application: {
              userId,
            },
          },
        });
      },

      async findById(noteId: string) {
        return prisma.note.findFirst({
          where: {
            id: noteId,
            application: { userId },
          },
        });
      },

      async create(applicationId: string, content: string) {
        await verifyApplicationOwnership(userId, applicationId);
        return prisma.note.create({
          data: {
            applicationId,
            content,
          },
        });
      },

      async update(noteId: string, content: string) {
        const item = await prisma.note.findFirst({
          where: {
            id: noteId,
            application: { userId },
          },
        });
        if (!item) {
          throw new UnauthorizedResourceError(`Note ${noteId} not found or access denied`);
        }
        return prisma.note.update({
          where: { id: noteId },
          data: { content },
        });
      },

      async delete(noteId: string) {
        const item = await prisma.note.findFirst({
          where: {
            id: noteId,
            application: { userId },
          },
        });
        if (!item) {
          throw new UnauthorizedResourceError(`Note ${noteId} not found or access denied`);
        }
        return prisma.note.delete({
          where: { id: noteId },
        });
      },
    },

    contacts: {
      async findMany(args?: Prisma.ContactFindManyArgs) {
        return prisma.contact.findMany({
          ...args,
          where: {
            ...args?.where,
            application: {
              userId,
            },
          },
        });
      },

      async findById(contactId: string) {
        return prisma.contact.findFirst({
          where: {
            id: contactId,
            application: { userId },
          },
        });
      },

      async create(applicationId: string, data: Omit<Prisma.ContactUncheckedCreateInput, "applicationId">) {
        await verifyApplicationOwnership(userId, applicationId);
        return prisma.contact.create({
          data: {
            ...data,
            applicationId,
          },
        });
      },

      async update(contactId: string, data: Omit<Prisma.ContactUncheckedUpdateInput, "applicationId" | "id">) {
        const item = await prisma.contact.findFirst({
          where: {
            id: contactId,
            application: { userId },
          },
        });
        if (!item) {
          throw new UnauthorizedResourceError(`Contact ${contactId} not found or access denied`);
        }
        return prisma.contact.update({
          where: { id: contactId },
          data,
        });
      },

      async delete(contactId: string) {
        const item = await prisma.contact.findFirst({
          where: {
            id: contactId,
            application: { userId },
          },
        });
        if (!item) {
          throw new UnauthorizedResourceError(`Contact ${contactId} not found or access denied`);
        }
        return prisma.contact.delete({
          where: { id: contactId },
        });
      },
    },

    statusHistory: {
      async findMany(args?: Prisma.StatusHistoryFindManyArgs) {
        return prisma.statusHistory.findMany({
          ...args,
          where: {
            ...args?.where,
            application: {
              userId,
            },
          },
        });
      },

      async findByApplicationId(applicationId: string) {
        await verifyApplicationOwnership(userId, applicationId);
        return prisma.statusHistory.findMany({
          where: {
            applicationId,
            application: { userId },
          },
          orderBy: { changedAt: "desc" },
        });
      },
    },
  };
}
