"use client";

import * as React from "react";
import { FileText, Plus, Pencil, Trash2, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createResumeVersionAction,
  updateResumeVersionAction,
  deleteResumeVersionAction,
  type ResumeVersionWithCount,
} from "@/server/actions/resume.actions";

export interface ResumeVersionsManagerProps {
  initialResumes: ResumeVersionWithCount[];
}

export function ResumeVersionsManager({
  initialResumes,
}: ResumeVersionsManagerProps) {
  const [resumes, setResumes] =
    React.useState<ResumeVersionWithCount[]>(initialResumes);

  // Sync state if initialResumes changes
  React.useEffect(() => {
    setResumes(initialResumes);
  }, [initialResumes]);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = React.useState<boolean>(false);
  const [editingResume, setEditingResume] =
    React.useState<ResumeVersionWithCount | null>(null);
  const [deletingResumeId, setDeletingResumeId] = React.useState<string | null>(
    null
  );

  // Form states
  const [formData, setFormData] = React.useState<{
    name: string;
    description: string;
    fileName: string;
  }>({
    name: "",
    description: "",
    fileName: "",
  });

  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  const resetForm = () => {
    setFormData({ name: "", description: "", fileName: "" });
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (resume: ResumeVersionWithCount) => {
    setEditingResume(resume);
    setFormData({
      name: resume.name,
      description: resume.description ?? "",
      fileName: resume.fileName ?? "",
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Resume version name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createResumeVersionAction({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        fileName: formData.fileName.trim() || null,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setResumes((prev) => [result.data, ...prev]);
      toast.success("Resume version created successfully");
      setIsCreateOpen(false);
      resetForm();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingResume) return;
    if (!formData.name.trim()) {
      toast.error("Resume version name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updateResumeVersionAction({
        id: editingResume.id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        fileName: formData.fileName.trim() || null,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setResumes((prev) =>
        prev.map((r) => (r.id === result.data.id ? result.data : r))
      );
      toast.success("Resume version updated successfully");
      setEditingResume(null);
      resetForm();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingResumeId) return;

    setIsSubmitting(true);
    try {
      const result = await deleteResumeVersionAction(deletingResumeId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setResumes((prev) => prev.filter((r) => r.id !== deletingResumeId));
      toast.success("Resume version deleted. Linked applications were unassigned.");
      setDeletingResumeId(null);
    } catch {
      toast.error("An unexpected error occurred while deleting");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card className="border-border shadow-xs">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Resume Versions</CardTitle>
              </div>
              <CardDescription className="text-xs mt-1">
                Manage tailored resume iterations to track A/B callback and interview conversion rates.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="gap-1.5 self-start sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Version</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {resumes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
              <h3 className="text-sm font-medium text-foreground">
                No resume versions configured yet
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Create resume variations to compare callback rates, interview conversions, and offer rates.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenCreate}
                className="mt-4 gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add First Resume Version</span>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {resumes.map((resume) => {
                const formattedDate = new Date(resume.createdAt).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric", year: "numeric" }
                );
                const isUrl =
                  resume.fileName &&
                  (resume.fileName.startsWith("http://") ||
                    resume.fileName.startsWith("https://"));

                return (
                  <div
                    key={resume.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 first:pt-0 last:pb-0"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">
                          {resume.name}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[11px] tabular-nums"
                        >
                          {resume.applicationCount}{" "}
                          {resume.applicationCount === 1
                            ? "application"
                            : "applications"}
                        </Badge>
                      </div>

                      {resume.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {resume.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                        <span>Created {formattedDate}</span>
                        {resume.fileName && (
                          <>
                            <span>•</span>
                            {isUrl ? (
                              <a
                                href={resume.fileName}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1 truncate max-w-xs"
                              >
                                <span>{resume.fileName}</span>
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            ) : (
                              <span className="truncate max-w-xs font-mono text-[10px]">
                                {resume.fileName}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenEdit(resume)}
                        aria-label={`Edit ${resume.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletingResumeId(resume.id)}
                        aria-label={`Delete ${resume.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>New Resume Version</DialogTitle>
              <DialogDescription className="text-xs">
                Add a new resume variant to track which version generates the most interviews and offers.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="create-resume-name" className="text-xs font-medium">
                  Resume Version Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="create-resume-name"
                  placeholder="e.g., Full-Stack TypeScript v3"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="create-resume-description"
                  className="text-xs font-medium"
                >
                  Target Role / Notes
                </Label>
                <Textarea
                  id="create-resume-description"
                  placeholder="e.g., Emphasizes React 19, distributed architecture, and GraphQL API design."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="create-resume-filename"
                  className="text-xs font-medium"
                >
                  Reference File Name or Link
                </Label>
                <Input
                  id="create-resume-filename"
                  placeholder="e.g., JaneDoe_FullStack_2026.pdf or Google Drive URL"
                  value={formData.fileName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      fileName: e.target.value,
                    }))
                  }
                  maxLength={255}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Create Version
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={Boolean(editingResume)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingResume(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Resume Version</DialogTitle>
              <DialogDescription className="text-xs">
                Update the version title, target focus, or reference link.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-resume-name" className="text-xs font-medium">
                  Resume Version Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-resume-name"
                  placeholder="e.g., Frontend & Design Systems v2"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-resume-description"
                  className="text-xs font-medium"
                >
                  Target Role / Notes
                </Label>
                <Textarea
                  id="edit-resume-description"
                  placeholder="e.g., Focused on design systems, CSS architecture, and web performance."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-resume-filename"
                  className="text-xs font-medium"
                >
                  Reference File Name or Link
                </Label>
                <Input
                  id="edit-resume-filename"
                  placeholder="e.g., JaneDoe_Frontend_2026.pdf"
                  value={formData.fileName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      fileName: e.target.value,
                    }))
                  }
                  maxLength={255}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingResume(null);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(deletingResumeId)}
        onOpenChange={(open) => {
          if (!open) setDeletingResumeId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume Version?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete this resume version? Any linked applications will simply be set to unassigned. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Delete Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
