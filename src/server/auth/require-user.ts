import { headers } from "next/headers";
import { prisma } from "@/server/db/prisma";
import { getAppMode, getAllowedEmails } from "@/lib/env";
import { getVerifiedGuestUserIdFromCookie } from "./guest-cookie";

export interface AuthenticatedUser {
  id: string;
  name: string | null;
  email: string | null;
  isGuest: boolean;
  timezone: string;
  lastExportedAt: Date | null;
}

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function getEffectiveAppMode(): Promise<"demo" | "personal"> {
  if (process.env.NODE_ENV !== "production") {
    try {
      const headerList = await headers();
      const testMode = headerList.get("x-test-app-mode");
      if (testMode === "personal" || testMode === "demo") {
        return testMode;
      }
    } catch {
      // Request headers unavailable outside of request contexts
    }
  }
  return getAppMode();
}

export async function verifyPersonalUser(
  userIdOrParams: string | { userId: string; email: string },
  emailParam?: string
): Promise<AuthenticatedUser | null> {
  const userId =
    typeof userIdOrParams === "object" ? userIdOrParams.userId : userIdOrParams;
  const email =
    typeof userIdOrParams === "object" ? userIdOrParams.email : (emailParam ?? "");

  const allowed = getAllowedEmails();
  if (allowed.length === 0 || !allowed.includes(email.toLowerCase())) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: userId,
      isGuest: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      isGuest: true,
      timezone: true,
      lastExportedAt: true,
    },
  });
}

export async function getCurrentUserOrNull(): Promise<AuthenticatedUser | null> {
  const mode = await getEffectiveAppMode();

  if (mode === "demo") {
    const guestId = await getVerifiedGuestUserIdFromCookie();
    if (!guestId) {
      return null;
    }
    return prisma.user.findFirst({
      where: {
        id: guestId,
        isGuest: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isGuest: true,
        timezone: true,
        lastExportedAt: true,
      },
    });
  }

  // Personal mode: Auth.js v5 session lookup
  try {
    const { auth } = await import("@/auth");
    const session = await auth();
    const userId = session?.user?.id;
    const email = session?.user?.email;

    if (!userId || !email) {
      return null;
    }

    return verifyPersonalUser({ userId, email });
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUserOrNull();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}

export async function signOutCurrentUserAction(): Promise<void> {
  const { signOutAction } = await import("@/server/actions/auth.actions");
  return signOutAction();
}
