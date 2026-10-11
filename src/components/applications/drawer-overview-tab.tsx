"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Building2,
  Briefcase,
  MapPin,
  Calendar,
  Globe,
  ExternalLink,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getFollowUpPresetDate } from "@/lib/dates/timezone";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  APPLICATION_STATUS_ORDER,
  APPLICATION_STATUS_LABELS,
  PRIORITY_ORDER,
  PRIORITY_LABELS,
  LOCATION_TYPE_ORDER,
  LOCATION_TYPE_LABELS,
  APPLICATION_SOURCE_ORDER,
  APPLICATION_SOURCE_LABELS,
  type ApplicationStatus,
  type Priority,
  type LocationType,
  type ApplicationSource,
} from "@/schemas/enums";
import { useDebouncedAutosave } from "@/hooks/use-debounced-autosave";
import { useUpdateApplicationMutation } from "@/hooks/use-applications";
import {
  getResumeVersionsForSelectAction,
  markFollowedUpAction,
} from "@/server/actions/application.actions";
import type { ApplicationWithRelations } from "@/server/actions/application.actions";

interface DrawerOverviewTabProps {
  application: ApplicationWithRelations;
}

interface OverviewFormState {
  company: string;
  role: string;
  status: ApplicationStatus;
  priority: Priority;
  locationType: LocationType;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  source: ApplicationSource;
  jobUrl: string;
  appliedDate: string; // YYYY-MM-DD
  followUpDate: string; // YYYY-MM-DD
  resumeVersionId: string;
}

