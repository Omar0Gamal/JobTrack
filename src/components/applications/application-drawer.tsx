"use client";

import * as React from "react";
import {
  Archive,
  ArchiveRestore,
  Trash2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
  type ApplicationStatus,
} from "@/schemas/enums";
import {
  getCompanyAvatarColor,
  getCompanyInitials,
  cn,
} from "@/lib/utils";
import { useDrawerUrl } from "@/hooks/use-drawer-url";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  useApplicationDetailQuery,
  useUpdateApplicationMutation,
  useArchiveMutation,
  useSoftDeleteMutation,
} from "@/hooks/use-applications";
import { DrawerOverviewTab } from "./drawer-overview-tab";
import { DrawerInterviewsTab } from "./drawer-interviews-tab";
import { DrawerNotesTab } from "./drawer-notes-tab";
import { DrawerContactsTab } from "./drawer-contacts-tab";
import { DrawerTimelineTab } from "./drawer-timeline-tab";

function ApplicationDrawerContent() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { selectedAppId, closeDrawer } = useDrawerUrl();

  const { data: application, isLoading } = useApplicationDetailQuery(selectedAppId);
  const updateMutation = useUpdateApplicationMutation();
  const archiveMutation = useArchiveMutation();
  const softDeleteMutation = useSoftDeleteMutation();

  const isOpen = Boolean(selectedAppId);

  const handleStatusChange = (newStatus: ApplicationStatus) => {
    if (!application || application.status === newStatus) return;
    updateMutation.mutate({
      id: application.id,
      status: newStatus,
    });
  };

  const handleToggleArchive = () => {
    if (!application) return;
    const isArchived = Boolean(application.archivedAt);
    archiveMutation.mutate({
      applicationId: application.id,
      archive: !isArchived,
    });
  };

  const handleDelete = async () => {
    if (!application) return;
    try {
      await softDeleteMutation.mutateAsync(application.id);
      closeDrawer();
    } catch {
      // Handled by mutation toast
    }
  };

  const isArchived = Boolean(application?.archivedAt);

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeDrawer();
        }
      }}
    >
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "p-0 flex flex-col gap-0",
          isDesktop
            ? "w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl overflow-y-auto"
            : "max-h-[90vh] rounded-t-2xl overflow-y-auto"
        )}
      >
        {isLoading ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !application ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <h3 className="font-semibold text-sm">Application Not Found</h3>
            <p className="text-xs text-muted-foreground">
              This application may have been deleted or is inaccessible.
            </p>
            <Button size="sm" variant="outline" onClick={closeDrawer} className="text-xs">
              Close Drawer
            </Button>
          </div>
        ) : (
          <div className="flex flex-col flex-1">
            {/* Drawer Header */}
            <div className="p-5 border-b border-border bg-card/50 space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                {/* Avatar & Title */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-sm shadow-2xs",
                      getCompanyAvatarColor(application.company)
                    )}
                  >
                    {getCompanyInitials(application.company)}
                  </div>
                  <div className="min-w-0">
                    <SheetTitle className="text-base font-bold text-foreground truncate">
                      {application.role}
                    </SheetTitle>
                    <SheetDescription className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                      <span className="font-medium text-foreground">
                        {application.company}
                      </span>
                      {application.jobUrl && (
                        <a
                          href={application.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-0.5 text-[11px]"
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </SheetDescription>
                  </div>
                </div>

                {/* Actions: Archive & Delete */}
                <div className="flex items-center gap-1.5 shrink-0 pr-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleArchive}
                    disabled={archiveMutation.isPending}
                    title={isArchived ? "Unarchive application" : "Archive application"}
                    aria-label={isArchived ? "Unarchive application" : "Archive application"}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    {isArchived ? (
                      <ArchiveRestore className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDelete}
                    disabled={softDeleteMutation.isPending}
                    title="Move to trash"
                    aria-label="Move application to trash"
                    className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Status bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Stage:
                  </span>
                  <Select
                    value={application.status}
                    onValueChange={(val) => handleStatusChange(val as ApplicationStatus)}
                  >
                    <SelectTrigger className="h-8 w-36 text-xs font-semibold">
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

                {isArchived && (
                  <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40">
                    Archived
                  </Badge>
                )}
              </div>
            </div>

            {/* Drawer Tabs Body */}
            <div className="flex-1 p-5">
              <Tabs defaultValue="overview" className="flex flex-col h-full">
                <TabsList className="grid grid-cols-5 h-9 mb-4">
                  <TabsTrigger value="overview" className="text-xs">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="interviews" className="text-xs">
                    Interviews
                    {application.interviews.length > 0 && (
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        ({application.interviews.length})
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs">
                    Notes
                    {application.notes.length > 0 && (
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        ({application.notes.length})
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="contacts" className="text-xs">
                    Contacts
                    {application.contacts.length > 0 && (
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        ({application.contacts.length})
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs">
                    Timeline
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-0 focus-visible:outline-hidden">
                  <DrawerOverviewTab application={application} />
                </TabsContent>

                <TabsContent value="interviews" className="mt-0 focus-visible:outline-hidden">
                  <DrawerInterviewsTab application={application} interviews={application.interviews} />
                </TabsContent>

                <TabsContent value="notes" className="mt-0 focus-visible:outline-hidden">
                  <DrawerNotesTab
                    applicationId={application.id}
                    notes={application.notes}
                  />
                </TabsContent>

                <TabsContent value="contacts" className="mt-0 focus-visible:outline-hidden">
                  <DrawerContactsTab
                    applicationId={application.id}
                    contacts={application.contacts}
                  />
                </TabsContent>

                <TabsContent value="timeline" className="mt-0 focus-visible:outline-hidden">
                  <DrawerTimelineTab statusHistory={application.statusHistory} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function ApplicationDrawer() {
  return (
    <React.Suspense fallback={null}>
      <ApplicationDrawerContent />
    </React.Suspense>
  );
}

