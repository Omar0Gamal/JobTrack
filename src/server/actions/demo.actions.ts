"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { subDays } from "date-fns";
import { prisma } from "@/server/db/prisma";
import { getAppMode } from "@/lib/env";
import {
  getVerifiedGuestUserIdFromCookie,
  setGuestCookie,
} from "@/server/auth/guest-cookie";
import { requireUser } from "@/server/auth/require-user";
import {
  createSeededGuestUser,
  reseedGuestUserData,
} from "@/lib/seed/seed-guest-data";

export async function startDemoSessionAction(): Promise<void> {
  if (getAppMode() !== "demo") {
    throw new Error("Demo sessions are only permitted in demo mode (APP_MODE=demo)");
  }

  const existingGuestId = await getVerifiedGuestUserIdFromCookie();
  if (existingGuestId) {
    const existingUser = await prisma.user.findFirst({
      where: { id: existingGuestId, isGuest: true },
    });
    if (existingUser) {
      redirect("/board");
    }
  }

  const { userId } = await createSeededGuestUser(prisma);
  await setGuestCookie(userId);
  redirect("/board");
}

export async function resetDemoDataAction(): Promise<{ success: boolean }> {
  if (getAppMode() !== "demo") {
    throw new Error("Resetting demo data is forbidden in personal mode");
  }

  const user = await requireUser();
  if (!user.isGuest) {
    throw new Error("Forbidden: Only guest demo accounts may be reset");
  }

  await reseedGuestUserData(user.id, prisma);

  revalidatePath("/board");
  revalidatePath("/dashboard");
  revalidatePath("/interviews");
  revalidatePath("/calendar");
  revalidatePath("/settings");

  return { success: true };
}

export interface CleanupResult {
  deletedGuests: number;
  purgedApplications: number;
}

export async function cleanupStaleGuestsAction(): Promise<CleanupResult> {
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);

  // Soft-deleted applications older than 30 days are purged in both modes
  const purgedApps = await prisma.application.deleteMany({
    where: {
      deletedAt: {
        lt: thirtyDaysAgo,
      },
    },
  });

  if (getAppMode() !== "demo") {
    // In personal mode, never touch User rows
    return {
      deletedGuests: 0,
      purgedApplications: purgedApps.count,
    };
  }

  // In demo mode, delete guest users created more than 7 days ago
  const sevenDaysAgo = subDays(now, 7);
  const deletedGuests = await prisma.user.deleteMany({
    where: {
      isGuest: true,
      createdAt: {
        lt: sevenDaysAgo,
      },
    },
  });

  return {
    deletedGuests: deletedGuests.count,
    purgedApplications: purgedApps.count,
  };
}
