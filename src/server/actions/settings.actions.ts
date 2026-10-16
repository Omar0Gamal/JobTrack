"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { requireUser, type AuthenticatedUser } from "@/server/auth/require-user";
import { clearGuestCookie } from "@/server/auth/guest-cookie";
import {
  UpdateUserSettingsSchema,
  DeleteAccountConfirmationSchema,
  type UpdateUserSettingsInput,
} from "@/schemas/settings.schema";
import type { ActionResult } from "@/server/actions/application.actions";

function safeRevalidate(path: string): void {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op when executed outside a Next.js server request context
  }
}

function isValidIanaTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function updateUserSettingsAction(
  input: UpdateUserSettingsInput
): Promise<ActionResult<AuthenticatedUser>> {
  try {
    const user = await requireUser();
    const parsed = UpdateUserSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      };
    }

    if (!isValidIanaTimezone(parsed.data.timezone)) {
      return {
        ok: false,
        error: `Invalid IANA timezone: ${parsed.data.timezone}`,
      };
    }

    const updateData: { name?: string; timezone: string } = {
      timezone: parsed.data.timezone,
    };
    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        isGuest: true,
        timezone: true,
        lastExportedAt: true,
      },
    });

    safeRevalidate("/settings");
    safeRevalidate("/board");
    safeRevalidate("/calendar");
    safeRevalidate("/dashboard");
    safeRevalidate("/interviews");

    return {
      ok: true,
      data: updated,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Failed to update user settings",
    };
  }
}

export async function deleteMyAccountAction(input: {
  confirmation: string;
}): Promise<ActionResult<{ deleted: boolean }>> {
  try {
    const user = await requireUser();
    const parsed = DeleteAccountConfirmationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: 'You must type "DELETE" to confirm account deletion',
      };
    }

    await prisma.user.delete({
      where: { id: user.id },
    });

    if (user.isGuest) {
      await clearGuestCookie();
    }

    safeRevalidate("/settings");
    safeRevalidate("/board");
    safeRevalidate("/");

    return {
      ok: true,
      data: { deleted: true },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to delete account",
    };
  }
}
