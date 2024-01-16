import axios from "axios";
//import {useDispatch, useSelector} from 'react-redux';

export const SEARCH_SET_SEARCH_RESULTS_COUNT = 'SEARCH_SET_SEARCH_RESULTS_COUNT';
export const SEARCH_SET_SEARCH_RESULTS_PAGE = 'SEARCH_SET_SEARCH_RESULTS_PAGE';
export const SEARCH_SET_SEARCH_RESULTS = 'SEARCH_SET_SEARCH_RESULTS';
export const SEARCH_SET_CROSS_REFERENCE_RESULTS = 'SEARCH_SET_CROSS_REFERENCE_RESULTS';
export const SEARCH_SET_SEARCH_LOADING = 'SEARCH_SET_SEARCH_LOADING';
export const SEARCH_SET_SEARCH_ERROR = 'SEARCH_SET_SEARCH_ERROR';
export const SEARCH_SET_SEARCH_FACETS = 'SEARCH_SET_SEARCH_FACETS';
export const SEARCH_SET_SEARCH_SEARCH = 'SEARCH_SET_SEARCH_SEARCH';
export const SEARCH_SET_SEARCH_FACETS_VALUES = 'SEARCH_SET_SEARCH_FACETS_VALUES';
export const SEARCH_SET_SEARCH_FACETS_LIMITS = 'SEARCH_SET_SEARCH_FACETS_LIMITS';
export const SEARCH_SET_SEARCH_SIZE_RESULTS_COUNT = 'SEARCH_SET_SEARCH_SIZE_RESULTS_COUNT';
export const SEARCH_RESET_FACET_VALUES = 'SEARCH_RESET_FACET_VALUES';
export const SEARCH_ADD_FACET_VALUE = 'SEARCH_ADD_FACET_VALUE';
export const SEARCH_REMOVE_FACET_VALUE = 'SEARCH_REMOVE_FACET_VALUE';
export const SEARCH_ADD_EXCLUDED_FACET_VALUE = 'SEARCH_ADD_EXCLUDED_FACET_VALUE';
export const SEARCH_REMOVE_EXCLUDED_FACET_VALUE = 'SEARCH_REMOVE_EXCLUDED_FACET_VALUE';
export const SEARCH_SET_AUTHOR_FILTER = 'SEARCH_SET_AUTHOR_FILTER';
export const SEARCH_SET_FACETS_LOADING = 'SEARCH_SET_FACETS_LOADING';
export const SEARCH_SET_DATE_PUBMED_ADDED = 'SEARCH_SET_DATE_PUBMED_ADDED';
export const SEARCH_SET_DATE_PUBMED_MODIFIED = 'SEARCH_SET_DATE_PUBMED_MODIFIED';
export const SEARCH_SET_DATE_PUBLISHED = 'SEARCH_SET_DATE_PUBLISHED';
export const SEARCH_SET_DATE_CREATED = 'SEARCH_SET_DATE_CREATED';
export const SEARCH_SET_SEARCH_QUERY_FIELDS = 'SEARCH_SET_SEARCH_QUERY_FIELDS';
export const SEARCH_SET_SORT_BY_PUBLISHED_DATE = 'SEARCH_SET_SORT_BY_PUBLISHED_DATE';
export const SEARCH_SET_PARTIAL_MATCH = 'SEARCH_SET_PARTIAL_MATCH';
export const SEARCH_SET_MOD_PREFERENCES_LOADED = 'SEARCH_SET_MOD_PREFERENCES_LOADED';

const restUrl = process.env.REACT_APP_RESTAPI;

export const changeQueryField = (e) => {
  console.log('action change field ' + e.target.id + ' to ' + e.target.value);
  return {
    type: 'SEARCH_CHANGE_QUERY_FIELD',
    payload: {
      field: e.target.id,
      value: e.target.value
    }
  };
};

export const fetchInitialFacets = (facetsLimits) => {
  return dispatch => {
    dispatch(setSearchFacetsLimits(facetsLimits));
    axios.post(restUrl + '/search/references/', {
      query: null,
      facets_values: null,
      facets_limits: facetsLimits,
      return_facets_only: true
    })
        .then(res => {
          dispatch(setSearchFacets(res.data.aggregations));
        })
        .catch();
  }
}

