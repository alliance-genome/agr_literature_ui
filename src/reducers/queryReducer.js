import {
  SET_SEARCH_ERROR,
  SET_SEARCH_FACETS,
  SET_SEARCH_FACETS_VALUES,
  SET_SEARCH_LOADING, SET_SEARCH_QUERY,
  SET_SEARCH_RESULTS
} from '../actions/queryActions';

const initialState = {
  searchResults: [],
  searchLoading: false,
  searchSuccess: false,
  searchFacets: {},
  searchFacetsValues: {},
  searchFacetsLimits: {},
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

    case SET_SEARCH_RESULTS:
      return {
        ...state,
        searchLoading: false,
        searchSuccess: true,
        searchError: false,
        searchResults: action.payload.searchResults
      }

    case SET_SEARCH_LOADING:
      return {
        ...state,
        searchLoading: true,
        searchSuccess: false,
        searchError: false,
        searchResults: []
      }

    case SET_SEARCH_ERROR:
      return {
        ...state,
        searchLoading: false,
        searchError: action.payload.value,
        searchSuccess: false,
        searchResults: []
      }

    case SET_SEARCH_QUERY:
      return {
        ...state,
        searchQuery: action.payload.query
      }

    case SET_SEARCH_FACETS:
      return {
        ...state,
        searchFacets: action.payload.facets
      }

    case SET_SEARCH_FACETS_VALUES:
      return {
        ...state,
        searchFacetsValues: action.payload.facetsValues
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
