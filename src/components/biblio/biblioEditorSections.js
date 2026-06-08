// src/components/biblio/biblioEditorSections.js
//
// Shared definitions for the 3-section BiblioEditor layout feature (SCRUM-6046).
//
// The editor's fields are grouped into three sections, derived as contiguous
// slices of the existing `fieldsOrdered` array (the single source of truth for
// field order, defined in BiblioEditor.js):
//
//   - "vital"      : everything ABOVE the `authors` field
//   - "authors"    : the `authors` field (and its extracted-emails row)
//   - "additional" : everything BELOW the `authors` field
//
// Users arrange these three sections in a 2D grid via BiblioLayoutPreferenceModal,
// which produces react-grid-layout coordinates. Those coordinates are persisted
// per-user and translated back into a CSS Grid for the actual editor render.

// react-grid-layout uses a 12-column grid.
export const LAYOUT_COLS = 12;

// componentName namespace used with usePersonSettings / the /person_setting API.
export const BIBLIO_LAYOUT_COMPONENT_NAME = 'biblio_editor_layout';

// The three sections, in their natural (default) top-to-bottom order.
export const SECTION_DEFS = [
  { id: 'vital', label: 'Vital' },
  { id: 'authors', label: 'Authors' },
  { id: 'additional', label: 'Additional Info' },
];

// Default arrangement: the three sections stacked full-width, preserving the
// editor's original single-column appearance. Used when the user has no saved
// layout, and as the starting canvas state in the preference modal.
//
// Heights are intentionally short (2 rows each) so the modal canvas is compact:
// quicker to drag/resize and it leaves the saved-layouts list below in view. The
// editor itself ignores `h` (it lays sections out by column position with
// auto-sized rows), so these heights only affect the modal canvas.
export const DEFAULT_LAYOUT = [
  { i: 'vital', x: 0, y: 0, w: LAYOUT_COLS, h: 2 },
  { i: 'authors', x: 0, y: 2, w: LAYOUT_COLS, h: 2 },
  { i: 'additional', x: 0, y: 4, w: LAYOUT_COLS, h: 2 },
];

// Per-track minimum width (px) for the side-by-side grid, keyed by the maximum
// number of sections that share a single row. Rows packed with more sections get
// a larger floor so each column stays readable; sparser rows can use a smaller
// floor so the page doesn't scroll as eagerly. Tune these two numbers to taste.
export const COLUMN_FLOOR_BY_MAX_PER_ROW = { 2: 120, 3: 280 };
export const DEFAULT_COLUMN_FLOOR = 120;

/**
 * Return the maximum number of sections that occupy the same horizontal band
 * (i.e. are placed side by side). Computed with a sweep line over each section's
 * vertical [y, y+h) interval. Sections that merely touch (one ends where the next
 * begins) are not counted as overlapping.
 */
export const maxColumnsPerRow = (layout) => {
  if (!Array.isArray(layout) || layout.length === 0) return 1;
  const events = [];
  for (const it of layout) {
    if (!it) continue;
    const y = Number(it.y) || 0;
    const h = Math.max(1, Number(it.h) || 1);
    events.push([y, 1]);
    events.push([y + h, -1]);
  }
  // At equal positions process ends (-1) before starts (+1) so touching intervals
  // do not inflate the count.
  events.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  let current = 0;
  let max = 0;
  for (const [, delta] of events) {
    current += delta;
    if (current > max) max = current;
  }
  return max || 1;
};

/**
 * Pick the per-track minimum width (px) for a layout, based on how many sections
 * are side by side in its busiest row. Falls back to DEFAULT_COLUMN_FLOOR, and
 * caps at the 3-up floor for any (unexpected) wider packing.
 */
export const columnFloorForLayout = (layout) => {
  const n = maxColumnsPerRow(layout);
  if (COLUMN_FLOOR_BY_MAX_PER_ROW[n] != null) return COLUMN_FLOOR_BY_MAX_PER_ROW[n];
  return n >= 3 ? COLUMN_FLOOR_BY_MAX_PER_ROW[3] : DEFAULT_COLUMN_FLOOR;
};

/**
 * Given the `fieldsOrdered` array, return the section id ("vital" | "authors" |
 * "additional") that a field at the supplied index belongs to. The split point
 * is the `authors` field.
 */
export const sectionIdForFieldIndex = (fieldsOrdered, fieldIndex) => {
  const authorsIdx = fieldsOrdered.indexOf('authors');
  if (authorsIdx === -1) return 'vital';
  if (fieldIndex < authorsIdx) return 'vital';
  if (fieldIndex === authorsIdx) return 'authors';
  return 'additional';
};

/**
 * Translate persisted react-grid-layout coordinates into CSS Grid placement for
 * the editor. We deliberately do NOT re-run react-grid-layout in the editor: its
 * fixed rowHeight model fights variable-height form content. Instead we map each
 * section to a `grid-column` span and render the sections in (y, x) order, letting
 * `grid-auto-flow: row dense` pack them into auto-sized rows.
 *
 * @param {Array<{i:string,x:number,y:number,w:number,h:number}>} layout
 * @returns {{ order: string[], styles: Object<string, {gridColumn: string}>, multiColumn: boolean, colFloor: number } | null}
 *          null when there is no usable layout (caller falls back to stacked order).
 *          `multiColumn` is true when any section is narrower than full width (i.e. the
 *          arrangement places sections side by side), which the editor uses to switch to a
 *          full-width container so the columns are not squished.
 *          `colFloor` is the per-track minimum width (px) chosen for this arrangement based
 *          on how many sections share its busiest row (see columnFloorForLayout).
 */
export const layoutToCssGrid = (layout) => {
  if (!Array.isArray(layout) || layout.length === 0) return null;

  const items = layout
    .filter((it) => it && typeof it.i === 'string')
    .map((it) => {
      const x = Math.max(0, Math.min(LAYOUT_COLS - 1, Number(it.x) || 0));
      // clamp the span so x + w never exceeds the 12-column track
      const w = Math.max(1, Math.min(LAYOUT_COLS - x, Number(it.w) || LAYOUT_COLS));
      const y = Number(it.y) || 0;
      return { id: it.i, x, y, w };
    });

  if (items.length === 0) return null;

  const sorted = [...items].sort((a, b) => (a.y - b.y) || (a.x - b.x));

  const styles = {};
  for (const it of sorted) {
    styles[it.id] = { gridColumn: `${it.x + 1} / span ${it.w}` };
  }

  const multiColumn = sorted.some((it) => it.w < LAYOUT_COLS);

  return {
    order: sorted.map((it) => it.id),
    styles,
    multiColumn,
    colFloor: columnFloorForLayout(layout),
  };
};
