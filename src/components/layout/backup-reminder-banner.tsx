"use client";

import * as React from "react";
import { Download, AlertCircle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportFullJsonBackupAction } from "@/server/actions/import-export.actions";
import type { AuthenticatedUser } from "@/server/auth/require-user";
import { toast } from "sonner";

interface BackupReminderBannerProps {
  user?: AuthenticatedUser | null;
}

const STORAGE_KEY = "jobtrack:dismiss-backup-reminder";

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

export function BackupReminderBanner({ user }: BackupReminderBannerProps) {
  const [dismissed, setDismissed] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);

  React.useEffect(() => {
    if (!user) {
      setDismissed(true);
      return;
    }

    // Check if dismissed in current browser session
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "true") {
        setDismissed(true);
        return;
      }
    } catch {
      // Safe fallback if sessionStorage is inaccessible
    }

    if (!user.lastExportedAt) {
      setDismissed(false);
      return;
    }

    const exportedTime = new Date(user.lastExportedAt).getTime();
    const daysSince = (Date.now() - exportedTime) / (1000 * 60 * 60 * 24);

    if (daysSince > 30) {
      setDismissed(false);
    } else {
      setDismissed(true);
    }
  }, [user]);

  if (dismissed || !user) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Safe fallback
    }
  };

  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      const res = await exportFullJsonBackupAction();
      if (res.ok) {
        triggerDownload(
          res.data.json,
          res.data.filename,
          "application/json;charset=utf-8;"
        );
        toast.success("Full JSON backup downloaded successfully!");
        handleDismiss();
      } else {
        toast.error(res.error || "Failed to export backup");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error exporting backup"
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <aside
      aria-label="Backup Reminder"
      className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-900 dark:text-amber-200 shadow-xs"
    >
      <div className="flex items-center gap-2.5">
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>
          <strong>Data safety reminder:</strong> You have not exported a backup recently.
          Protect your job applications by saving a complete offline backup.
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportBackup}
          disabled={isExporting}
          className="h-7 gap-1.5 border-amber-500/40 text-xs font-medium text-amber-900 dark:text-amber-200 hover:bg-amber-500/20"
        >
          {isExporting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Download className="h-3 w-3" />
          )}
          Export Backup
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={handleDismiss}
          className="h-7 w-7 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
          aria-label="Dismiss backup reminder"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </aside>
  );
}
