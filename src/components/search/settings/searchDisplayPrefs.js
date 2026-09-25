// Search-card display profile (SCRUM-6512).
//
// One profile object describes how a search-result card renders: which sections
// show, in what vertical order, which cross-reference prefixes are listed,
// whether the action icons (TET / PDF / images) show, and whether author names
// link to the person screen. SearchResults renders from it; the Display
// settings modal edits it; named profiles persist per-user via person_settings
// under the 'search_display' namespace — a namespace deliberately separate from
// 'reference_search' saved searches, so what to search for and how cards look
// are saved and loaded independently.

export const SEARCH_DISPLAY_COMPONENT = 'search_display';

// The card's customizable sections, in default order. The title is not a
// section: it is the card's identity/link and always renders first.
export const CARD_SECTIONS = [
  { id: 'xrefs', label: 'Cross-references' },
  { id: 'authors', label: 'Authors' },
  { id: 'pubDate', label: 'Publication date' },
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
  linkAuthorsToPerson: true,
};

// The prefix an xref curie is selected by: "PMID:123" -> "PMID".
export const xrefPrefix = (curie) => String(curie || '').split(':')[0];

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
    linkAuthorsToPerson: p.linkAuthorsToPerson !== false,
  };
};
