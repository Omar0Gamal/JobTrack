"use client";

import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
} from "@/schemas/enums";
import { KanbanCard, type KanbanCardData } from "./kanban-card";

export interface KanbanColumnProps {
  status: ApplicationStatus;
  items: KanbanCardData[];
  onSelectCard: (id: string) => void;
  onQuickAdd: (status: ApplicationStatus) => void;
}

const STATUS_DOT_COLORS: Record<ApplicationStatus, string> = {
  WISHLIST: "bg-slate-400 dark:bg-slate-500",
  APPLIED: "bg-blue-500",
  PHONE_SCREEN: "bg-purple-500",
  INTERVIEW: "bg-amber-500",
  OFFER: "bg-emerald-500",
  REJECTED: "bg-rose-500",
};

export function KanbanColumn({
  status,
  items,
  onSelectCard,
  onQuickAdd,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
      type: "column",
      status,
    },
  });

  const itemIds = React.useMemo(() => items.map((item) => item.id), [items]);
  const statusLabel = APPLICATION_STATUS_LABELS[status];
  const dotColor = STATUS_DOT_COLORS[status];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "snap-center shrink-0 w-[85vw] sm:w-[310px] flex flex-col rounded-xl border border-border bg-card/60 p-3 shadow-2xs min-h-[540px] transition-colors",
        isOver && "ring-2 ring-primary/40 bg-muted/40"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", dotColor)} />
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            {statusLabel}
          </h2>
          <Badge
            variant="secondary"
            className="h-5 min-w-5 px-1.5 justify-center text-[10px] font-bold"
          >
            {items.length}
          </Badge>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onQuickAdd(status)}
          className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
          title={`Add application to ${statusLabel}`}
          aria-label={`Add application to ${statusLabel}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Cards Sortable Container */}
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2.5 flex-1 pb-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-border/80 rounded-lg p-3 my-auto">
              <p className="text-xs text-muted-foreground">No applications</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onQuickAdd(status)}
                className="mt-2 text-xs text-primary h-7 gap-1"
              >
                <Plus className="h-3 w-3" />
                Add card
              </Button>
            </div>
          ) : (
            items.map((app) => (
              <KanbanCard
                key={app.id}
                app={app}
                onSelect={onSelectCard}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
