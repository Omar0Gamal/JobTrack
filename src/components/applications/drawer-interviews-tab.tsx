"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  CalendarCheck,
  Calendar,
  Clock,
  FileText,
  Info,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_TYPE_COLORS,
  INTERVIEW_OUTCOME_LABELS,
  INTERVIEW_OUTCOME_COLORS,
  APPLICATION_STATUS_LABELS,
  INTERVIEW_OUTCOME_ORDER,
  type InterviewType,
  type InterviewOutcome,
  type ApplicationStatus,
} from "@/schemas/enums";
import {
  deleteInterviewAction,
  updateInterviewAction,
} from "@/server/actions/interview.actions";
import {
  updateApplicationAction,
  type ApplicationWithRelations,
} from "@/server/actions/application.actions";
import {
  InterviewFormDialog,
  type InterviewFormData,
} from "@/components/interviews/interview-form-dialog";
import { cn } from "@/lib/utils";

export interface InterviewItem {
  id: string;
  round: number;
  type: InterviewType;
  scheduledAt: Date | string;
  durationMinutes: number;
  prepNotes?: string | null;
  outcome: InterviewOutcome;
  feedback?: string | null;
}

export interface DrawerInterviewsTabProps {
  application?: ApplicationWithRelations;
  applicationId?: string;
  applicationStatus?: ApplicationStatus;
  company?: string;
  role?: string;
  interviews?: InterviewItem[];
}

