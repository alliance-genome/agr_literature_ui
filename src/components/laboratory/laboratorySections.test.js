import {
  SECTION_DEFS,
  DEFAULT_LAYOUT,
  LAYOUT_COLS,
  LABORATORY_EDITOR_LAYOUT_COMPONENT_NAME,
  LABORATORY_DISPLAY_LAYOUT_COMPONENT_NAME,
  defaultHiddenSections,
} from './laboratorySections';

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

  test('no laboratory section is MOD-gated', () => {
    // Unlike the person sections, where lineage is WB-only. If a gate is ever
    // added here, defaultHiddenSections already handles it -- this test is the
    // reminder that today nothing is hidden by default for anyone.
    expect(SECTION_DEFS.filter((s) => Array.isArray(s.mods))).toEqual([]);
  });
});

describe('defaultHiddenSections', () => {
  test('hides nothing, for any MOD', () => {
    ['WB', 'SGD', 'MGI', 'ZFIN', undefined].forEach((mod) => {
      expect([...defaultHiddenSections(mod)]).toEqual([]);
    });
  });
});

describe('DEFAULT_LAYOUT', () => {
  test('covers every section exactly once, stacked full-width in order', () => {
    expect(DEFAULT_LAYOUT.map((it) => it.i)).toEqual(SECTION_DEFS.map((s) => s.id));
    DEFAULT_LAYOUT.forEach((it, i) => {
      expect(it.x).toBe(0);
      expect(it.y).toBe(i);
      expect(it.w).toBe(LAYOUT_COLS);
    });
  });
});

describe('component namespaces', () => {
  // The Editor and Display tabs share SECTION_DEFS but must never share a saved
  // layout -- arranging one must not disturb the other.
  test('editor and display persist to different namespaces', () => {
    expect(LABORATORY_EDITOR_LAYOUT_COMPONENT_NAME).toBe('laboratory_editor_layout');
    expect(LABORATORY_DISPLAY_LAYOUT_COMPONENT_NAME).toBe('laboratory_display_layout');
    expect(LABORATORY_EDITOR_LAYOUT_COMPONENT_NAME)
      .not.toBe(LABORATORY_DISPLAY_LAYOUT_COMPONENT_NAME);
  });

  test('laboratory namespaces do not collide with the person ones', () => {
    expect(LABORATORY_DISPLAY_LAYOUT_COMPONENT_NAME).not.toBe('person_display_layout');
    expect(LABORATORY_EDITOR_LAYOUT_COMPONENT_NAME).not.toBe('person_editor_layout');
  });
});
