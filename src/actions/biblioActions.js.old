// import history from "../history";

// import notGithubVariables from './notGithubVariables';

const restUrl = process.env.REACT_APP_RESTAPI;
// const restUrl = 'stage-literature-rest.alliancegenome.org';
// const port = 11223;
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
  console.log('action change field mod reference json ' + e.target.id + ' to ' + e.target.value);
//   console.log(e);
  return {
    type: 'CHANGE_FIELD_MOD_REFERENCE_REFERENCE_JSON',
    payload: {
      field: e.target.id,
      value: e.target.value
    }
  };
};

export const changeFieldCrossReferencesReferenceJson = (e) => {
  console.log('action change field cross references json ' + e.target.id + ' to ' + e.target.value + ' checked ' + e.target.checked);
//   console.log(e);
  return {
    type: 'CHANGE_FIELD_CROSS_REFERENCES_REFERENCE_JSON',
    payload: {
      field: e.target.id,
      checked: e.target.checked,
      value: e.target.value
    }
  };
};

export const changeFieldCommentsCorrectionsReferenceJson = (e) => {
  console.log('action change field comments corrections json ' + e.target.id + ' to ' + e.target.value);
//   console.log(e);
  return {
    type: 'CHANGE_FIELD_COMMENTS_CORRECTIONS_REFERENCE_JSON',
    payload: {
      field: e.target.id,
      value: e.target.value
    }
  };
};

export const changeFieldAuthorsReferenceJson = (e) => {
  console.log('action change field authors json ' + e.target.id + ' to ' + e.target.value + ' checked ' + e.target.checked);
  return {
    type: 'CHANGE_FIELD_AUTHORS_REFERENCE_JSON',
    payload: {
      field: e.target.id,
      checked: e.target.checked,
      value: e.target.value
    }
  };
};

const getRevertButtonFromFontAwesomeElement = (activeElement) => {
  if (activeElement.nodeName === 'BUTTON') { return activeElement; }
  else if (activeElement.nodeName === 'svg') { return activeElement.parentNode; }
  else if (activeElement.nodeName === 'path') { return activeElement.parentNode.parentNode; }
  else { return activeElement; } }	// will probably error
export const biblioRevertField = (e) => {
  const activeElement = getRevertButtonFromFontAwesomeElement(e.target);
  return {
    type: 'BIBLIO_REVERT',
    payload: {
      field: activeElement.id,
      type: 'string'
    }
  };
};
export const biblioRevertFieldArray = (e) => {
  const activeElement = getRevertButtonFromFontAwesomeElement(e.target);
  return {
    type: 'BIBLIO_REVERT',
    payload: {
      field: activeElement.id,
      type: 'array'
    }
  };
};
export const biblioRevertAuthorArray = (e, initializeDict) => {
  const activeElement = getRevertButtonFromFontAwesomeElement(e.target);
  return {
    type: 'BIBLIO_REVERT',
    payload: {
      field: activeElement.id,
      initializeDict: initializeDict,
      type: 'author_array'
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
export const biblioAddNewAuthorAffiliation = (e) => {
  return {
    type: 'BIBLIO_ADD_NEW_AUTHOR_AFFILIATION',
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

export const biblioQueryReferenceCurie = (referenceCurie) => dispatch => {
  console.log('action in biblioQueryReferenceCurie action');
  console.log("action referenceCurie " + referenceCurie);
  const createBiblioQueryReferenceCurie = async () => {
    const url = restUrl + '/reference/' + referenceCurie;
//     const url = 'https://' + restUrl + '/reference/' + referenceCurie;
//     const url = 'http://dev.alliancegenome.org:' + port + '/reference/' + referenceCurie;
//     const url = 'http://dev.alliancegenome.org:49161/reference/' + referenceCurie;
//     const url = 'http://localhost:49161/reference/' + referenceCurie;
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
      const referenceJson = response;
      if ('comment_and_corrections' in referenceJson && referenceJson['comment_and_corrections'] !== null) {
        let comcorMapping = {}
        comcorMapping['CommentOn'] = 'HasComment'
        comcorMapping['ErratumFor'] = 'HasErratum'
        comcorMapping['ExpressionOfConcernFor'] = 'HasExpressionOfConcernFor'
        comcorMapping['ReprintOf'] = 'HasReprint'
        comcorMapping['RepublishedFrom'] = 'RepublishedIn'
        comcorMapping['RetractionOf'] = 'HasRetraction'
        comcorMapping['UpdateOf'] = 'HasUpdate'
        const comcorDirections = ['to_references', 'from_references']
        referenceJson['corrections'] = []
        for (const direction of comcorDirections) {
          for (const comcorDict of referenceJson['comment_and_corrections'][direction].values()) {
            let curieFieldInDict = (direction === 'to_references') ? 'reference_curie_to' : 'reference_curie_from';
            let curie = comcorDict[curieFieldInDict]
            let dbid = comcorDict['reference_comment_and_correction_id']
            let type = comcorDict['reference_comment_and_correction_type']
            if (direction === 'from_references') {
              if (type in comcorMapping) { type = comcorMapping[type] } }
            let newComcorDict = {}
            newComcorDict['reference_comment_and_correction_id'] = dbid
            newComcorDict['type'] = type
            newComcorDict['curie'] = curie
            referenceJson['corrections'].push(newComcorDict)
      } } }
      response_payload = referenceJson;
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

export const updateButtonBiblio = (updateArrayData) => dispatch => {
  // console.log('in updateButtonBiblio action');
  const [accessToken, subPath, payload, method, index, field, subField] = updateArrayData;
  // console.log("payload " + payload);
  // console.log("payload "); console.log(updateArrayData);
  let newId = null;
  const createUpdateButtonBiblio = async () => {
//     const url = 'http://dev.alliancegenome.org:' + port + '/reference/' + curie;
//     const url = 'http://dev.alliancegenome.org:' + port + '/' + subPath;
//     const url = 'https://' + restUrl + '/' + subPath;
    const url = restUrl + '/' + subPath;
    console.log(url);
    // console.log(notGithubVariables.authToken);
    const res = await fetch(url, {
      method: method,
      mode: 'cors',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + accessToken
      },
      body: JSON.stringify( payload )
    })
//         'authorization': 'Bearer ' + notGithubVariables.authToken

    let response_message = 'update success';
    if ((method === 'DELETE') && (res.status === 204)) { }	// success of delete has no res.text so can't process like others
    else {
      // const response = await res.json();	// successful POST to related table (e.g. mod_reference_types) returns an id that is not in json format
      const response_text = await res.text();
      const response = JSON.parse(response_text);
      if ( ((method === 'PATCH') && (res.status !== 202)) || 
           ((method === 'DELETE') && (res.status !== 204)) || 
           ((method === 'POST') && (res.status !== 201)) ) {
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
    }
    setTimeout(() => {
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
    }, 500);
  }
  createUpdateButtonBiblio()
};

export const resetBiblioIsLoading = () => {
  return {
    type: 'RESET_BIBLIO_IS_LOADING'
  };
};

// replaced by setReferenceCurie + setGetReferenceCurieFlag
// export const resetBiblioReferenceCurie = () => {
//   return {
//     type: 'RESET_BIBLIO_REFERENCE_CURIE'
//   };
// };

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

export const setGetReferenceCurieFlag = (true_false) => {
  console.log("action setReferenceCurie");
  return {
    type: 'SET_GET_REFERENCE_CURIE_FLAG',
    payload: true_false
  };
};
