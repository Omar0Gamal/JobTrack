import { test, expect } from "@playwright/test";
import path from "path";

const ARTIFACT_PATH = process.env.ARTIFACT_DIR
  ? path.resolve(process.env.ARTIFACT_DIR, "mobile-responsive-view.png")
  : path.resolve(__dirname, "../docs/screenshots/mobile-responsive-view.png");

test.describe("Responsive Viewport, Accessibility & Core Web Vitals E2E", () => {
  test("Landing Page Accessibility & Fast LCP (1280x800)", async ({ page }) => {
    test.setTimeout(60000);

    const runtimeErrors: Error[] = [];
    page.on("pageerror", (err) => {
      runtimeErrors.push(err);
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    // Verify html lang attribute is set to "en"
    const htmlLang = await page.locator("html").getAttribute("lang");
    expect(htmlLang).toBe("en");

    // Verify document has non-empty title
    const docTitle = await page.title();
    expect(docTitle).toBeTruthy();
    expect(docTitle.length).toBeGreaterThan(0);

    // Verify semantic main landmark exists
    const mainLandmark = page.locator("main");
    await expect(mainLandmark).toBeVisible();

    // Verify single clear h1 landmark
    const h1Landmarks = page.locator("h1");
    await expect(h1Landmarks).toHaveCount(1);
    await expect(h1Landmarks.first()).toContainText("Master your job search");

    // Verify zero buttons without accessible text or aria-label
    const unlabelledButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button, [role='button']"));
      const invalid: string[] = [];
      for (const btn of buttons) {
        const text = btn.textContent?.trim() || "";
        const ariaLabel = btn.getAttribute("aria-label")?.trim() || "";
        const ariaLabelledby = btn.getAttribute("aria-labelledby")?.trim() || "";
        const title = btn.getAttribute("title")?.trim() || "";
        if (!text && !ariaLabel && !ariaLabelledby && !title) {
          invalid.push(btn.outerHTML.slice(0, 100));
        }
      }
      return invalid;
    });
    expect(unlabelledButtons).toEqual([]);

    // Fast LCP / Core Web Vital check
    const lcpValue = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let maxLcp = 0;
        try {
          const observer = new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              if (entry.startTime > maxLcp) {
                maxLcp = entry.startTime;
              }
            }
          });
          observer.observe({ type: "largest-contentful-paint", buffered: true });
        } catch {
          // If observer not supported in environment
        }
        setTimeout(() => resolve(maxLcp), 1500);
      });
    });

    // LCP should render promptly (under 4.0s)
    if (lcpValue > 0) {
      expect(lcpValue).toBeLessThan(4000);
    }

    expect(runtimeErrors).toEqual([]);
  });

  test("Mobile Viewport (375x812): zero horizontal overflow, drawer navigation & agenda list", async ({
    page,
  }) => {
    test.setTimeout(90000);

    const runtimeErrors: Error[] = [];
    page.on("pageerror", (err) => {
      runtimeErrors.push(err);
    });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    // Launch demo session from landing page
    const demoButton = page
      .getByRole("button", { name: /Try the Interactive Demo|Launch Demo/i })
      .first();
    await expect(demoButton).toBeVisible();
    await demoButton.click();
    await page.waitForURL("**/board", { timeout: 30000 });

    // Verify board page at 375x812 has zero horizontal document overflow
    const documentScrollWidth = await page.evaluate(() => {
      return document.documentElement.scrollWidth;
    });
    expect(documentScrollWidth).toBeLessThanOrEqual(375);

    // Open mobile navigation drawer via header menu button
    const mobileMenuTrigger = page.getByRole("button", {
      name: "Open sidebar navigation",
    });
    await expect(mobileMenuTrigger).toBeVisible();
    await mobileMenuTrigger.click();

    // Verify navigation drawer sheet opened
    const drawerDialog = page.getByRole("dialog");
    await expect(drawerDialog).toBeVisible();

    // Navigate to /calendar via drawer link
    const calendarLink = drawerDialog.getByRole("link", { name: "Calendar" });
    await expect(calendarLink).toBeVisible();
    await calendarLink.click();
    await page.waitForURL("**/calendar", { timeout: 15000 });

    // Verify mobile chronological Agenda List is visible while 7-column desktop grid is hidden
    const desktopGrid = page.locator("div.hidden.md\\:block [role='grid']");
    await expect(desktopGrid).toBeHidden();

    const mobileAgendaContainer = page.locator("div.md\\:hidden");
    await expect(mobileAgendaContainer).toBeVisible();

    // Capture mobile responsive screenshot to artifact directory
    await page.screenshot({
      path: ARTIFACT_PATH,
      fullPage: true,
    });

    expect(runtimeErrors).toEqual([]);
  });

  test("Tablet (768x1024) and Desktop (1280x800) Viewports: board & dashboard clean rendering", async ({
    page,
  }) => {
    test.setTimeout(90000);

    const runtimeErrors: Error[] = [];
    page.on("pageerror", (err) => {
      runtimeErrors.push(err);
    });

    // Start with demo session
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    const demoButton = page
      .getByRole("button", { name: /Try the Interactive Demo|Launch Demo/i })
      .first();
    await expect(demoButton).toBeVisible();
    await demoButton.click();
    await page.waitForURL("**/board", { timeout: 30000 });

    const viewports = [
      { name: "Tablet", width: 768, height: 1024 },
      { name: "Desktop", width: 1280, height: 800 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // 1. Verify Board view
      await page.goto("/board");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Application Pipeline"
      );

      // Verify all buttons have accessible names
      const boardUnlabelled = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button, [role='button']"));
        const invalid: string[] = [];
        for (const btn of buttons) {
          const text = btn.textContent?.trim() || "";
          const ariaLabel = btn.getAttribute("aria-label")?.trim() || "";
          const ariaLabelledby = btn.getAttribute("aria-labelledby")?.trim() || "";
          const title = btn.getAttribute("title")?.trim() || "";
          if (!text && !ariaLabel && !ariaLabelledby && !title) {
            invalid.push(btn.outerHTML.slice(0, 100));
          }
        }
        return invalid;
      });
      expect(boardUnlabelled).toEqual([]);

      // 2. Verify Dashboard view
      await page.goto("/dashboard");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Analytics & Pipeline Funnel"
      );

      const dashboardUnlabelled = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button, [role='button']"));
        const invalid: string[] = [];
        for (const btn of buttons) {
          const text = btn.textContent?.trim() || "";
          const ariaLabel = btn.getAttribute("aria-label")?.trim() || "";
          const ariaLabelledby = btn.getAttribute("aria-labelledby")?.trim() || "";
          const title = btn.getAttribute("title")?.trim() || "";
          if (!text && !ariaLabel && !ariaLabelledby && !title) {
            invalid.push(btn.outerHTML.slice(0, 100));
          }
        }
        return invalid;
      });
      expect(dashboardUnlabelled).toEqual([]);
    }

    expect(runtimeErrors).toEqual([]);
  });
});
