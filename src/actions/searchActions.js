import axios from "axios";
import { api } from "../api";
import { compileAdvancedQuery } from "../components/search/advanced/advancedQueryModel";
//import {useDispatch, useSelector} from 'react-redux';

export const SEARCH_SET_SEARCH_RESULTS_COUNT = 'SEARCH_SET_SEARCH_RESULTS_COUNT';
export const SEARCH_SET_SEARCH_RESULTS_PAGE = 'SEARCH_SET_SEARCH_RESULTS_PAGE';
export const SEARCH_SET_SEARCH_RESULTS = 'SEARCH_SET_SEARCH_RESULTS';
export const SEARCH_SET_CROSS_REFERENCE_RESULTS = 'SEARCH_SET_CROSS_REFERENCE_RESULTS';
export const SEARCH_SET_CURIE_MAIN_PDF_IDS_MAP_RESULTS = 'SEARCH_SET_CURIE_MAIN_PDF_IDS_MAP_RESULTS';
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
export const SEARCH_SET_CONFIDENCE_SCORE = 'SEARCH_SET_CONFIDENCE_SCORE';
export const SEARCH_SET_SEARCH_QUERY_FIELDS = 'SEARCH_SET_SEARCH_QUERY_FIELDS';
export const SEARCH_SET_SORT_BY_PUBLISHED_DATE = 'SEARCH_SET_SORT_BY_PUBLISHED_DATE';
export const SEARCH_SET_PARTIAL_MATCH = 'SEARCH_SET_PARTIAL_MATCH';
export const SEARCH_SET_MOD_PREFERENCES_LOADED = 'SEARCH_SET_MOD_PREFERENCES_LOADED';
export const SEARCH_SET_APPLY_TO_SINGLE_TAG = 'SEARCH_SET_APPLY_TO_SINGLE_TAG';
export const SEARCH_SET_READY_TO_FACET_SEARCH = "SEARCH_SET_READY_TO_FACET_SEARCH";
export const SEARCH_REMOVE_DATE_PUBMED_ADDED = "SEARCH_REMOVE_DATE_PUBMED_ADDED"
export const SEARCH_REMOVE_DATE_PUBMED_MODIFIED = "SEARCH_REMOVE_DATE_PUBMED_MODIFIED"
export const SEARCH_REMOVE_DATE_PUBLISHED = "SEARCH_REMOVE_DATE_PUBLISHED"
export const SEARCH_REMOVE_DATE_CREATED = "SEARCH_REMOVE_DATE_CREATED"
export const SEARCH_SET_CURRENT_ABORT_CONTROLLER = 'SEARCH_SET_CURRENT_ABORT_CONTROLLER';
export const SEARCH_LOAD_SAVED_SEARCH_STATE = 'SEARCH_LOAD_SAVED_SEARCH_STATE';
export const SEARCH_SET_SEARCH_MODE = 'SEARCH_SET_SEARCH_MODE';
export const SEARCH_SET_ADVANCED_TOPIC_QUERY = 'SEARCH_SET_ADVANCED_TOPIC_QUERY';
export const SEARCH_SET_ADVANCED_FACETS_VOCAB = 'SEARCH_SET_ADVANCED_FACETS_VOCAB';

const TET_FACETS_LIST = ["topics", "confidence_levels", "source_methods", "source_evidence_assertions","data_novelty"];

// Upper bound for the Advanced query builder's value dropdowns. The facet panel
// paginates (INITIAL_FACETS_LIMIT with Show More/All), and every search overwrites
// searchFacets with result-scoped, limited buckets — so the builder can't rely on
// it for a complete list. Mirrors the facet panel's "Show All" limit (1000).
const ADVANCED_VOCAB_LIMIT = 1000;

export const loadSavedSearchState = (saved) => ({
  type: SEARCH_LOAD_SAVED_SEARCH_STATE,
  payload: saved
});

export const changeQueryField = (e) => {
  //console.log('action change field ' + e.target.id + ' to ' + e.target.value);
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
    api.post('/search/references/', {
      query: null,
      facets_values: null,
      facets_limits: facetsLimits,
      return_facets_only: true
    })
        .then(res => {
          if (
            res.data &&
            !res.data.hits &&
            !res.data.aggregations &&
            res.data.error
          ) {
            dispatch(setSearchError('Elasticsearch has an error, index may be rebuilding.  Detailed error message: ' + res.data.error));
          } else {
            dispatch(setSearchFacets(res.data.aggregations));
          }
          // dispatch(setSearchFacets(res.data.aggregations));
        })
        .catch();
  }
}

