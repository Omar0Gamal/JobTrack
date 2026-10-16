import { z } from "zod";

export const UpdateUserSettingsSchema = z.object({
  name: z.string().trim().min(1, "Name must be at least 1 character").max(100).optional(),
  timezone: z.string().trim().min(1, "Timezone is required"),
});

export type UpdateUserSettingsInput = z.infer<typeof UpdateUserSettingsSchema>;

export const DeleteAccountConfirmationSchema = z.object({
  confirmation: z.literal("DELETE", {
    errorMap: () => ({ message: 'You must type "DELETE" to confirm account deletion' }),
  }),
});

export type DeleteAccountConfirmationInput = z.infer<typeof DeleteAccountConfirmationSchema>;
