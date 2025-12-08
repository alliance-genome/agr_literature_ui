import {
  SEARCH_ADD_FACET_VALUE, SEARCH_REMOVE_FACET_VALUE,
  SEARCH_ADD_EXCLUDED_FACET_VALUE, SEARCH_REMOVE_EXCLUDED_FACET_VALUE,
  SEARCH_RESET_FACET_VALUES, SEARCH_SET_SEARCH_ERROR,
  SEARCH_SET_SEARCH_FACETS, SEARCH_SET_SEARCH_FACETS_LIMITS,
  SEARCH_SET_SEARCH_FACETS_VALUES, SEARCH_SET_DATE_PUBMED_ADDED,
  SEARCH_SET_SEARCH_LOADING, SEARCH_SET_SEARCH_SEARCH,
  SEARCH_SET_SEARCH_RESULTS, SEARCH_SET_SEARCH_RESULTS_PAGE,
  SEARCH_SET_SEARCH_SIZE_RESULTS_COUNT, SEARCH_SET_AUTHOR_FILTER,
  SEARCH_SET_FACETS_LOADING, SEARCH_SET_DATE_PUBMED_MODIFIED,
  SEARCH_SET_DATE_PUBLISHED, SEARCH_SET_SEARCH_QUERY_FIELDS,
  SEARCH_SET_SORT_BY_PUBLISHED_DATE, SEARCH_SET_PARTIAL_MATCH,
  SEARCH_SET_DATE_CREATED, SEARCH_SET_CROSS_REFERENCE_RESULTS,
  SEARCH_SET_MOD_PREFERENCES_LOADED, SEARCH_SET_APPLY_TO_SINGLE_TAG,
  SEARCH_SET_READY_TO_FACET_SEARCH, SEARCH_REMOVE_DATE_PUBMED_ADDED,
  SEARCH_REMOVE_DATE_PUBMED_MODIFIED, SEARCH_REMOVE_DATE_PUBLISHED,
  SEARCH_REMOVE_DATE_CREATED, SEARCH_SET_CURIE_MAIN_PDF_IDS_MAP_RESULTS,
  SEARCH_SET_CURRENT_ABORT_CONTROLLER,
  SEARCH_LOAD_SAVED_SEARCH_STATE
} from '../actions/searchActions';

import _ from "lodash";



export const INITIAL_FACETS_LIMIT = 10;

const initialState = {
  searchResults: [],
  crossReferenceResults: {},
  searchResultsCount: 0,
  searchSizeResultsCount: 50,
  searchResultsPage: 1,
  searchLoading: false,
  facetsLoading: false,
  searchSuccess: false,
  searchFacets: {},
  searchFacetsValues: {},
  searchExcludedFacetsValues: {},
  searchFacetsLimits: {
    'pubmed_types.keyword': INITIAL_FACETS_LIMIT,
    'mod_reference_types.keyword': INITIAL_FACETS_LIMIT,
    'category.keyword': INITIAL_FACETS_LIMIT,
    'pubmed_publication_status.keyword': INITIAL_FACETS_LIMIT,
    'authors.name.keyword': INITIAL_FACETS_LIMIT,
    'topics': INITIAL_FACETS_LIMIT,
    'confidence_levels': INITIAL_FACETS_LIMIT,
    'source_methods': INITIAL_FACETS_LIMIT,
    'source_evidence_assertions': INITIAL_FACETS_LIMIT,
    'workflow_tags.workflow_tag_id.keyword': INITIAL_FACETS_LIMIT
  },
  searchFacetsShowMore: {},
  searchQuery: "",
  readyToFacetSearch: false,
  authorFilter: "",
  datePubmedAdded: "",
  datePubmedModified: "",
  datePublished: "",
  dateCreated: "",
  query_fields:"All",
  sortByPublishedDate: "relevance",  
  sort_by_published_date_order:"relevance",
  partialMatch:"true",
  modPreferencesLoaded:"false",
  applyToSingleTag: true,
  curiePDFIDsMap: {},
  currentAbortController: null  
};

