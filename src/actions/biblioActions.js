// import history from "../history";

import notGithubVariables from './notGithubVariables';

const port = 11223;
// const port = 49161;

export const changeFieldReferenceJson = (e) => {
  console.log('action change field reference json ' + e.target.id + ' to ' + e.target.value);
  return {
    type: 'CHANGE_FIELD_REFERENCE_JSON',
    payload: {
      field: e.target.id,
      value: e.target.value
    }
  };
};

export const changeFieldArrayReferenceJson = (e) => {
  console.log('action change field array reference json ' + e.target.id + ' to ' + e.target.value);
//   console.log(e);
  return {
    type: 'CHANGE_FIELD_ARRAY_REFERENCE_JSON',
    payload: {
      field: e.target.id,
      value: e.target.value
    }
  };
};

export const changeFieldModReferenceReferenceJson = (e) => {
  console.log('action change field array reference json ' + e.target.id + ' to ' + e.target.value);
//   console.log(e);
  return {
    type: 'CHANGE_FIELD_MOD_REFERENCE_REFERENCE_JSON',
    payload: {
      field: e.target.id,
      value: e.target.value
    }
  };
};

export const biblioAddNewRowString = (e) => {
  return {
    type: 'BIBLIO_ADD_NEW_ROW',
    payload: {
      field: e.target.id,
      type: 'string',
      value: e.target.value
    }
  };
};
export const biblioAddNewRowDict = (e, initializeDict) => {
  console.log('action biblio add new row dict ' + e.target.id + ' to ' + e.target.value);
  console.log('action initializeDict ' + initializeDict);
  return {
    type: 'BIBLIO_ADD_NEW_ROW',
    payload: {
      field: e.target.id,
      initializeDict: initializeDict,
      type: 'dict',
      value: e.target.value
    }
  };
};

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

export const changeBiblioMeshExpandToggler = (e) => {
  console.log('action change biblio mesh expand toggler radio ' + e.target.id + ' to ' + e.target.value);
  let biblioMeshExpandTogglerSelected = 'short';
  if (e.target.id === 'biblio-mesh-expand-toggler-detailed') { biblioMeshExpandTogglerSelected = 'detailed'; }
  return {
    type: 'CHANGE_BIBLIO_MESH_EXPAND_TOGGLER',
    payload: biblioMeshExpandTogglerSelected
  };
};

export const changeBiblioAuthorExpandToggler = (e) => {
  console.log('action change biblio author expand toggler radio ' + e.target.id + ' to ' + e.target.value);
  let biblioAuthorExpandTogglerSelected = 'first';
  if (e.target.id === 'biblio-author-expand-toggler-list') { biblioAuthorExpandTogglerSelected = 'list'; }
    else if (e.target.id === 'biblio-author-expand-toggler-detailed') { biblioAuthorExpandTogglerSelected = 'detailed'; }
  return {
    type: 'CHANGE_BIBLIO_AUTHOR_EXPAND_TOGGLER',
    payload: biblioAuthorExpandTogglerSelected
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

// export const updateButtonBiblio = (subPath, payload, method) => dispatch => 
export const updateButtonBiblio = (updateArrayData) => dispatch => {
//   console.log('in updateButtonBiblio action');
  const [subPath, payload, method, index, field, subField] = updateArrayData;
//   console.log("payload " + payload);
  let newId = null;
//   console.log("subPath " + subPath);
  const createUpdateButtonBiblio = async () => {
//     const url = 'http://dev.alliancegenome.org:' + port + '/reference/' + curie;
    const url = 'http://dev.alliancegenome.org:' + port + '/' + subPath;
    console.log(url);
    // console.log(notGithubVariables.authToken);
    const res = await fetch(url, {
      method: method,
      mode: 'cors',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + notGithubVariables.authToken
      },
      body: JSON.stringify( payload )
    })

    // const response = await res.json();
    const response_text = await res.text();
    const response = JSON.parse(response_text);
    let response_message = 'update success';
    if ( ((method === 'PATCH') && (res.status !== 202)) || ((method === 'POST') && (res.status !== 201)) ) {
      console.log('updateButtonBiblio action response not updated');
      if (typeof(response.detail) !== 'object') {
          response_message = response.detail; }
        else if (typeof(response.detail[0].msg) !== 'object') {
          response_message = 'error: ' + subPath + ' : ' + response.detail[0].msg + ': ' + response.detail[0].loc[1]; }
        else {
          response_message = 'error: ' + subPath + ' : API status code ' + res.status; }
    }
    if ((method === 'POST') && (res.status === 201)) {
      newId = parseInt(response_text); }
    // need dispatch because "Actions must be plain objects. Use custom middleware for async actions."
    console.log('dispatch UPDATE_BUTTON_BIBLIO');
    dispatch({
      type: 'UPDATE_BUTTON_BIBLIO',
      payload: {
        responseMessage: response_message,
        index: index,
        value: newId,
        field: field,
        subField: subField
      }
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
