export const POSITION_STEP = 1000;
export const MIN_POSITION_GAP = 0.001;

export interface MovePositionResult {
  position: number;
  needsRebalance: boolean;
}

export interface RebalancedPosition {
  id: string;
  position: number;
}

/**
 * Calculates a new card's position at the bottom of a column.
 * Returns (max || 0) + 1000.
 */
export function calculateNewCardPosition(existingPositions: number[]): number {
  if (!existingPositions || existingPositions.length === 0) {
    return POSITION_STEP;
  }
  const validPositions = existingPositions.filter((pos) => Number.isFinite(pos));
  if (validPositions.length === 0) {
    return POSITION_STEP;
  }
  const max = Math.max(...validPositions);
  return (max > 0 ? max : 0) + POSITION_STEP;
}

/**
 * Calculates new position when moving a card between prevPosition and nextPosition.
 * - Both null: empty column or sole item -> 1000
 * - prevPosition null, nextPosition non-null: inserted at top -> nextPosition / 2
 * - prevPosition non-null, nextPosition null: inserted at bottom -> prevPosition + 1000
 * - Both non-null: inserted in between -> (prevPosition + nextPosition) / 2
 * Detects whether rebalancing is needed when gap < MIN_POSITION_GAP.
 */
export function calculateMovePosition(
  prevPosition: number | null,
  nextPosition: number | null
): MovePositionResult {
  if (prevPosition === null && nextPosition === null) {
    return {
      position: POSITION_STEP,
      needsRebalance: false,
    };
  }

  if (prevPosition === null && nextPosition !== null) {
    const position = nextPosition / 2;
    return {
      position,
      needsRebalance: position < MIN_POSITION_GAP,
    };
  }

  if (prevPosition !== null && nextPosition === null) {
    return {
      position: prevPosition + POSITION_STEP,
      needsRebalance: false,
    };
  }

  // Both non-null
  const prev = prevPosition as number;
  const next = nextPosition as number;
  const position = (prev + next) / 2;
  const gap = Math.abs(next - prev);

  return {
    position,
    needsRebalance: gap < MIN_POSITION_GAP,
  };
}

/**
 * Assigns clean sequential positions (1000, 2000, 3000, ...) to ordered item IDs.
 */
export function generateRebalancedPositions(orderedIds: string[]): RebalancedPosition[] {
  return orderedIds.map((id, index) => ({
    id,
    position: (index + 1) * POSITION_STEP,
  }));
}
