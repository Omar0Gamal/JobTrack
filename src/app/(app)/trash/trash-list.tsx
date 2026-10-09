"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  restoreApplicationAction,
  permanentDeleteApplicationAction,
} from "@/server/actions/application.actions";

export interface TrashedApplication {
  id: string;
  company: string;
  role: string;
  deletedAt: Date | string | null;
}

interface TrashListProps {
  initialItems: TrashedApplication[];
}

export function TrashList({ initialItems }: TrashListProps) {
  const router = useRouter();
  const [items, setItems] = React.useState<TrashedApplication[]>(initialItems);
  const [restoringId, setRestoringId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    try {
      const res = await restoreApplicationAction(id);
      if (res.ok) {
        toast.success("Application restored successfully");
        setItems((prev) => prev.filter((item) => item.id !== id));
        router.refresh();
      } else {
        toast.error(res.error || "Failed to restore application");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to restore application");
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await permanentDeleteApplicationAction(id);
      if (res.ok) {
        toast.success("Application permanently deleted");
        setItems((prev) => prev.filter((item) => item.id !== id));
        router.refresh();
      } else {
        toast.error(res.error || "Failed to delete application");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete application");
    } finally {
      setDeletingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <Card className="border-dashed border-2 text-center p-8">
        <CardContent className="space-y-2">
          <Trash2 className="h-8 w-8 text-muted-foreground mx-auto" />
          <h3 className="font-semibold text-sm">Trash is empty</h3>
          <p className="text-xs text-muted-foreground">
            No soft-deleted applications currently in your account.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((app) => {
        const isRestoring = restoringId === app.id;
        const isDeleting = deletingId === app.id;

        return (
          <Card key={app.id} className="border-border shadow-2xs flex flex-col justify-between">
            <div>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold">{app.company}</CardTitle>
                <CardDescription className="text-xs">{app.role}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
                <p>
                  Deleted on:{" "}
                  {app.deletedAt
                    ? new Date(app.deletedAt).toLocaleDateString("en-US", {
                        dateStyle: "medium",
                      })
                    : "Recently"}
                </p>
              </CardContent>
            </div>

            <div className="p-4 pt-2 border-t border-border flex items-center justify-end gap-2 bg-muted/10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRestore(app.id)}
                disabled={isRestoring || isDeleting}
                className="h-8 text-xs gap-1.5"
              >
                {isRestoring ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                <span>Restore</span>
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isRestoring || isDeleting}
                    className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1.5"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    <span>Delete Forever</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-base font-bold">
                      Permanently delete this application?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-xs">
                      This will permanently remove the application for{" "}
                      <span className="font-semibold text-foreground">
                        {app.company} ({app.role})
                      </span>{" "}
                      along with all associated notes, contacts, and interview history.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handlePermanentDelete(app.id)}
                      className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
                    >
                      Delete Permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
