import { z } from "zod";

export const CreateResumeVersionSchema = z.object({
  name: z.string().trim().min(1, "Resume version name is required").max(100),
  description: z.string().trim().max(500).optional().nullable(),
  fileName: z.string().trim().max(255).optional().nullable(),
});
export type CreateResumeVersionInput = z.infer<typeof CreateResumeVersionSchema>;

export const UpdateResumeVersionSchema = CreateResumeVersionSchema.partial().extend({
  id: z.string().min(1, "Resume version ID is required"),
});
export type UpdateResumeVersionInput = z.infer<typeof UpdateResumeVersionSchema>;