export const searchReferences = () => {
  return (dispatch,getState) => {
    const state = getState();
    dispatch(setSearchLoading());

    let params = {
      query: state.search.searchQuery.replace(/\|/g,'\\|').replace(/\+/g,'\\+').replace(/OR/g,"|").replace(/AND/g,"+").trim(),
      size_result_count: state.search.searchSizeResultsCount,
      page: state.search.searchResultsPage,
      facets_values: state.search.searchFacetsValues,
      negated_facets_values: state.search.searchExcludedFacetsValues,
      facets_limits: state.search.searchFacetsLimits,
      author_filter: state.search.authorFilter,
      query_fields: state.search.query_fields,
      sort_by_published_date_order: state.search.sortByPublishedDate,
      partial_match: state.search.partialMatch
    }
    if(state.search.datePubmedModified){
      params.date_pubmed_modified = state.search.datePubmedModified;
    }
    if(state.search.datePubmedAdded){
      params.date_pubmed_arrive = state.search.datePubmedAdded;
    }
    if(state.search.datePublished){
      params.date_published = state.search.datePublished;
    }
    if(state.search.dateCreated){
      params.date_created = state.search.dateCreated;
    }
    axios.post(restUrl + '/search/references/', params )

        .then(res => {
          const curieValues = res.data.hits.filter(hit => hit.cross_references !== null).flatMap(hit =>
              hit.cross_references.map(cross_reference => cross_reference.curie)
          );
          axios.post(restUrl + '/cross_reference/show_all', curieValues)
              .then(resXref => {
                let curieToCrossRefMap = resXref.data.reduce((accumulatedHashTable, currentObject) => {
                  accumulatedHashTable[currentObject.curie] = currentObject;
                  return accumulatedHashTable;
                }, {});
                dispatch(setCrossReferenceResults(curieToCrossRefMap));
                dispatch(setSearchResults(res.data.hits, res.data.return_count));
                dispatch(setSearchFacets(res.data.aggregations));
              })
              .catch(err => dispatch(setSearchError(true)));
        })
        .catch(err => dispatch(setSearchError(true)));
  }
}

export const filterFacets = (query, facetsValues, excludedFacetsValues, facetsLimits, sizeResultsCount, searchResultsPage, authorFilter, datePubmedAdded, datePubmedModified, datePublished, sortByPublishedDate) => {
  return dispatch => {
    dispatch(setFacetsLoading());
    let params = {
      query: query.replace(/\|/g,'\\|').replace(/\+/g,'\\+').replace(/OR/g,"|").replace(/AND/g,"+").trim(),
      size_result_count: sizeResultsCount,
      page: searchResultsPage,
      facets_values: facetsValues,
      negated_facets_values: excludedFacetsValues,
      facets_limits: facetsLimits,
      author_filter: authorFilter,
      sort_by_published_date_order: sortByPublishedDate
    }
    if(datePubmedModified){
      params.date_pubmed_modified = datePubmedModified;
    }
    if(datePubmedAdded){
      params.date_pubmed_arrive = datePubmedAdded;
    }
    if(datePublished){
      params.date_published = datePublished;
    }

    axios.post(restUrl + '/search/references/', params)
        .then(res => {
          dispatch(setSearchFacets(res.data.aggregations));
        })
        .catch(err => dispatch(setSearchError(true)));
  }
}

export const searchXref = (xref, setUrl) => {
  axios.get(restUrl + '/cross_reference/'+xref)
  .then(res => {
    if(res.data.pages){
      setUrl(res.data.pages[0].url)
    }else{
      setUrl(res.data.url);
    }
  })
  .catch();
}

export const setSearchSizeResultsCount = (sizeResultsCount) => ({
  type: SEARCH_SET_SEARCH_SIZE_RESULTS_COUNT,
  payload: {
    sizeResultsCount
  }
});

export const setSearchResultsPage = (searchResultsPage) => ({
  type: SEARCH_SET_SEARCH_RESULTS_PAGE,
  payload: {
    searchResultsPage
  }
});

