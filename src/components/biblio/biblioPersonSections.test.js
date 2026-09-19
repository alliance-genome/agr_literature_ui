import {
  SECTION_DEFS,
  DEFAULT_LAYOUT,
  LAYOUT_COLS,
  BIBLIO_PERSON_LAYOUT_COMPONENT_NAME,
} from './biblioPersonSections';

describe('SECTION_DEFS', () => {
  test('every section has a unique id and a label', () => {
    const ids = SECTION_DEFS.map((s) => s.id);
    expect(ids).toEqual([...new Set(ids)]);
    SECTION_DEFS.forEach((s) => {
      expect(typeof s.id).toBe('string');
      expect(s.id.length).toBeGreaterThan(0);
      expect(typeof s.label).toBe('string');
      expect(s.label.length).toBeGreaterThan(0);
    });
  });

  test('covers the four arrangeable sections in reading order', () => {
    // The commit header is deliberately absent: it is fixed above the grid, because
    // a curator must never be able to hide or reorder the button that writes.
    expect(SECTION_DEFS.map((s) => s.id))
      .toEqual(['reference', 'unmatched', 'authors', 'institutions']);
  });
});

describe('DEFAULT_LAYOUT', () => {
  test('stacks every section full width, in SECTION_DEFS order', () => {
    expect(DEFAULT_LAYOUT.map((l) => l.i)).toEqual(SECTION_DEFS.map((s) => s.id));
    DEFAULT_LAYOUT.forEach((l, i) => {
      expect(l.x).toBe(0);
      expect(l.y).toBe(i);
      expect(l.w).toBe(LAYOUT_COLS);
    });
  });
});

describe('BIBLIO_PERSON_LAYOUT_COMPONENT_NAME', () => {
  test('is its own namespace, not shared with the person or laboratory tabs', () => {
    // usePersonSettings keys saved layouts by this string; colliding with another
    // page would have one screen load the other's arrangement.
    expect(BIBLIO_PERSON_LAYOUT_COMPONENT_NAME).toBe('biblio_person_layout');
  });
});
