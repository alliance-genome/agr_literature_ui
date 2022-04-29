import axios from "axios";

export const QUERY_SET_SEARCH_RESULTS = 'QUERY_SET_SEARCH_RESULTS';
export const QUERY_SET_SEARCH_LOADING = 'QUERY_SET_SEARCH_LOADING';
export const QUERY_SET_SEARCH_ERROR = 'QUERY_SET_SEARCH_ERROR';
export const QUERY_SET_SEARCH_FACETS = 'QUERY_SET_SEARCH_FACETS';
export const QUERY_SET_SEARCH_QUERY = 'QUERY_SET_SEARCH_QUERY';
export const QUERY_SET_SEARCH_FACETS_VALUES = 'QUERY_SET_SEARCH_FACETS_VALUES';
export const QUERY_SET_SEARCH_FACETS_LIMITS = 'QUERY_SET_SEARCH_FACETS_LIMITS';


const restUrl = process.env.REACT_APP_RESTAPI;

export const changeQueryField = (e) => {
  console.log('action change field ' + e.target.id + ' to ' + e.target.value);
  return {
    type: 'QUERY_CHANGE_QUERY_FIELD',
    payload: {
      field: e.target.id,
      value: e.target.value
    }
  };
};

export const resetQueryRedirect = () => {
  return {
    type: 'RESET_QUERY_REDIRECT'
  };
};

export const fetchInitialFacets = (facetsLimits) => {
  return dispatch => {
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

export const searchReferences = (query, facetsValues, facetsLimits) => {
  return dispatch => {
    dispatch(setSearchLoading());
    dispatch(setSearchQuery(query));
    dispatch(setSearchFacetsValues(facetsValues));
    dispatch(setSearchFacetsLimits(facetsLimits));
    axios.post(restUrl + '/search/references', {
      query: query,
      facets_values: facetsValues,
      facets_limits: facetsLimits
    })
        .then(res => {
          dispatch(setSearchResults(res.data.hits));
          dispatch(setSearchFacets(res.data.aggregations));
        })
        .catch(err => dispatch(setSearchError(true)));
  }
}

export const setSearchQuery = (query) => ({
  type: QUERY_SET_SEARCH_QUERY,
  payload: {
    query
  }
});

export const setSearchFacetsValues = (facetsValues) => ({
  type: QUERY_SET_SEARCH_FACETS_VALUES,
  payload: {
    facetsValues
  }
});

export const setSearchFacetsLimits = (facetsLimits) => ({
  type: QUERY_SET_SEARCH_FACETS_LIMITS,
  payload: {
    facetsLimits
  }
});

export const setSearchLoading = () => ({
  type: QUERY_SET_SEARCH_LOADING
});

export const setSearchError = (value) => ({
  type: QUERY_SET_SEARCH_ERROR,
  payload: {
    value: value
  }
});

export const setSearchResults = (searchResults) => ({
  type: QUERY_SET_SEARCH_RESULTS,
  payload: {
    searchResults: searchResults
  }
});

export const setSearchFacets = (facets) => ({
  type: QUERY_SET_SEARCH_FACETS,
  payload: {
    facets: facets
  }
});

export const queryButtonCrossRefCurie = (payload) => dispatch => {
  console.log('in queryButtonCrossRefCurie action');
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
    console.log('dispatch QUERY_BUTTON_XREF_CURIE');
    dispatch({
      type: 'QUERY_BUTTON_XREF_CURIE',
      payload: response_payload,
      responseFound: response_found
    })
  }
  createGetQueryCrossRefCurie()
};
