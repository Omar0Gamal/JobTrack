"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  INTERVIEW_TYPE_ORDER,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_OUTCOME_ORDER,
  INTERVIEW_OUTCOME_LABELS,
  type InterviewType,
  type InterviewOutcome,
  type ApplicationStatus,
} from "@/schemas/enums";
import {
  createInterviewAction,
  updateInterviewAction,
} from "@/server/actions/interview.actions";
import { getApplicationsAction } from "@/server/actions/application.actions";

export interface InterviewFormData {
  id?: string;
  applicationId: string;
  round: number;
  type: InterviewType;
  scheduledAt: Date | string;
  durationMinutes: number;
  prepNotes?: string | null;
  outcome: InterviewOutcome;
  feedback?: string | null;
}

export interface ApplicationOption {
  id: string;
  company: string;
  role: string;
}

export interface InterviewFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId?: string;
  interview?: InterviewFormData | null;
  defaultRound?: number;
  applicationsList?: ApplicationOption[];
  onSuccess?: (result: {
    interviewId: string;
    applicationId: string;
    shouldSuggestStatusMove?: boolean;
    applicationStatus?: ApplicationStatus;
  }) => void;
}

function toDatetimeLocalString(dateInput: Date | string): string {
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

export function InterviewFormDialog({
  open,
  onOpenChange,
  applicationId: initialAppId,
  interview,
  defaultRound = 1,
  applicationsList: initialAppsList,
  onSuccess,
}: InterviewFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(interview?.id);

  const [applicationId, setApplicationId] = React.useState<string>(
    interview?.applicationId || initialAppId || ""
  );
  const [round, setRound] = React.useState<number>(
    interview?.round ?? defaultRound
  );
  const [type, setType] = React.useState<InterviewType>(
    interview?.type ?? "HR"
  );
  const [scheduledAtStr, setScheduledAtStr] = React.useState<string>(
    interview?.scheduledAt
      ? toDatetimeLocalString(interview.scheduledAt)
      : toDatetimeLocalString(new Date(Date.now() + 24 * 60 * 60 * 1000))
  );
  const [durationMinutes, setDurationMinutes] = React.useState<number>(
    interview?.durationMinutes ?? 45
  );
  const [outcome, setOutcome] = React.useState<InterviewOutcome>(
    interview?.outcome ?? "PENDING"
  );
  const [prepNotes, setPrepNotes] = React.useState<string>(
    interview?.prepNotes ?? ""
  );
  const [feedback, setFeedback] = React.useState<string>(
    interview?.feedback ?? ""
  );

  const [availableApplications, setAvailableApplications] = React.useState<
    ApplicationOption[]
  >(initialAppsList ?? []);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  // Sync state whenever dialog opens or interview changes
  React.useEffect(() => {
    if (open) {
      const targetAppId = interview?.applicationId || initialAppId || "";
      setApplicationId(targetAppId);
      setRound(interview?.round ?? defaultRound);
      setType(interview?.type ?? "HR");
      setScheduledAtStr(
        interview?.scheduledAt
          ? toDatetimeLocalString(interview.scheduledAt)
          : toDatetimeLocalString(new Date(Date.now() + 24 * 60 * 60 * 1000))
      );
      setDurationMinutes(interview?.durationMinutes ?? 45);
      setOutcome(interview?.outcome ?? "PENDING");
      setPrepNotes(interview?.prepNotes ?? "");
      setFeedback(interview?.feedback ?? "");

      if (!initialAppId && (!initialAppsList || initialAppsList.length === 0)) {
        void getApplicationsAction().then((apps) => {
          setAvailableApplications(
            apps.map((a) => ({ id: a.id, company: a.company, role: a.role }))
          );
        });
      } else if (initialAppsList && initialAppsList.length > 0) {
        setAvailableApplications(initialAppsList);
      }
    }
  }, [open, interview, initialAppId, defaultRound, initialAppsList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!applicationId) {
      toast.error("Please select an application");
      return;
    }

    if (!scheduledAtStr) {
      toast.error("Please specify interview date and time");
      return;
    }

    const scheduledDate = new Date(scheduledAtStr);
    if (isNaN(scheduledDate.getTime())) {
      toast.error("Invalid scheduled date and time");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && interview?.id) {
        const result = await updateInterviewAction({
          interviewId: interview.id,
          round,
          type,
          scheduledAt: scheduledDate,
          durationMinutes,
          outcome,
          prepNotes: prepNotes.trim() || null,
          feedback: feedback.trim() || null,
        });

        if (!result.ok) {
          toast.error(result.error);
          return;
        }

        toast.success("Interview updated");
        void queryClient.invalidateQueries({ queryKey: ["applications"] });
        void queryClient.invalidateQueries({
          queryKey: ["application", applicationId],
        });
        void queryClient.invalidateQueries({ queryKey: ["interviews"] });

        onSuccess?.({
          interviewId: result.data.id,
          applicationId,
        });
        onOpenChange(false);
      } else {
        const result = await createInterviewAction({
          applicationId,
          round,
          type,
          scheduledAt: scheduledDate,
          durationMinutes,
          outcome,
          prepNotes: prepNotes.trim() || null,
          feedback: feedback.trim() || null,
        });

        if (!result.ok) {
          toast.error(result.error);
          return;
        }

        toast.success("Interview scheduled");
        void queryClient.invalidateQueries({ queryKey: ["applications"] });
        void queryClient.invalidateQueries({
          queryKey: ["application", applicationId],
        });
        void queryClient.invalidateQueries({ queryKey: ["interviews"] });

        onSuccess?.({
          interviewId: result.data.interview.id,
          applicationId,
          shouldSuggestStatusMove: result.data.shouldSuggestStatusMove,
          applicationStatus: result.data.applicationStatus,
        });
        onOpenChange(false);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save interview"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {isEditing ? "Edit Interview Round" : "Add Interview Round"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditing
              ? "Update interview details, notes, or outcome."
              : "Schedule an upcoming round or log completed interview feedback."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Application Selector (only shown if applicationId not pre-supplied) */}
          {!initialAppId && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Application <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={applicationId}
                onValueChange={setApplicationId}
                disabled={isEditing}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select application..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {availableApplications.map((app) => (
                    <SelectItem key={app.id} value={app.id} className="text-xs">
                      {app.company} — {app.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Round Number & Interview Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="interviewRound" className="text-xs font-semibold">
                Round Number
              </Label>
              <Input
                id="interviewRound"
                type="number"
                min={1}
                max={20}
                value={round}
                onChange={(e) => setRound(Math.max(1, Number(e.target.value)))}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Interview Type</Label>
              <Select
                value={type}
                onValueChange={(val) => setType(val as InterviewType)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_TYPE_ORDER.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {INTERVIEW_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Scheduled Date/Time & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="scheduledAt" className="text-xs font-semibold">
                Date & Time <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAtStr}
                onChange={(e) => setScheduledAtStr(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="duration" className="text-xs font-semibold">
                Duration (minutes)
              </Label>
              <Input
                id="duration"
                type="number"
                min={5}
                max={480}
                step={5}
                value={durationMinutes}
                onChange={(e) =>
                  setDurationMinutes(
                    Math.min(480, Math.max(5, Number(e.target.value)))
                  )
                }
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Outcome */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Interview Outcome</Label>
            <Select
              value={outcome}
              onValueChange={(val) => setOutcome(val as InterviewOutcome)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_OUTCOME_ORDER.map((o) => (
                  <SelectItem key={o} value={o} className="text-xs">
                    {INTERVIEW_OUTCOME_LABELS[o]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prep Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="prepNotes" className="text-xs font-semibold">
              Preparation Notes
            </Label>
            <Textarea
              id="prepNotes"
              placeholder="Key concepts to review, talking points, questions for the interviewer..."
              rows={3}
              value={prepNotes}
              onChange={(e) => setPrepNotes(e.target.value)}
              className="text-xs resize-none"
            />
          </div>

          {/* Feedback */}
          <div className="space-y-1.5">
            <Label htmlFor="feedback" className="text-xs font-semibold">
              Post-Interview Feedback / Notes
            </Label>
            <Textarea
              id="feedback"
              placeholder="What went well, questions asked, follow-up items, reflections..."
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs font-semibold gap-1.5"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{isEditing ? "Save Changes" : "Schedule Interview"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
