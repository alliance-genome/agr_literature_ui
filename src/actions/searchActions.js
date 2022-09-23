import axios from "axios";

export const SEARCH_SET_SEARCH_RESULTS_COUNT = 'SEARCH_SET_SEARCH_RESULTS_COUNT';
export const SEARCH_SET_SEARCH_RESULTS = 'SEARCH_SET_SEARCH_RESULTS';
export const SEARCH_SET_SEARCH_LOADING = 'SEARCH_SET_SEARCH_LOADING';
export const SEARCH_SET_SEARCH_ERROR = 'SEARCH_SET_SEARCH_ERROR';
export const SEARCH_SET_SEARCH_FACETS = 'SEARCH_SET_SEARCH_FACETS';
export const SEARCH_SET_SEARCH_SEARCH = 'SEARCH_SET_SEARCH_SEARCH';
export const SEARCH_SET_SEARCH_FACETS_VALUES = 'SEARCH_SET_SEARCH_FACETS_VALUES';
export const SEARCH_SET_SEARCH_FACETS_LIMITS = 'SEARCH_SET_SEARCH_FACETS_LIMITS';
export const SEARCH_SET_SEARCH_SIZE_RESULTS_COUNT = 'SEARCH_SET_SEARCH_SIZE_RESULTS_COUNT';
export const SEARCH_ADD_FACET_VALUE = 'SEARCH_ADD_FACET_VALUE';
export const SEARCH_REMOVE_FACET_VALUE = 'SEARCH_REMOVE_FACET_VALUE';


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

export const resetSearchRedirect = () => {
  return {
    type: 'RESET_SEARCH_REDIRECT'
  };
};

export const fetchInitialFacets = (facetsLimits) => {
  return dispatch => {
    dispatch(setSearchFacetsLimits(facetsLimits));
    axios.post(restUrl + '/search/references', {
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

export const searchReferences = (query, fieldToSearch, facetsValues, facetsLimits, sizeResultsCount) => {
  return dispatch => {
    if (fieldToSearch === 'ID') {
      if (query.startsWith('AGR:') || query.startsWith('AGRKB:')) {
        dispatch({
          type: 'SEARCH_BUTTON_XREF_CURIE',
          payload: query,
          responseFound: 'found'
        })
      } else {
        dispatch(searchButtonCrossRefCurie(query));
      }
      dispatch(setSearchQuery(""));
    } else {
      dispatch(setSearchLoading());
      dispatch(setSearchQuery(query));
      dispatch(setSearchFacetsValues(facetsValues));
      dispatch(setSearchFacetsLimits(facetsLimits));
      axios.post(restUrl + '/search/references', {
        query: query,
        size_result_count: sizeResultsCount,
        facets_values: facetsValues,
        facets_limits: facetsLimits
      })
          .then(res => {
            dispatch(setSearchResults(res.data.hits, res.data.return_count));
            dispatch(setSearchFacets(res.data.aggregations));
          })
          .catch(err => dispatch(setSearchError(true)));
    }
  }
}

export const setSearchSizeResultsCount = (sizeResultsCount) => ({
  type: SEARCH_SET_SEARCH_SIZE_RESULTS_COUNT,
  payload: {
    sizeResultsCount
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

export const setSearchLoading = () => ({
  type: SEARCH_SET_SEARCH_LOADING
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

export const searchButtonCrossRefCurie = (payload) => dispatch => {
  console.log('in searchButtonCrossRefCurie action');
  console.log("payload " + payload);
  const createGetQueryCrossRefCurie = async () => {
//     const url = 'http://dev.alliancegenome.org:49161/cross_reference/' + payload;
//     const url = 'http://dev.alliancegenome.org:' + port + '/cross_reference/' + payload;
//     const url = 'https://' + restUrl + '/cross_reference/' + payload;
    const url = restUrl + '/cross_reference/' + payload;
    // console.log(url);
    const res = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'content-type': 'application/json'
      }
    })
    const response = await res.json();
    let response_payload = payload + ' not found';
    let response_found = 'not found';
    if (response.reference_curie !== undefined) {
      console.log('response not undefined');
      response_found = 'found';
      response_payload = response.reference_curie;
    }
//     history.push("/Biblio");	// value hasn't been set in store yet
    // need dispatch because "Actions must be plain objects. Use custom middleware for async actions."
    console.log('dispatch SEARCH_BUTTON_XREF_CURIE');
    dispatch({
      type: 'SEARCH_BUTTON_XREF_CURIE',
      payload: response_payload,
      responseFound: response_found
    })
  }
  createGetQueryCrossRefCurie()
};
