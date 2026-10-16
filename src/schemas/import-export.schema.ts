import { z } from "zod";
import {
  ApplicationStatusSchema,
  PrioritySchema,
  LocationTypeSchema,
  ApplicationSourceSchema,
  InterviewTypeSchema,
  InterviewOutcomeSchema,
} from "@/schemas/enums";

export const CsvImportRowSchema = z
  .object({
    company: z
      .string({ required_error: "Company is required" })
      .trim()
      .min(1, "Company is required")
      .max(120),
    role: z
      .string({ required_error: "Role is required" })
      .trim()
      .min(1, "Role is required")
      .max(120),
    status: ApplicationStatusSchema.default("APPLIED"),
    priority: PrioritySchema.default("MEDIUM"),
    locationType: LocationTypeSchema.default("REMOTE"),
    location: z.string().trim().max(120).optional().nullable(),
    salaryMin: z.number().int().min(0).optional().nullable(),
    salaryMax: z.number().int().min(0).optional().nullable(),
    currency: z.string().trim().length(3).default("USD"),
    source: ApplicationSourceSchema.default("OTHER"),
    jobUrl: z.string().trim().url("Invalid Job URL").optional().nullable().or(z.literal("")),
    appliedDate: z.coerce.date().optional(),
    followUpDate: z.coerce.date().optional().nullable(),
  })
  .refine(
    (data) =>
      data.salaryMin == null ||
      data.salaryMax == null ||
      data.salaryMax >= data.salaryMin,
    {
      message: "Maximum salary must be greater than or equal to minimum salary",
      path: ["salaryMax"],
    }
  );

export type CsvImportRowInput = z.infer<typeof CsvImportRowSchema>;

export const BackupStatusHistorySchema = z.object({
  id: z.string().optional(),
  fromStatus: ApplicationStatusSchema.optional().nullable(),
  toStatus: ApplicationStatusSchema,
  changedAt: z.coerce.date().default(() => new Date()),
});

export const BackupNoteSchema = z.object({
  id: z.string().optional(),
  content: z.string().trim().min(1).max(10000),
  createdAt: z.coerce.date().default(() => new Date()),
});

export const BackupContactSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  title: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  linkedinUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
  createdAt: z.coerce.date().default(() => new Date()),
});

export const BackupInterviewSchema = z.object({
  id: z.string().optional(),
  round: z.number().int().min(1).max(20).default(1),
  type: InterviewTypeSchema.default("HR"),
  scheduledAt: z.coerce.date(),
  durationMinutes: z.number().int().min(5).max(480).default(45),
  prepNotes: z.string().max(10000).optional().nullable(),
  outcome: InterviewOutcomeSchema.default("PENDING"),
  feedback: z.string().max(10000).optional().nullable(),
  createdAt: z.coerce.date().default(() => new Date()),
  updatedAt: z.coerce.date().optional(),
});

export const BackupResumeVersionSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().nullable(),
  fileName: z.string().trim().max(255).optional().nullable(),
  createdAt: z.coerce.date().default(() => new Date()),
});

export const BackupApplicationSchema = z.object({
  id: z.string().optional(),
  company: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(120),
  status: ApplicationStatusSchema.default("APPLIED"),
  priority: PrioritySchema.default("MEDIUM"),
  locationType: LocationTypeSchema.default("REMOTE"),
  location: z.string().trim().max(120).optional().nullable(),
  salaryMin: z.number().int().min(0).optional().nullable(),
  salaryMax: z.number().int().min(0).optional().nullable(),
  currency: z.string().trim().length(3).default("USD"),
  source: ApplicationSourceSchema.default("OTHER"),
  jobUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
  appliedDate: z.coerce.date().default(() => new Date()),
  followUpDate: z.coerce.date().optional().nullable(),
  resumeVersionId: z.string().optional().nullable(),
  position: z.number().default(1000),
  archivedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().default(() => new Date()),
  updatedAt: z.coerce.date().optional(),
  interviews: z.array(BackupInterviewSchema).optional().default([]),
  notes: z.array(BackupNoteSchema).optional().default([]),
  contacts: z.array(BackupContactSchema).optional().default([]),
  statusHistory: z.array(BackupStatusHistorySchema).optional().default([]),
});

export const FullBackupJsonSchema = z.object({
  version: z.literal(1),
  exportedAt: z.coerce.date(),
  resumeVersions: z.array(BackupResumeVersionSchema).default([]),
  applications: z.array(BackupApplicationSchema).default([]),
});

export type FullBackupJsonPayload = z.infer<typeof FullBackupJsonSchema>;
