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
    // the saved order is kept, and the sections the saved profile predates
    // are added back — a later-added section never vanishes.
    expect(p.sectionOrder.filter((id) => ['abstract', 'authors'].includes(id)))
      .toEqual(['abstract', 'authors']);
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

  test('a missing section goes after its default predecessor, not at the bottom', () => {
    // SCRUM-1463: appending put a new section below the matching text
    const p = normalizeDisplayPrefs({
      sectionOrder: ['xrefs', 'authors', 'abstract', 'matchingText'],
      hiddenSections: [],
    });
    expect(p.sectionOrder).toEqual(['xrefs', 'authors', 'pubDate', 'abstract', 'matchingText']);
    expect(normalizeDisplayPrefs({ sectionOrder: ['matchingText', 'abstract'] }).sectionOrder)
      .toEqual(['xrefs', 'authors', 'pubDate', 'matchingText', 'abstract']);
  });

  test('the retired journal section is dropped; the journal is on the pubDate line', () => {
    // profiles saved with the separate journal section (SCRUM-6512)
    const p = normalizeDisplayPrefs({
      sectionOrder: ['xrefs', 'authors', 'pubDate', 'abstract', 'matchingText', 'journal'],
      hiddenSections: ['journal'],
    });
    expect(p.sectionOrder).toEqual(['xrefs', 'authors', 'pubDate', 'abstract', 'matchingText']);
    expect(p.hiddenSections).toEqual([]);
    expect(CARD_SECTIONS.find((s) => s.id === 'pubDate').label).toBe('Journal and publication date');
  });

  test('a duplicated saved id is kept once', () => {
    expect(normalizeDisplayPrefs({ sectionOrder: ['abstract', 'abstract'] }).sectionOrder)
      .toEqual(['xrefs', 'authors', 'pubDate', 'abstract', 'matchingText']);
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

  test('journalInfoFromCitation strips markup from the citation too', () => {
    // Real-world shape (curator screenshot): the citation itself carries <i>
    // tags, with placement that differs from the title's own markup.
    const citation =
      'Chen X; Zhao G, (2027) Ribosome engineering enhances genetic code expansion '
      + 'in <i>Saccharomyces cerevisiae</i>. Synthetic and systems biotechnology 18:76-84';
    expect(
      journalInfoFromCitation(
        citation,
        'Ribosome engineering enhances genetic code expansion in <i>Saccharomyces cerevisiae</i>.'
      )
    ).toBe('Synthetic and systems biotechnology 18:76-84');
    // differing tag placement between title and citation still matches
    expect(
      journalInfoFromCitation(
        'A B, (2027) Production of ent-</i>kaurene in yeast. Some Journal 18:63-74',
        'Production of <i>ent</i>-kaurene in yeast.'
      )
    ).toBe('Some Journal 18:63-74');
  });

  test('journalInfoFromCitation falls back to the stripped full citation', () => {
    const citation = 'Someone A, (2026) A different <i>title</i>. Some Journal 1:2-3';
    const stripped = 'Someone A, (2026) A different title. Some Journal 1:2-3';
    expect(journalInfoFromCitation(citation, 'Title not in the citation')).toBe(stripped);
    expect(journalInfoFromCitation(citation, null)).toBe(stripped);
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
