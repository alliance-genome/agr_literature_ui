// import history from "../history";

// import notGithubVariables from './notGithubVariables';

const restUrl = process.env.REACT_APP_RESTAPI;

export const changeCreateActionToggler = (e) => {
  console.log('action change create action toggler radio ' + e.target.id + ' to ' + e.target.value);
  let createActionTogglerSelected = 'pubmed';
  if (e.target.id === 'create-toggler-alliance') { createActionTogglerSelected = 'alliance'; }
  return {
    type: 'CHANGE_CREATE_ACTION_TOGGLER',
    payload: createActionTogglerSelected
  };
};

export const changeCreateField = (e) => {
  console.log('action change field ' + e.target.name + ' to ' + e.target.value);
  return {
    type: 'CREATE_CHANGE_FIELD',
    payload: {
      field: e.target.name,
      value: e.target.value
    }
  };
};
export const changeCreatePmidField = (e) => {
  return {
    type: 'CREATE_CHANGE_PMID_FIELD',
    payload: {
      value: e.target.value
    }
  };
};

export const createQueryPubmed = (pmid) => dispatch => {
  pmid = pmid.replace(/[^\d.]/g, '');
  console.log("action createQueryPubmed " + pmid);
  const createQueryPmid = async () => {
    const urlApi = restUrl + '/cross_reference/PMID:' + pmid;
    console.log(urlApi);
    const res = await fetch(urlApi, {
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
      dispatch({
        type: 'CREATE_QUERY_PMID_XREF',
        payload: response_payload
      })}
    else {
      const url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id=' + pmid;
      console.log(url);
      const res = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'content-type': 'text/plain'
        }
      })
      const response_text = await res.text();
      // console.log(response_text);
      let title = '';
      if ( response_text.match(/<ArticleTitle[^>]*?>(.+?)<\/ArticleTitle>/) ) {
        const matches = response_text.match(/<ArticleTitle[^>]*?>(.+?)<\/ArticleTitle>/);
        title = matches[1]; }
      else if ( response_text.match(/<BookTitle[^>]*?>(.+?)<\/BookTitle>/) ) {
        const matches = response_text.match(/<BookTitle[^>]*?>(.+?)<\/BookTitle>/);
        title = matches[1]; }
      else if ( response_text.match(/<VernacularTitle[^>]*?>(.+?)<\/VernacularTitle>/) ) {
        const matches = response_text.match(/<VernacularTitle[^>]*?>(.+?)<\/VernacularTitle>/);
        title = matches[1]; }
      console.log(title);
      // need dispatch because "Actions must be plain objects. Use custom middleware for async actions."
      dispatch({
        type: 'CREATE_QUERY_PMID_PUBMED',
        payload: title
      })
    }
  }
  createQueryPmid();
};

export const setCreateAction = (createAction) => {
  console.log("action setCreateAction");
  return {
    type: 'SET_CREATE_ACTION',
    payload: createAction
  };
};

export const resetCreateRedirect = () => {
  return {
    type: 'RESET_CREATE_REDIRECT'
  };
};

export const updateButtonCreate = (updateArrayData) => dispatch => {
  console.log('in updateButtonCreate action');
  const [accessToken, subPath, payload, method, index, field, subField] = updateArrayData;
  console.log("payload "); console.log(payload);
  let newId = null;
  console.log("subPath " + subPath);

  const createUpdateButtonCreate = async () => {
    const url = restUrl + '/' + subPath;
    console.log(url);
    const res = await fetch(url, {
      method: method,
      mode: 'cors',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + accessToken
      },
      body: JSON.stringify( payload )
    })

    let response_message = 'update success';
    if ((method === 'DELETE') && (res.status === 204)) { }	// success of delete has no res.text so can't process like others
    else {
      // const response = await res.json();	// successful POST to related table (e.g. mod_reference_types) returns an id that is not in json format
      const response_text = await res.text();
      const response = JSON.parse(response_text);
      if ( ((method === 'PATCH') && (res.status !== 202)) || 
           ((method === 'DELETE') && (res.status !== 204)) || 
           ((method === 'POST') && (res.status !== 201)) ) {
        console.log('updateButtonCreate action response not updated');
        if (typeof(response.detail) !== 'object') {
            response_message = response.detail; }
          else if (typeof(response.detail[0].msg) !== 'object') {
            response_message = 'error: ' + subPath + ' : ' + response.detail[0].msg + ': ' + response.detail[0].loc[1]; }
          else {
            response_message = 'error: ' + subPath + ' : API status code ' + res.status; }
      }
      if ((method === 'POST') && (res.status === 201)) {
        newId = response_text.replace(/^"|"$/g, ''); }
      // need dispatch because "Actions must be plain objects. Use custom middleware for async actions."
      console.log('dispatch UPDATE_BUTTON_CREATE');
    }
    dispatch({
      type: 'UPDATE_BUTTON_CREATE',
      payload: {
        responseMessage: response_message,
        index: index,
        value: newId,
        field: field,
        subField: subField
      }
    })
  }
  createUpdateButtonCreate()
};

