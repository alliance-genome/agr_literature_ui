// Search-card display profile (SCRUM-6512).
//
// One profile object describes how a search-result card renders: which sections
// show, in what vertical order, which cross-reference prefixes are listed,
// whether the action icons (TET / PDF / images) show, and whether the person
// icon shows (it opens the paper's authors on the Biblio person screen; author
// names stay plain text, reserved for a future link to individual person
// records). SearchResults renders from it; the Layout modal edits it; named
// profiles persist per-user via person_settings under the 'search_display'
// namespace — a namespace deliberately separate from 'reference_search' saved
// searches, so what to search for and how cards look are saved and loaded
// independently.

export const SEARCH_DISPLAY_COMPONENT = 'search_display';

// The card's customizable sections, in default order. The title is not a
// section: it is the card's identity/link and always renders first.
export const CARD_SECTIONS = [
  { id: 'xrefs', label: 'Cross-references' },
  { id: 'authors', label: 'Authors' },
  { id: 'pubDate', label: 'Publication date' },
  { id: 'journal', label: 'Journal' },
  { id: 'abstract', label: 'Abstract' },
  { id: 'matchingText', label: 'Matching text' },
];

export const DEFAULT_DISPLAY_PREFS = {
  sectionOrder: CARD_SECTIONS.map((s) => s.id),
  hiddenSections: [],
  showIcons: true,
  // Hidden (not shown) prefixes rather than a shown-list: a prefix this
  // profile has never seen (new MOD, new resource type) defaults to visible
  // instead of silently vanishing.
  hiddenXrefPrefixes: [],
  showPersonIcon: true,
};

// The prefix an xref curie is selected by: "PMID:123" -> "PMID".
export const xrefPrefix = (curie) => String(curie || '').split(':')[0];

// Journal info for the card's Journal section (curator request: e.g. eLife is
// excluded from the corpus by review model, so seeing the journal on the card
// saves a trip to the biblio display). The search index has no journal field —
// only the full citation, "Authors, (Year) Title. Journal Vol(Issue):Pages" —
// so take the text after the title, which the card already knows. Both the
// citation and the title can carry markup (<i>species</i> names), and often
// with different tag placement, so strip markup from BOTH before matching —
// the result renders as plain text either way. When the title still cannot be
// found, fall back to the (stripped) full citation rather than guessing.
const stripMarkup = (s) => String(s || '').replace(/<[^>]+>/g, '');

export const journalInfoFromCitation = (citation, title) => {
  const cit = stripMarkup(citation).trim();
  if (!cit) return '';
  const plainTitle = stripMarkup(title).trim();
  if (plainTitle) {
    const idx = cit.indexOf(plainTitle);
    if (idx >= 0) {
      const tail = cit.slice(idx + plainTitle.length).replace(/^[.\s]+/, '').trim();
      if (tail) return tail;
    }
  }
  return cit;
};

// Merge a stored profile over the defaults, tolerating older/partial payloads:
// unknown section ids are dropped, sections missing from a saved order are
// appended in default order (so adding a section later never blanks it for
// existing profiles).
export const normalizeDisplayPrefs = (raw) => {
  const p = raw && typeof raw === 'object' ? raw : {};
  const known = CARD_SECTIONS.map((s) => s.id);
  const order = (Array.isArray(p.sectionOrder) ? p.sectionOrder : [])
    .filter((id) => known.includes(id));
  for (const id of known) {
    if (!order.includes(id)) order.push(id);
  }
  return {
    sectionOrder: order,
    hiddenSections: (Array.isArray(p.hiddenSections) ? p.hiddenSections : [])
      .filter((id) => known.includes(id)),
    showIcons: p.showIcons !== false,
    hiddenXrefPrefixes: Array.isArray(p.hiddenXrefPrefixes) ? p.hiddenXrefPrefixes : [],
    // showPersonIcon replaced linkAuthorsToPerson (the "Authors :" label link,
    // now a rail icon): honor the legacy key when a saved profile predates it.
    showPersonIcon:
      (p.showPersonIcon !== undefined ? p.showPersonIcon : p.linkAuthorsToPerson) !== false,
  };
};
