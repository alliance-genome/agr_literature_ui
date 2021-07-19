// import history from "../history";

export const increment = (number_multiply) => {
  return {
    type: 'INCREMENT',
    payload: number_multiply
  };
};

export const decrement = () => {
  return {
    type: 'DECREMENT'
  };
};

export const changeField = (e) => {
  console.log('action change field ' + e.target.name + ' to ' + e.target.value);
  return {
    type: 'CHANGE_FIELD',
    payload: e.target.value
  };
};

// export const setLoadingQuery = (payload) => {
//   console.log('action setLoadingQuery ' + payload);
//   return {
//     type: 'SET_LOADING_QUERY',
//     payload: payload
//   };
// };

export const biblioQueryReferenceCurie = (payload) => dispatch => {
  console.log('action in biblioQueryReferenceCurie action');
  console.log("action payload " + payload);
  const createGetQueryReferenceCurie = async () => {
    const url = 'http://dev.alliancegenome.org:49161/reference/' + payload;
    console.log(url);
    const res = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'content-type': 'application/json'
      }
    })
    const response = await res.json();
    console.log("action response");
    console.log(response);
    let response_payload = 'not found';
    if (response !== undefined) {
      response_payload = response;
    }
//     history.push("/Biblio");	// value hasn't been set in store yet
    // need dispatch because "Actions must be plain objects. Use custom middleware for async actions."
    dispatch({
      type: 'BIBLIO_GET_REFERENCE_CURIE',
      payload: response_payload
    })
  }
  createGetQueryReferenceCurie()
};

export const setReferenceCurie = (reference_curie) => {
  console.log("action setReferenceCurie");
  return {
    type: 'SET_REFERENCE_CURIE',
    payload: reference_curie
  };
};

export const resetQueryState = () => {
  return {
    type: 'RESET_QUERY_STATE'
  };
};

export const resetQueryRedirect = () => {
  return {
    type: 'RESET_QUERY_REDIRECT'
  };
};

export const queryButton = (payload) => {
  return {
    type: 'QUERY_BUTTON',
    payload: payload
  };
};

export const queryButtonCrossRefCurie = (payload) => dispatch => {
  console.log('in queryButtonCrossRefCurie action');
  console.log("payload " + payload);
  const createGetQueryCrossRefCurie = async () => {
    const url = 'http://dev.alliancegenome.org:49161/cross-reference/' + payload;
    console.log(url);
    const res = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'content-type': 'application/json'
      }
    })
    const response = await res.json();
    let response_payload = 'not found';
    if (response.reference_curie !== undefined) {
      console.log('response not undefined');
      response_payload = response.reference_curie;
    }
//     history.push("/Biblio");	// value hasn't been set in store yet
    // need dispatch because "Actions must be plain objects. Use custom middleware for async actions."
    console.log('dispatch QUERY_BUTTON');
    dispatch({
      type: 'QUERY_BUTTON',
      payload: response_payload
    })
  }
  createGetQueryCrossRefCurie()
//   return {
//     type: 'QUERY_BUTTON',
//     payload: payload
//   };
};


export const signIn = (userId, accessToken) => {
  return {
    type: 'SIGN_IN',
    payload:{userId: userId, accessToken:accessToken}
  };
};

export const signOut = () => {
  return {
    type: 'SIGN_OUT',
  };
};