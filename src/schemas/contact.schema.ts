import { z } from "zod";

export const CreateContactSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
  name: z.string().trim().min(1, "Contact name is required").max(120, "Contact name must be at most 120 characters"),
  title: z.string().trim().max(120, "Title must be at most 120 characters").optional().nullable(),
  email: z.string().trim().email("Invalid email address").optional().nullable().or(z.literal("")),
  linkedinUrl: z.string().trim().url("Invalid URL").optional().nullable().or(z.literal("")),
});

export type CreateContactInput = z.infer<typeof CreateContactSchema>;

export const UpdateContactSchema = CreateContactSchema.omit({ applicationId: true })
  .partial()
  .extend({
    contactId: z.string().min(1, "Contact ID is required"),
  });

export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;
