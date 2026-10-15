import { requireUser } from "@/server/auth/require-user";
import { getApplicationsAction } from "@/server/actions/application.actions";
import { getResumeVersionsAction } from "@/server/actions/resume.actions";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function DashboardPage() {
  const user = await requireUser();

  const [applications, resumeVersions] = await Promise.all([
    getApplicationsAction({ includeArchived: true }),
    getResumeVersionsAction(),
  ]);

  return (
    <DashboardView
      initialApplications={applications}
      resumeVersions={resumeVersions}
      userTimezone={user.timezone}
    />
  );
}
