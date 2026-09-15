// Pure reorder logic for the Quick Topic Addition grid's unmanaged row drag
// (SCRUM-6560). Kept dependency-free in its own module so the direction and
// midpoint-crossing rules are directly unit-testable without mounting the
// AG Grid component.

// Reorder `rows` (the FULL topic list, not just the filtered view) so the
// dragged row lands at the hovered row's position, or return null when
// nothing should change. Works while a filter is active: visible rows keep
// their full-array relative order (there is no sort during a drag), so the
// dragged row simply lands next to the hovered row and hidden rows keep
// their positions.
//
// The midpoint guard is what makes the live reorder stable with variable
// (autoHeight) rows: the swap only happens once the pointer has crossed the
// hovered row's vertical midpoint in the travel direction. Without it, a
// short row dragged over a tall one can land with the pointer still inside
// the tall row's span, and the very next mousemove swaps the pair straight
// back, flickering on every event. This mirrors what AG Grid's managed
// RowDragFeature does internally.
//
// geometry: { pointerY, overTop, overHeight } in the grid's row-container
// pixel space (RowDragEvent.y / RowNode.rowTop / RowNode.rowHeight). When any
// of them is missing the guard is skipped and the swap happens immediately.
export const dragReorder = (rows, draggedCurie, overCurie, geometry = {}) => {
  if (!Array.isArray(rows) || draggedCurie === overCurie) { return null; }
  const from = rows.findIndex((r) => r.topic_curie === draggedCurie);
  const to = rows.findIndex((r) => r.topic_curie === overCurie);
  if (from < 0 || to < 0 || from === to) { return null; }

  // from < to means the dragged row currently sits above the hovered row (in
  // the filtered view too: visible rows preserve full-array order), so the
  // pointer is travelling down.
  const movingDown = from < to;
  const { pointerY, overTop, overHeight } = geometry;
  if (Number.isFinite(pointerY) && Number.isFinite(overTop) && Number.isFinite(overHeight)) {
    const midpoint = overTop + overHeight / 2;
    if (movingDown ? pointerY < midpoint : pointerY > midpoint) { return null; }
  }

  const next = [...rows];
  next.splice(from, 1);
  next.splice(to, 0, rows[from]);
  return next;
};
