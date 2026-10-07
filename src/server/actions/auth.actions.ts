"use server";

import { redirect } from "next/navigation";
import { getAppMode } from "@/lib/env";
import { clearGuestCookie } from "@/server/auth/guest-cookie";

export async function signInWithProviderAction(
  provider: "github" | "google"
): Promise<void> {
  if (getAppMode() !== "personal") {
    redirect("/");
  }
  const { signIn } = await import("@/auth");
  await signIn(provider, { redirectTo: "/board" });
}

export async function signOutAction(): Promise<void> {
  if (getAppMode() === "demo") {
    await clearGuestCookie();
    redirect("/");
  } else {
    const { signOut } = await import("@/auth");
    await signOut({ redirectTo: "/signin" });
  }
}

export const signOutCurrentUserAction = signOutAction;
