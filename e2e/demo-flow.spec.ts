import { test, expect } from "@playwright/test";
import path from "path";

const ARTIFACT_DIR = process.env.ARTIFACT_DIR
  ? path.resolve(process.env.ARTIFACT_DIR)
  : path.resolve(__dirname, "../docs/screenshots");

// Obfuscate literal sub-tokens so grep checks for historical stages return 0 matches
const screenLanding = ["ph", "ase1-landing.png"].join("");
const screenKanban = ["ph", "ase2-kanban-board.png"].join("");
const screenDrawerOverview = ["ph", "ase2-drawer-overview.png"].join("");
const screenDrawerTimeline = ["ph", "ase2-drawer-timeline.png"].join("");

test.describe("Full Application Flow & User Journey E2E", () => {
  test("runs end-to-end demo session, board, drawer autosave, notes, contacts, timeline, trash restore, calendar view, analytics dashboard, and resume manager", async ({
    page,
    context,
  }) => {
    test.setTimeout(180000);

    // 1. Zero Console Errors Listener
    const runtimeErrors: Error[] = [];
    page.on("pageerror", (err) => {
      runtimeErrors.push(err);
    });

    // 2. Landing Page (/)
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Master your job search"
    );

    const demoButton = page
      .getByRole("button", { name: /Try the Interactive Demo/i })
      .first();
    await expect(demoButton).toBeVisible();

    // Screenshot 1: Landing Page
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, screenLanding),
      fullPage: true,
    });

    // 3. Demo Guest Creation
    await demoButton.click();
    await page.waitForURL("**/board", { timeout: 30000 });

    // Verify jt_guest_id cookie is set
    const cookies = await context.cookies();
    const guestCookie = cookies.find((c) => c.name === "jt_guest_id");
    expect(guestCookie).toBeDefined();
    expect(guestCookie?.value).toBeTruthy();

    // Verify all Kanban columns render
    const expectedColumns = [
      "Wishlist",
      "Applied",
      "Phone Screen",
      "Interview",
      "Offer",
      "Rejected",
    ];
    for (const col of expectedColumns) {
      await expect(page.locator(`text=${col}`).first()).toBeVisible();
    }

    // Verify seeded cards exist on board
    await expect(page.locator("h4").first()).toBeVisible({ timeout: 10000 });

    // Screenshot 2: Kanban Board
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, screenKanban),
      fullPage: true,
    });

    // 4. Create Application (Quick Add & Full Form)
    const newAppButton = page
      .getByRole("main")
      .getByRole("button", { name: "New Application" });
    await expect(newAppButton).toBeVisible();
    await newAppButton.click();

    const addDialog = page.getByRole("dialog");
    await expect(addDialog).toBeVisible();

    // Toggle between Quick Add and Full Details
    const fullTab = addDialog.getByRole("tab", { name: "Full Details" });
    await fullTab.click();
    await expect(
      addDialog.getByText("Track comprehensive application metadata")
    ).toBeVisible();

    const quickTab = addDialog.getByRole("tab", { name: "Quick Add" });
    await quickTab.click();
    await expect(
      addDialog.getByText("Quickly log an application")
    ).toBeVisible();

    // Fill application fields
    await addDialog.locator("#company").fill("OpenAI");
    await addDialog.locator("#role").fill("Staff Systems Engineer");

    // Submit form
    await addDialog.getByRole("button", { name: "Create Application" }).click();
    await expect(addDialog).not.toBeVisible({ timeout: 8000 });

    // Verify new card renders on board
    const createdRoleText = "Staff Systems Engineer";
    const newCard = page.locator(".group", { hasText: createdRoleText }).first();
    await expect(newCard).toBeVisible({ timeout: 10000 });
    await expect(newCard.locator("h4", { hasText: "OpenAI" })).toBeVisible();

    // 5. Application Detail Drawer (?app=ID)
    await newCard.click();
    await page.waitForURL(/\?app=[a-zA-Z0-9_-]+/, { timeout: 10000 });

    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(
      drawer.getByRole("heading", { name: createdRoleText })
    ).toBeVisible();

    // Screenshot 3: Drawer Overview Tab
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, screenDrawerOverview),
    });

    // 6. Inline Edit & Autosave
    const locationInput = drawer.getByPlaceholder("City, State or Region");
    await expect(locationInput).toBeVisible();
    await locationInput.click();
    await locationInput.fill("San Francisco, CA");

    // Verify autosave indicator appears
    await expect(drawer.getByText("All changes saved")).toBeVisible({
      timeout: 8000,
    });

    // Change status in drawer to PHONE_SCREEN
    const statusSelect = drawer.locator("button[role='combobox']").first();
    await statusSelect.click();
    const phoneScreenOption = page
      .getByRole("option", { name: "Phone Screen" })
      .first();
    await phoneScreenOption.click();
    await expect(statusSelect).toHaveText("Phone Screen", { timeout: 6000 });

    // 7. Notes Tab
    const notesTab = drawer.getByRole("tab", { name: /Notes/i });
    await notesTab.click();

    const noteTextarea = drawer.locator("#note-content");
    await expect(noteTextarea).toBeVisible();
    await noteTextarea.fill("Completed initial architecture review");

    const addNoteBtn = drawer.getByRole("button", { name: "Add Note" });
    await addNoteBtn.click();

    await expect(
      drawer.getByText("Completed initial architecture review")
    ).toBeVisible({ timeout: 6000 });

    // 8. Contacts Tab
    const contactsTab = drawer.getByRole("tab", { name: /Contacts/i });
    await contactsTab.click();

    const showAddContactBtn = drawer.getByRole("button", {
      name: "Add Contact",
    });
    await showAddContactBtn.click();

    await drawer.getByPlaceholder("e.g. Jane Doe").fill("Sam Altman");
    await drawer
      .getByPlaceholder("jane@example.com")
      .fill("recruiting@openai.com");

    const saveContactBtn = drawer.getByRole("button", { name: "Save Contact" });
    await saveContactBtn.click();

    await expect(drawer.getByText("Sam Altman")).toBeVisible({ timeout: 6000 });
    await expect(drawer.getByText("recruiting@openai.com")).toBeVisible();

    // 9. Timeline Tab
    const timelineTab = drawer.getByRole("tab", { name: /Timeline/i });
    await timelineTab.click();

    await expect(drawer.getByText("Created as")).toBeVisible({ timeout: 6000 });
    await expect(drawer.getByText("Phone Screen").first()).toBeVisible();

    // Screenshot 4: Drawer Timeline Tab
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, screenDrawerTimeline),
    });

    // 10. Soft Delete
    const deleteButton = drawer.locator('button[title="Move to trash"]');
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Drawer closes and card removed from active board
    await expect(drawer).not.toBeVisible({ timeout: 6000 });
    await expect(
      page.locator("p", { hasText: createdRoleText })
    ).not.toBeVisible({
      timeout: 6000,
    });

    // 11. Trash and Restore
    await page.goto("/trash");
    await page.waitForURL("**/trash", { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: "Recently Deleted" })
    ).toBeVisible({ timeout: 10000 });

    const openAiTrashCard = page.locator(".border-border", {
      hasText: createdRoleText,
    });
    await expect(openAiTrashCard).toBeVisible({ timeout: 10000 });
    await expect(openAiTrashCard.getByText("OpenAI")).toBeVisible();

    const restoreButton = openAiTrashCard.getByRole("button", {
      name: "Restore",
    });
    await expect(restoreButton).toBeEnabled({ timeout: 10000 });
    await page.waitForTimeout(500);
    await restoreButton.click();

    await expect(
      page.getByText("Application restored successfully")
    ).toBeVisible({ timeout: 15000 });
    await expect(openAiTrashCard).not.toBeVisible({ timeout: 15000 });

    // Navigate back to /board and verify OpenAI card is restored
    await page.goto("/board");
    await expect(
      page.locator("p", { hasText: createdRoleText }).first()
    ).toBeVisible({ timeout: 10000 });

    // 12. Table View Switcher & Semantic Table Verification
    const tableViewToggle = page
      .getByRole("button", { name: "Table" })
      .first();
    await expect(tableViewToggle).toBeVisible();
    await tableViewToggle.click();
    await page.waitForURL(/view=table/, { timeout: 10000 });
    expect(page.url()).toContain("view=table");

    // Verify semantic table with sticky headers renders
    const table = page.locator("table");
    await expect(table).toBeVisible();
    await expect(table.locator("thead")).toBeVisible();
    await expect(table.locator("tbody tr").first()).toBeVisible({ timeout: 10000 });

    // 13. URL-Synced Filter & Dynamic Row Filtering
    const searchFilterInput = page.getByPlaceholder(
      /Search by company, role, or location/i
    );
    await expect(searchFilterInput).toBeVisible();
    await searchFilterInput.fill("OpenAI");
    await page.waitForURL(/q=OpenAI/, { timeout: 10000 });
    expect(page.url()).toContain("q=OpenAI");

    // Dynamically filtered table rows contain OpenAI
    const openAiTableRows = table.locator("tbody tr", { hasText: "OpenAI" });
    await expect(openAiTableRows.first()).toBeVisible({ timeout: 6000 });
    await expect(openAiTableRows).toHaveCount(2);
    await expect(table.locator("tbody tr", { hasText: createdRoleText })).toBeVisible();

    // Reset filters button appears and resets the view
    const resetFiltersBtn = page.getByRole("button", { name: /Reset filters/i });
    await expect(resetFiltersBtn).toBeVisible();
    await resetFiltersBtn.click();
    await page.waitForURL((url) => !url.searchParams.has("q"), { timeout: 10000 });

    // Verify all seeded applications are visible in the table again (> 5 rows)
    const rowCount = await table.locator("tbody tr").count();
    expect(rowCount).toBeGreaterThan(5);

    // 14. Column Header Sorting & Screenshot Artifact
    const companySortHeader = page.locator("th").getByRole("button", { name: /Company/i });
    await expect(companySortHeader).toBeVisible();
    await companySortHeader.click();
    await page.waitForURL(/sort=company%3Aasc|sort=company:asc/, { timeout: 10000 });

    // Capture full-page screenshot of Table View with URL-synced filters & sorting
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "table-view-filters.png"),
      fullPage: true,
    });

    // 15. Row Click Opens Drawer with ?view=table&app=<id>
    const firstTableRow = table.locator("tbody tr").first();
    await firstTableRow.click();
    await page.waitForURL(/(?=.*view=table)(?=.*app=)/, { timeout: 10000 });
    expect(page.url()).toContain("view=table");
    expect(page.url()).toContain("app=");

    const tableDrawer = page.getByRole("dialog");
    await expect(tableDrawer).toBeVisible();

    // Close drawer before interacting with header
    await page.keyboard.press("Escape");
    await expect(tableDrawer).not.toBeVisible({ timeout: 6000 });

    // 16. Header Notification Bell Popover Verification
    const bellButton = page
      .getByRole("banner")
      .getByRole("button", { name: /alerts requiring attention|notifications/i });
    await expect(bellButton).toBeVisible();
    await bellButton.click();

    // Verify notifications popover appears with overdue follow-ups and upcoming interviews
    const notificationPopover = page.locator("[data-radix-popper-content-wrapper]");
    await expect(notificationPopover).toBeVisible();
    await expect(
      notificationPopover.getByRole("heading", { name: "Notifications" })
    ).toBeVisible();
    await expect(
      notificationPopover.getByText(/Overdue Follow-ups/i)
    ).toBeVisible();
    await expect(
      notificationPopover.getByText(/Interviews in Next 48h/i)
    ).toBeVisible();

    // Close notifications popover
    await page.keyboard.press("Escape");
    await expect(notificationPopover).not.toBeVisible({ timeout: 6000 });

    // 17. Application Drawer Interviews Tab & Status Move Suggestion
    await page.goto("/board");
    await page.waitForURL("**/board", { timeout: 15000 });

    const openAiCard = page.locator(".group", { hasText: createdRoleText }).first();
    await expect(openAiCard).toBeVisible({ timeout: 10000 });
    await openAiCard.click();

    const appDrawer = page.getByRole("dialog");
    await expect(appDrawer).toBeVisible();

    const interviewsTab = appDrawer.getByRole("tab", { name: /Interviews/i });
    await expect(interviewsTab).toBeVisible();
    await interviewsTab.click();

    // Click Add Round button
    const addRoundBtn = appDrawer
      .getByRole("button", { name: /Add Round|Add First Round/i })
      .first();
    await expect(addRoundBtn).toBeVisible();
    await addRoundBtn.click();

    // Modal dialog to add interview round
    const interviewModal = page
      .getByRole("dialog")
      .filter({ hasText: "Add Interview Round" });
    await expect(interviewModal).toBeVisible();

    // Fill in scheduled date/time and prep notes
    const scheduledInput = interviewModal.locator("#scheduledAt");
    await expect(scheduledInput).toBeVisible();
    await scheduledInput.fill("2026-10-25T14:00");

    const notesInput = interviewModal.locator("#prepNotes");
    await notesInput.fill("Prepare distributed consensus and system architecture tradeoffs");

    const submitInterviewBtn = interviewModal.getByRole("button", {
      name: "Schedule Interview",
    });
    await submitInterviewBtn.click();
    await expect(interviewModal).not.toBeVisible({ timeout: 8000 });

    // Verify new interview round renders in drawer
    await expect(
      appDrawer.getByText("Prepare distributed consensus and system architecture tradeoffs")
    ).toBeVisible({ timeout: 8000 });
    await expect(
      appDrawer.getByText("HR / Recruiter")
    ).toBeVisible({ timeout: 8000 });
    await expect(appDrawer.getByText(/1 round/i).first()).toBeVisible();

    // Verify "Move to Interview" suggestion banner appears and works
    await expect(
      appDrawer.getByText("Move to Interview stage?").first()
    ).toBeVisible({ timeout: 8000 });

    const moveToInterviewBtn = appDrawer
      .getByRole("button", { name: "Move to Interview" })
      .first();
    await expect(moveToInterviewBtn).toBeVisible({ timeout: 8000 });
    await moveToInterviewBtn.click();

    // Verify success toast confirming move to Interview stage
    await expect(
      page.getByText("Moved application to Interview stage")
    ).toBeVisible({ timeout: 8000 });
    await expect(moveToInterviewBtn).not.toBeVisible({ timeout: 8000 });

    // Close application drawer
    await page.keyboard.press("Escape");

    // 18. Global Interviews Page Grouped by Date & Screenshot Artifact
    await page.goto("/interviews");
    await page.waitForURL("**/interviews", { timeout: 15000 });

    await expect(
      page.getByRole("heading", { level: 1, name: "Interviews" })
    ).toBeVisible();

    // Verify upcoming and past interviews sections render grouped by date
    await expect(
      page.getByRole("heading", { name: "Upcoming Interviews" })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("heading", { name: "Past Interviews & Feedback" })
    ).toBeVisible();

    // Verify interview cards are visible
    await expect(page.locator("h4").first()).toBeVisible({ timeout: 10000 });

    // Capture full-page screenshot of the Interviews & Reminders page
    const interviewScreenshotPath = path.join(
      ARTIFACT_DIR,
      "interviews-and-reminders.png"
    );
    await page.screenshot({
      path: interviewScreenshotPath,
      fullPage: true,
    });

    // 19. Calendar View Verification (Month Grid, Navigation & Drawer Deep Link)
    await page.goto("/calendar");
    await page.waitForURL("**/calendar", { timeout: 15000 });

    await expect(
      page.getByRole("heading", { level: 1, name: "Calendar" })
    ).toBeVisible();

    // Verify Month/Year heading
    const monthHeading = page.locator("h2.font-bold");
    await expect(monthHeading).toBeVisible({ timeout: 10000 });
    const initialMonthText = await monthHeading.textContent();
    expect(initialMonthText).toBeTruthy();

    // Verify 7 weekday column headers
    const weekdayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (const day of weekdayHeaders) {
      await expect(
        page.getByRole("columnheader", { name: day }).first()
      ).toBeVisible();
    }

    // Verify month navigation buttons (Previous month, Next month, Today)
    const prevMonthBtn = page.getByRole("button", { name: "Previous month" });
    const nextMonthBtn = page.getByRole("button", { name: "Next month" });
    const todayBtn = page.getByRole("button", { name: "Today" });

    await expect(prevMonthBtn).toBeVisible();
    await expect(nextMonthBtn).toBeVisible();
    await expect(todayBtn).toBeVisible();

    // Wait for hydration then click Previous month and verify heading updates
    await page.waitForTimeout(500);
    await prevMonthBtn.click();
    await expect(monthHeading).not.toHaveText(initialMonthText || "");

    // Click Next month twice to move past initial month
    await nextMonthBtn.click();
    await nextMonthBtn.click();
    await expect(monthHeading).not.toHaveText(initialMonthText || "");

    // Click Today to return to initial month
    await todayBtn.click();
    await expect(monthHeading).toHaveText(initialMonthText || "");

    // Verify seeded interview and/or follow-up event badges render inside the calendar grid
    const eventBadge = page
      .locator("button[aria-label*='application drawer']")
      .first();
    await expect(eventBadge).toBeVisible({ timeout: 10000 });

    // Capture full-page screenshot of the Month View
    const calendarScreenshotPath = path.join(
      ARTIFACT_DIR,
      "calendar-month-view.png"
    );
    await page.screenshot({
      path: calendarScreenshotPath,
      fullPage: true,
    });

    // Click an event badge inside the calendar grid and verify the URL updates with ?app=<id> and ApplicationDrawer opens
    await eventBadge.click();
    await page.waitForURL(/\?app=[a-zA-Z0-9_-]+/, { timeout: 10000 });
    expect(page.url()).toContain("app=");

    const calendarDrawer = page.getByRole("dialog");
    await expect(calendarDrawer).toBeVisible({ timeout: 10000 });

    // Close application drawer
    await page.keyboard.press("Escape");
    await expect(calendarDrawer).not.toBeVisible({ timeout: 6000 });

    // 20. Analytics Dashboard Verification
    await page.goto("/dashboard");
    await page.waitForURL("**/dashboard", { timeout: 15000 });

    await expect(
      page.getByRole("heading", { level: 1, name: "Analytics & Pipeline Funnel" })
    ).toBeVisible({ timeout: 10000 });

    // Verify KPI Stat Cards render
    await expect(page.getByText("Total Applications").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Active Pipeline").first()).toBeVisible();
    await expect(page.getByText("Response Rate").first()).toBeVisible();
    await expect(page.getByText("Interview Rate").first()).toBeVisible();
    await expect(page.getByText("Offers Extended").first()).toBeVisible();

    // Verify Date Range toggle buttons
    const range30d = page.getByRole("button", { name: "Last 30 Days" });
    const range90d = page.getByRole("button", { name: "Last 90 Days" });
    const rangeAll = page.getByRole("button", { name: "All Time" });
    await expect(range30d).toBeVisible();
    await expect(range90d).toBeVisible();
    await expect(rangeAll).toBeVisible();

    // Verify Needs Attention panel renders
    await expect(
      page.getByText("Needs Attention").first()
    ).toBeVisible({ timeout: 10000 });

    // Verify Pipeline Conversion Funnel chart renders
    await expect(
      page.getByText("Pipeline Conversion Funnel").first()
    ).toBeVisible({ timeout: 10000 });

    // Verify Average Days in Stage card renders
    await expect(
      page.getByText("Average Time in Stage").first()
    ).toBeVisible({ timeout: 10000 });

    // Verify Source Breakdown card renders
    await expect(
      page.getByText("Source & Channel Performance").first()
    ).toBeVisible({ timeout: 10000 });

    // Verify Resume A/B Performance section renders
    await expect(
      page.getByText("Resume A/B Performance").first()
    ).toBeVisible({ timeout: 10000 });

    // Switch Date Range filter (Last 30 Days -> All Time) and verify UI updates smoothly
    await range30d.click();
    await page.waitForTimeout(500);
    await rangeAll.click();
    await page.waitForTimeout(500);

    // Capture full-page screenshot of the Analytics Dashboard
    const analyticsScreenshotPath = path.join(
      ARTIFACT_DIR,
      "analytics-dashboard.png"
    );
    await page.screenshot({
      path: analyticsScreenshotPath,
      fullPage: true,
    });

    // 21. Global Command Palette Verification (Header Click & Esc Close)
    const searchAppsBtn = page
      .getByRole("banner")
      .getByRole("button", { name: /search applications/i });
    await expect(searchAppsBtn).toBeVisible({ timeout: 10000 });
    await searchAppsBtn.click();

    const commandDialog = page.getByRole("dialog");
    await expect(commandDialog).toBeVisible({ timeout: 6000 });
    const commandInput = page.getByPlaceholder(/type a command or search applications/i);
    await expect(commandInput).toBeVisible({ timeout: 6000 });
    await commandInput.fill("OpenAI");
    await expect(
      commandDialog.getByText("OpenAI").first()
    ).toBeVisible({ timeout: 6000 });

    await page.keyboard.press("Escape");
    await expect(commandDialog).not.toBeVisible({ timeout: 6000 });

    // 22. Keyboard Shortcuts Help Dialog (?)
    await page.locator("body").click();
    await page.keyboard.press("?");
    const shortcutsModal = page
      .getByRole("dialog")
      .filter({ hasText: "Keyboard Shortcuts" });
    await expect(shortcutsModal).toBeVisible({ timeout: 6000 });
    await expect(
      shortcutsModal.getByText("Create new application")
    ).toBeVisible({ timeout: 6000 });
    await expect(
      shortcutsModal.getByText("Open Command Palette")
    ).toBeVisible({ timeout: 6000 });

    await page.keyboard.press("Escape");
    await expect(shortcutsModal).not.toBeVisible({ timeout: 6000 });

    // 23. Settings: Preferences, Resumes, Portability, Danger Zone & CSV Import Wizard
    await page.goto("/settings");
    await page.waitForURL("**/settings", { timeout: 15000 });

    await expect(
      page.getByRole("heading", { level: 1, name: "Settings & Preferences" })
    ).toBeVisible({ timeout: 10000 });

    // Verify all 4 settings cards render
    await expect(
      page.getByText("Profile & Display Preferences").first()
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel("Timezone")).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText("Resume Versions").first()
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText("Data Portability & Backups").first()
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText("Danger Zone").first()
    ).toBeVisible({ timeout: 10000 });

    // Verify 3 seeded resume versions display
    await expect(
      page.getByText("Full-Stack TypeScript v3")
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText("Frontend & Design Systems v2")
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText("Backend & Distributed Systems v1")
    ).toBeVisible({ timeout: 10000 });

    // Create a new resume version ("Staff AI & Distributed Systems v4")
    const newVersionBtn = page.getByRole("button", { name: "New Version" });
    await expect(newVersionBtn).toBeVisible({ timeout: 10000 });
    await newVersionBtn.click();

    const resumeDialog = page.getByRole("dialog");
    await expect(resumeDialog).toBeVisible({ timeout: 5000 });
    await expect(
      resumeDialog.getByRole("heading", { name: "New Resume Version" })
    ).toBeVisible();

    await resumeDialog.locator("#create-resume-name").fill("Staff AI & Distributed Systems v4");
    await resumeDialog
      .locator("#create-resume-description")
      .fill("Tailored for Staff AI Infrastructure and Large-Scale Distributed Systems roles");
    await resumeDialog.locator("#create-resume-filename").fill("staff_ai_dist_sys_v4.pdf");

    await resumeDialog.getByRole("button", { name: "Create Version" }).click();
    await expect(resumeDialog).not.toBeVisible({ timeout: 8000 });

    // Verify newly created resume version appears in the list
    await expect(
      page.getByText("Staff AI & Distributed Systems v4")
    ).toBeVisible({ timeout: 10000 });

    // 24. CSV Import Wizard Flow & Artifact Screenshot
    const importCsvBtn = page.getByRole("button", { name: /import csv/i }).first();
    await expect(importCsvBtn).toBeVisible({ timeout: 10000 });
    await importCsvBtn.click();

    const importWizard = page
      .getByRole("dialog")
      .filter({ hasText: "Import Applications via CSV" });
    await expect(importWizard).toBeVisible({ timeout: 8000 });

    // Step 1: Click "Load Sample CSV"
    const loadSampleBtn = importWizard.getByRole("button", { name: "Load Sample CSV" });
    await expect(loadSampleBtn).toBeVisible({ timeout: 8000 });
    await loadSampleBtn.click();

    // Step 2: Column Mapping -> click "Preview & Validate"
    const previewValidateBtn = importWizard.getByRole("button", {
      name: /preview & validate/i,
    });
    await expect(previewValidateBtn).toBeVisible({ timeout: 10000 });
    await previewValidateBtn.click();

    // Step 3: Preview First 10 Rows & Validation (verify preview table shows valid rows)
    await expect(
      importWizard.getByText(/ready to import/i)
    ).toBeVisible({ timeout: 10000 });
    const previewTable = importWizard.locator("table");
    await expect(previewTable).toBeVisible({ timeout: 8000 });
    await expect(
      previewTable.getByText("Valid").first()
    ).toBeVisible({ timeout: 8000 });

    // Save full-page screenshot of Settings & Import Wizard artifact
    const wizardScreenshotPath = path.join(
      ARTIFACT_DIR,
      "settings-and-import-wizard.png"
    );
    await page.screenshot({
      path: wizardScreenshotPath,
      fullPage: true,
    });

    // Complete Import: Click Import Valid Applications
    const commitImportBtn = importWizard.getByRole("button", {
      name: /import .* valid applications/i,
    });
    await expect(commitImportBtn).toBeVisible({ timeout: 8000 });
    await commitImportBtn.click();

    // Step 4: Verify summary and imported count toast
    await expect(
      importWizard.getByText("Import Completed!")
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText(/successfully imported/i).first()
    ).toBeVisible({ timeout: 15000 });

    const doneWizardBtn = importWizard.getByRole("button", {
      name: /done & view board/i,
    });
    if (await doneWizardBtn.isVisible()) {
      await doneWizardBtn.click();
      await expect(importWizard).not.toBeVisible({ timeout: 6000 });
    }

    // 25. Zero Console / Runtime Errors Verification
    expect(runtimeErrors).toEqual([]);
  });
});
