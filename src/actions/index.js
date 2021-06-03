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
  console.log('change field ' + e.target.name + ' to ' + e.target.value);
  return {
    type: 'CHANGE_FIELD',
    payload: e.target.value
  };
};

export const biblioQueryReferenceCurie = (payload) => dispatch => {
  console.log('in biblioQueryReferenceCurie action');
  console.log("payload " + payload);
  const createGet = async () => {
    const url = 'http://dev.alliancegenome.org:49161/reference/' + payload;
    console.log(url);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'content-type': 'application/json'
      }
    })
    const response = await res.json();
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
  createGet()
};

export const setReferenceCurie = (reference_curie) => {
  return {
    type: 'SET_REFERENCE_CURIE',
    payload: reference_curie
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
  const createGet = async () => {
    const url = 'http://dev.alliancegenome.org:49161/cross-reference/' + payload;
    console.log(url);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'content-type': 'application/json'
      }
    })
    const response = await res.json();
    let response_payload = 'not found';
    if (response.reference_curie !== undefined) {
      response_payload = response.reference_curie;
    }
//     history.push("/Biblio");	// value hasn't been set in store yet
    // need dispatch because "Actions must be plain objects. Use custom middleware for async actions."
    dispatch({
      type: 'QUERY_BUTTON',
      payload: response_payload
    })
  }
  createGet()
//   return {
//     type: 'QUERY_BUTTON',
//     payload: payload
//   };
};


export const signIn = () => {
  return {
    type: 'SIGN_IN'
  };
};
