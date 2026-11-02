import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireAgent } from "@/server/auth/require-agent";
import { APPLICATION_STATUS_ORDER, type ApplicationStatus } from "@/schemas/enums";
import { getCalendarDateStringInTimezone } from "@/lib/dates/timezone";

export async function GET(request: NextRequest) {
  const auth = await requireAgent(request);
  if (!auth.ok) {
    return auth.response;
  }
  const { user } = auth.context;

  const now = new Date();
  const userTz = user.timezone || "Africa/Cairo";
  const todayUserStr = getCalendarDateStringInTimezone(now, userTz);
  const todayUtcStr = getCalendarDateStringInTimezone(now, "UTC");
  const todayCairoStr = getCalendarDateStringInTimezone(now, "Africa/Cairo");
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [activeApplications, resumeVersions] = await Promise.all([
    prisma.application.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
        archivedAt: null,
      },
      include: {
        contacts: {
          orderBy: { createdAt: "asc" },
        },
        resumeVersion: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.resumeVersion.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { applications: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const byStatus: Record<ApplicationStatus, number> = APPLICATION_STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<ApplicationStatus, number>
  );

  let appliedToday = 0;
  let appliedThisWeek = 0;
  const overdueFollowUps: typeof activeApplications = [];

  for (const app of activeApplications) {
    // Status breakdown
    if (byStatus[app.status] !== undefined) {
      byStatus[app.status]++;
    }

    // Applied today (UTC or Cairo or User timezone)
    const appDate = app.appliedDate ? new Date(app.appliedDate) : null;
    const createDate = app.createdAt ? new Date(app.createdAt) : null;
    const dates = [appDate, createDate].filter(Boolean) as Date[];

    const matchesToday = dates.some((d) => {
      const dUser = getCalendarDateStringInTimezone(d, userTz);
      const dUtc = getCalendarDateStringInTimezone(d, "UTC");
      const dCairo = getCalendarDateStringInTimezone(d, "Africa/Cairo");
      return dUser === todayUserStr || dUtc === todayUtcStr || dCairo === todayCairoStr;
    });

    if (matchesToday) {
      appliedToday++;
    }

    // Applied this week (last 7 days)
    const matchesThisWeek = dates.some((d) => d >= sevenDaysAgo);
    if (matchesThisWeek) {
      appliedThisWeek++;
    }

    // Overdue follow-ups
    if (
      app.followUpDate &&
      app.status !== "OFFER" &&
      app.status !== "REJECTED" &&
      new Date(app.followUpDate) <= now
    ) {
      overdueFollowUps.push(app);
    }
  }

  const resumes = resumeVersions.map((r) => ({
    ...r,
    applicationCount: r._count.applications,
  }));

  const resultData = {
    totalActive: activeApplications.length,
    appliedToday,
    appliedThisWeek,
    byStatus,
    overdueFollowUps,
    resumes,
  };

  return NextResponse.json({
    ok: true,
    ...resultData,
    data: resultData,
  });
}
