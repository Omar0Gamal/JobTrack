import { test, expect } from "@playwright/test";

test.describe("Personal Mode Authentication & Route Protection E2E", () => {
  test.use({
    extraHTTPHeaders: {
      "x-test-app-mode": "personal",
    },
  });

  test("enforces unauthenticated redirects and error displays in personal mode", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => {
      pageErrors.push(err);
    });

    // 1. Navigating to /board unauthenticated in personal mode redirects to /signin?callbackUrl=%2Fboard
    await page.goto("/board");
    await page.waitForURL(
      (url) =>
        url.pathname === "/signin" &&
        url.searchParams.get("callbackUrl") === "/board",
      { timeout: 15000 }
    );
    expect(page.url()).toContain("/signin?callbackUrl=%2Fboard");

    // 2. Navigating to / unauthenticated in personal mode redirects to /signin
    await page.goto("/");
    await page.waitForURL((url) => url.pathname === "/signin", {
      timeout: 15000,
    });
    expect(page.url()).toContain("/signin");

    // 3. Navigating to /signin?error=AccessDenied in personal mode renders the OAuth sign-in screen and displays allowlist banner
    await page.goto("/signin?error=AccessDenied");
    await expect(
      page.getByRole("heading", { name: /sign in to jobtrack/i })
    ).toBeVisible({ timeout: 15000 });

    // Verify ALLOWED_EMAILS rejection error banner is visible
    await expect(page.getByText(/ALLOWED_EMAILS/i)).toBeVisible({
      timeout: 10000,
    });

    // Verify OAuth provider buttons are rendered
    await expect(
      page.getByRole("button", { name: /continue with github/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /continue with google/i })
    ).toBeVisible();

    // Verify zero console errors
    expect(pageErrors).toEqual([]);
  });
});
