import {
  CARD_SECTIONS,
  DEFAULT_DISPLAY_PREFS,
  normalizeDisplayPrefs,
  xrefPrefix,
  journalInfoFromCitation,
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
    expect(d.showPersonIcon).toBe(true);
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
    expect(p.showPersonIcon).toBe(true);
    expect(p.hiddenXrefPrefixes).toEqual([]);
  });

  test('legacy linkAuthorsToPerson migrates to showPersonIcon', () => {
    expect(normalizeDisplayPrefs({ linkAuthorsToPerson: false }).showPersonIcon).toBe(false);
    expect(normalizeDisplayPrefs({ linkAuthorsToPerson: true }).showPersonIcon).toBe(true);
    // an explicit new key wins over the legacy one
    expect(
      normalizeDisplayPrefs({ showPersonIcon: true, linkAuthorsToPerson: false }).showPersonIcon
    ).toBe(true);
  });

  test('a profile saved before the journal section gets it appended, visible', () => {
    const p = normalizeDisplayPrefs({
      sectionOrder: ['abstract', 'authors', 'pubDate', 'xrefs', 'matchingText'],
      hiddenSections: [],
    });
    expect(p.sectionOrder[p.sectionOrder.length - 1]).toBe('journal');
    expect(p.hiddenSections).not.toContain('journal');
  });

  test('journalInfoFromCitation takes the text after the title', () => {
    const citation =
      'Libourel C; Roux F, (2026) A receptor-like kinase mediates plant-plant '
      + 'interactions. Journal of experimental botany 77(14):4710-4724';
    expect(
      journalInfoFromCitation(
        citation,
        'A receptor-like kinase mediates plant-plant interactions.'
      )
    ).toBe('Journal of experimental botany 77(14):4710-4724');
    // markup in the reference title is stripped before matching
    expect(
      journalInfoFromCitation(
        citation,
        'A receptor-like kinase mediates <i>plant-plant</i> interactions.'
      )
    ).toBe('Journal of experimental botany 77(14):4710-4724');
  });

  test('journalInfoFromCitation falls back to the full citation', () => {
    const citation = 'Someone A, (2026) A different title. Some Journal 1:2-3';
    expect(journalInfoFromCitation(citation, 'Title not in the citation')).toBe(citation);
    expect(journalInfoFromCitation(citation, null)).toBe(citation);
    expect(journalInfoFromCitation('', 'Anything')).toBe('');
    expect(journalInfoFromCitation(null, null)).toBe('');
  });

  test('xrefPrefix takes the curie prefix', () => {
    expect(xrefPrefix('PMID:12345')).toBe('PMID');
    expect(xrefPrefix('DOI:10.1000/xyz:extra')).toBe('DOI');
    expect(xrefPrefix('')).toBe('');
    expect(xrefPrefix(null)).toBe('');
  });
});
