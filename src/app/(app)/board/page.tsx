import { Suspense } from "react";
import {
  getApplicationsAction,
  getResumeVersionsForSelectAction,
} from "@/server/actions/application.actions";
import { BoardView } from "@/components/board/board-view";
import BoardLoading from "./loading";

export default async function BoardPage() {
  const [initialApplications, resumeVersions] = await Promise.all([
    getApplicationsAction({ includeArchived: true }),
    getResumeVersionsForSelectAction(),
  ]);

  return (
    <Suspense fallback={<BoardLoading />}>
      <BoardView
        initialApplications={initialApplications}
        resumeVersions={resumeVersions}
      />
    </Suspense>
  );
}