// Fetch the TET sub-facet vocabulary for the Advanced query builder (SCRUM-6228),
// scoped to the currently selected corpus/MOD so the dropdowns list only the topics
// (and sources) relevant to that MOD rather than the whole ontology. Uses query:null
// with the MOD facet keys as facets_values and a high per-facet limit so the lists
// aren't truncated to the facet panel's INITIAL_FACETS_LIMIT. Stored separately from
// searchFacets so a later search's result-scoped aggregations don't overwrite it, and
// re-fetched when the MOD selection changes. When no MOD is selected, falls back to
// the global list.
export const fetchAdvancedFacetsVocab = () => {
  return (dispatch, getState) => {
    const fv = (getState().search && getState().search.searchFacetsValues) || {};
    // Mirror the corpus/MOD facet keys the search itself uses to scope aggregations.
    const facets_values = {};
    ['mods_in_corpus.keyword', 'mods_needs_review.keyword', 'mods_in_corpus_or_needs_review.keyword']
      .forEach((k) => {
        if (Array.isArray(fv[k]) && fv[k].length > 0) facets_values[k] = fv[k];
      });
    const mods = Array.from(new Set(Object.values(facets_values).flat()));
    const hasMod = mods.length > 0;

    const facets_limits = TET_FACETS_LIST.reduce((acc, key) => {
      acc[key] = ADVANCED_VOCAB_LIMIT;
      return acc;
    }, {});
    // Source methods are aggregated only within a corpus/MOD scope, so the aggregation
    // returns them only when a MOD is selected. The dedicated endpoint carries the full
    // list with its owning MOD, so use it to fill/scope source methods when the
    // aggregation doesn't.
    Promise.all([
      api.post('/search/references/', {
        query: null,
        facets_values: hasMod ? facets_values : null,
        facets_limits: facets_limits,
        return_facets_only: true
      })
        .then(res => (res.data && res.data.aggregations) ? res.data.aggregations : {})
        .catch(() => ({})),
      api.get('/topic_entity_tag/source/all')
        .then(res => Array.isArray(res.data) ? res.data : [])
        .catch(() => [])
    ]).then(([aggregations, sources]) => {
      const vocab = { ...aggregations };
      const aggSources = (vocab.source_methods && Array.isArray(vocab.source_methods.buckets))
        ? vocab.source_methods.buckets : [];
      // Prefer the MOD-scoped aggregation's source methods; otherwise derive them from
      // the endpoint, filtered to the selected MOD(s) when one is chosen. The endpoint
      // returns one row per MOD, so dedupe by name; bucket.key is the source_method
      // string, matching the value the search filter expects.
      if (aggSources.length === 0) {
        const modSet = new Set(mods);
        const seen = new Set();
        const sourceBuckets = [];
        for (const item of sources) {
          const key = item && item.source_method ? String(item.source_method) : '';
          if (!key || seen.has(key)) continue;
          if (hasMod) {
            const provider = item.data_provider || item.secondary_data_provider_abbreviation;
            if (!modSet.has(provider)) continue;
          }
          seen.add(key);
          sourceBuckets.push({ key });
        }
        sourceBuckets.sort((a, b) => a.key.localeCompare(b.key));
        if (sourceBuckets.length > 0) vocab.source_methods = { buckets: sourceBuckets };
      }
      if (Object.keys(vocab).length > 0) dispatch(setAdvancedFacetsVocab(vocab));
    });
  }
}

function processCombinedTETFacets(data, tetNestedFacetsValues) {
  const non_empty_facets = TET_FACETS_LIST.filter(tet_facet_label => data[tet_facet_label] &&
      data[tet_facet_label].length > 0)
  if (non_empty_facets.length > 0) {
    tetNestedFacetsValues.push(
        Object.fromEntries(
            non_empty_facets.map(

                tet_facet_label => [tet_facet_label === 'data_novelty' ? `topic_entity_tags.${tet_facet_label}.keyword`: `topic_entity_tags.${tet_facet_label.slice(0, -1)}.keyword`, data[tet_facet_label][0]]
            )
        )
    );
  }
}

