import { z } from "zod";
import { InterviewTypeSchema, InterviewOutcomeSchema } from "./enums";

export const CreateInterviewSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
  round: z.coerce
    .number()
    .int()
    .min(1, "Round must be at least 1")
    .max(20, "Round must be at most 20")
    .default(1),
  type: InterviewTypeSchema.default("HR"),
  scheduledAt: z.coerce.date(),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(5, "Duration must be at least 5 minutes")
    .max(480, "Duration cannot exceed 480 minutes")
    .default(45),
  prepNotes: z
    .string()
    .trim()
    .max(10000, "Notes cannot exceed 10,000 characters")
    .optional()
    .nullable(),
  outcome: InterviewOutcomeSchema.default("PENDING"),
  feedback: z
    .string()
    .trim()
    .max(10000, "Feedback cannot exceed 10,000 characters")
    .optional()
    .nullable(),
});

export type CreateInterviewInput = z.infer<typeof CreateInterviewSchema>;

export const UpdateInterviewSchema = CreateInterviewSchema.omit({ applicationId: true })
  .partial()
  .extend({
    interviewId: z.string().min(1, "Interview ID is required"),
  });

export type UpdateInterviewInput = z.infer<typeof UpdateInterviewSchema>;
