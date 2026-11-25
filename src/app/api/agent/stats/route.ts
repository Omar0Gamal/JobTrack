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

  const { searchParams } = request.nextUrl;
  const compact = searchParams.get("compact") === "true";
  const followUpLimitRaw = parseInt(searchParams.get("followUpLimit") || "15", 10);
  const followUpLimit = Math.min(Math.max(1, isNaN(followUpLimitRaw) ? 15 : followUpLimitRaw), 100);

  const now = new Date();
  const userTz = user.timezone || "Africa/Cairo";
  const todayUserStr = getCalendarDateStringInTimezone(now, userTz);
  const todayUtcStr = getCalendarDateStringInTimezone(now, "UTC");
  const todayCairoStr = getCalendarDateStringInTimezone(now, "Africa/Cairo");
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const activeApplicationsPromise = compact
    ? prisma.application.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
          archivedAt: null,
        },
        select: {
          id: true,
          company: true,
          role: true,
          status: true,
          appliedDate: true,
          createdAt: true,
          followUpDate: true,
          jobUrl: true,
          contacts: {
            select: { name: true, email: true, linkedinUrl: true },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : prisma.application.findMany({
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
      });

  const resumeVersionsPromise = compact
    ? Promise.resolve([])
    : prisma.resumeVersion.findMany({
        where: { userId: user.id },
        include: {
          _count: {
            select: { applications: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

  const [activeApplications, resumeVersions] = await Promise.all([
    activeApplicationsPromise,
    resumeVersionsPromise,
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
    if (byStatus[app.status] !== undefined) {
      byStatus[app.status]++;
    }

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

    const matchesThisWeek = dates.some((d) => d >= sevenDaysAgo);
    if (matchesThisWeek) {
      appliedThisWeek++;
    }

    if (
      app.followUpDate &&
      app.status !== "OFFER" &&
      app.status !== "REJECTED" &&
      new Date(app.followUpDate) <= now
    ) {
      overdueFollowUps.push(app);
    }
  }

  if (compact) {
    return NextResponse.json({
      ok: true,
      compact: true,
      totalActive: activeApplications.length,
      appliedToday,
      appliedThisWeek,
      byStatus,
      overdueFollowUpsTotal: overdueFollowUps.length,
      overdueFollowUps: overdueFollowUps.slice(0, followUpLimit).map((a) => ({
        id: a.id,
        company: a.company,
        role: a.role,
        status: a.status,
        appliedDate: a.appliedDate,
        followUpDate: a.followUpDate,
        jobUrl: a.jobUrl,
        contacts: a.contacts ?? [],
      })),
    });
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
