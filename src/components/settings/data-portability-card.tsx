"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Upload,
  Database,
  FileSpreadsheet,
  FileCode,
  RotateCcw,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CsvImportWizard } from "@/components/settings/csv-import-wizard";
import {
  exportApplicationsCsvAction,
  exportFullJsonBackupAction,
  restoreFullJsonBackupAction,
} from "@/server/actions/import-export.actions";
import { formatDateTimeInTimezone } from "@/lib/dates/timezone";
import type { AuthenticatedUser } from "@/server/auth/require-user";
import { toast } from "sonner";

interface DataPortabilityCardProps {
  user: AuthenticatedUser;
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function DataPortabilityCard({ user }: DataPortabilityCardProps) {
  const router = useRouter();
  const [csvWizardOpen, setCsvWizardOpen] = React.useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = React.useState(false);
  const [isExportingCsv, setIsExportingCsv] = React.useState(false);
  const [isExportingJson, setIsExportingJson] = React.useState(false);
  const [isRestoring, setIsRestoring] = React.useState(false);
  const [selectedJsonFile, setSelectedJsonFile] = React.useState<File | null>(null);
  const [lastExported, setLastExported] = React.useState<string | null>(
    user.lastExportedAt ? new Date(user.lastExportedAt).toISOString() : null
  );

  const restoreFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleExportCsv = async () => {
    try {
      setIsExportingCsv(true);
      const res = await exportApplicationsCsvAction();
      if (res.ok) {
        triggerDownload(res.data.csv, res.data.filename, "text/csv;charset=utf-8;");
        setLastExported(res.data.lastExportedAt);
        toast.success(`Exported ${res.data.count} applications to CSV!`);
      } else {
        toast.error(res.error || "Failed to export CSV");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error exporting applications CSV"
      );
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportJson = async () => {
    try {
      setIsExportingJson(true);
      const res = await exportFullJsonBackupAction();
      if (res.ok) {
        triggerDownload(
          res.data.json,
          res.data.filename,
          "application/json;charset=utf-8;"
        );
        setLastExported(res.data.lastExportedAt);
        toast.success("Full JSON backup exported successfully!");
      } else {
        toast.error(res.error || "Failed to export JSON backup");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error exporting JSON backup"
      );
    } finally {
      setIsExportingJson(false);
    }
  };

  const handleRestoreSubmit = async () => {
    if (!selectedJsonFile) {
      toast.error("Please select a JSON backup file to restore");
      return;
    }

    try {
      setIsRestoring(true);
      const text = await selectedJsonFile.text();
      const res = await restoreFullJsonBackupAction(text);

      if (res.ok) {
        toast.success(
          `Restored ${res.data.restoredApplications} applications and ${res.data.restoredResumes} resumes!`
        );
        setRestoreModalOpen(false);
        setSelectedJsonFile(null);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to restore backup");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error reading or restoring JSON backup"
      );
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <>
      <CsvImportWizard
        open={csvWizardOpen}
        onOpenChange={setCsvWizardOpen}
        onImportComplete={() => router.refresh()}
      />

      {/* Restore JSON Backup Dialog */}
      <Dialog open={restoreModalOpen} onOpenChange={setRestoreModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary" />
              Restore Full JSON Backup
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload a previously exported JobTrack JSON backup file to restore applications, resumes, interviews, and notes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <p>
                <strong>Pre-condition requirement:</strong> Your account must have 0 active applications before restoring a full backup. This ensures data integrity and prevents duplicate keys.
              </p>
            </div>

            <div
              onClick={() => restoreFileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-lg p-6 text-center cursor-pointer bg-muted/20"
            >
              <FileCode className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              {selectedJsonFile ? (
                <div>
                  <p className="text-xs font-medium text-foreground">{selectedJsonFile.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {(selectedJsonFile.size / 1024).toFixed(1)} KB • Click to choose different file
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-foreground">Click to select backup .json file</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Accepts full JobTrack v1 backup files</p>
                </div>
              )}
              <input
                ref={restoreFileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setSelectedJsonFile(file);
                }}
                className="hidden"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRestoreModalOpen(false)}
              disabled={isRestoring}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRestoreSubmit}
              disabled={isRestoring || !selectedJsonFile}
              className="gap-1.5 text-xs"
            >
              {isRestoring ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Restore Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Data Portability Card */}
      <Card className="border-border shadow-xs">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Data Portability &amp; Backups</CardTitle>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Last exported:</span>
              <span className="tabular-nums font-mono font-medium text-foreground">
                {lastExported
                  ? formatDateTimeInTimezone(lastExported, user.timezone)
                  : "Never"}
              </span>
            </div>
          </div>
          <CardDescription className="text-xs">
            Export your job applications to spreadsheet format, download complete encrypted JSON archives, or import data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* CSV Portability */}
            <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-3">
              <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Spreadsheet (CSV)</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Export applications to a flat CSV file compatible with Excel and Google Sheets, or import applications using the multi-step mapping wizard.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCsv}
                  disabled={isExportingCsv}
                  className="gap-1.5 text-xs h-8"
                >
                  {isExportingCsv ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Export CSV
                </Button>
                <Button
                  size="sm"
                  onClick={() => setCsvWizardOpen(true)}
                  className="gap-1.5 text-xs h-8"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Import CSV (Wizard)
                </Button>
              </div>
            </div>

            {/* JSON Portability */}
            <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-3">
              <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                <FileCode className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Complete Backup (JSON)</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Full relational archive containing all applications, custom resume versions, interview rounds, prep notes, recruiter contacts, and status timeline records.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportJson}
                  disabled={isExportingJson}
                  className="gap-1.5 text-xs h-8"
                >
                  {isExportingJson ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Export Full JSON Backup
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRestoreModalOpen(true)}
                  className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore JSON Backup
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
