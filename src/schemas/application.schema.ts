import { z } from "zod";
import {
  ApplicationStatusSchema,
  PrioritySchema,
  LocationTypeSchema,
  ApplicationSourceSchema,
} from "./enums";

export const QuickAddApplicationSchema = z.object({
  company: z.string().trim().min(1, "Company is required").max(120, "Company must be at most 120 characters"),
  role: z.string().trim().min(1, "Role is required").max(120, "Role must be at most 120 characters"),
  status: ApplicationStatusSchema.default("APPLIED"),
});

export type QuickAddApplicationInput = z.infer<typeof QuickAddApplicationSchema>;

export const FullApplicationBaseSchema = QuickAddApplicationSchema.extend({
  priority: PrioritySchema.default("MEDIUM"),
  locationType: LocationTypeSchema.default("REMOTE"),
  location: z.string().trim().max(120, "Location must be at most 120 characters").optional().nullable(),
  salaryMin: z.number().int().min(0, "Salary must be non-negative").optional().nullable(),
  salaryMax: z.number().int().min(0, "Salary must be non-negative").optional().nullable(),
  currency: z.string().trim().length(3, "Currency must be a 3-letter ISO code").default("USD"),
  source: ApplicationSourceSchema.default("LINKEDIN"),
  jobUrl: z.string().trim().url("Invalid URL").optional().nullable().or(z.literal("")),
  appliedDate: z.coerce.date().default(() => new Date()),
  followUpDate: z.coerce.date().optional().nullable(),
  resumeVersionId: z.string().trim().optional().nullable().or(z.literal("")),
});

export const FullApplicationSchema = FullApplicationBaseSchema.refine(
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

export type FullApplicationInput = z.infer<typeof FullApplicationSchema>;

export const UpdateApplicationSchema = FullApplicationBaseSchema.partial()
  .extend({
    id: z.string().min(1, "Application ID is required"),
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

export type UpdateApplicationInput = z.infer<typeof UpdateApplicationSchema>;

export const MoveApplicationCardSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
  toStatus: ApplicationStatusSchema,
  newPosition: z.number().finite("Position must be a finite number"),
  orderedColumnIds: z.array(z.string()).optional(),
  rebalanceColumn: z.boolean().optional(),
});

export type MoveApplicationCardInput = z.infer<typeof MoveApplicationCardSchema>;
