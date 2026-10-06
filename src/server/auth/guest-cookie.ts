import crypto from "crypto";
import { cookies } from "next/headers";
import { getAuthSecret } from "@/lib/env";

export const GUEST_COOKIE_NAME = "jt_guest_id";
export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export function signGuestUserId(userId: string): string {
  if (!userId || typeof userId !== "string") {
    throw new Error("Cannot sign empty userId");
  }
  const secret = getAuthSecret();
  const signature = crypto.createHmac("sha256", secret).update(userId).digest("hex");
  return `${userId}.${signature}`;
}

export function verifyGuestCookieValue(raw: string | undefined): string | null {
  if (!raw || typeof raw !== "string") {
    return null;
  }
  const dotIndex = raw.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === raw.length - 1) {
    return null;
  }

  const userId = raw.slice(0, dotIndex);
  const signature = raw.slice(dotIndex + 1);

  if (!userId || !signature) {
    return null;
  }

  // Hex encoded SHA256 is exactly 64 characters
  if (signature.length !== 64) {
    return null;
  }

  const secret = getAuthSecret();
  const expectedSignature = crypto.createHmac("sha256", secret).update(userId).digest("hex");

  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (sigBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  return userId;
}

export async function setGuestCookie(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const value = signGuestUserId(userId);
  cookieStore.set(GUEST_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_COOKIE_MAX_AGE,
  });
}

export async function getVerifiedGuestUserIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(GUEST_COOKIE_NAME)?.value;
  return verifyGuestCookieValue(raw);
}

export async function clearGuestCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_COOKIE_NAME);
}
