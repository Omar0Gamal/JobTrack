import { requireUser } from "@/server/auth/require-user";
import { getAllInterviewsAction } from "@/server/actions/interview.actions";
import { getApplicationsAction } from "@/server/actions/application.actions";
import { InterviewsView } from "@/components/interviews/interviews-view";

export default async function InterviewsPage() {
  const [user, interviews, applications] = await Promise.all([
    requireUser(),
    getAllInterviewsAction(),
    getApplicationsAction(),
  ]);

  return (
    <InterviewsView
      initialInterviews={interviews}
      applications={applications}
      userTimezone={user.timezone}
    />
  );
}