function processSingleFacet(facetArray, facetKey, tetNestedFacetsValues) {
  facetArray.forEach(item => {
    const newEntry = { [facetKey]: item };
    if (!tetNestedFacetsValues.some(entry => JSON.stringify(entry) === JSON.stringify(newEntry))) {
      tetNestedFacetsValues.push(newEntry);
    }
  });
}

const getSearchParams = (state) => {
  const query =
    state.search.searchQuery
      .replace(/\|/g, '\\|')          // escape literal pipes
      .replace(/\+/g, '\\+')          // escape literal pluses
      .replace(/\bOR\b/gi, '|')       // ONLY standalone OR
      .replace(/\bAND\b/gi, '+')      // ONLY standalone AND
      .trim();
  const author_filter = String(state.search.authorFilter ?? '').trim();  
  let params = {
    query: query,
    size_result_count: state.search.searchSizeResultsCount,
    page: state.search.searchResultsPage,
    facets_limits: state.search.searchFacetsLimits,
    query_fields: state.search.query_fields,
    sort_by_published_date_order: state.search.sortByPublishedDate,
    partial_match: state.search.partialMatch,
    mod_abbreviation: state.isLogged.testerMod !== 'No' ? state.isLogged.testerMod : state.isLogged.cognitoMod,
    confidence_score: state.search.confidenceScore
  }
  // Only add author_filter if it has a value
  if (author_filter) {
    params.author_filter = author_filter;
  }
  const data = state.search.searchFacetsValues;
  const negated_facets= state.search.searchExcludedFacetsValues;
  // TET (nested) negated facets are routed through tet_facets_negative_values below, not the
  // flat negated_facets_values (which is only for non-nested facets).
  const tetNegatedKeys = ["confidence_levels", "source_methods", "source_evidence_assertions"];
  const negated_facets_values = {};
  Object.keys(negated_facets).forEach(key => {
    if (!tetNegatedKeys.includes(key)) {
      negated_facets_values[key] = negated_facets[key];
    }
  });
  params.negated_facets_values  = negated_facets_values;
  const tetNestedFacetsValues = [];
  const tetNestedNegatedFacetsValues = [];
  const facetsValues = {};
  if (state.search.applyToSingleTag) {
      processCombinedTETFacets(data, tetNestedFacetsValues);
  } else {
      TET_FACETS_LIST.forEach(key => {
	  if (data[key]) {
	      const facetType = key.slice(0, -1); // topics => topic
	      const keyword = `topic_entity_tags.${facetType}.keyword`;
	      processSingleFacet(data[key], keyword, tetNestedFacetsValues);
	  }
      });
  }

  // Negated TET facets. Source method / source evidence assertion exclusions use
  // whole-reference semantics on the backend (drop a reference if ANY of its tags matches an
  // excluded value). Confidence level exclusion is topic-scoped: the backend combines the
  // excluded level with the selected topic/entity terms so a reference is dropped only when it
  // has a tag that is both the selected topic AND the excluded level (a NEG tag on a different
  // topic does not remove it); with no positive TET facet it falls back to any tag at that
  // level. All apply in both single- and multi-tag modes.
  // All negated TET keys are carried in ONE merged object: the backend reads only
  // tet_facets_negative_values[0] and turns each source/SEA key into its own independent
  // must_not nested clause, so splitting them into separate array entries would silently drop
  // everything past index [0].
  const negatedTetEntry = {};
  if (negated_facets.source_methods && negated_facets.source_methods.length > 0) {
      negatedTetEntry["topic_entity_tags.source_method.keyword"] = negated_facets.source_methods;
  }
  if (negated_facets.source_evidence_assertions && negated_facets.source_evidence_assertions.length > 0) {
      negatedTetEntry["topic_entity_tags.source_evidence_assertion.keyword"] = negated_facets.source_evidence_assertions;
  }
  if (negated_facets.confidence_levels && negated_facets.confidence_levels.length > 0) {
      negatedTetEntry["topic_entity_tags.confidence_level.keyword"] = negated_facets.confidence_levels;
  }
  if (Object.keys(negatedTetEntry).length > 0) {
      tetNestedNegatedFacetsValues.push(negatedTetEntry);
  }
  Object.keys(data).forEach(key => {
      if (!TET_FACETS_LIST.includes(key)) {
        facetsValues[key] = data[key];
      }
  });
    
  params.facets_values = facetsValues;
  params.tet_nested_facets_values = {
      "apply_to_single_tag": state.search.applyToSingleTag,
      "tet_facets_values": tetNestedFacetsValues,
      "tet_facets_negative_values": tetNestedNegatedFacetsValues
  };

  //If we still have the default values... don't add this.
  if(!(params.confidence_score[0] === 0 && params.confidence_score[1] === 1)){
    const tetFacetsValues = params.tet_nested_facets_values.tet_facets_values;
    if (state.search.applyToSingleTag && tetFacetsValues.length > 0) {
      // SCRUM-6184: in single-tag mode the confidence score must apply to the SAME tag
      // as the other selected TET facets (e.g. the chosen topic). The backend turns each
      // object in tet_facets_values into its own nested query, so a separate confidence
      // object would be matched by any other tag on the reference -- letting through tags
      // whose own confidence score is outside the slider range. Merge it into the combined
      // nested object instead so both conditions must hold on one tag.
      tetFacetsValues[0]["topic_entity_tags.confidence_score"] = params.confidence_score;
    } else {
      tetFacetsValues.push({"topic_entity_tags.confidence_score": params.confidence_score});
    }
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

  const WORKFLOW_FACETS = ["file_workflow", "manual_indexing", "entity_extraction", "reference_classification"];
  Object.keys(data).forEach(key => {
    if (!TET_FACETS_LIST.includes(key) || WORKFLOW_FACETS.includes(key)) {
        facetsValues[key] = data[key];
    }
  });

  // Advanced Topic search (SCRUM-6228): when the query builder is active, replace
  // the flat TET nested-facet mechanism with the compiled AND/OR tree. Non-TET
  // facets (category, corpus/MOD, dates, workflow) still flow through unchanged.
  if (state.search.searchMode === 'advanced') {
    const compiled = compileAdvancedQuery(state.search.advancedTopicQuery);
    delete params.tet_nested_facets_values;
    if (compiled) {
      params.tet_advanced_query = compiled;
    }
  }

  console.log('POST /search/references payload', params);
  return params;
}

export const downloadSearchReferences = () => {
  return (dispatch, getState) => {
    const state = getState();
    let params = getSearchParams(state);
    params.size_result_count = 1000;	// always download up to 1000 results
    return api.post('/search/references/', params)
      .then(res => {
        if (
          res.data &&
          !res.data.hits &&
          !res.data.aggregations &&
          res.data.error
        ) {
          dispatch(setSearchError('Elasticsearch has an error, index may be rebuilding.  Detailed error message: ' + res.data.error));
          return Promise.reject(res.data.error);
        } else {
          return res.data; // Return all data in case curators later want count in download file
        }
      })
      .catch(err => {
        if (axios.isCancel(err)) {
          console.log("Request cancelled: " + err.message);
        } else {
          dispatch(setSearchError(true));
        }
        return Promise.reject(err);
      });
  }
}


export const searchReferences = () => {
  return (dispatch, getState) => {
    const state = getState();

    // cancel any previous request if it exists.
    if (state.search.currentAbortController) {
      state.search.currentAbortController.cancel("Cancelled in favor of new search request");
    }

    // create a new CancelToken source for the current request.
    const cancelSource = axios.CancelToken.source();
    dispatch(setCurrentAbortController(cancelSource));

    dispatch(setSearchLoading());
    let params = getSearchParams(state);

    // main search request with cancel token.
    api.post('/search/references/', params, { cancelToken: cancelSource.token })
      .then(res => {
        if (
          res.data &&
          !res.data.hits &&
          !res.data.aggregations &&
          res.data.error
        ) {
          dispatch(setSearchError('Elasticsearch has an error, index may be rebuilding.  Detailed error message: ' + res.data.error));
        } else {
          const xrefCurieValues = res.data.hits
            .filter(hit => hit.cross_references !== null)
            .flatMap(hit => hit.cross_references.map(cr => cr.curie));
          const curies = res.data.hits.map(hit => hit.curie);

          api.post('/cross_reference/show_all', xrefCurieValues, { cancelToken: cancelSource.token })
            .then(resXref => {
              let curieToCrossRefMap = resXref.data.reduce((acc, cur) => {
                acc[cur.curie] = cur;
                return acc;
              }, {});

              api.post('/reference/referencefile/show_main_pdf_ids_for_curies', {
                curies: curies,
                mod_abbreviation: params.mod_abbreviation
              }, { cancelToken: cancelSource.token })
              .then(resCuriePDFIDsMap => {
                dispatch(setCuriePDFIDsMap(resCuriePDFIDsMap.data));
                dispatch(setCrossReferenceResults(curieToCrossRefMap));
                dispatch(setSearchResults(res.data.hits, res.data.return_count));
                dispatch(setSearchFacets(res.data.aggregations));
                dispatch(setReadyToFacetSearch(true));
              })
              .catch(err => {
                if (axios.isCancel(err)) {
                  console.log("Request cancelled: " + err.message);
                } else {
                  dispatch(setSearchError(true));
                }
              });
            })
            .catch(err => {
              if (axios.isCancel(err)) {
                console.log("Request cancelled: " + err.message);
              } else {
                dispatch(setSearchError(true));
              }
            });
          }
      })
      .catch(err => {
        if (axios.isCancel(err)) {
          console.log("Request cancelled: " + err.message);
        } else {
          dispatch(setSearchError(true));
        }
      });
  }
}

export const filterFacets = () => {
  return (dispatch,getState) => {
    dispatch(setFacetsLoading());
    let state= getState();
    let params= getSearchParams(state);

    api.post('/search/references/', params)
        .then(res => {
          if (
            res.data &&
            !res.data.hits &&
            !res.data.aggregations &&
            res.data.error
          ) {
            dispatch(setSearchError('Elasticsearch has an error, index may be rebuilding.  Detailed error message: ' + res.data.error));
          } else {
            dispatch(setSearchFacets(res.data.aggregations));
          }
        })
        .catch(err => dispatch(setSearchError(true)));
  }
}

export const searchXref = (xref, setUrl) => {
  api.get('/cross_reference/'+xref)
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

export const setCuriePDFIDsMap = (curiePDFIDsMap) => ({
  type: SEARCH_SET_CURIE_MAIN_PDF_IDS_MAP_RESULTS,
  payload: {
    curiePDFIDsMap: curiePDFIDsMap
  }
});

export const setSearchFacets = (facets) => ({
  type: SEARCH_SET_SEARCH_FACETS,
  payload: {
    facets: facets
  }
});

export const setAdvancedFacetsVocab = (facets) => ({
  type: SEARCH_SET_ADVANCED_FACETS_VOCAB,
  payload: {
    facets: facets
  }
});

export const setReadyToFacetSearch = (value) => ({
  type: SEARCH_SET_READY_TO_FACET_SEARCH,
  payload: {
    value: value
  }
})

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

export const setConfidenceScore = (confidenceScore) => ({
  type: SEARCH_SET_CONFIDENCE_SCORE,
  payload: {
    confidenceScore : confidenceScore
  }
})

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

export const setApplyToSingleTag = (value) => ({
    type: 'SEARCH_SET_APPLY_TO_SINGLE_TAG',
    payload: value
});

export const removeDatePubmedAdded = () => ({
    type: 'SEARCH_REMOVE_DATE_PUBMED_ADDED'
});

export const removeDatePubmedModified = () => ({
    type: 'SEARCH_REMOVE_DATE_PUBMED_MODIFIED'
});

export const removeDatePublished = () => ({
    type: 'SEARCH_REMOVE_DATE_PUBLISHED'
});

export const removeDateCreated = () => ({
    type: 'SEARCH_REMOVE_DATE_CREATED'
});

export const setCurrentAbortController = (cancelSource) => ({
  type: SEARCH_SET_CURRENT_ABORT_CONTROLLER,
  payload: cancelSource
});

// Advanced Topic query builder (SCRUM-6228). searchMode toggles between the
// facet panel ('facet') and the query builder ('advanced'); advancedTopicQuery
// holds the builder's UI tree (compiled to tet_advanced_query at search time).
export const setSearchMode = (mode) => ({
  type: SEARCH_SET_SEARCH_MODE,
  payload: mode
});

export const setAdvancedTopicQuery = (tree) => ({
  type: SEARCH_SET_ADVANCED_TOPIC_QUERY,
  payload: tree
});
