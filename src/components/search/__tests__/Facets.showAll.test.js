import { isSearchNarrowed, canShowAll, getShowAllLimit } from '../Facets';

// SCRUM-1463: "+Show All" on the Journal / Resource facet only once the search
// is narrowed; with nothing selected it would list thousands of journals.

const empty = {
  searchQuery: '',
  authorFilter: '',
  searchFacetsValues: {},
  searchExcludedFacetsValues: {},
  datePubmedAdded: '',
  datePubmedModified: '',
  datePublished: '',
  dateCreated: '',
  searchMode: 'facet',
  advancedTopicQuery: null,
};

test('nothing selected is not narrowed', () => {
  expect(isSearchNarrowed(empty)).toBe(false);
  // facets cleared back to empty lists
  expect(isSearchNarrowed({ ...empty, searchFacetsValues: { 'resource_id.keyword': [] } })).toBe(false);
  expect(isSearchNarrowed({ ...empty, datePublished: ['', ''] })).toBe(false);
});

test('a query, a facet value, an exclusion or a date narrows the search', () => {
  expect(isSearchNarrowed({ ...empty, searchQuery: 'toxicology' })).toBe(true);
  expect(isSearchNarrowed({ ...empty, authorFilter: 'Doe' })).toBe(true);
  expect(isSearchNarrowed({ ...empty, searchFacetsValues: { 'pubmed_types.keyword': ['Review'] } })).toBe(true);
  expect(isSearchNarrowed({ ...empty, searchExcludedFacetsValues: { 'resource_id.keyword': ['9001'] } })).toBe(true);
  expect(isSearchNarrowed({ ...empty, datePublished: ['2025-01-01', '2025-12-31'] })).toBe(true);
});

test('an advanced tree that compiles to nothing does not narrow the search', () => {
  expect(isSearchNarrowed({ ...empty, searchMode: 'advanced', advancedTopicQuery: null })).toBe(false);
});

test('Show All on the journal facet asks for every journal, not 1000', () => {
  expect(getShowAllLimit('resource_id.keyword')).toBeGreaterThan(9500);
  expect(getShowAllLimit('pubmed_types.keyword')).toBe(1000);
});

test('Show All hides once the facet already shows what it would ask for', () => {
  // narrowed SGD search, journal list cut at 10, then after Show All
  expect(canShowAll('resource_id.keyword', 10, 10, true)).toBe(true);
  expect(canShowAll('resource_id.keyword', 2464, 20000, true)).toBe(false);
  // Show More doubled past 1000: Show All still offered, and never shrinks the list
  expect(canShowAll('resource_id.keyword', 1280, 1280, true)).toBe(true);
  // not narrowed
  expect(canShowAll('resource_id.keyword', 10, 10, false)).toBe(false);
  // other facets keep the 1000 cap
  expect(canShowAll('pubmed_types.keyword', 10, 10, false)).toBe(true);
  expect(canShowAll('pubmed_types.keyword', 1000, 1000, false)).toBe(false);
});
