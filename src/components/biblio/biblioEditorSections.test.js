import {
  sectionIdForFieldIndex,
  layoutToCssGrid,
  maxColumnsPerRow,
  columnFloorForLayout,
  SECTION_DEFS,
  DEFAULT_LAYOUT,
  LAYOUT_COLS,
} from './biblioEditorSections';

// Mirrors the real fieldsOrdered shape: fields, an `authors` split point, dividers.
const fieldsOrdered = [
  'title',
  'cross_references',
  'retraction_status',
  'authors',
  'DIVIDER',
  'citation',
  'mesh_terms',
];
const authorsIdx = fieldsOrdered.indexOf('authors');

describe('sectionIdForFieldIndex', () => {
  test('fields above authors are "vital"', () => {
    expect(sectionIdForFieldIndex(fieldsOrdered, 0)).toBe('vital');
    expect(sectionIdForFieldIndex(fieldsOrdered, authorsIdx - 1)).toBe('vital');
  });

  test('the authors field itself is "authors"', () => {
    expect(sectionIdForFieldIndex(fieldsOrdered, authorsIdx)).toBe('authors');
  });

  test('fields below authors (including dividers) are "additional"', () => {
    expect(sectionIdForFieldIndex(fieldsOrdered, authorsIdx + 1)).toBe('additional'); // DIVIDER
    expect(sectionIdForFieldIndex(fieldsOrdered, fieldsOrdered.length - 1)).toBe('additional');
  });

  test('falls back to "vital" when there is no authors field', () => {
    expect(sectionIdForFieldIndex(['title', 'citation'], 1)).toBe('vital');
  });
});

describe('layoutToCssGrid', () => {
  test('returns null for empty/invalid input', () => {
    expect(layoutToCssGrid(null)).toBeNull();
    expect(layoutToCssGrid([])).toBeNull();
  });

  test('maps x/w to grid-column spans', () => {
    const grid = layoutToCssGrid([
      { i: 'vital', x: 0, y: 0, w: 6, h: 4 },
      { i: 'authors', x: 6, y: 0, w: 6, h: 4 },
      { i: 'additional', x: 0, y: 4, w: 12, h: 6 },
    ]);
    expect(grid.styles.vital.gridColumn).toBe('1 / span 6');
    expect(grid.styles.authors.gridColumn).toBe('7 / span 6');
    expect(grid.styles.additional.gridColumn).toBe('1 / span 12');
  });

  test('flags multiColumn when any section is narrower than full width', () => {
    const sideBySide = layoutToCssGrid([
      { i: 'vital', x: 0, y: 0, w: 6, h: 4 },
      { i: 'authors', x: 6, y: 0, w: 6, h: 4 },
      { i: 'additional', x: 0, y: 4, w: 12, h: 6 },
    ]);
    expect(sideBySide.multiColumn).toBe(true);

    const stacked = layoutToCssGrid([
      { i: 'vital', x: 0, y: 0, w: 12, h: 4 },
      { i: 'authors', x: 0, y: 4, w: 12, h: 4 },
      { i: 'additional', x: 0, y: 8, w: 12, h: 6 },
    ]);
    expect(stacked.multiColumn).toBe(false);
  });

  test('orders sections by y then x', () => {
    const grid = layoutToCssGrid([
      { i: 'additional', x: 0, y: 4, w: 12, h: 6 },
      { i: 'authors', x: 6, y: 0, w: 6, h: 4 },
      { i: 'vital', x: 0, y: 0, w: 6, h: 4 },
    ]);
    expect(grid.order).toEqual(['vital', 'authors', 'additional']);
  });

  test('clamps spans so x + w never exceeds the column track', () => {
    const grid = layoutToCssGrid([{ i: 'vital', x: 10, y: 0, w: 8, h: 4 }]);
    // x clamped to <= 11, span clamped so it fits within LAYOUT_COLS
    expect(grid.styles.vital.gridColumn).toBe(`11 / span ${LAYOUT_COLS - 10}`);
  });

  test('colFloor scales with the busiest row (2-up vs 3-up)', () => {
    const twoUp = layoutToCssGrid([
      { i: 'vital', x: 0, y: 0, w: 6, h: 4 },
      { i: 'authors', x: 6, y: 0, w: 6, h: 4 },
      { i: 'additional', x: 0, y: 4, w: 12, h: 6 },
    ]);
    expect(twoUp.colFloor).toBe(120);

    const threeUp = layoutToCssGrid([
      { i: 'vital', x: 0, y: 0, w: 4, h: 4 },
      { i: 'authors', x: 4, y: 0, w: 4, h: 4 },
      { i: 'additional', x: 8, y: 0, w: 4, h: 4 },
    ]);
    expect(threeUp.colFloor).toBe(280);
  });

  test('DEFAULT_LAYOUT covers all three sections full-width', () => {
    const ids = DEFAULT_LAYOUT.map((it) => it.i).sort();
    expect(ids).toEqual(SECTION_DEFS.map((s) => s.id).sort());
    DEFAULT_LAYOUT.forEach((it) => expect(it.w).toBe(LAYOUT_COLS));
  });
});

describe('maxColumnsPerRow', () => {
  test('stacked full-width sections share no row (1)', () => {
    expect(maxColumnsPerRow(DEFAULT_LAYOUT)).toBe(1);
  });

  test('two side by side then one below is 2', () => {
    expect(
      maxColumnsPerRow([
        { i: 'vital', x: 0, y: 0, w: 6, h: 4 },
        { i: 'authors', x: 6, y: 0, w: 6, h: 4 },
        { i: 'additional', x: 0, y: 4, w: 12, h: 6 },
      ])
    ).toBe(2);
  });

  test('three side by side is 3', () => {
    expect(
      maxColumnsPerRow([
        { i: 'vital', x: 0, y: 0, w: 4, h: 4 },
        { i: 'authors', x: 4, y: 0, w: 4, h: 4 },
        { i: 'additional', x: 8, y: 0, w: 4, h: 4 },
      ])
    ).toBe(3);
  });

  test('touching intervals (one ends where the next begins) are not overlapping', () => {
    expect(
      maxColumnsPerRow([
        { i: 'a', x: 0, y: 0, w: 6, h: 4 },
        { i: 'b', x: 0, y: 4, w: 6, h: 4 },
      ])
    ).toBe(1);
  });
});

describe('columnFloorForLayout', () => {
  test('2-up arrangement -> 120, 3-up -> 280, default otherwise', () => {
    expect(
      columnFloorForLayout([
        { i: 'vital', x: 0, y: 0, w: 6, h: 4 },
        { i: 'authors', x: 6, y: 0, w: 6, h: 4 },
        { i: 'additional', x: 0, y: 4, w: 12, h: 6 },
      ])
    ).toBe(120);
    expect(
      columnFloorForLayout([
        { i: 'vital', x: 0, y: 0, w: 4, h: 4 },
        { i: 'authors', x: 4, y: 0, w: 4, h: 4 },
        { i: 'additional', x: 8, y: 0, w: 4, h: 4 },
      ])
    ).toBe(280);
    expect(columnFloorForLayout(DEFAULT_LAYOUT)).toBe(120);
  });
});
