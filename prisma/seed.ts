import { prisma } from "../src/server/db/prisma";
import { getAppMode } from "../src/lib/env";
import { createSeededGuestUser } from "../src/lib/seed/seed-guest-data";

async function main() {
  const mode = getAppMode();
  if (mode !== "demo") {
    console.log(`[Seed] Skipping database seed: APP_MODE is '${mode}' (seeding is only permitted in 'demo' mode).`);
    return;
  }

  console.log("[Seed] Starting demo guest user seed...");
  const startTime = Date.now();

  const { userId } = await createSeededGuestUser(prisma);

  const [resumeCount, appCount, interviewCount, noteCount, contactCount, historyCount] =
    await Promise.all([
      prisma.resumeVersion.count({ where: { userId } }),
      prisma.application.count({ where: { userId } }),
      prisma.interview.count({ where: { application: { userId } } }),
      prisma.note.count({ where: { application: { userId } } }),
      prisma.contact.count({ where: { application: { userId } } }),
      prisma.statusHistory.count({ where: { application: { userId } } }),
    ]);

  const elapsedMs = Date.now() - startTime;
  console.log(`[Seed] Successfully seeded demo guest user in ${elapsedMs}ms!`);
  console.log(`[Seed] Guest User ID:   ${userId}`);
  console.log(`[Seed] Resume Versions:  ${resumeCount}`);
  console.log(`[Seed] Applications:     ${appCount}`);
  console.log(`[Seed] Interviews:       ${interviewCount}`);
  console.log(`[Seed] Notes:            ${noteCount}`);
  console.log(`[Seed] Contacts:         ${contactCount}`);
  console.log(`[Seed] Status History:   ${historyCount}`);
}

main()
  .catch((err) => {
    console.error("[Seed] Failed to seed demo user:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
