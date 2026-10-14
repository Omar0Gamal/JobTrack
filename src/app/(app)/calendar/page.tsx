import { requireUser } from "@/server/auth/require-user";
import { getApplicationsAction } from "@/server/actions/application.actions";
import { getAllInterviewsAction } from "@/server/actions/interview.actions";
import { CalendarView } from "@/components/calendar/calendar-view";

export default async function CalendarPage() {
  const user = await requireUser();
  const [applications, interviews] = await Promise.all([
    getApplicationsAction(),
    getAllInterviewsAction(),
  ]);

  return (
    <CalendarView
      initialApplications={applications}
      initialInterviews={interviews}
      userTimezone={user.timezone}
    />
  );
}
