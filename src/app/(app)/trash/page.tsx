import { requireUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db/prisma";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TrashList } from "./trash-list";

export default async function TrashPage() {
  const user = await requireUser();

  const trashedApplications = await prisma.application.findMany({
    where: {
      userId: user.id,
      deletedAt: {
        not: null,
      },
    },
    orderBy: {
      deletedAt: "desc",
    },
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Recently Deleted
            </h1>
            <Badge variant="secondary" className="font-semibold text-xs">
              {trashedApplications.length} Items
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Data Safety: Soft-deleted applications are kept for 30 days before permanent cleanup.
          </p>
        </div>
      </div>

      {/* Information Banner */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">
            30-Day Auto-Purge Policy
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Deleted applications, along with their associated interview notes, contacts, and status
            history records, remain in the trash for 30 days. You can restore them or trigger permanent
            deletion anytime.
          </p>
        </div>
      </div>

      <TrashList initialItems={trashedApplications} />
    </div>
  );
}
