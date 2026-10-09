import { z } from "zod";

export const CreateNoteSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
  content: z.string().trim().min(1, "Note content cannot be empty").max(10000, "Note cannot exceed 10,000 characters"),
});

export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;

export const DeleteNoteSchema = z.object({
  noteId: z.string().min(1, "Note ID is required"),
});

export type DeleteNoteInput = z.infer<typeof DeleteNoteSchema>;