export const setSearchQuery = (query) => ({
  type: SEARCH_SET_SEARCH_SEARCH,
  payload: {
    query
  }
});

export const setSearchFacetsValues = (facetsValues) => ({
  type: SEARCH_SET_SEARCH_FACETS_VALUES,
  payload: {
    facetsValues
  }
});

export const setSearchFacetsLimits = (facetsLimits) => ({
  type: SEARCH_SET_SEARCH_FACETS_LIMITS,
  payload: {
    facetsLimits
  }
});

export const setQueryFields = (query_fields) => ({
  type: SEARCH_SET_SEARCH_QUERY_FIELDS,
  payload: {
    query_fields: query_fields
  }
});

export const setSearchLoading = () => ({
  type: SEARCH_SET_SEARCH_LOADING
});

export const setFacetsLoading = () => ({
  type: SEARCH_SET_FACETS_LOADING
});

export const setSearchError = (value) => ({
  type: SEARCH_SET_SEARCH_ERROR,
  payload: {
    value: value
  }
});

export const setSearchResults = (searchResults, searchResultsCount) => ({
  type: SEARCH_SET_SEARCH_RESULTS,
  payload: {
    searchResultsCount: searchResultsCount,
    searchResults: searchResults
  }
});

export const setCrossReferenceResults = (crossReferenceResults) => ({
  type: SEARCH_SET_CROSS_REFERENCE_RESULTS,
  payload: {
    crossReferenceResults: crossReferenceResults
  }
});

export const setSearchFacets = (facets) => ({
  type: SEARCH_SET_SEARCH_FACETS,
  payload: {
    facets: facets
  }
});

export const addFacetValue = (facet, value) => ({
  type: SEARCH_ADD_FACET_VALUE,
  payload: {
    facet: facet,
    value: value
  }
});

export const removeFacetValue = (facet, value) => ({
  type: SEARCH_REMOVE_FACET_VALUE,
  payload: {
    facet: facet,
    value: value
  }
});

export const addExcludedFacetValue = (facet, value) => ({
  type: SEARCH_ADD_EXCLUDED_FACET_VALUE,
  payload: {
    facet: facet,
    value: value
  }
});

export const removeExcludedFacetValue = (facet, value) => ({
  type: SEARCH_REMOVE_EXCLUDED_FACET_VALUE,
  payload: {
    facet: facet,
    value: value
  }
});

export const resetFacetValues = () => ({
  type: SEARCH_RESET_FACET_VALUES
});

export const setAuthorFilter = (authorFilter) => ({
  type: SEARCH_SET_AUTHOR_FILTER,
  payload: {
    authorFilter : authorFilter
  }
});

export const setDatePubmedAdded = (datePubmed) => ({
  type: SEARCH_SET_DATE_PUBMED_ADDED,
  payload: {
      datePubmedAdded : datePubmed
    }
});

export const setDatePubmedModified = (datePubmed) => ({
  type: SEARCH_SET_DATE_PUBMED_MODIFIED,
  payload: {
    datePubmedModified : datePubmed
  }
});

export const setDatePublished = (datePubmed) => ({
  type: SEARCH_SET_DATE_PUBLISHED,
  payload: {
    datePublished : datePubmed
  }
});

export const setDateCreated = (dateCreated) => ({
  type: SEARCH_SET_DATE_CREATED,
  payload: {
    dateCreated : dateCreated
  }
});

export const setSortByPublishedDate = (sortByPublishedDate) => ({
  type: SEARCH_SET_SORT_BY_PUBLISHED_DATE,
  payload: {
    sortByPublishedDate : sortByPublishedDate
  }
});

export const setPartialMatch = (partialMatch) => ({
  type: SEARCH_SET_PARTIAL_MATCH,
  payload: {
    partialMatch : partialMatch
  }
});

export const setModPreferencesLoaded = (modPreferencesLoaded) => ({
  type: SEARCH_SET_MOD_PREFERENCES_LOADED,
  payload: {
    modPreferencesLoaded : modPreferencesLoaded
  }
});
