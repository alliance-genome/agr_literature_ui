import {
  SECTION_DEFS,
  DEFAULT_LAYOUT,
  LAYOUT_COLS,
  PERSON_EDITOR_LAYOUT_COMPONENT_NAME,
  PERSON_DISPLAY_LAYOUT_COMPONENT_NAME,
  defaultHiddenSections,
} from './personSections';

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

  test('lineage is the only MOD-gated section, gated to WB', () => {
    const gated = SECTION_DEFS.filter((s) => Array.isArray(s.mods));
    expect(gated.map((s) => s.id)).toEqual(['lineage']);
    expect(gated[0].mods).toEqual(['WB']);
  });
});

describe('defaultHiddenSections', () => {
  test('hides lineage for a non-WB MOD', () => {
    const hidden = defaultHiddenSections('SGD');
    expect(hidden.has('lineage')).toBe(true);
  });

  test('shows lineage for WB', () => {
    const hidden = defaultHiddenSections('WB');
    expect(hidden.has('lineage')).toBe(false);
  });

  test('never hides an ungated section', () => {
    const ungated = SECTION_DEFS.filter((s) => !s.mods).map((s) => s.id);
    ['WB', 'SGD', 'MGI', undefined].forEach((mod) => {
      const hidden = defaultHiddenSections(mod);
      ungated.forEach((id) => expect(hidden.has(id)).toBe(false));
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
  // The Editor and Display tabs share SECTION_DEFS but must never share a
  // saved layout — arranging one must not disturb the other.
  test('editor and display persist to different namespaces', () => {
    expect(PERSON_EDITOR_LAYOUT_COMPONENT_NAME).toBe('person_editor_layout');
    expect(PERSON_DISPLAY_LAYOUT_COMPONENT_NAME).toBe('person_display_layout');
    expect(PERSON_EDITOR_LAYOUT_COMPONENT_NAME)
      .not.toBe(PERSON_DISPLAY_LAYOUT_COMPONENT_NAME);
  });
});