export function DrawerInterviewsTab({
  application,
  applicationId: propAppId,
  applicationStatus: propAppStatus,
  company: propCompany,
  role: propRole,
  interviews: propInterviews,
}: DrawerInterviewsTabProps) {
  const queryClient = useQueryClient();

  const appId = application?.id ?? propAppId ?? "";
  const appStatus = application?.status ?? propAppStatus ?? "APPLIED";
  const appCompany = application?.company ?? propCompany ?? "";
  const appRole = application?.role ?? propRole ?? "";
  const [formDialogOpen, setFormDialogOpen] = React.useState<boolean>(false);
  const [selectedInterview, setSelectedInterview] =
    React.useState<InterviewFormData | null>(null);
  const [isMovingStatus, setIsMovingStatus] = React.useState<boolean>(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const sorted = React.useMemo(() => {
    const list = application?.interviews ?? propInterviews ?? [];
    return [...list].sort((a, b) => a.round - b.round);
  }, [application?.interviews, propInterviews]);

  const isEarlyStatus =
    appStatus === "WISHLIST" ||
    appStatus === "APPLIED" ||
    appStatus === "PHONE_SCREEN";
  const showStatusMoveBanner = isEarlyStatus && sorted.length > 0;

  const handleOpenAdd = () => {
    setSelectedInterview(null);
    setFormDialogOpen(true);
  };

  const handleOpenEdit = (interview: InterviewItem) => {
    setSelectedInterview({
      id: interview.id,
      applicationId: appId,
      round: interview.round,
      type: interview.type,
      scheduledAt: interview.scheduledAt,
      durationMinutes: interview.durationMinutes,
      prepNotes: interview.prepNotes,
      outcome: interview.outcome,
      feedback: interview.feedback,
    });
    setFormDialogOpen(true);
  };

  const handleQuickOutcomeChange = async (
    interviewId: string,
    newOutcome: InterviewOutcome
  ) => {
    try {
      const res = await updateInterviewAction({
        interviewId,
        outcome: newOutcome,
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to update outcome");
        return;
      }

      toast.success("Outcome updated");
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      void queryClient.invalidateQueries({ queryKey: ["application", appId] });
      void queryClient.invalidateQueries({ queryKey: ["interviews"] });
    } catch {
      toast.error("Failed to update outcome");
    }
  };

  const handleDeleteInterview = async (interviewId: string) => {
    setDeletingId(interviewId);
    try {
      const res = await deleteInterviewAction(interviewId);
      if (!res.ok) {
        toast.error(res.error || "Failed to delete interview");
        return;
      }

      toast.success("Interview round deleted");
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      void queryClient.invalidateQueries({ queryKey: ["application", appId] });
      void queryClient.invalidateQueries({ queryKey: ["interviews"] });
    } catch {
      toast.error("Failed to delete interview");
    } finally {
      setDeletingId(null);
    }
  };

  const handleMoveToInterviewStage = async () => {
    if (!appId) return;
    setIsMovingStatus(true);
    try {
      const res = await updateApplicationAction({
        id: appId,
        status: "INTERVIEW",
      });
      if (res.ok) {
        toast.success("Moved application to Interview stage");
        void queryClient.invalidateQueries({ queryKey: ["applications"] });
        void queryClient.invalidateQueries({ queryKey: ["application", appId] });
        void queryClient.invalidateQueries({ queryKey: ["interviews"] });
      } else {
        toast.error(res.error || "Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsMovingStatus(false);
    }
  };

  const handleFormSuccess = (result: {
    interviewId: string;
    applicationId: string;
    shouldSuggestStatusMove?: boolean;
    applicationStatus?: ApplicationStatus;
  }) => {
    if (result.shouldSuggestStatusMove) {
      toast("Interview round scheduled!", {
        description: `Application is currently in ${APPLICATION_STATUS_LABELS[appStatus]}. Move it to Interview stage?`,
        action: {
          label: "Move to Interview",
          onClick: () => {
            void handleMoveToInterviewStage();
          },
        },
        duration: 8000,
      });
    }
  };

  return (
    <div className="py-2 space-y-4">
      {/* Header with Title and Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <CalendarCheck className="h-3.5 w-3.5" />
            Interview Rounds
          </h3>
          <Badge variant="secondary" className="text-[10px]">
            {sorted.length} {sorted.length === 1 ? "round" : "rounds"}
          </Badge>
        </div>

        <Button
          size="sm"
          onClick={handleOpenAdd}
          className="h-7 text-xs font-medium gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Round</span>
        </Button>
      </div>

      {/* Prominent Callout Banner to Move Status to INTERVIEW */}
      {showStatusMoveBanner && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                Move to Interview stage?
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                This application has interview rounds logged but is still marked as{" "}
                <span className="font-semibold">
                  {APPLICATION_STATUS_LABELS[appStatus]}
                </span>
                .
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleMoveToInterviewStage}
            disabled={isMovingStatus}
            className="h-7 text-xs font-semibold shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isMovingStatus && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            <span>Move to Interview</span>
          </Button>
        </div>
      )}

      {/* Empty State */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-lg p-6 space-y-3">
          <Calendar className="h-8 w-8 text-muted-foreground/60" />
          <div className="space-y-1">
            <h4 className="font-semibold text-xs text-foreground">
              No interview rounds scheduled yet
            </h4>
            <p className="text-[11px] text-muted-foreground max-w-sm">
              Track phone screens, technical interviews, behavioral rounds, and take-home assignments.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAdd}
            className="text-xs h-7 gap-1"
          >
            <Plus className="h-3 w-3" />
            Add First Round
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((interview) => {
            const scheduledDate = new Date(interview.scheduledAt);
            const dateStr = format(scheduledDate, "EEEE, MMMM d, yyyy");
            const timeStr = format(scheduledDate, "h:mm a");

            return (
              <Card key={interview.id} className="border-border shadow-2xs">
                <CardContent className="p-3.5 space-y-2.5">
                  {/* Top row: Round, Type, Outcome selector, Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                        {interview.round}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-2 py-0 border font-semibold",
                          INTERVIEW_TYPE_COLORS[interview.type]
                        )}
                      >
                        {INTERVIEW_TYPE_LABELS[interview.type]}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Quick Outcome Selector */}
                      <Select
                        value={interview.outcome}
                        onValueChange={(val) =>
                          void handleQuickOutcomeChange(
                            interview.id,
                            val as InterviewOutcome
                          )
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            "h-6 text-[10px] px-2 font-semibold border rounded-md",
                            INTERVIEW_OUTCOME_COLORS[interview.outcome]
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                          {INTERVIEW_OUTCOME_ORDER.map((oc) => (
                            <SelectItem key={oc} value={oc} className="text-xs">
                              {INTERVIEW_OUTCOME_LABELS[oc]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Edit Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(interview)}
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        title="Edit round"
                        aria-label={`Edit interview round ${interview.round}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleDeleteInterview(interview.id)}
                        disabled={deletingId === interview.id}
                        className="h-6 w-6 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Delete round"
                        aria-label={`Delete interview round ${interview.round}`}
                      >
                        {deletingId === interview.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Scheduled date & time, duration */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      {dateStr} at {timeStr}
                    </span>
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock className="h-3 w-3" />
                      {interview.durationMinutes} min
                    </span>
                  </div>

                  {/* Prep Notes */}
                  {interview.prepNotes && (
                    <div className="rounded-md bg-muted/50 p-2.5 text-xs text-foreground space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        Prep Notes
                      </div>
                      <p className="text-xs whitespace-pre-wrap leading-relaxed">
                        {interview.prepNotes}
                      </p>
                    </div>
                  )}

                  {/* Feedback */}
                  {interview.feedback && (
                    <div className="rounded-md bg-muted/50 p-2.5 text-xs text-foreground space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <Info className="h-3 w-3" />
                        Feedback
                      </div>
                      <p className="text-xs whitespace-pre-wrap leading-relaxed">
                        {interview.feedback}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Dialog for Add / Edit */}
      <InterviewFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        applicationId={appId}
        interview={selectedInterview}
        defaultRound={sorted.length + 1}
        applicationsList={
          appId
            ? [{ id: appId, company: appCompany, role: appRole }]
            : undefined
        }
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