// export const changeFieldReferenceJson = (e) => {
//   console.log('action change field reference json ' + e.target.id + ' to ' + e.target.value);
//   return {
//     type: 'CHANGE_FIELD_REFERENCE_JSON',
//     payload: {
//       field: e.target.id,
//       value: e.target.value
//     }
//   };
// };
// 
// export const changeFieldArrayReferenceJson = (e) => {
//   console.log('action change field array reference json ' + e.target.id + ' to ' + e.target.value);
// //   console.log(e);
//   return {
//     type: 'CHANGE_FIELD_ARRAY_REFERENCE_JSON',
//     payload: {
//       field: e.target.id,
//       value: e.target.value
//     }
//   };
// };
// 
// export const changeFieldModReferenceReferenceJson = (e) => {
//   console.log('action change field mod reference json ' + e.target.id + ' to ' + e.target.value);
// //   console.log(e);
//   return {
//     type: 'CHANGE_FIELD_MOD_REFERENCE_REFERENCE_JSON',
//     payload: {
//       field: e.target.id,
//       value: e.target.value
//     }
//   };
// };
// 
// export const changeFieldCrossReferencesReferenceJson = (e) => {
//   console.log('action change field cross references json ' + e.target.id + ' to ' + e.target.value + ' checked ' + e.target.checked);
// //   console.log(e);
//   return {
//     type: 'CHANGE_FIELD_CROSS_REFERENCES_REFERENCE_JSON',
//     payload: {
//       field: e.target.id,
//       checked: e.target.checked,
//       value: e.target.value
//     }
//   };
// };
// 
// export const changeFieldAuthorsReferenceJson = (e) => {
//   console.log('action change field authors json ' + e.target.id + ' to ' + e.target.value);
//   return {
//     type: 'CHANGE_FIELD_AUTHORS_REFERENCE_JSON',
//     payload: {
//       field: e.target.id,
//       checked: e.target.checked,
//       value: e.target.value
//     }
//   };
// };
// 
// const getRevertButtonFromFontAwesomeElement = (activeElement) => {
//   if (activeElement.nodeName === 'BUTTON') { return activeElement; }
//   else if (activeElement.nodeName === 'svg') { return activeElement.parentNode; }
//   else if (activeElement.nodeName === 'path') { return activeElement.parentNode.parentNode; }
//   else { return activeElement; } }	// will probably error
// export const biblioRevertField = (e) => {
//   const activeElement = getRevertButtonFromFontAwesomeElement(e.target);
//   return {
//     type: 'BIBLIO_REVERT',
//     payload: {
//       field: activeElement.id,
//       type: 'string'
//     }
//   };
// };
// export const biblioRevertFieldArray = (e) => {
//   const activeElement = getRevertButtonFromFontAwesomeElement(e.target);
//   return {
//     type: 'BIBLIO_REVERT',
//     payload: {
//       field: activeElement.id,
//       type: 'array',
//       value: activeElement.value
//     }
//   };
// };
// export const biblioRevertAuthorArray = (e, initializeDict) => {
//   const activeElement = getRevertButtonFromFontAwesomeElement(e.target);
//   return {
//     type: 'BIBLIO_REVERT',
//     payload: {
//       field: activeElement.id,
//       initializeDict: initializeDict,
//       type: 'author_array',
//       value: activeElement.value
//     }
//   };
// };
// 
// export const biblioAddNewRowString = (e) => {
//   return {
//     type: 'BIBLIO_ADD_NEW_ROW',
//     payload: {
//       field: e.target.id,
//       type: 'string',
//       value: e.target.value
//     }
//   };
// };
// export const biblioAddNewAuthorAffiliation = (e) => {
//   return {
//     type: 'BIBLIO_ADD_NEW_AUTHOR_AFFILIATION',
//     payload: {
//       field: e.target.id,
//       type: 'string',
//       value: e.target.value
//     }
//   };
// };
// export const biblioAddNewRowDict = (e, initializeDict) => {
//   console.log('action biblio add new row dict ' + e.target.id + ' to ' + e.target.value);
//   console.log('action initializeDict ' + initializeDict);
//   return {
//     type: 'BIBLIO_ADD_NEW_ROW',
//     payload: {
//       field: e.target.id,
//       initializeDict: initializeDict,
//       type: 'dict',
//       value: e.target.value
//     }
//   };
// };
// 
// export const biblioQueryReferenceCurie = (referenceCurie) => dispatch => {
//   console.log('action in biblioQueryReferenceCurie action');
//   console.log("action referenceCurie " + referenceCurie);
//   const createBiblioQueryReferenceCurie = async () => {
//     const url = restUrl + '/reference/' + referenceCurie;
// //     const url = 'https://' + restUrl + '/reference/' + referenceCurie;
// //     const url = 'http://dev.alliancegenome.org:' + port + '/reference/' + referenceCurie;
// //     const url = 'http://dev.alliancegenome.org:49161/reference/' + referenceCurie;
// //     const url = 'http://localhost:49161/reference/' + referenceCurie;
//     console.log(url);
//     const res = await fetch(url, {
//       method: 'GET',
//       mode: 'cors',
//       headers: {
//         'content-type': 'application/json'
//       }
//     })
//     const response = await res.json();
//     console.log("action response");
//     console.log(response);
//     let response_payload = 'not found';
//     if (response !== undefined) {
//       response_payload = response;
//     }
// //     history.push("/Biblio");	// value hasn't been set in store yet
//     // need dispatch because "Actions must be plain objects. Use custom middleware for async actions."
//     dispatch({
//       type: 'BIBLIO_GET_REFERENCE_CURIE',
//       payload: response_payload
//     })
//   }
//   createBiblioQueryReferenceCurie()
// };
// 
// export const closeUpdateAlert = () => {
//   console.log("action closeUpdateAlert");
//   return {
//     type: 'CLOSE_UPDATE_ALERT'
//   };
// };
// 
// export const changeBiblioMeshExpandToggler = (e) => {
//   console.log('action change biblio mesh expand toggler radio ' + e.target.id + ' to ' + e.target.value);
//   let biblioMeshExpandTogglerSelected = 'short';
//   if (e.target.id === 'biblio-mesh-expand-toggler-detailed') { biblioMeshExpandTogglerSelected = 'detailed'; }
//   return {
//     type: 'CHANGE_BIBLIO_MESH_EXPAND_TOGGLER',
//     payload: biblioMeshExpandTogglerSelected
//   };
// };
// 
// export const changeBiblioAuthorExpandToggler = (e) => {
//   console.log('action change biblio author expand toggler radio ' + e.target.id + ' to ' + e.target.value);
//   let biblioAuthorExpandTogglerSelected = 'first';
//   if (e.target.id === 'biblio-author-expand-toggler-list') { biblioAuthorExpandTogglerSelected = 'list'; }
//     else if (e.target.id === 'biblio-author-expand-toggler-detailed') { biblioAuthorExpandTogglerSelected = 'detailed'; }
//   return {
//     type: 'CHANGE_BIBLIO_AUTHOR_EXPAND_TOGGLER',
//     payload: biblioAuthorExpandTogglerSelected
//   };
// };
// 
// // export const updateButtonBiblio = (subPath, payload, method) => dispatch => 
// export const updateButtonBiblio = (updateArrayData) => dispatch => {
// //   console.log('in updateButtonBiblio action');
//   const [accessToken, subPath, payload, method, index, field, subField] = updateArrayData;
// //   console.log("payload " + payload);
//   let newId = null;
// //   console.log("subPath " + subPath);
//   const createUpdateButtonBiblio = async () => {
// //     const url = 'http://dev.alliancegenome.org:' + port + '/reference/' + curie;
// //     const url = 'http://dev.alliancegenome.org:' + port + '/' + subPath;
// //     const url = 'https://' + restUrl + '/' + subPath;
//     const url = restUrl + '/' + subPath;
//     console.log(url);
//     // console.log(notGithubVariables.authToken);
//     const res = await fetch(url, {
//       method: method,
//       mode: 'cors',
//       headers: {
//         'content-type': 'application/json',
//         'authorization': 'Bearer ' + accessToken
//       },
//       body: JSON.stringify( payload )
//     })
// //         'authorization': 'Bearer ' + notGithubVariables.authToken
// 
//     let response_message = 'update success';
//     if ((method === 'DELETE') && (res.status === 204)) { }	// success of delete has no res.text so can't process like others
//     else {
//       // const response = await res.json();	// successful POST to related table (e.g. mod_reference_types) returns an id that is not in json format
//       const response_text = await res.text();
//       const response = JSON.parse(response_text);
//       if ( ((method === 'PATCH') && (res.status !== 202)) || 
//            ((method === 'DELETE') && (res.status !== 204)) || 
//            ((method === 'POST') && (res.status !== 201)) ) {
//         console.log('updateButtonBiblio action response not updated');
//         if (typeof(response.detail) !== 'object') {
//             response_message = response.detail; }
//           else if (typeof(response.detail[0].msg) !== 'object') {
//             response_message = 'error: ' + subPath + ' : ' + response.detail[0].msg + ': ' + response.detail[0].loc[1]; }
//           else {
//             response_message = 'error: ' + subPath + ' : API status code ' + res.status; }
//       }
//       if ((method === 'POST') && (res.status === 201)) {
//         newId = parseInt(response_text); }
//       // need dispatch because "Actions must be plain objects. Use custom middleware for async actions."
//       console.log('dispatch UPDATE_BUTTON_BIBLIO');
//     }
//     dispatch({
//       type: 'UPDATE_BUTTON_BIBLIO',
//       payload: {
//         responseMessage: response_message,
//         index: index,
//         value: newId,
//         field: field,
//         subField: subField
//       }
//     })
//   }
//   createUpdateButtonBiblio()
// };
// 
// export const setBiblioUpdating = (payload) => {
//   return {
//     type: 'SET_BIBLIO_UPDATING',
//     payload: payload
//   };
// };
// 
// export const setReferenceCurie = (reference_curie) => {
//   console.log("action setReferenceCurie");
//   return {
//     type: 'SET_REFERENCE_CURIE',
//     payload: reference_curie
//   };
// };