export function DrawerOverviewTab({ application }: DrawerOverviewTabProps) {
  const queryClient = useQueryClient();
  const updateMutation = useUpdateApplicationMutation();
  const [resumeVersions, setResumeVersions] = React.useState<
    Array<{ id: string; name: string }>
  >([]);

  // Fetch user resume versions once on mount
  React.useEffect(() => {
    void getResumeVersionsForSelectAction().then((versions) => {
      setResumeVersions(versions);
    });
  }, []);

  const formatDateForInput = (d?: Date | string | null): string => {
    if (!d) return "";
    try {
      return format(new Date(d), "yyyy-MM-dd");
    } catch {
      return "";
    }
  };

  const [formState, setFormState] = React.useState<OverviewFormState>({
    company: application.company,
    role: application.role,
    status: application.status,
    priority: application.priority,
    locationType: application.locationType,
    location: application.location ?? "",
    salaryMin: application.salaryMin,
    salaryMax: application.salaryMax,
    currency: application.currency || "USD",
    source: application.source,
    jobUrl: application.jobUrl ?? "",
    appliedDate: formatDateForInput(application.appliedDate),
    followUpDate: formatDateForInput(application.followUpDate),
    resumeVersionId: application.resumeVersionId ?? "NONE",
  });

  // Sync if external application ID changes
  React.useEffect(() => {
    setFormState({
      company: application.company,
      role: application.role,
      status: application.status,
      priority: application.priority,
      locationType: application.locationType,
      location: application.location ?? "",
      salaryMin: application.salaryMin,
      salaryMax: application.salaryMax,
      currency: application.currency || "USD",
      source: application.source,
      jobUrl: application.jobUrl ?? "",
      appliedDate: formatDateForInput(application.appliedDate),
      followUpDate: formatDateForInput(application.followUpDate),
      resumeVersionId: application.resumeVersionId ?? "NONE",
    });
  }, [application]);

  // Debounced autosave handler
  const handleSave = React.useCallback(
    async (state: OverviewFormState): Promise<boolean> => {
      try {
        await updateMutation.mutateAsync({
          id: application.id,
          company: state.company,
          role: state.role,
          status: state.status,
          priority: state.priority,
          locationType: state.locationType,
          location: state.location.trim() || null,
          salaryMin: state.salaryMin,
          salaryMax: state.salaryMax,
          currency: state.currency,
          source: state.source,
          jobUrl: state.jobUrl.trim() || null,
          appliedDate: state.appliedDate ? new Date(state.appliedDate) : undefined,
          followUpDate: state.followUpDate ? new Date(state.followUpDate) : null,
          resumeVersionId:
            state.resumeVersionId === "NONE" ? null : state.resumeVersionId,
        });
        return true;
      } catch {
        return false;
      }
    },
    [application.id, updateMutation]
  );

  const { status: autosaveStatus, triggerSave } = useDebouncedAutosave(handleSave, 600);

  const updateField = <K extends keyof OverviewFormState>(
    field: K,
    val: OverviewFormState[K]
  ) => {
    setFormState((prev) => {
      const next = { ...prev, [field]: val };
      triggerSave(next);
      return next;
    });
  };

  const handleFollowUpPreset = (preset: "in_3_days" | "next_week") => {
    const nextDate = getFollowUpPresetDate(preset);
    const dateStr = formatDateForInput(nextDate);
    updateField("followUpDate", dateStr);
  };

  const handleMarkFollowedUp = async () => {
    updateField("followUpDate", "");
    try {
      const res = await markFollowedUpAction(application.id, "clear");
      if (res.ok) {
        toast.success("Follow-up marked as completed");
        void queryClient.invalidateQueries({ queryKey: ["applications"] });
        void queryClient.invalidateQueries({
          queryKey: ["application", application.id],
        });
      } else {
        toast.error(res.error || "Failed to mark follow-up");
      }
    } catch {
      toast.error("Failed to mark follow-up");
    }
  };

  return (
    <div className="py-2 space-y-5">
      {/* Top Banner: Autosave Indicator */}
      <div className="flex items-center justify-between pb-1 border-b border-border/60">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Application Details
        </span>

        <div>
          {autosaveStatus === "saving" && (
            <Badge
              variant="outline"
              className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 flex items-center gap-1 font-medium"
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving changes...
            </Badge>
          )}
          {autosaveStatus === "saved" && (
            <Badge
              variant="outline"
              className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 flex items-center gap-1 font-medium"
            >
              <Check className="h-3 w-3" />
              All changes saved
            </Badge>
          )}
          {autosaveStatus === "error" && (
            <Badge
              variant="outline"
              className="text-[10px] text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 flex items-center gap-1 font-medium"
            >
              <AlertCircle className="h-3 w-3" />
              Failed to save
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Company & Role */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Company</Label>
            <div className="relative">
              <Building2 className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={formState.company}
                onChange={(e) => updateField("company", e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Role / Title</Label>
            <div className="relative">
              <Briefcase className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={formState.role}
                onChange={(e) => updateField("role", e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Status & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Status Stage</Label>
            <Select
              value={formState.status}
              onValueChange={(val) => updateField("status", val as ApplicationStatus)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {APPLICATION_STATUS_ORDER.map((st) => (
                  <SelectItem key={st} value={st} className="text-xs">
                    {APPLICATION_STATUS_LABELS[st]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Priority</Label>
            <Select
              value={formState.priority}
              onValueChange={(val) => updateField("priority", val as Priority)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_ORDER.map((pr) => (
                  <SelectItem key={pr} value={pr} className="text-xs">
                    {PRIORITY_LABELS[pr]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Workplace Type & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Workplace Type</Label>
            <Select
              value={formState.locationType}
              onValueChange={(val) =>
                updateField("locationType", val as LocationType)
              }
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Workplace Type" />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_TYPE_ORDER.map((lt) => (
                  <SelectItem key={lt} value={lt} className="text-xs">
                    {LOCATION_TYPE_LABELS[lt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="City, State or Region"
                value={formState.location}
                onChange={(e) => updateField("location", e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Salary Min, Max, Currency */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Min Salary</Label>
            <Input
              type="number"
              min="0"
              placeholder="e.g. 100000"
              value={formState.salaryMin ?? ""}
              onChange={(e) =>
                updateField(
                  "salaryMin",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Max Salary</Label>
            <Input
              type="number"
              min="0"
              placeholder="e.g. 150000"
              value={formState.salaryMax ?? ""}
              onChange={(e) =>
                updateField(
                  "salaryMax",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Currency</Label>
            <Select
              value={formState.currency}
              onValueChange={(val) => updateField("currency", val)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="USD" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD" className="text-xs">
                  USD ($)
                </SelectItem>
                <SelectItem value="EUR" className="text-xs">
                  EUR (€)
                </SelectItem>
                <SelectItem value="GBP" className="text-xs">
                  GBP (£)
                </SelectItem>
                <SelectItem value="CAD" className="text-xs">
                  CAD (CA$)
                </SelectItem>
                <SelectItem value="AUD" className="text-xs">
                  AUD (AU$)
                </SelectItem>
                <SelectItem value="JPY" className="text-xs">
                  JPY (¥)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Source & Job URL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Source</Label>
            <Select
              value={formState.source}
              onValueChange={(val) =>
                updateField("source", val as ApplicationSource)
              }
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                {APPLICATION_SOURCE_ORDER.map((src) => (
                  <SelectItem key={src} value={src} className="text-xs">
                    {APPLICATION_SOURCE_LABELS[src]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>Job Posting URL</span>
              {formState.jobUrl && (
                <a
                  href={formState.jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5 text-[10px]"
                >
                  Visit <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </Label>
            <div className="relative">
              <Globe className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="url"
                placeholder="https://..."
                value={formState.jobUrl}
                onChange={(e) => updateField("jobUrl", e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Dates: Applied Date & Follow-Up Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Applied Date</Label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="date"
                value={formState.appliedDate}
                onChange={(e) => updateField("appliedDate", e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Follow-Up Date</Label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="date"
                value={formState.followUpDate}
                onChange={(e) => updateField("followUpDate", e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => handleFollowUpPreset("in_3_days")}
              >
                In 3 days
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => handleFollowUpPreset("next_week")}
              >
                Next week
              </Button>
              {Boolean(formState.followUpDate) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={handleMarkFollowedUp}
                >
                  Mark followed up
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Resume Version */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Resume Version</Label>
          <Select
            value={formState.resumeVersionId}
            onValueChange={(val) => updateField("resumeVersionId", val)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select resume version" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE" className="text-xs">
                No resume version linked
              </SelectItem>
              {resumeVersions.map((rv) => (
                <SelectItem key={rv.id} value={rv.id} className="text-xs">
                  {rv.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
