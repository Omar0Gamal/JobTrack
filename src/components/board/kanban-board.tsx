"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import {
  APPLICATION_STATUS_ORDER,
  type ApplicationStatus,
} from "@/schemas/enums";
import { calculateMovePosition } from "@/lib/kanban/positioning";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard, type KanbanCardData } from "./kanban-card";

export interface KanbanBoardProps {
  applications: KanbanCardData[];
  onMoveCard: (input: {
    applicationId: string;
    toStatus: ApplicationStatus;
    newPosition: number;
    rebalanceColumn?: boolean;
  }) => void;
  onSelectCard: (id: string) => void;
  onQuickAdd: (status: ApplicationStatus) => void;
}

export function KanbanBoard({
  applications,
  onMoveCard,
  onSelectCard,
  onQuickAdd,
}: KanbanBoardProps) {
  // Local state for smooth drag animations between columns
  const [items, setItems] = React.useState<KanbanCardData[]>(applications);
  const [activeCard, setActiveCard] = React.useState<KanbanCardData | null>(null);

  // Sync local items whenever external applications prop changes
  React.useEffect(() => {
    setItems(applications);
  }, [applications]);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5,
    },
  });

  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  const sensors = useSensors(pointerSensor, keyboardSensor);

  // Group items by status
  const columns = React.useMemo(() => {
    const map: Record<ApplicationStatus, KanbanCardData[]> = {
      WISHLIST: [],
      APPLIED: [],
      PHONE_SCREEN: [],
      INTERVIEW: [],
      OFFER: [],
      REJECTED: [],
    };

    for (const app of items) {
      if (map[app.status]) {
        map[app.status].push(app);
      }
    }

    for (const status of APPLICATION_STATUS_ORDER) {
      map[status].sort((a, b) => a.position - b.position);
    }

    return map;
  }, [items]);

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);
    const found = items.find((i) => i.id === activeId) || null;
    setActiveCard(found);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    const activeItem = items.find((i) => i.id === activeId);
    if (!activeItem) return;

    // Check if dragging over a column container directly
    const isOverColumn = APPLICATION_STATUS_ORDER.includes(overId as ApplicationStatus);
    if (isOverColumn) {
      const targetStatus = overId as ApplicationStatus;
      if (activeItem.status !== targetStatus) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === activeId ? { ...item, status: targetStatus } : item
          )
        );
      }
      return;
    }

    // Dragging over another card
    const overItem = items.find((i) => i.id === overId);
    if (!overItem) return;

    if (activeItem.status !== overItem.status) {
      setItems((prev) => {
        const activeIndex = prev.findIndex((i) => i.id === activeId);
        const overIndex = prev.findIndex((i) => i.id === overId);
        const updated = [...prev];
        const currentActive = updated[activeIndex];
        if (currentActive) {
          updated[activeIndex] = { ...currentActive, status: overItem.status };
          return arrayMove(updated, activeIndex, overIndex);
        }
        return prev;
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) {
      // Rollback to source applications state
      setItems(applications);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    // Identify target status
    let targetStatus: ApplicationStatus | null = null;
    if (APPLICATION_STATUS_ORDER.includes(overId as ApplicationStatus)) {
      targetStatus = overId as ApplicationStatus;
    } else {
      const overCard = items.find((i) => i.id === overId);
      if (overCard) {
        targetStatus = overCard.status;
      }
    }

    if (!targetStatus) {
      setItems(applications);
      return;
    }

    // Get current cards in target column in visual order
    let targetCards = items.filter((i) => i.status === targetStatus);

    // If dragged over another card in the same column, reorder first
    if (!APPLICATION_STATUS_ORDER.includes(overId as ApplicationStatus)) {
      const activeIdx = targetCards.findIndex((i) => i.id === activeId);
      const overIdx = targetCards.findIndex((i) => i.id === overId);
      if (activeIdx !== -1 && overIdx !== -1 && activeIdx !== overIdx) {
        targetCards = arrayMove(targetCards, activeIdx, overIdx);
      }
    }

    const newIndex = targetCards.findIndex((i) => i.id === activeId);
    if (newIndex === -1) {
      setItems(applications);
      return;
    }

    const prevCard = targetCards[newIndex - 1];
    const nextCard = targetCards[newIndex + 1];
    const prevPos = prevCard ? prevCard.position : null;
    const nextPos = nextCard ? nextCard.position : null;

    const { position, needsRebalance } = calculateMovePosition(prevPos, nextPos);

    onMoveCard({
      applicationId: activeId,
      toStatus: targetStatus,
      newPosition: position,
      rebalanceColumn: needsRebalance,
    });
  };

  const handleDragCancel = () => {
    setActiveCard(null);
    setItems(applications);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 min-h-[600px] items-start scrollbar-thin">
        {APPLICATION_STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            items={columns[status]}
            onSelectCard={onSelectCard}
            onQuickAdd={onQuickAdd}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard ? <KanbanCard app={activeCard} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
