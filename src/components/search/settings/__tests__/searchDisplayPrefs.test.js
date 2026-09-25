import {
  CARD_SECTIONS,
  DEFAULT_DISPLAY_PREFS,
  normalizeDisplayPrefs,
  xrefPrefix,
} from '../searchDisplayPrefs';

describe('searchDisplayPrefs (SCRUM-6512)', () => {
  test('null (no profile loaded) normalizes to the defaults', () => {
    expect(normalizeDisplayPrefs(null)).toEqual(DEFAULT_DISPLAY_PREFS);
    expect(normalizeDisplayPrefs(undefined)).toEqual(DEFAULT_DISPLAY_PREFS);
  });

  test('defaults show everything, in the canonical section order', () => {
    const d = DEFAULT_DISPLAY_PREFS;
    expect(d.sectionOrder).toEqual(CARD_SECTIONS.map((s) => s.id));
    expect(d.hiddenSections).toEqual([]);
    expect(d.hiddenXrefPrefixes).toEqual([]);
    expect(d.showIcons).toBe(true);
    expect(d.linkAuthorsToPerson).toBe(true);
  });

  test('a saved order is preserved and unknown ids are dropped', () => {
    const p = normalizeDisplayPrefs({
      sectionOrder: ['abstract', 'bogus', 'authors'],
      hiddenSections: ['pubDate', 'bogus'],
    });
    // saved order first, then the sections the saved profile predates,
    // appended in default order — a later-added section never vanishes.
    expect(p.sectionOrder.slice(0, 2)).toEqual(['abstract', 'authors']);
    expect(p.sectionOrder).toHaveLength(CARD_SECTIONS.length);
    expect(new Set(p.sectionOrder)).toEqual(new Set(CARD_SECTIONS.map((s) => s.id)));
    expect(p.hiddenSections).toEqual(['pubDate']);
  });

  test('partial payloads keep the other defaults', () => {
    const p = normalizeDisplayPrefs({ showIcons: false });
    expect(p.showIcons).toBe(false);
    expect(p.linkAuthorsToPerson).toBe(true);
    expect(p.hiddenXrefPrefixes).toEqual([]);
  });

  test('xrefPrefix takes the curie prefix', () => {
    expect(xrefPrefix('PMID:12345')).toBe('PMID');
    expect(xrefPrefix('DOI:10.1000/xyz:extra')).toBe('DOI');
    expect(xrefPrefix('')).toBe('');
    expect(xrefPrefix(null)).toBe('');
  });
});
