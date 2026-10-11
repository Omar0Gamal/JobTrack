"use client";

import * as React from "react";
import { format } from "date-fns";
import { ArrowRight, History, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
  type ApplicationStatus,
} from "@/schemas/enums";
import { cn } from "@/lib/utils";

export interface StatusHistoryItem {
  id: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedAt: Date | string;
}

interface DrawerTimelineTabProps {
  statusHistory: StatusHistoryItem[];
}

export function DrawerTimelineTab({ statusHistory }: DrawerTimelineTabProps) {
  const sorted = React.useMemo(() => {
    return [...statusHistory].sort(
      (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    );
  }, [statusHistory]);

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-lg p-6">
        <History className="h-8 w-8 text-muted-foreground/60 mb-2" />
        <h4 className="font-semibold text-xs text-foreground">No status transitions yet</h4>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Changes in application status will appear here as a chronological timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="py-2 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" />
          Status History & Transitions
        </h3>
        <Badge variant="secondary" className="text-[10px]">
          {sorted.length} events
        </Badge>
      </div>

      <div className="relative pl-6 border-l-2 border-border/80 space-y-6 my-2">
        {sorted.map((item, index) => {
          const dateStr = format(new Date(item.changedAt), "MMM d, yyyy · h:mm a");
          const isLatest = index === 0;

          return (
            <div key={item.id} className="relative group">
              {/* Timeline marker */}
              <div
                className={cn(
                  "absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background",
                  isLatest
                    ? "bg-primary ring-4 ring-primary/20"
                    : "bg-muted-foreground/50"
                )}
              />

              <div className="bg-card border border-border rounded-lg p-3 shadow-2xs space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {item.fromStatus ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-2 py-0 border",
                          APPLICATION_STATUS_COLORS[item.fromStatus]
                        )}
                      >
                        {APPLICATION_STATUS_LABELS[item.fromStatus]}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-2 py-0 border font-semibold",
                          APPLICATION_STATUS_COLORS[item.toStatus]
                        )}
                      >
                        {APPLICATION_STATUS_LABELS[item.toStatus]}
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground">
                        Created as
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-2 py-0 border font-semibold",
                          APPLICATION_STATUS_COLORS[item.toStatus]
                        )}
                      >
                        {APPLICATION_STATUS_LABELS[item.toStatus]}
                      </Badge>
                    </div>
                  )}

                  {isLatest && (
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary font-medium"
                    >
                      Current
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{dateStr}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
