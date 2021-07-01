// import history from "../history";

import notGithubVariables from './notGithubVariables';

const port = 11223;

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

export const changeFieldReferenceJson = (e) => {
  console.log('action change field reference json' + e.target.id + ' to ' + e.target.value);
  return {
    type: 'CHANGE_FIELD_REFERENCE_JSON',
    payload: {
      field: e.target.id,
      value: e.target.value
    }
  };
};

export const changeFieldArrayReferenceJson = (e) => {
  console.log('action change field array reference json' + e.target.id + ' to ' + e.target.value);
//   console.log(e);
  return {
    type: 'CHANGE_FIELD_ARRAY_REFERENCE_JSON',
    payload: {
      field: e.target.id,
      value: e.target.value
    }
  };
};

export const biblioAddNewRow = (e) => {
  return {
    type: 'BIBLIO_ADD_NEW_ROW',
    payload: {
      field: e.target.id,
      value: e.target.value
    }
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
  const createBiblioQueryReferenceCurie = async () => {
    const url = 'http://dev.alliancegenome.org:' + port + '/reference/' + payload;
//     const url = 'http://dev.alliancegenome.org:49161/reference/' + payload;
//     const url = 'http://localhost:49161/reference/' + payload;
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
  createBiblioQueryReferenceCurie()
};

export const closeUpdateAlert = () => {
  console.log("action closeUpdateAlert");
  return {
    type: 'CLOSE_UPDATE_ALERT'
  };
};

export const changeBiblioActionToggler = (e) => {
  console.log('action change biblio action toggler radio ' + e.target.id + ' to ' + e.target.value);
  let biblioActionTogglerSelected = 'display';
  if (e.target.id === 'biblio-toggler-editor') { biblioActionTogglerSelected = 'editor'; }
  return {
    type: 'CHANGE_BIBLIO_ACTION_TOGGLER',
    payload: biblioActionTogglerSelected
  };
};

export const setBiblioAction = (biblioAction) => {
  console.log("action setBiblioAction");
  return {
    type: 'SET_BIBLIO_ACTION',
    payload: biblioAction
  };
};

export const updateButtonBiblio = (curie, payload) => dispatch => {
//   console.log('in updateButtonBiblio action');
//   console.log("payload " + payload);
  const createUpdateButtonBiblio = async () => {
    const url = 'http://dev.alliancegenome.org:' + port + '/reference/' + curie;
    console.log(url);
    // console.log(notGithubVariables.authToken);
    const res = await fetch(url, {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + notGithubVariables.authToken
      },
      body: JSON.stringify( payload )
    })

    const response = await res.json();
    // console.log(res.status);
    let response_payload = 'update success';
    if (res.status !== 202) {
      console.log('updateButtonBiblio action response not updated');
      if (typeof(response.detail) !== 'object') {
          response_payload = response.detail; }
        else if (typeof(response.detail[0].msg) !== 'object') {
          response_payload = response.detail[0].msg + ': ' + response.detail[0].loc[1]; }
        else {
          response_payload = 'error: API status code ' + res.status; }
    }
    // need dispatch because "Actions must be plain objects. Use custom middleware for async actions."
    console.log('dispatch UPDATE_BUTTON_BIBLIO');
    dispatch({
      type: 'UPDATE_BUTTON_BIBLIO',
      payload: response_payload
    })
  }
  createUpdateButtonBiblio()
};


export const setBiblioUpdating = (payload) => {
  return {
    type: 'SET_BIBLIO_UPDATING',
    payload: payload
  };
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
//     const url = 'http://dev.alliancegenome.org:49161/cross-reference/' + payload;
    const url = 'http://dev.alliancegenome.org:' + port + '/cross-reference/' + payload;
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


export const signIn = () => {
  return {
    type: 'SIGN_IN'
  };
};
