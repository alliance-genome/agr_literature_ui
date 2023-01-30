import {
  SEARCH_ADD_FACET_VALUE, SEARCH_REMOVE_FACET_VALUE,
  SEARCH_RESET_FACET_VALUES, SEARCH_SET_SEARCH_ERROR,
  SEARCH_SET_SEARCH_FACETS, SEARCH_SET_SEARCH_FACETS_LIMITS,
  SEARCH_SET_SEARCH_FACETS_VALUES, SEARCH_SET_DATE_PUBMED_ADDED,
  SEARCH_SET_SEARCH_LOADING, SEARCH_SET_SEARCH_SEARCH,
  SEARCH_SET_SEARCH_RESULTS, SEARCH_SET_SEARCH_RESULTS_PAGE,
  SEARCH_SET_SEARCH_SIZE_RESULTS_COUNT, SEARCH_SET_AUTHOR_FILTER,
  SEARCH_SET_FACETS_LOADING, SEARCH_SET_DATE_PUBMED_MODIFIED,
  SEARCH_SET_DATE_PUBLISHED,
  SEARCH_SET_SEARCH_QUERY_FIELDS
} from '../actions/searchActions';

import _ from "lodash";


export const INITIAL_FACETS_LIMIT = 10;

const initialState = {
  searchResults: [],
  searchResultsCount: 0,
  searchSizeResultsCount: 10,
  searchResultsPage: 0,
  searchLoading: false,
  facetsLoading: false,
  searchSuccess: false,
  searchFacets: {},
  searchFacetsValues: {},
  searchFacetsLimits: {
    'pubmed_types.keyword': INITIAL_FACETS_LIMIT,
    'category.keyword': INITIAL_FACETS_LIMIT,
    'pubmed_publication_status.keyword': INITIAL_FACETS_LIMIT,
    'authors.name.keyword': INITIAL_FACETS_LIMIT
  },
  searchFacetsShowMore: {},
  searchQuery: "",
  authorFilter: "",
  datePubmedAdded: "",
  datePubmedModified: "",
  datePublished: "",
  query_fields:"All"
};

// to ignore a warning about Unexpected default export of anonymous function
// eslint-disable-next-line
export default function(state = initialState, action) {
  // action will have a type.  common to evaluate with a switch
  switch (action.type) {
    case 'SEARCH_CHANGE_QUERY_FIELD':
      console.log(action.payload);
      return {
        ...state,
        [action.payload.field]: action.payload.value
      }

    case SEARCH_SET_SEARCH_RESULTS:
      // console.log("reducer SEARCH_SET_SEARCH_RESULTS")
      // console.log(action.payload.searchResults);
      return {
        ...state,
        searchLoading: false,
        searchSuccess: true,
        searchError: false,
        searchResultsCount: action.payload.searchResultsCount,
        searchResults: action.payload.searchResults
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

    case SEARCH_RESET_FACET_VALUES:
      return {
        ...state,
        searchFacetsValues: {}
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

    case SEARCH_SET_SEARCH_FACETS_LIMITS:
      // console.log("reducer SEARCH_SET_SEARCH_FACETS_LIMITS")
      // console.log(action.payload.facetsLimits);
      return {
        ...state,
        searchFacetsLimits: action.payload.facetsLimits
      }

//     case 'FETCH_POSTS':
//       console.log('in postReducer case FETCH_POSTS');
//       return {
//         ...state,
//         items: action.payload   // from postActions.js
//       }
//     case 'NEW_POSTS':
//       console.log('in postReducer case NEW_POSTS');
//       return {
//         ...state,
//         items: [action.payload, ...state.items],        // from postActions.js
//         item: action.payload    // from postActions.js
//       }
    default:
      return state;
  }
}


// const crossRefCurieQueryFieldReducer = (state = 'ab', action) => {
//   switch (action.type) {
//     case 'CHANGE_FIELD':
//       // console.log(action.payload);
//       return action.payload;
//     case 'SEARCH_BUTTON':
//       console.log("query button reducer set " + action.payload);
//       return action.payload;
//     default:
//       return state;
//   }
// }
// export default crossRefCurieQueryFieldReducer;
