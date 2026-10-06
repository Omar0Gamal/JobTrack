import { PrismaClient, ApplicationStatus, Priority, LocationType, ApplicationSource, InterviewType, InterviewOutcome } from "@prisma/client";
import { prisma as defaultPrisma } from "@/server/db/prisma";
import { getAppMode } from "@/lib/env";
import { subDays, addDays, addHours } from "date-fns";

export async function createSeededGuestUser(
  client?: PrismaClient
): Promise<{ userId: string }> {
  if (getAppMode() !== "demo") {
    throw new Error("Seeding is only permitted when APP_MODE is 'demo'");
  }

  const db = client ?? defaultPrisma;

  const guestUser = await db.user.create({
    data: {
      name: "Demo Guest",
      email: null,
      isGuest: true,
      timezone: "America/New_York",
    },
  });

  await seedDataForUser(guestUser.id, db);

  return { userId: guestUser.id };
}

export async function reseedGuestUserData(
  userId: string,
  client?: PrismaClient
): Promise<void> {
  if (getAppMode() !== "demo") {
    throw new Error("Reseeding demo data is only permitted when APP_MODE is 'demo'");
  }

  const db = client ?? defaultPrisma;

  const user = await db.user.findFirst({
    where: { id: userId, isGuest: true },
  });

  if (!user) {
    throw new Error(`Guest user with ID ${userId} not found or is not a guest`);
  }

  // Delete all existing applications (cascades to interviews, notes, contacts, statusHistory)
  // and resume versions for this user
  await db.$transaction([
    db.application.deleteMany({ where: { userId } }),
    db.resumeVersion.deleteMany({ where: { userId } }),
  ]);

  await seedDataForUser(userId, db);
}

