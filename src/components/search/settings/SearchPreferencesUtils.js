import {
  setSearchQuery,
  setSearchResultsPage,
  setSearchSizeResultsCount,
  setSearchFacetsLimits,
  resetFacetValues,
  addFacetValue,
  addExcludedFacetValue,
  setAuthorFilter,
  setQueryFields,
  setSortByPublishedDate,
  setPartialMatch,
  setApplyToSingleTag,
  setDatePubmedAdded,
  setDatePubmedModified,
  setDatePublished,
  setDateCreated,
  searchReferences,
} from '../../../actions/searchActions';

/**
 * Build the current search state from Redux
 * This is what gets stored in person_settings.json_settings.state.
 */
export const buildSearchSettingsState = (reduxState) => {
  const s = reduxState.search || {};
  const isLogged = reduxState.isLogged || {};

  const mod_abbreviation =
    isLogged.testerMod && isLogged.testerMod !== 'No'
      ? isLogged.testerMod
      : isLogged.cognitoMod || null;

  return {
    query: s.searchQuery || '',
    authorFilter: s.authorFilter || '',
    query_fields: s.query_fields || 'All',
    partialMatch: s.partialMatch ?? 'true',
    sortByPublishedDate: s.sortByPublishedDate || 'relevance',
    searchResultsPage: s.searchResultsPage || 1,
    searchSizeResultsCount: s.searchSizeResultsCount || 50,

    datePubmedAdded: s.datePubmedAdded || '',
    datePubmedModified: s.datePubmedModified || '',
    datePublished: s.datePublished || '',
    dateCreated: s.dateCreated || '',

    facetsLimits: s.searchFacetsLimits || {},
    facetsValues: s.searchFacetsValues || {},
    excludedFacetsValues: s.searchExcludedFacetsValues || {},

    applyToSingleTag: s.applyToSingleTag ?? true,
    mod_abbreviation,
  };
};

/**
 * Apply a saved search json_settings object into Redux and (optionally) run a search.
 *
 * json_settings looks like:
 *   { meta: {...}, state: {...} }
 *
 * @param {Object} json_settings - Saved JSON settings.
 * @param {Function} dispatch - Redux dispatch.
 * @param {Object} options
 * @param {boolean} [options.runSearch=true] - Whether to trigger searchReferences().
 */
export const applySearchSettingsFromJson = (
  json_settings,
  dispatch,
  options = {}
) => {
  if (!json_settings) {
    return;
  }

  // If options.runSearch is:
  //   defined -> use its value
  //   undefined -> use true as the default
  const { runSearch = true } = options;

  const state = json_settings.state || json_settings;
  const {
    query = '',
    authorFilter = '',
    query_fields = 'All',
    partialMatch = 'true',
    sortByPublishedDate = 'relevance',
    searchResultsPage = 1,
    searchSizeResultsCount = 50,
    datePubmedAdded = '',
    datePubmedModified = '',
    datePublished = '',
    dateCreated = '',
    facetsLimits = {},
    facetsValues = {},
    excludedFacetsValues = {},
    applyToSingleTag = true,
  } = state;

  // 1) basic fields
  dispatch(setSearchQuery(query));
  dispatch(setAuthorFilter(authorFilter));
  dispatch(setQueryFields(query_fields));
  dispatch(setPartialMatch(partialMatch));
  dispatch(setSortByPublishedDate(sortByPublishedDate));
  dispatch(setSearchResultsPage(searchResultsPage));
  dispatch(setSearchSizeResultsCount(searchSizeResultsCount));

  // 2) dates
  dispatch(setDatePubmedAdded(datePubmedAdded || ''));
  dispatch(setDatePubmedModified(datePubmedModified || ''));
  dispatch(setDatePublished(datePublished || ''));
  dispatch(setDateCreated(dateCreated || ''));

  // 3) facets limits
  if (facetsLimits && typeof facetsLimits === 'object') {
    dispatch(setSearchFacetsLimits(facetsLimits));
  }

  // 4) facet values (included + excluded)
  dispatch(resetFacetValues()); // clears both included & excluded

  if (facetsValues && typeof facetsValues === 'object') {
    Object.entries(facetsValues).forEach(([facetKey, values]) => {
      if (Array.isArray(values)) {
        values.forEach((v) => dispatch(addFacetValue(facetKey, v)));
      }
    });
  }

  if (excludedFacetsValues && typeof excludedFacetsValues === 'object') {
    Object.entries(excludedFacetsValues).forEach(([facetKey, values]) => {
      if (Array.isArray(values)) {
        values.forEach((v) => dispatch(addExcludedFacetValue(facetKey, v)));
      }
    });
  }

  // 5) topic-entity-tag flag
  dispatch(setApplyToSingleTag(Boolean(applyToSingleTag)));

  // 6) trigger the search (optional)
  if (runSearch) {
    dispatch(searchReferences());
  }
};