// to ignore a warning about Unexpected default export of anonymous function
// eslint-disable-next-line
export default function(state = initialState, action) {
  // action will have a type.  common to evaluate with a switch
  switch (action.type) {
    case 'SEARCH_CHANGE_QUERY_FIELD':
      return {
        ...state,
        [action.payload.field]: action.payload.value
      }

    case SEARCH_SET_READY_TO_FACET_SEARCH:
      return {
        ...state,
        readyToFacetSearch: action.payload.value
      }

    case SEARCH_SET_SEARCH_RESULTS:
      return {
        ...state,
        searchLoading: false,
        searchSuccess: true,
        searchError: false,
        searchResultsCount: action.payload.searchResultsCount,
        searchResults: action.payload.searchResults
      }

    case SEARCH_SET_CROSS_REFERENCE_RESULTS:
      return {
        ...state,
        crossReferenceResults: action.payload.crossReferenceResults
      }

    case SEARCH_SET_CURIE_MAIN_PDF_IDS_MAP_RESULTS:
      return {
        ...state,
        curiePDFIDsMap: action.payload.curiePDFIDsMap
      }

    case SEARCH_SET_SEARCH_LOADING:
      return {
        ...state,
        searchLoading: true,
        searchSuccess: false,
        searchError: false,
        searchResults: []
      }

    case SEARCH_SET_FACETS_LOADING:
      return {
        ...state,
        facetsLoading: true
      }

    case SEARCH_SET_SEARCH_ERROR:
      return {
        ...state,
        searchLoading: false,
        searchError: action.payload.value,
        searchSuccess: false,
        searchResults: []
      }

    case SEARCH_SET_SEARCH_SIZE_RESULTS_COUNT:
      return {
        ...state,
        searchSizeResultsCount: action.payload.sizeResultsCount
      }

    case SEARCH_SET_SEARCH_RESULTS_PAGE:
      return {
        ...state,
        searchResultsPage: action.payload.searchResultsPage
      }

    case SEARCH_SET_SEARCH_SEARCH:
      return {
        ...state,
        searchQuery: action.payload.query
      }

    case SEARCH_SET_AUTHOR_FILTER:
      return {
        ...state,
        authorFilter: action.payload.authorFilter
      }

    case SEARCH_SET_DATE_PUBMED_ADDED:
      return {
        ...state,
        datePubmedAdded: action.payload.datePubmedAdded
      }

    case SEARCH_SET_DATE_PUBMED_MODIFIED:
      return {
        ...state,
        datePubmedModified: action.payload.datePubmedModified
      }

    case SEARCH_SET_DATE_PUBLISHED:
      return {
        ...state,
        datePublished: action.payload.datePublished
      }

    case SEARCH_SET_DATE_CREATED:
      return {
        ...state,
        dateCreated: action.payload.dateCreated
      }

    case SEARCH_SET_SEARCH_FACETS:
      return {
        ...state,
        searchFacets: action.payload.facets,
        facetsLoading: false
      }

    case SEARCH_SET_SEARCH_FACETS_VALUES:
      return {
        ...state,
        searchFacetsValues: action.payload.facetsValues
      }

    case SEARCH_ADD_FACET_VALUE:
      let addSearchFacetsValues = _.cloneDeep(state.searchFacetsValues);
      if (!addSearchFacetsValues.hasOwnProperty(action.payload.facet)) {
        addSearchFacetsValues[action.payload.facet] = [];
      }
      addSearchFacetsValues[action.payload.facet].push(action.payload.value);
      return {
        ...state,
        searchFacetsValues: addSearchFacetsValues
      }

    case SEARCH_ADD_EXCLUDED_FACET_VALUE:
      let addExcludedSearchFacetsValues = _.cloneDeep(state.searchExcludedFacetsValues);
      if (!addExcludedSearchFacetsValues.hasOwnProperty(action.payload.facet)) {
        addExcludedSearchFacetsValues[action.payload.facet] = [];
      }
      addExcludedSearchFacetsValues[action.payload.facet].push(action.payload.value);
      return {
        ...state,
        searchExcludedFacetsValues: addExcludedSearchFacetsValues
      }

    case SEARCH_RESET_FACET_VALUES:
      return {
        ...state,
        searchFacetsValues: {},
        searchExcludedFacetsValues: {}
      }

    case SEARCH_SET_SEARCH_QUERY_FIELDS:
      return {
        ...state,
        query_fields: action.payload.query_fields
      }

    case SEARCH_REMOVE_FACET_VALUE:
      let remSearchFacetsValues = _.cloneDeep(state.searchFacetsValues);
      remSearchFacetsValues[action.payload.facet] = remSearchFacetsValues[action.payload.facet].filter(
            e => e !== action.payload.value)
      if (remSearchFacetsValues[action.payload.facet].length === 0) {
        delete remSearchFacetsValues[action.payload.facet];
      }
      return {
        ...state,
        searchFacetsValues: remSearchFacetsValues
      }

    case SEARCH_REMOVE_EXCLUDED_FACET_VALUE:
      let remSearchExcludedFacetsValues = _.cloneDeep(state.searchExcludedFacetsValues);
      remSearchExcludedFacetsValues[action.payload.facet] = remSearchExcludedFacetsValues[action.payload.facet].filter(
          e => e !== action.payload.value)
      if (remSearchExcludedFacetsValues[action.payload.facet].length === 0) {
        delete remSearchExcludedFacetsValues[action.payload.facet];
      }
      return {
        ...state,
        searchExcludedFacetsValues: remSearchExcludedFacetsValues
      }

    case SEARCH_SET_SEARCH_FACETS_LIMITS:
      return {
        ...state,
        searchFacetsLimits: action.payload.facetsLimits
      }

    case SEARCH_SET_SORT_BY_PUBLISHED_DATE:
      return {
        ...state,
        sortByPublishedDate: action.payload.sortByPublishedDate
      }

    case SEARCH_SET_PARTIAL_MATCH:
      return {
        ...state,
        partialMatch: action.payload.partialMatch
      }

    case SEARCH_SET_MOD_PREFERENCES_LOADED:
      return {
        ...state,
        modPreferencesLoaded: action.payload.modPreferencesLoaded
      }

    case SEARCH_SET_APPLY_TO_SINGLE_TAG:
      console.log('Updating applyToSingleTag to:', action.payload);
      return {
        ...state,
        applyToSingleTag: action.payload
      }

        case 'SEARCH_SET_DATE_PUBMED_ADDED':
            return {
                ...state,
                datePubmedAdded: action.payload
            };
        case 'SEARCH_REMOVE_DATE_PUBMED_ADDED':
            return {
                ...state,
                datePubmedAdded: ''
            };
        case 'SEARCH_SET_DATE_PUBMED_MODIFIED':
            return {
                ...state,
                datePubmedModified: action.payload
            };
        case 'SEARCH_REMOVE_DATE_PUBMED_MODIFIED':
            return {
                ...state,
                datePubmedModified: ''
            };
        case 'SEARCH_SET_DATE_PUBLISHED':
            return {
                ...state,
                datePublished: action.payload
            };
        case 'SEARCH_REMOVE_DATE_PUBLISHED':
            return {
                ...state,
                datePublished: ''
            };
        case 'SEARCH_SET_DATE_CREATED':
            return {
                ...state,
                dateCreated: action.payload
            };
        case 'SEARCH_REMOVE_DATE_CREATED':
            return {
                ...state,
                dateCreated: ''
            };
        case 'SEARCH_SET_CURRENT_ABORT_CONTROLLER':
            return {
                ...state,
                currentAbortController: action.payload,
            };
        // Clear out the controller once the request is complete or fails
        case 'SEARCH_SUCCESS':
        case 'SEARCH_FAILURE':
            return {
                ...state,
                currentAbortController: null,
            };
        // Load a saved search setting from the database into Redux state
        case SEARCH_LOAD_SAVED_SEARCH_STATE:
          // action.payload = the json_settings we saved earlier
          const p = action.payload || {};

          // The reducer merges that saved state into the current search state
          // Anything not present in the saved setting is left unchanged (eg pagination etc)
          return {
	    // preserve the rest of Redux state
            ...state,

	    // If the saved search has a value -> use it
	    // If it does not -> keep the current value

	    // basic query + field
            searchQuery: p.searchQuery ?? state.searchQuery,
            query_fields: p.query_fields ?? state.query_fields,

            // facets (positive & excluded)
            searchFacetsValues:
              p.searchFacetsValues ?? state.searchFacetsValues,
            searchExcludedFacetsValues:
              p.searchExcludedFacetsValues ?? state.searchExcludedFacetsValues,

            // date filters
            datePubmedAdded: p.datePubmedAdded ?? state.datePubmedAdded,
            datePubmedModified: p.datePubmedModified ?? state.datePubmedModified,
            datePublished: p.datePublished ?? state.datePublished,
            dateCreated: p.dateCreated ?? state.dateCreated,

            // options
            sortByPublishedDate: p.sortByPublishedDate ?? state.sortByPublishedDate,
            partialMatch: (typeof p.partialMatch !== 'undefined') ? p.partialMatch : state.partialMatch,
	    applyToSingleTag: (typeof p.applyToSingleTag !== 'undefined') ? p.applyToSingleTag : state.applyToSingleTag,
          };
    default:
      return state;
  }
}
