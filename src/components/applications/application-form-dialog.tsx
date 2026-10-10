"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  Building2,
  Briefcase,
  MapPin,
  Calendar,
  Globe,
} from "lucide-react";
import { getFollowUpPresetDate } from "@/lib/dates/timezone";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FullApplicationSchema,
  type FullApplicationInput,
} from "@/schemas/application.schema";
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
import { getResumeVersionsForSelectAction } from "@/server/actions/application.actions";
import { useCreateApplicationMutation } from "@/hooks/use-applications";

export interface ApplicationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatus?: ApplicationStatus;
}

export function ApplicationFormDialog({
  open,
  onOpenChange,
  defaultStatus = "APPLIED",
}: ApplicationFormDialogProps) {
  const [mode, setMode] = React.useState<"quick" | "full">("quick");
  const [autofillUrl, setAutofillUrl] = React.useState<string>("");
  const [isAutofilling, setIsAutofilling] = React.useState<boolean>(false);
  const [resumeVersions, setResumeVersions] = React.useState<
    Array<{ id: string; name: string }>
  >([]);

  const createMutation = useCreateApplicationMutation();

  const form = useForm<FullApplicationInput>({
    resolver: zodResolver(FullApplicationSchema),
    defaultValues: {
      company: "",
      role: "",
      status: defaultStatus,
      priority: "MEDIUM",
      locationType: "REMOTE",
      location: "",
      salaryMin: null,
      salaryMax: null,
      currency: "USD",
      source: "LINKEDIN",
      jobUrl: "",
      appliedDate: new Date(),
      followUpDate: null,
      resumeVersionId: null,
    },
  });

  // Keep default status up to date when opened
  React.useEffect(() => {
    if (open) {
      form.setValue("status", defaultStatus);
      void getResumeVersionsForSelectAction().then((versions) => {
        setResumeVersions(versions);
      });
    }
  }, [open, defaultStatus, form]);

  const handleAutofill = async () => {
    const trimmed = autofillUrl.trim();
    if (!trimmed) {
      toast.error("Please enter a job URL first");
      return;
    }

    setIsAutofilling(true);
    try {
      const response = await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      const resData = (await response.json()) as {
        ok: boolean;
        data?: {
          company?: string;
          role?: string;
          location?: string;
          description?: string;
        };
        error?: string;
      };

      if (resData.ok && resData.data) {
        if (resData.data.company && !form.getValues("company")) {
          form.setValue("company", resData.data.company, { shouldValidate: true });
        }
        if (resData.data.role && !form.getValues("role")) {
          form.setValue("role", resData.data.role, { shouldValidate: true });
        }
        if (resData.data.location && !form.getValues("location")) {
          form.setValue("location", resData.data.location);
        }
        form.setValue("jobUrl", trimmed);
        toast.success("Job details autofilled from URL");
      } else {
        form.setValue("jobUrl", trimmed);
        toast.info(
          resData.error ||
            "Could not automatically extract job details. You can enter them manually."
        );
      }
    } catch {
      form.setValue("jobUrl", trimmed);
      toast.info(
        "Could not automatically extract job details. You can enter them manually."
      );
    } finally {
      setIsAutofilling(false);
    }
  };

  const onSubmit = async (values: FullApplicationInput) => {
    try {
      await createMutation.mutateAsync(values);
      form.reset();
      setAutofillUrl("");
      onOpenChange(false);
    } catch {
      // Error handled by mutation toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="text-lg font-bold">New Application</DialogTitle>
            <Tabs
              value={mode}
              onValueChange={(val) => setMode(val as "quick" | "full")}
              className="w-auto"
            >
              <TabsList className="h-8">
                <TabsTrigger value="quick" className="text-xs px-3">
                  Quick Add
                </TabsTrigger>
                <TabsTrigger value="full" className="text-xs px-3">
                  Full Details
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <DialogDescription className="text-xs">
            {mode === "quick"
              ? "Quickly log an application with company, role, and status."
              : "Track comprehensive application metadata including compensation, dates, and resume version."}
          </DialogDescription>
        </DialogHeader>

        {/* Paste Job URL to Autofill Bar */}
        <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
          <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Paste Job URL to Autofill
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="url"
              placeholder="https://jobs.example.com/posting/123"
              value={autofillUrl}
              onChange={(e) => setAutofillUrl(e.target.value)}
              className="h-8 text-xs flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAutofill}
              disabled={isAutofilling || !autofillUrl.trim()}
              className="h-8 px-3 text-xs gap-1.5 shrink-0"
            >
              {isAutofilling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>Autofill</span>
            </Button>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Core Fields: Company & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="company" className="text-xs font-semibold">
                Company <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="company"
                  placeholder="e.g. Acme Corp"
                  {...form.register("company")}
                  className="pl-8 h-9 text-xs"
                />
              </div>
              {form.formState.errors.company && (
                <p className="text-[11px] text-rose-500">
                  {form.formState.errors.company.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-xs font-semibold">
                Role / Title <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Briefcase className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="role"
                  placeholder="e.g. Senior Software Engineer"
                  {...form.register("role")}
                  className="pl-8 h-9 text-xs"
                />
              </div>
              {form.formState.errors.role && (
                <p className="text-[11px] text-rose-500">
                  {form.formState.errors.role.message}
                </p>
              )}
            </div>
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(val) =>
                  form.setValue("status", val as ApplicationStatus)
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select status" />
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

            {mode === "full" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Priority</Label>
                <Select
                  value={form.watch("priority")}
                  onValueChange={(val) => form.setValue("priority", val as Priority)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select priority" />
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
            )}
          </div>

          {/* Full Form Fields */}
          {mode === "full" && (
            <>
              {/* Location Type & Location Text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Workplace Type</Label>
                  <Select
                    value={form.watch("locationType")}
                    onValueChange={(val) =>
                      form.setValue("locationType", val as LocationType)
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select workplace type" />
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
                  <Label htmlFor="location" className="text-xs font-semibold">
                    Location
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="location"
                      placeholder="e.g. San Francisco, CA or Remote (US)"
                      value={form.watch("location") ?? ""}
                      onChange={(e) => form.setValue("location", e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Salary Min, Max, Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="salaryMin" className="text-xs font-semibold">
                    Min Salary
                  </Label>
                  <Input
                    id="salaryMin"
                    type="number"
                    min="0"
                    placeholder="e.g. 120000"
                    value={form.watch("salaryMin") ?? ""}
                    onChange={(e) =>
                      form.setValue(
                        "salaryMin",
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="salaryMax" className="text-xs font-semibold">
                    Max Salary
                  </Label>
                  <Input
                    id="salaryMax"
                    type="number"
                    min="0"
                    placeholder="e.g. 160000"
                    value={form.watch("salaryMax") ?? ""}
                    onChange={(e) =>
                      form.setValue(
                        "salaryMax",
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                    className="h-9 text-xs"
                  />
                  {form.formState.errors.salaryMax && (
                    <p className="text-[10px] text-rose-500">
                      {form.formState.errors.salaryMax.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Currency</Label>
                  <Select
                    value={form.watch("currency") ?? "USD"}
                    onValueChange={(val) => form.setValue("currency", val)}
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
                    value={form.watch("source")}
                    onValueChange={(val) =>
                      form.setValue("source", val as ApplicationSource)
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select source" />
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
                  <Label htmlFor="jobUrl" className="text-xs font-semibold">
                    Job Posting URL
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="jobUrl"
                      type="url"
                      placeholder="https://..."
                      value={form.watch("jobUrl") ?? ""}
                      onChange={(e) => form.setValue("jobUrl", e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Applied Date & Follow-Up Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="appliedDate" className="text-xs font-semibold">
                    Applied Date
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="appliedDate"
                      type="date"
                      value={
                        form.watch("appliedDate")
                          ? format(new Date(form.watch("appliedDate")), "yyyy-MM-dd")
                          : ""
                      }
                      onChange={(e) =>
                        form.setValue(
                          "appliedDate",
                          e.target.value ? new Date(e.target.value) : new Date()
                        )
                      }
                      className="pl-8 h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="followUpDate" className="text-xs font-semibold">
                    Follow-Up Date
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="followUpDate"
                      type="date"
                      value={
                        form.watch("followUpDate")
                          ? format(new Date(form.watch("followUpDate")!), "yyyy-MM-dd")
                          : ""
                      }
                      onChange={(e) =>
                        form.setValue(
                          "followUpDate",
                          e.target.value ? new Date(e.target.value) : null
                        )
                      }
                      className="pl-8 h-9 text-xs"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() =>
                        form.setValue(
                          "followUpDate",
                          getFollowUpPresetDate("in_3_days")
                        )
                      }
                    >
                      In 3 days
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() =>
                        form.setValue(
                          "followUpDate",
                          getFollowUpPresetDate("next_week")
                        )
                      }
                    >
                      Next week
                    </Button>
                    {form.watch("followUpDate") && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                        onClick={() => form.setValue("followUpDate", null)}
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
                  value={form.watch("resumeVersionId") || "NONE"}
                  onValueChange={(val) =>
                    form.setValue(
                      "resumeVersionId",
                      val === "NONE" ? null : val
                    )
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select resume version" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE" className="text-xs">
                      No resume linked
                    </SelectItem>
                    {resumeVersions.map((rv) => (
                      <SelectItem key={rv.id} value={rv.id} className="text-xs">
                        {rv.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

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
              disabled={createMutation.isPending}
              className="text-xs font-semibold gap-1.5"
            >
              {createMutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              <span>Create Application</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
