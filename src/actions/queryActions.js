// import history from "../history";

// import notGithubVariables from './notGithubVariables';

const restUrl = process.env.REACT_APP_RESTAPI;
// const restUrl = 'stage-literature-rest.alliancegenome.org';
// const port = 11223;
// const port = 49161;

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

// replaced by biblioActions : setReferenceCurie + setGetReferenceCurieFlag
// export const resetQueryState = () => {
//   return {
//     type: 'RESET_QUERY_STATE'
//   };
// };

export const resetQueryRedirect = () => {
  return {
    type: 'RESET_QUERY_REDIRECT'
  };
};

export const queryButtonTitle = (payload) => dispatch => {
  console.log('in queryButtonTitle action');
  console.log("payload " + payload);
  const createGetQueryButtonTitle = async () => {
    const url = restUrl + '/search/references/' + payload;
    const res = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'content-type': 'application/json'
      }
    })
    const response = await res.json();
    let response_payload = [];
    let response_found = 'not found';
    if ( (response[0] !== undefined) && (response[0].curie !== undefined) ) {
      console.log('response not undefined');
      response_found = 'found';
      response_payload = response;
    }
    console.log('dispatch QUERY_BUTTON_TITLE');
    dispatch({
      type: 'QUERY_BUTTON_TITLE',
      payload: response_payload,
      responseFound: response_found,
      searchInput: payload
    })
  }
  createGetQueryButtonTitle()
}

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
