import {
  QUERY_ADD_FACET_VALUE, QUERY_REMOVE_FACET_VALUE,
  QUERY_SET_SEARCH_ERROR,
  QUERY_SET_SEARCH_FACETS, QUERY_SET_SEARCH_FACETS_LIMITS,
  QUERY_SET_SEARCH_FACETS_VALUES,
  QUERY_SET_SEARCH_LOADING, QUERY_SET_SEARCH_QUERY,
  QUERY_SET_SEARCH_RESULTS,
  QUERY_SET_SEARCH_SIZE_RESULTS_COUNT,
} from '../actions/queryActions';

import _ from "lodash";


export const INITIAL_FACETS_LIMIT = 10;

const initialState = {
  searchResults: [],
  searchResultsCount: 0,
  searchSizeResultsCount: 10,
  searchLoading: false,
  searchSuccess: false,
  searchFacets: {},
  searchFacetsValues: {},
  searchFacetsLimits: {
    'pubmed_types.keyword': INITIAL_FACETS_LIMIT
  },
  searchQuery: null,
  xrefcurieField: '',
  querySuccess: false,
  responseColor: 'black',
  responseField: 'unknown reference',
  redirectToBiblio: false
};

// to ignore a warning about Unexpected default export of anonymous function
// eslint-disable-next-line
export default function(state = initialState, action) {
  // action will have a type.  common to evaluate with a switch
  switch (action.type) {
    case 'QUERY_CHANGE_QUERY_FIELD':
      console.log(action.payload);
      return {
        ...state,
        [action.payload.field]: action.payload.value
      }
    case 'RESET_QUERY_REDIRECT':
      console.log("reset query redirect");
      return {
        ...state,
        redirectToBiblio: false
      }

    case QUERY_SET_SEARCH_RESULTS:
      // console.log("reducer QUERY_SET_SEARCH_RESULTS")
      // console.log(action.payload.searchResults);
      return {
        ...state,
        searchLoading: false,
        searchSuccess: true,
        searchError: false,
        searchResultsCount: action.payload.searchResultsCount,
        searchResults: action.payload.searchResults
      }

    case QUERY_SET_SEARCH_LOADING:
      return {
        ...state,
        searchLoading: true,
        searchSuccess: false,
        searchError: false,
        searchResults: []
      }

    case QUERY_SET_SEARCH_ERROR:
      return {
        ...state,
        searchLoading: false,
        searchError: action.payload.value,
        searchSuccess: false,
        searchResults: []
      }

    case QUERY_SET_SEARCH_SIZE_RESULTS_COUNT:
      return {
        ...state,
        searchSizeResultsCount: action.payload.sizeResultsCount
      }

    case QUERY_SET_SEARCH_QUERY:
      return {
        ...state,
        searchQuery: action.payload.query
      }

    case QUERY_SET_SEARCH_FACETS:
      let newSearchFacetsLimits = _.cloneDeep(state.searchFacetsLimits);
      Object.entries(action.payload.facets).forEach(([key, values]) => {
        newSearchFacetsLimits[key] = Math.max(values.buckets.length, INITIAL_FACETS_LIMIT);
      });
      return {
        ...state,
        searchFacets: action.payload.facets,
        searchFacetsLimits: newSearchFacetsLimits
      }

    case QUERY_SET_SEARCH_FACETS_VALUES:
      return {
        ...state,
        searchFacetsValues: action.payload.facetsValues
      }

    case QUERY_ADD_FACET_VALUE:
      let addSearchFacetsValues = _.cloneDeep(state.searchFacetsValues);
      if (!addSearchFacetsValues.hasOwnProperty(action.payload.facet)) {
        addSearchFacetsValues[action.payload.facet] = [];
      }
      addSearchFacetsValues[action.payload.facet].push(action.payload.value);
      return {
        ...state,
        searchFacetsValues: addSearchFacetsValues
      }

    case QUERY_REMOVE_FACET_VALUE:
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

    case QUERY_SET_SEARCH_FACETS_LIMITS:
      // console.log("reducer QUERY_SET_SEARCH_FACETS_LIMITS")
      // console.log(action.payload.facetsLimits);
      return {
        ...state,
        searchFacetsLimits: action.payload.facetsLimits
      }

    case 'QUERY_BUTTON_XREF_CURIE':
      console.log("query button xref curie reducer set " + action.payload);
      let responseField = action.payload;
      let responseFound = action.responseFound;
      let responseColor = 'blue';
      let redirectToBiblio = false;
      let querySuccess = false;
      if (responseFound === 'not found') { responseColor = 'red'; }
        else { redirectToBiblio = true; querySuccess = true; }
      return {
        ...state,
        responseColor: responseColor,
        responseField: responseField,
        redirectToBiblio: redirectToBiblio,
        querySuccess: querySuccess
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
//     case 'QUERY_BUTTON':
//       console.log("query button reducer set " + action.payload);
//       return action.payload;
//     default:
//       return state;
//   }
// }
// export default crossRefCurieQueryFieldReducer;
