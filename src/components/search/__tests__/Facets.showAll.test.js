import { isSearchNarrowed } from '../Facets';

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
