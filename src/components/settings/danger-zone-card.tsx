"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  RotateCcw,
  Trash2,
  Loader2,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { resetDemoDataAction } from "@/server/actions/demo.actions";
import { deleteMyAccountAction } from "@/server/actions/settings.actions";
import { toast } from "sonner";

interface DangerZoneCardProps {
  isDemo?: boolean;
}

export function DangerZoneCard({ isDemo = false }: DangerZoneCardProps) {
  const router = useRouter();
  const [isResetting, setIsResetting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const handleResetDemo = async () => {
    try {
      setIsResetting(true);
      await resetDemoDataAction();
      toast.success("Demo sandbox reset to initial 30 applications and 3 resumes!");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reset demo data"
      );
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") {
      toast.error('You must type "DELETE" to confirm account deletion');
      return;
    }

    try {
      setIsDeleting(true);
      const res = await deleteMyAccountAction({ confirmation: "DELETE" });

      if (res.ok) {
        toast.success("Your account and all associated data have been deleted.");
        setDeleteDialogOpen(false);
        router.push(isDemo ? "/" : "/signin");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to delete account");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-rose-500/30 bg-rose-500/5 shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
          <ShieldAlert className="h-4 w-4" />
          <CardTitle className="text-base">Danger Zone</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Irreversible and destructive actions. Proceed with caution.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reset Demo Data (Visible only in demo mode) */}
        {isDemo && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Reset Demo Sandbox</span>
              </div>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                Wipes all modified applications, notes, and interviews and restores the initial 30 realistic seeded applications.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDemo}
              disabled={isResetting}
              className="gap-1.5 text-xs border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 shrink-0 self-start sm:self-auto"
            >
              {isResetting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              )}
              Reset Demo Data
            </Button>
          </div>
        )}

        {/* Delete Account */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-rose-500/20 bg-rose-500/5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-800 dark:text-rose-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Delete Account Permanently</span>
            </div>
            <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80">
              Permanently purges your account, all job applications, uploaded resumes, timeline logs, and notes. This action cannot be undone.
            </p>
          </div>

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5 text-xs shrink-0 self-start sm:self-auto"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Are you absolutely sure?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs space-y-2">
                  <span>
                    This action is permanent and cannot be reversed. All your job applications,
                    interview records, notes, contacts, and resume configurations will be deleted immediately.
                  </span>
                  <span className="block font-medium text-foreground pt-1">
                    Please type <strong className="text-destructive font-mono font-bold">DELETE</strong> to confirm:
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="py-2">
                <Input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder='Type "DELETE" to confirm'
                  className="font-mono text-xs uppercase"
                  autoFocus
                />
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => setDeleteConfirmation("")}
                  className="text-xs"
                >
                  Cancel
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmation !== "DELETE" || isDeleting}
                  className="gap-1.5 text-xs"
                >
                  {isDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Delete My Account
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