async function seedDataForUser(userId: string, db: PrismaClient): Promise<void> {
  const now = new Date();

  // 1. Create 3 Resume Versions
  const [resumeFullstack, resumeFrontend, resumeBackend] = await Promise.all([
    db.resumeVersion.create({
      data: {
        userId,
        name: "Full-Stack TypeScript v3",
        description: "Tailored for senior full-stack roles with Next.js, Node.js, and TypeScript focus.",
        fileName: "alex-morgan-fullstack-ts-v3.pdf",
      },
    }),
    db.resumeVersion.create({
      data: {
        userId,
        name: "Frontend & Design Systems v2",
        description: "Focused on React 19, Tailwind CSS, design systems, and web performance.",
        fileName: "alex-morgan-frontend-ds-v2.pdf",
      },
    }),
    db.resumeVersion.create({
      data: {
        userId,
        name: "Backend & Distributed Systems v1",
        description: "Emphasis on PostgreSQL, distributed microservices, event queues, and APIs.",
        fileName: "alex-morgan-backend-v1.pdf",
      },
    }),
  ]);

  // 2. Define 30 applications with realistic metadata
  // Distribution:
  // WISHLIST: 4
  // APPLIED: 9
  // PHONE_SCREEN: 5
  // INTERVIEW: 5
  // OFFER: 2
  // REJECTED: 5
  // Exactly 5 overdue followUpDates (items 4, 5, 7, 13, 16)
  interface SeedAppSpec {
    company: string;
    role: string;
    status: ApplicationStatus;
    priority: Priority;
    locationType: LocationType;
    location: string;
    salaryMin: number;
    salaryMax: number;
    source: ApplicationSource;
    jobUrl: string;
    appliedDate: Date;
    followUpDate: Date | null;
    resumeVersionId: string;
    position: number;
    notes: string[];
    contacts: Array<{ name: string; title: string; email: string; linkedinUrl: string }>;
    interviews: Array<{
      round: number;
      type: InterviewType;
      scheduledAt: Date;
      durationMinutes: number;
      prepNotes?: string;
      outcome: InterviewOutcome;
      feedback?: string;
    }>;
    statusProgression: Array<{ from: ApplicationStatus | null; to: ApplicationStatus; daysOffset: number }>;
  }

  const specs: SeedAppSpec[] = [
    // ---------------- WISHLIST (4) ----------------
    {
      company: "Linear",
      role: "Staff Product Engineer",
      status: ApplicationStatus.WISHLIST,
      priority: Priority.HIGH,
      locationType: LocationType.REMOTE,
      location: "San Francisco, CA (Remote)",
      salaryMin: 185000,
      salaryMax: 235000,
      source: ApplicationSource.REFERRAL,
      jobUrl: "https://linear.app/careers/staff-product-engineer",
      appliedDate: subDays(now, 10),
      followUpDate: null,
      resumeVersionId: resumeFullstack.id,
      position: 1000,
      notes: ["Met their lead engineer at React Summit. Incredible keyboard-first UX culture."],
      contacts: [
        {
          name: "Tuomas Artman",
          title: "Co-Founder & Engineering",
          email: "tuomas@linear.app",
          linkedinUrl: "https://linkedin.com/in/tuomasartman",
        },
      ],
      interviews: [],
      statusProgression: [{ from: null, to: ApplicationStatus.WISHLIST, daysOffset: 0 }],
    },
    {
      company: "Anthropic",
      role: "AI Systems & Infrastructure Engineer",
      status: ApplicationStatus.WISHLIST,
      priority: Priority.HIGH,
      locationType: LocationType.HYBRID,
      location: "San Francisco, CA",
      salaryMin: 220000,
      salaryMax: 290000,
      source: ApplicationSource.COMPANY_SITE,
      jobUrl: "https://anthropic.com/careers/systems-infra",
      appliedDate: subDays(now, 14),
      followUpDate: null,
      resumeVersionId: resumeBackend.id,
      position: 2000,
      notes: ["Working on Claude's cluster infrastructure and inference optimization pipelines."],
      contacts: [],
      interviews: [],
      statusProgression: [{ from: null, to: ApplicationStatus.WISHLIST, daysOffset: 0 }],
    },
    {
      company: "Raycast",
      role: "Senior macOS & Web Engineer",
      status: ApplicationStatus.WISHLIST,
      priority: Priority.MEDIUM,
      locationType: LocationType.REMOTE,
      location: "London, UK (Remote)",
      salaryMin: 160000,
      salaryMax: 205000,
      source: ApplicationSource.OTHER,
      jobUrl: "https://raycast.com/jobs/macos-web-engineer",
      appliedDate: subDays(now, 8),
      followUpDate: null,
      resumeVersionId: resumeFrontend.id,
      position: 3000,
      notes: ["High craftsmanship team. Extensions ecosystem built with Node and React."],
      contacts: [],
      interviews: [],
      statusProgression: [{ from: null, to: ApplicationStatus.WISHLIST, daysOffset: 0 }],
    },
    {
      company: "Tailscale",
      role: "Network Systems Engineer",
      status: ApplicationStatus.WISHLIST,
      priority: Priority.MEDIUM,
      locationType: LocationType.REMOTE,
      location: "Toronto, Canada (Remote)",
      salaryMin: 170000,
      salaryMax: 215000,
      source: ApplicationSource.COMPANY_SITE,
      jobUrl: "https://tailscale.com/careers/network-systems",
      appliedDate: subDays(now, 5),
      followUpDate: null,
      resumeVersionId: resumeBackend.id,
      position: 4000,
      notes: [],
      contacts: [],
      interviews: [],
      statusProgression: [{ from: null, to: ApplicationStatus.WISHLIST, daysOffset: 0 }],
    },

    // ---------------- APPLIED (9) ----------------
    {
      company: "Vercel",
      role: "Senior Full-Stack Engineer (Next.js)",
      status: ApplicationStatus.APPLIED,
      priority: Priority.HIGH,
      locationType: LocationType.REMOTE,
      location: "Remote - US",
      salaryMin: 175000,
      salaryMax: 230000,
      source: ApplicationSource.REFERRAL,
      jobUrl: "https://vercel.com/careers/senior-full-stack-engineer",
      appliedDate: subDays(now, 12),
      followUpDate: subDays(now, 2), // OVERDUE 1
      resumeVersionId: resumeFullstack.id,
      position: 1000,
      notes: [
        "Referred by Guillermo via Twitter mutual. Applied through private link.",
        "Need to prepare examples of Next.js 15 Server Actions and PPR architectures.",
      ],
      contacts: [
        {
          name: "Sarah Jenkins",
          title: "Principal Technical Recruiter",
          email: "sarah.jenkins@vercel.com",
          linkedinUrl: "https://linkedin.com/in/sarahjenkins-recruiter",
        },
      ],
      interviews: [],
      statusProgression: [{ from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 }],
    },
    {
      company: "Stripe",
      role: "Infrastructure Platform Engineer",
      status: ApplicationStatus.APPLIED,
      priority: Priority.HIGH,
      locationType: LocationType.HYBRID,
      location: "Seattle, WA",
      salaryMin: 190000,
      salaryMax: 250000,
      source: ApplicationSource.LINKEDIN,
      jobUrl: "https://stripe.com/jobs/infra-platform",
      appliedDate: subDays(now, 15),
      followUpDate: subDays(now, 4), // OVERDUE 2
      resumeVersionId: resumeBackend.id,
      position: 2000,
      notes: ["High bar for distributed systems and idempotent transaction handling."],
      contacts: [
        {
          name: "Marcus Vance",
          title: "Lead Technical Sourcer",
          email: "marcusv@stripe.com",
          linkedinUrl: "https://linkedin.com/in/marcus-vance-talent",
        },
      ],
      interviews: [],
      statusProgression: [{ from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 }],
    },
    {
      company: "Supabase",
      role: "Developer Platform Engineer",
      status: ApplicationStatus.APPLIED,
      priority: Priority.MEDIUM,
      locationType: LocationType.REMOTE,
      location: "Remote - Worldwide",
      salaryMin: 155000,
      salaryMax: 195000,
      source: ApplicationSource.COMPANY_SITE,
      jobUrl: "https://supabase.com/careers/dev-platform",
      appliedDate: subDays(now, 7),
      followUpDate: addDays(now, 3), // upcoming
      resumeVersionId: resumeFullstack.id,
      position: 3000,
      notes: [],
      contacts: [],
      interviews: [],
      statusProgression: [{ from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 }],
    },
    {
      company: "Cloudflare",
      role: "Edge Runtime Engineer",
      status: ApplicationStatus.APPLIED,
      priority: Priority.MEDIUM,
      locationType: LocationType.HYBRID,
      location: "Austin, TX",
      salaryMin: 165000,
      salaryMax: 215000,
      source: ApplicationSource.LINKEDIN,
      jobUrl: "https://cloudflare.com/careers/edge-runtime",
      appliedDate: subDays(now, 18),
      followUpDate: subDays(now, 1), // OVERDUE 3
      resumeVersionId: resumeBackend.id,
      position: 4000,
      notes: ["Submitted with custom note on V8 isolates and Web standards conformance."],
      contacts: [],
      interviews: [],
      statusProgression: [{ from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 }],
    },
    {
      company: "Notion",
      role: "Web & Desktop Client Engineer",
      status: ApplicationStatus.APPLIED,
      priority: Priority.HIGH,
      locationType: LocationType.HYBRID,
      location: "San Francisco, CA",
      salaryMin: 180000,
      salaryMax: 235000,
      source: ApplicationSource.REFERRAL,
      jobUrl: "https://notion.so/careers/web-desktop",
      appliedDate: subDays(now, 6),
      followUpDate: addDays(now, 5), // upcoming
      resumeVersionId: resumeFrontend.id,
      position: 5000,
      notes: [],
      contacts: [
        {
          name: "Elena Rostova",
          title: "Staff Product Engineer",
          email: "elena@makenotion.com",
          linkedinUrl: "https://linkedin.com/in/elenarostova",
        },
      ],
      interviews: [],
      statusProgression: [{ from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 }],
    },
    {
      company: "Figma",
      role: "Design Systems Infrastructure",
      status: ApplicationStatus.APPLIED,
      priority: Priority.HIGH,
      locationType: LocationType.HYBRID,
      location: "San Francisco, CA",
      salaryMin: 185000,
      salaryMax: 240000,
      source: ApplicationSource.COMPANY_SITE,
      jobUrl: "https://figma.com/careers/design-systems-infra",
      appliedDate: subDays(now, 25),
      followUpDate: null,
      resumeVersionId: resumeFrontend.id,
      position: 6000,
      notes: [],
      contacts: [],
      interviews: [],
      statusProgression: [{ from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 }],
    },
    {
      company: "Retool",
      role: "Full-Stack Product Engineer",
      status: ApplicationStatus.APPLIED,
      priority: Priority.MEDIUM,
      locationType: LocationType.ONSITE,
      location: "San Francisco, CA",
      salaryMin: 160000,
      salaryMax: 210000,
      source: ApplicationSource.RECRUITER,
      jobUrl: "https://retool.com/careers/product-engineer",
      appliedDate: subDays(now, 9),
      followUpDate: null,
      resumeVersionId: resumeFullstack.id,
      position: 7000,
      notes: [],
      contacts: [],
      interviews: [],
      statusProgression: [{ from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 }],
    },
    {
      company: "Plaid",
      role: "API Platform Engineer",
      status: ApplicationStatus.APPLIED,
      priority: Priority.MEDIUM,
      locationType: LocationType.HYBRID,
      location: "New York, NY",
      salaryMin: 165000,
      salaryMax: 210000,
      source: ApplicationSource.INDEED,
      jobUrl: "https://plaid.com/careers/api-platform",
      appliedDate: subDays(now, 22),
      followUpDate: null,
      resumeVersionId: resumeBackend.id,
      position: 8000,
      notes: [],
      contacts: [],
      interviews: [],
      statusProgression: [{ from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 }],
    },
    {
      company: "Resend",
      role: "Senior Backend Engineer",
      status: ApplicationStatus.APPLIED,
      priority: Priority.HIGH,
      locationType: LocationType.REMOTE,
      location: "Remote - Worldwide",
      salaryMin: 165000,
      salaryMax: 215000,
      source: ApplicationSource.OTHER,
      jobUrl: "https://resend.com/careers/senior-backend",
      appliedDate: subDays(now, 4),
      followUpDate: addDays(now, 4), // upcoming
      resumeVersionId: resumeBackend.id,
      position: 9000,
      notes: ["Direct message to Zeno Rocha. Email delivery and DKIM infrastructure."],
      contacts: [
        {
          name: "Zeno Rocha",
          title: "Founder & CEO",
          email: "zeno@resend.com",
          linkedinUrl: "https://linkedin.com/in/zenorocha",
        },
      ],
      interviews: [],
      statusProgression: [{ from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 }],
    },

    // ---------------- PHONE SCREEN (5) ----------------
    {
      company: "Datadog",
      role: "Distributed Tracing Engineer",
      status: ApplicationStatus.PHONE_SCREEN,
      priority: Priority.HIGH,
      locationType: LocationType.HYBRID,
      location: "New York, NY",
      salaryMin: 175000,
      salaryMax: 230000,
      source: ApplicationSource.LINKEDIN,
      jobUrl: "https://datadoghq.com/careers/tracing-engineer",
      appliedDate: subDays(now, 28),
      followUpDate: subDays(now, 3), // OVERDUE 4
      resumeVersionId: resumeBackend.id,
      position: 1000,
      notes: ["Completed initial recruiter screen on OpenTelemetry collection."],
      contacts: [
        {
          name: "Chloe Martin",
          title: "Senior Engineering Recruiter",
          email: "chloe.martin@datadoghq.com",
          linkedinUrl: "https://linkedin.com/in/chloemartin-techrecruiter",
        },
      ],
      interviews: [],
      statusProgression: [
        { from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 },
        { from: ApplicationStatus.APPLIED, to: ApplicationStatus.PHONE_SCREEN, daysOffset: 5 },
      ],
    },
    {
      company: "Ramp",
      role: "Senior Full-Stack Engineer (Cards)",
      status: ApplicationStatus.PHONE_SCREEN,
      priority: Priority.HIGH,
      locationType: LocationType.HYBRID,
      location: "New York, NY",
      salaryMin: 185000,
      salaryMax: 245000,
      source: ApplicationSource.REFERRAL,
      jobUrl: "https://ramp.com/careers/cards-fullstack",
      appliedDate: subDays(now, 20),
      followUpDate: addDays(now, 2), // upcoming
      resumeVersionId: resumeFullstack.id,
      position: 2000,
      notes: ["Phone screen with hiring manager next week. Reviewing ledger models."],
      contacts: [
        {
          name: "Alex Zhao",
          title: "Engineering Manager",
          email: "alex.zhao@ramp.com",
          linkedinUrl: "https://linkedin.com/in/alexzhao-eng",
        },
      ],
      interviews: [],
      statusProgression: [
        { from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 },
        { from: ApplicationStatus.APPLIED, to: ApplicationStatus.PHONE_SCREEN, daysOffset: 4 },
      ],
    },
    {
      company: "PostHog",
      role: "Product Engineer (Web Analytics)",
      status: ApplicationStatus.PHONE_SCREEN,
      priority: Priority.MEDIUM,
      locationType: LocationType.REMOTE,
      location: "Remote - Worldwide",
      salaryMin: 160000,
      salaryMax: 205000,
      source: ApplicationSource.COMPANY_SITE,
      jobUrl: "https://posthog.com/careers/product-engineer",
      appliedDate: subDays(now, 16),
      followUpDate: null,
      resumeVersionId: resumeFullstack.id,
      position: 3000,
      notes: ["Transparent compensation model, public handbook. Culture fit call scheduled."],
      contacts: [],
      interviews: [],
      statusProgression: [
        { from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 },
        { from: ApplicationStatus.APPLIED, to: ApplicationStatus.PHONE_SCREEN, daysOffset: 6 },
      ],
    },
    {
      company: "Fly.io",
      role: "Systems & Edge Infrastructure Engineer",
      status: ApplicationStatus.PHONE_SCREEN,
      priority: Priority.HIGH,
      locationType: LocationType.REMOTE,
      location: "Chicago, IL (Remote)",
      salaryMin: 170000,
      salaryMax: 225000,
      source: ApplicationSource.OTHER,
      jobUrl: "https://fly.io/jobs/edge-systems",
      appliedDate: subDays(now, 35),
      followUpDate: subDays(now, 5), // OVERDUE 5
      resumeVersionId: resumeBackend.id,
      position: 4000,
      notes: ["Need to read Fly.io blog posts on Firecracker microVMs and Wireguard tunnels."],
      contacts: [],
      interviews: [],
      statusProgression: [
        { from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 },
        { from: ApplicationStatus.APPLIED, to: ApplicationStatus.PHONE_SCREEN, daysOffset: 7 },
      ],
    },
    {
      company: "Cal.com",
      role: "Full-Stack Core Engineer",
      status: ApplicationStatus.PHONE_SCREEN,
      priority: Priority.LOW,
      locationType: LocationType.REMOTE,
      location: "Remote - Worldwide",
      salaryMin: 135000,
      salaryMax: 175000,
      source: ApplicationSource.OTHER,
      jobUrl: "https://cal.com/jobs/full-stack-core",
      appliedDate: subDays(now, 11),
      followUpDate: addDays(now, 6), // upcoming
      resumeVersionId: resumeFullstack.id,
      position: 5000,
      notes: [],
      contacts: [],
      interviews: [],
      statusProgression: [
        { from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 },
        { from: ApplicationStatus.APPLIED, to: ApplicationStatus.PHONE_SCREEN, daysOffset: 4 },
      ],
    },

    // ---------------- INTERVIEW (5) ----------------
    {
      company: "OpenAI",
      role: "Full-Stack Platform Engineer",
      status: ApplicationStatus.INTERVIEW,
      priority: Priority.HIGH,
      locationType: LocationType.HYBRID,
      location: "San Francisco, CA",
      salaryMin: 220000,
      salaryMax: 310000,
      source: ApplicationSource.REFERRAL,
      jobUrl: "https://openai.com/careers/full-stack-platform",
      appliedDate: subDays(now, 42),
      followUpDate: null,
      resumeVersionId: resumeFullstack.id,
      position: 1000,
      notes: [
        "Passed initial screening with flying colors. Architecture round focused on streaming responses.",
      ],
      contacts: [
        {
          name: "David Kim",
          title: "Engineering Director",
          email: "dkim@openai.com",
          linkedinUrl: "https://linkedin.com/in/davidkim-openai",
        },
      ],
      interviews: [
        // UPCOMING IN 18 HOURS (< 48 hours)
        {
          round: 3,
          type: InterviewType.SYSTEM_DESIGN,
          scheduledAt: addHours(now, 18),
          durationMinutes: 60,
          prepNotes: "Topic: Real-time multi-tenant token rate limiting and SSE streaming cache.",
          outcome: InterviewOutcome.PENDING,
        },
      ],
      statusProgression: [
        { from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 },
        { from: ApplicationStatus.APPLIED, to: ApplicationStatus.PHONE_SCREEN, daysOffset: 6 },
        { from: ApplicationStatus.PHONE_SCREEN, to: ApplicationStatus.INTERVIEW, daysOffset: 15 },
      ],
    },
    {
      company: "GitHub",
      role: "Senior Next.js & Web Platform Engineer",
      status: ApplicationStatus.INTERVIEW,
      priority: Priority.HIGH,
      locationType: LocationType.REMOTE,
      location: "Remote - US",
      salaryMin: 180000,
      salaryMax: 235000,
      source: ApplicationSource.COMPANY_SITE,
      jobUrl: "https://github.com/careers/nextjs-web-platform",
      appliedDate: subDays(now, 38),
      followUpDate: null,
      resumeVersionId: resumeFrontend.id,
      position: 2000,
      notes: [
        "Working on GitHub Discussions and issues modernization using React Server Components.",
      ],
      contacts: [
        {
          name: "Hannah Reed",
          title: "Staff Technical Recruiter",
          email: "hannah.reed@github.com",
          linkedinUrl: "https://linkedin.com/in/hannahreed-github",
        },
      ],
      interviews: [
        // UPCOMING IN 38 HOURS (< 48 hours)
        {
          round: 2,
          type: InterviewType.TECHNICAL,
          scheduledAt: addHours(now, 38),
          durationMinutes: 60,
          prepNotes: "Live coding on custom React hooks, virtualized lists, and keyboard navigation.",
          outcome: InterviewOutcome.PENDING,
        },
      ],
      statusProgression: [
        { from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 },
        { from: ApplicationStatus.APPLIED, to: ApplicationStatus.PHONE_SCREEN, daysOffset: 7 },
        { from: ApplicationStatus.PHONE_SCREEN, to: ApplicationStatus.INTERVIEW, daysOffset: 16 },
      ],
    },
    {
      company: "Sentry",
      role: "Performance & Tracing Infrastructure",
      status: ApplicationStatus.INTERVIEW,
      priority: Priority.MEDIUM,
      locationType: LocationType.HYBRID,
      location: "San Francisco, CA",
      salaryMin: 165000,
      salaryMax: 215000,
      source: ApplicationSource.LINKEDIN,
      jobUrl: "https://sentry.io/careers/tracing-infra",
      appliedDate: subDays(now, 45),
      followUpDate: null,
      resumeVersionId: resumeBackend.id,
      position: 3000,
      notes: [
        "HR recruiter screen passed. Tech lead was impressed by knowledge of ClickHouse and Snuba.",
      ],
      contacts: [
        {
          name: "Liam O'Connor",
          title: "Principal Recruiter",
          email: "liam@sentry.io",
          linkedinUrl: "https://linkedin.com/in/liam-oconnor-talent",
        },
      ],
      interviews: [
        {
          round: 1,
          type: InterviewType.HR,
          scheduledAt: subDays(now, 14),
          durationMinutes: 45,
          prepNotes: "Discuss career background, distributed systems experience, and remote alignment.",
          outcome: InterviewOutcome.PASSED,
          feedback: "Great communication, clear passion for observability tooling.",
        },
        {
          round: 2,
          type: InterviewType.TECHNICAL,
          scheduledAt: addDays(now, 4),
          durationMinutes: 60,
          prepNotes: "Deep dive into Kafka event streaming and database indexing strategies.",
          outcome: InterviewOutcome.PENDING,
        },
      ],
      statusProgression: [
        { from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 },
        { from: ApplicationStatus.APPLIED, to: ApplicationStatus.PHONE_SCREEN, daysOffset: 5 },
        { from: ApplicationStatus.PHONE_SCREEN, to: ApplicationStatus.INTERVIEW, daysOffset: 18 },
      ],
    },
    {
      company: "Clerk",
      role: "Senior Auth Platform Engineer",
      status: ApplicationStatus.INTERVIEW,
      priority: Priority.HIGH,
      locationType: LocationType.REMOTE,
      location: "San Francisco, CA (Remote)",
      salaryMin: 170000,
      salaryMax: 225000,
      source: ApplicationSource.OTHER,
      jobUrl: "https://clerk.com/careers/auth-platform",
      appliedDate: subDays(now, 30),
      followUpDate: null,
      resumeVersionId: resumeFullstack.id,
      position: 4000,
      notes: [
        "First round technical interview went great. Discussed JWT signing, JWKS rotation, and session cookies.",
      ],
      contacts: [
        {
          name: "Colin Sidoti",
          title: "Co-Founder & CEO",
          email: "colin@clerk.com",
          linkedinUrl: "https://linkedin.com/in/colin-sidoti",
        },
      ],
      interviews: [
        {
          round: 1,
          type: InterviewType.TECHNICAL,
          scheduledAt: subDays(now, 8),
          durationMinutes: 60,
          prepNotes: "OAuth2 / OIDC deep dive and token validation logic.",
          outcome: InterviewOutcome.PASSED,
          feedback: "Solid knowledge of cryptography and web security primitives.",
        },
        {
          round: 2,
          type: InterviewType.SYSTEM_DESIGN,
          scheduledAt: addDays(now, 6),
          durationMinutes: 60,
          prepNotes: "Design a globally distributed session verification service with sub-5ms latency.",
          outcome: InterviewOutcome.PENDING,
        },
      ],
      statusProgression: [
        { from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 },
        { from: ApplicationStatus.APPLIED, to: ApplicationStatus.PHONE_SCREEN, daysOffset: 4 },
        { from: ApplicationStatus.PHONE_SCREEN, to: ApplicationStatus.INTERVIEW, daysOffset: 12 },
      ],
    },
    {
      company: "PlanetScale",
      role: "Database Engine Platform Engineer",
      status: ApplicationStatus.INTERVIEW,
      priority: Priority.MEDIUM,
      locationType: LocationType.REMOTE,
      location: "Mountain View, CA (Remote)",
      salaryMin: 180000,
      salaryMax: 235000,
      source: ApplicationSource.RECRUITER,
      jobUrl: "https://planetscale.com/careers/database-platform",
      appliedDate: subDays(now, 50),
      followUpDate: null,
      resumeVersionId: resumeBackend.id,
      position: 5000,
      notes: ["Completed both HR screen and core database systems coding round."],
      contacts: [],
      interviews: [
        {
          round: 1,
          type: InterviewType.HR,
          scheduledAt: subDays(now, 20),
          durationMinutes: 45,
          prepNotes: "Overview of Vitess and MySQL sharding background.",
          outcome: InterviewOutcome.PASSED,
          feedback: "Strong cultural alignment and clear technical trajectory.",
        },
        {
          round: 2,
          type: InterviewType.TECHNICAL,
          scheduledAt: subDays(now, 10),
          durationMinutes: 60,
          prepNotes: "Concurrency primitives, write-ahead logs, and Raft consensus.",
          outcome: InterviewOutcome.PASSED,
          feedback: "Flawless coding on lock-free data structures.",
        },
      ],
      statusProgression: [
        { from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 },
        { from: ApplicationStatus.APPLIED, to: ApplicationStatus.PHONE_SCREEN, daysOffset: 6 },
        { from: ApplicationStatus.PHONE_SCREEN, to: ApplicationStatus.INTERVIEW, daysOffset: 20 },
      ],
    },

    // ---------------- OFFER (2) ----------------
    {
      company: "Dub",
      role: "Founding Full-Stack Engineer",
      status: ApplicationStatus.OFFER,
      priority: Priority.HIGH,
      locationType: LocationType.REMOTE,
      location: "New York, NY (Remote)",
      salaryMin: 165000,
      salaryMax: 215000,
      source: ApplicationSource.REFERRAL,
      jobUrl: "https://dub.co/careers/founding-engineer",
      appliedDate: subDays(now, 60),
      followUpDate: null,
      resumeVersionId: resumeFullstack.id,
      position: 1000,
      notes: [
        "Received formal written offer: $185k base + 1.25% equity with 4-year vest and 1-year cliff.",
        "Team is tiny, highly autonomous, and ships daily. Decision deadline next Friday.",
      ],
      contacts: [
        {
          name: "Steven Tey",
          title: "Founder",
          email: "steven@dub.co",
          linkedinUrl: "https://linkedin.com/in/steventey",
        },
      ],
      interviews: [
        {
          round: 1,
          type: InterviewType.TECHNICAL,
          scheduledAt: subDays(now, 35),
          durationMinutes: 60,
          prepNotes: "Live pair-programming on link analytics ingestion with Tinybird.",
          outcome: InterviewOutcome.PASSED,
          feedback: "Extremely fast execution and high code cleanliness.",
        },
        {
          round: 2,
          type: InterviewType.BEHAVIORAL,
          scheduledAt: subDays(now, 22),
          durationMinutes: 45,
          prepNotes: "Discussion on roadmap ownership, design tastes, and product intuition.",
          outcome: InterviewOutcome.PASSED,
          feedback: "Unanimous yes from founders.",
        },
      ],
      statusProgression: [
        { from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 },
        { from: ApplicationStatus.APPLIED, to: ApplicationStatus.PHONE_SCREEN, daysOffset: 5 },
        { from: ApplicationStatus.PHONE_SCREEN, to: ApplicationStatus.INTERVIEW, daysOffset: 14 },
        { from: ApplicationStatus.INTERVIEW, to: ApplicationStatus.OFFER, daysOffset: 32 },
      ],
    },
    {
      company: "Railway",
      role: "Infrastructure Software Engineer",
      status: ApplicationStatus.OFFER,
      priority: Priority.HIGH,
      locationType: LocationType.REMOTE,
      location: "San Francisco, CA (Remote)",
      salaryMin: 175000,
      salaryMax: 225000,
      source: ApplicationSource.COMPANY_SITE,
      jobUrl: "https://railway.com/careers/infra-engineer",
      appliedDate: subDays(now, 55),
      followUpDate: null,
      resumeVersionId: resumeBackend.id,
      position: 2000,
      notes: [
        "Offer details: $180k base + competitive equity. Excellent developer experience ethos.",
      ],
      contacts: [
        {
          name: "Jake Cooper",
          title: "Head of Infrastructure",
          email: "jake@railway.com",
          linkedinUrl: "https://linkedin.com/in/jakecooper-railway",
        },
      ],
      interviews: [],
      statusProgression: [
        { from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 },
        { from: ApplicationStatus.APPLIED, to: ApplicationStatus.PHONE_SCREEN, daysOffset: 6 },
        { from: ApplicationStatus.PHONE_SCREEN, to: ApplicationStatus.INTERVIEW, daysOffset: 16 },
        { from: ApplicationStatus.INTERVIEW, to: ApplicationStatus.OFFER, daysOffset: 30 },
      ],
    },

    // ---------------- REJECTED (5) ----------------
    {
      company: "Discord",
      role: "Real-Time Messaging Systems",
      status: ApplicationStatus.REJECTED,
      priority: Priority.MEDIUM,
      locationType: LocationType.HYBRID,
      location: "San Francisco, CA",
      salaryMin: 180000,
      salaryMax: 240000,
      source: ApplicationSource.LINKEDIN,
      jobUrl: "https://discord.com/careers/messaging-systems",
      appliedDate: subDays(now, 85),
      followUpDate: null,
      resumeVersionId: resumeBackend.id,
      position: 1000,
      notes: ["Position closed due to internal restructuring."],
      contacts: [],
      interviews: [],
      statusProgression: [
        { from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 },
        { from: ApplicationStatus.APPLIED, to: ApplicationStatus.REJECTED, daysOffset: 12 },
      ],
    },
    {
      company: "Snowflake",
      role: "Distributed Query Optimizer",
      status: ApplicationStatus.REJECTED,
      priority: Priority.MEDIUM,
      locationType: LocationType.ONSITE,
      location: "Seattle, WA",
      salaryMin: 195000,
      salaryMax: 255000,
      source: ApplicationSource.INDEED,
      jobUrl: "https://snowflake.com/careers/query-optimizer",
      appliedDate: subDays(now, 75),
      followUpDate: null,
      resumeVersionId: resumeBackend.id,
      position: 2000,
      notes: [],
      contacts: [],
      interviews: [],
      statusProgression: [
        { from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 },
        { from: ApplicationStatus.APPLIED, to: ApplicationStatus.REJECTED, daysOffset: 18 },
      ],
    },
    {
      company: "Databricks",
      role: "Data Platform Engineer",
      status: ApplicationStatus.REJECTED,
      priority: Priority.HIGH,
      locationType: LocationType.HYBRID,
      location: "San Francisco, CA",
      salaryMin: 200000,
      salaryMax: 265000,
      source: ApplicationSource.REFERRAL,
      jobUrl: "https://databricks.com/careers/data-platform",
      appliedDate: subDays(now, 70),
      followUpDate: null,
      resumeVersionId: resumeBackend.id,
      position: 3000,
      notes: ["Referred by senior staff engineer. Rejected after automated resume screen."],
      contacts: [],
      interviews: [],
      statusProgression: [
        { from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 },
        { from: ApplicationStatus.APPLIED, to: ApplicationStatus.REJECTED, daysOffset: 8 },
      ],
    },
    {
      company: "Loom",
      role: "Media Streaming Engineer",
      status: ApplicationStatus.REJECTED,
      priority: Priority.LOW,
      locationType: LocationType.REMOTE,
      location: "San Francisco, CA (Remote)",
      salaryMin: 160000,
      salaryMax: 205000,
      source: ApplicationSource.COMPANY_SITE,
      jobUrl: "https://loom.com/careers/media-streaming",
      appliedDate: subDays(now, 65),
      followUpDate: null,
      resumeVersionId: resumeFullstack.id,
      position: 4000,
      notes: [],
      contacts: [],
      interviews: [],
      statusProgression: [
        { from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 },
        { from: ApplicationStatus.APPLIED, to: ApplicationStatus.REJECTED, daysOffset: 10 },
      ],
    },
    {
      company: "Prisma",
      role: "ORM & Driver Core Engineer",
      status: ApplicationStatus.REJECTED,
      priority: Priority.HIGH,
      locationType: LocationType.REMOTE,
      location: "Berlin, Germany (Remote)",
      salaryMin: 155000,
      salaryMax: 195000,
      source: ApplicationSource.OTHER,
      jobUrl: "https://prisma.io/careers/orm-core",
      appliedDate: subDays(now, 80),
      followUpDate: null,
      resumeVersionId: resumeFullstack.id,
      position: 5000,
      notes: ["Decided to hire someone with Rust compiler internals experience."],
      contacts: [],
      interviews: [],
      statusProgression: [
        { from: null, to: ApplicationStatus.APPLIED, daysOffset: 0 },
        { from: ApplicationStatus.APPLIED, to: ApplicationStatus.REJECTED, daysOffset: 14 },
      ],
    },
  ];

  // Insert all applications and associated children inside a transaction
  await db.$transaction(async (tx) => {
    for (const spec of specs) {
      const app = await tx.application.create({
        data: {
          userId,
          company: spec.company,
          role: spec.role,
          status: spec.status,
          priority: spec.priority,
          locationType: spec.locationType,
          location: spec.location,
          salaryMin: spec.salaryMin,
          salaryMax: spec.salaryMax,
          currency: "USD",
          source: spec.source,
          jobUrl: spec.jobUrl,
          appliedDate: spec.appliedDate,
          followUpDate: spec.followUpDate,
          resumeVersionId: spec.resumeVersionId,
          position: spec.position,
        },
      });

      // Insert StatusHistory records
      for (const step of spec.statusProgression) {
        await tx.statusHistory.create({
          data: {
            applicationId: app.id,
            fromStatus: step.from,
            toStatus: step.to,
            changedAt: addDays(spec.appliedDate, step.daysOffset),
          },
        });
      }

      // Insert Notes
      for (const noteContent of spec.notes) {
        await tx.note.create({
          data: {
            applicationId: app.id,
            content: noteContent,
            createdAt: spec.appliedDate,
          },
        });
      }

      // Insert Contacts
      for (const contact of spec.contacts) {
        await tx.contact.create({
          data: {
            applicationId: app.id,
            name: contact.name,
            title: contact.title,
            email: contact.email,
            linkedinUrl: contact.linkedinUrl,
            createdAt: spec.appliedDate,
          },
        });
      }

      // Insert Interviews
      for (const interview of spec.interviews) {
        await tx.interview.create({
          data: {
            applicationId: app.id,
            round: interview.round,
            type: interview.type,
            scheduledAt: interview.scheduledAt,
            durationMinutes: interview.durationMinutes,
            prepNotes: interview.prepNotes,
            outcome: interview.outcome,
            feedback: interview.feedback,
          },
        });
      }
    }
  });
}
