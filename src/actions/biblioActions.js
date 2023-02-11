// import history from "../history";

// import notGithubVariables from './notGithubVariables';

import axios from "axios";


const restUrl = process.env.REACT_APP_RESTAPI;
// const restUrl = 'stage-literature-rest.alliancegenome.org';
// const port = 11223;
// const port = 49161;

const ateamApiBaseUrl = 'https://beta-curation.alliancegenome.org/';

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

// TODO to make live, add this to biblioActions.js  rename MOCK1_CHANGE_FIELD_MOD_ASSOCIATION_REFERENCE_JSON    create reducer action for it
export const changeFieldModAssociationReferenceJson = (e) => {
  console.log('action change field mod association json ' + e.target.id + ' to ' + e.target.value + ' checked ' + e.target.checked);
//   console.log(e);
  return {
    type: 'CHANGE_FIELD_MOD_ASSOCIATION_REFERENCE_JSON',	// this doesn't do anything yet
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

export const changeFieldDatePublishedRange = (datePublishedRange) => {
  console.log('action change field date published range ');
  console.log(datePublishedRange);
  return {
    type: 'CHANGE_FIELD_DATE_PUBLISHED_RANGE',
    payload: {
      field: 'datePublishedRange',
      value: datePublishedRange
    }
  };
}


export const setBiblioUpdatingEntityAdd = (payload) => { return { type: 'SET_BIBLIO_UPDATING_ENTITY_ADD', payload: payload }; };

// export const updateButtonBiblioEntityAdd_NOTAXIOS = (updateArrayData) => dispatch => {
//   // console.log('in updateButtonBiblioEntityAdd action');
//   const [accessToken, subPath, payload, method, index, field, subField] = updateArrayData;
//   // const post_json = JSON.stringify(payload);
//   // console.log("payload " + post_json);
//   // console.log("payload " + payload);
//   // console.log("payload "); console.log(updateArrayData);
//   let newId = null;
//   const createUpdateButtonBiblioEntityAdd = async () => {
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
// 
//     let response_message = 'update success';
//     if ((method === 'DELETE') && (res.status === 204)) { }	// success of delete has no res.text so can't process like others
//     else {
//       const response_text = await res.text();
//       const response = JSON.parse(response_text);
//       if ( ((method === 'PATCH') && (res.status !== 202)) || 
//            ((method === 'DELETE') && (res.status !== 204)) || 
//            ((method === 'POST') && (res.status !== 201)) ) {
//         console.log('updateButtonBiblioEntityAdd action response not updated');
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
//       console.log('dispatch UPDATE_BUTTON_BIBLIO_ENTITY_ADD');
//     }
//     setTimeout(() => {
//       dispatch({
//         type: 'UPDATE_BUTTON_BIBLIO_ENTITY_ADD',
//         payload: {
//           responseMessage: response_message,
//           index: index,
//           value: newId,
//           field: field,
//           subField: subField
//         }
//       })
//     }, 500);
//   }
//   createUpdateButtonBiblioEntityAdd()
// };


export const setBiblioWorkflowCuratability = (value) => ({
  type: 'SET_BIBLIO_WORKFLOW_CURATABILITY',
  payload: { value: value }
});

export const updateSelectBiblioWorkflowCuratability = (accessToken, workflowTagId, payload, method) => { return dispatch => {
  // console.log(subPath);
  // console.log(method);
  const url = (workflowTagId) ? restUrl + '/workflow_tag/' + workflowTagId : restUrl + '/workflow_tag/';
  console.log(payload);
  console.log(url);
  let response_message = 'update success';

  axios({
      url: url,
      method: method,
      headers: {
        'content-type': 'application/json',
        'mode': 'cors',
        'authorization': 'Bearer ' + accessToken
      },
      data: payload
  })
  .then(res => {
    console.log(res);
    if ( ((method === 'PATCH') && (res.status !== 202)) ||
         ((method === 'DELETE') && (res.status !== 204)) ||
         ((method === 'POST') && (res.status !== 201)) ) {
           response_message = 'error: ' + workflowTagId + ' : API status code ' + res.status + ' for method ' + method; }
    dispatch({
      type: 'UPDATE_SELECT_BIBLIO_WORKFLOW_CURATABILITY',
      payload: { workflowTagId: workflowTagId, responseMessage: response_message }
    })
  })
  .catch(err =>
    dispatch({
      type: 'UPDATE_SELECT_BIBLIO_WORKFLOW_CURATABILITY',
      payload: { workflowTagId: workflowTagId, responseMessage: 'error: updateSelectBiblioEntityCuratability failure on workflow_tag_id ' + workflowTagId + ' ' + err }
    }));
} };


export const setBiblioEntityRemoveEntity = (tetId, value) => ({
  type: 'SET_BIBLIO_ENTITY_REMOVE_ENTITY',
  payload: { tetId: tetId, value: value }
});

export const updateButtonBiblioEntityEditEntity = (accessToken, tetId, payload, method, dispatchAction) => { return dispatch => {
  // console.log(subPath);
  // console.log(method);
  const url = restUrl + '/topic_entity_tag/' + tetId;
  let response_message = 'update success';

  axios({
      url: url,
      method: method,
      headers: {
        'content-type': 'application/json',
        'mode': 'cors',
        'authorization': 'Bearer ' + accessToken
      },
      data: payload
  })
  .then(res => {
    console.log(res);
    if ( ((method === 'PATCH') && (res.status !== 202)) ||
         ((method === 'DELETE') && (res.status !== 204)) ||
         ((method === 'POST') && (res.status !== 201)) ) {
           response_message = 'error: ' + tetId + ' : API status code ' + res.status + ' for method ' + method; }
    dispatch({
      type: dispatchAction,
      payload: { tetId: tetId, responseMessage: response_message }
    })
  })
  .catch(err =>
    dispatch({
      type: dispatchAction,
      payload: { tetId: tetId, responseMessage: 'error: updateButtonBiblioEntityEditEntity failure on topic_entity_tag_id ' + tetId + ' ' + err }
    }));
} };

export const updateButtonBiblioEntityAdd = (updateArrayData) => { return dispatch => {
  // console.log('in updateButtonBiblioEntityAdd action');
  // const [accessToken, subPath, payload, method, index, field, subField] = updateArrayData;
  const [accessToken, subPath, payload, method] = updateArrayData;
  // console.log("payload " + payload);
  // console.log("payload "); console.log(updateArrayData);
  // let newId = null;
  const url = restUrl + '/' + subPath;
  let response_message = 'update success';

  axios({
      url: url,
      method: method,
      headers: {
        'content-type': 'application/json',
        'mode': 'cors',
        'authorization': 'Bearer ' + accessToken
      },
      data: payload
  })
  .then(res => {
    console.log(res);
    if ( ((method === 'PATCH') && (res.status !== 202)) ||
         ((method === 'DELETE') && (res.status !== 204)) ||
         ((method === 'POST') && (res.status !== 201)) ) {
           response_message = 'error: ' + subPath + ' : API status code ' + res.status + ' for method ' + method; }
    // if ((method === 'POST') && (res.status === 201)) {
    //   newId = parseInt(res.data); }
    dispatch({
      type: 'UPDATE_BUTTON_BIBLIO_ENTITY_ADD',
      payload: { responseMessage: response_message }
    })
  })
  .catch(err =>
    dispatch({
      type: 'UPDATE_BUTTON_BIBLIO_ENTITY_ADD',
      payload: { responseMessage: 'error: ' + subPath + ' ' + err }
    }));
} };


export const changeFieldEntityEntityList = (entityText, accessToken, taxon, entityType) => {
  return dispatch => {
    // console.log('action change field entity list ' + entityText + ' entityType ' + entityType);
    let entityInputList = [];
    if (entityText && entityText !== '') {
      entityInputList = entityText.split('\n').map(element => { return element.trim(); }).filter(item => item);
    }
    const entityQueryString = entityInputList.map(element => { return element.replace(/(?=[() ])/g, '\\'); }).join(" ");
    // const aGeneApiUrl = 'https://beta-curation.alliancegenome.org/swagger-ui/#/Elastic%20Search%20Endpoints/post_api_gene_search';
    // const aGeneApiUrl = 'https://beta-curation.alliancegenome.org/api/gene/search?limit=10&page=0';
    const ateamApiUrl = ateamApiBaseUrl + 'api/' + entityType + '/search?limit=10&page=0';
    const entityTypeSymbolField = entityType + 'Symbol';
  
    // console.log(ateamApiUrl);
    // console.log(accessToken);
    // const geneSymbol = e.target.value;

    // simple search
    //   const json = {"searchFilters":{"nameFilter":{"symbol_keyword":{"queryString":geneSymbol,"tokenOperator":"AND"}}}}
  
    // search by taxon + exact symbol keyword or exact curie keyword
    const searchEntityJson =
      {"searchFilters": {
        "nameFilters": {
          [entityTypeSymbolField + ".displayText_keyword"]:{"queryString":entityQueryString,"tokenOperator":"OR"},
          "curie_keyword":{"queryString":entityQueryString,"tokenOperator":"OR"}
        },
        "taxonFilters": { "taxon.curie_keyword":{"queryString":taxon,"tokenOperator":"AND"} }
      } }

    // MarkQT : although formatText may be more appropriate than displayText for your needs - I think the LinkML model explains the differences
    // if you wanted to add full names/systematic names/synonyms to your search then the appropriate fields would be geneFullName.displayText, geneSystematicName.displayText, and geneSynonyms.displayText
  
    // try GET1, SGD:S000001766, MGM1
    axios.post(ateamApiUrl, searchEntityJson, {
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + accessToken
      }
    })
    .then(res => {
      // console.log('res.data.results');
      // console.log(res.data.results);
      const searchMap = {};
      if (res.data.results) {
        for (const entityResult of res.data.results) {
          if (entityResult.curie && entityResult[entityTypeSymbolField].displayText) {
            searchMap[entityResult.curie.toLowerCase()] = entityResult.curie;
            searchMap[entityResult[entityTypeSymbolField].displayText.toLowerCase()] = entityResult.curie; }
          // entityResultList.push(entityResult.symbol + " " + entityResult.curie);
          // console.log(entityResult.curie);
          // console.log(entityResult.symbol);
      } }
      let entityResultList = [];
      for (const entityTypeSymbol of entityInputList) {
        if (entityTypeSymbol.toLowerCase() in searchMap) {
          entityResultList.push( { 'entityTypeSymbol': entityTypeSymbol, 'curie': searchMap[entityTypeSymbol.toLowerCase()] } ); }
        else { 
          entityResultList.push( { 'entityTypeSymbol': entityTypeSymbol, 'curie': 'no Alliance curie' } ); } }
      dispatch(setEntityResultList(entityResultList));
    })
    .catch(err =>
      dispatch({
        type: 'SET_ENTITY_MODAL_TEXT',
        payload: 'Entity lookup API failure' + err
      }));
  }
};

export const setFieldEntityEditor = (id, value) => ({
  type: 'CHANGE_FIELD_ENTITY_EDITOR',
  payload: { field: id, value: value }
});

export const changeFieldEntityEditor = (e) => ({
  type: 'CHANGE_FIELD_ENTITY_EDITOR',
  payload: { field: e.target.id, value: e.target.value }
});

export const changeFieldEntityEditorPriority = (e) => ({
  type: 'CHANGE_FIELD_ENTITY_EDITOR_PRIORITY',
  payload: { field: e.target.id, value: e.target.value }
});

export const changeFieldEntityAddGeneralField = (e) => ({
  type: 'CHANGE_FIELD_ENTITY_ADD_GENERAL_FIELD',
  payload: { field: e.target.id, value: e.target.value }
});

export const changeFieldEntityAddTaxonSelect = (taxon) => ({
  type: 'CHANGE_FIELD_ENTITY_ADD_GENERAL_FIELD',
  payload: { field: 'taxonSelect', value: taxon }
});

const setEntityResultList = (entityResultList) => ({
  type: 'SET_ENTITY_RESULT_LIST',
  payload: { entityResultList: entityResultList }
});


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
export const biblioRevertDatePublished = (e) => {
  const activeElement = getRevertButtonFromFontAwesomeElement(e.target);
  return {
    type: 'BIBLIO_REVERT_DATE_PUBLISHED',
    payload: {
      field: activeElement.id
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
  console.log('action initializeDict ');
  console.log(initializeDict);
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

export function generateCorrectionsSimple(referenceJson) {
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
  } }
}

export const fetchModReferenceTypes = async (mods) => {
  const baseUrl = restUrl + '/reference/mod_reference_type/by_mod/';
  let modReferenceTypes = {}
  for (const mod of mods) {
    if (mod !== '') {
      const result = await axios.get(baseUrl + mod)
      modReferenceTypes[mod] = await result.data;
      modReferenceTypes[mod].unshift('');
    }
  }
  return modReferenceTypes
}

export const biblioQueryReferenceCurie = (referenceCurie) => dispatch => {
  console.log('action in biblioQueryReferenceCurie action');
  const createBiblioQueryReferenceCurie = async () => {
    const url = restUrl + '/reference/' + referenceCurie;
    const res = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'content-type': 'application/json'
      }
    })
    const response = await res.json();
    let response_payload = 'not found';
    if (response !== undefined) {
      const referenceJson = response;
      if ('comment_and_corrections' in referenceJson && referenceJson['comment_and_corrections'] !== null) {
        generateCorrectionsSimple(referenceJson);
      }
      response_payload = referenceJson;
    }
    // need dispatch because "Actions must be plain objects. Use custom middleware for async actions."
    dispatch({
      type: 'BIBLIO_GET_REFERENCE_CURIE',
      payload: response_payload
    })
  }
  createBiblioQueryReferenceCurie()
};

export const closeBiblioUpdateAlert = () => {
  console.log("action closeBiblioUpdateAlert");
  return {
    type: 'CLOSE_BIBLIO_UPDATE_ALERT'
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

export const changeBiblioSupplementExpandToggler = (e) => {
  console.log('action change biblio supplement expand toggler radio ' + e.target.id + ' to ' + e.target.value);
  let biblioSupplementExpandTogglerSelected = 'tarball';
  if (e.target.id === 'biblio-supplement-expand-toggler-list') { biblioSupplementExpandTogglerSelected = 'list'; }
    else if (e.target.id === 'biblio-supplement-expand-toggler-detailed') { biblioSupplementExpandTogglerSelected = 'detailed'; }
  return {
    type: 'CHANGE_BIBLIO_SUPPLEMENT_EXPAND_TOGGLER',
    payload: biblioSupplementExpandTogglerSelected
  };
};

export const changeBiblioActionToggler = (e, biblioActionTogglerSelected) => {
  console.log('action change biblio action toggler radio ' + e.target.id + ' to ' + biblioActionTogglerSelected);
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

export const setUpdateCitationFlag = (updateCitationFlag) => {
  console.log("action setUpdateCitationFlag");
  return {
    type: 'SET_UPDATE_CITATION_FLAG',
    payload: updateCitationFlag
  };
};

export const setUpdateBiblioFlag = (updateBiblioFlag) => {
  console.log("action setUpdateBiblioFlag");
  return {
    type: 'SET_UPDATE_BIBLIO_FLAG',
    payload: updateBiblioFlag
  };
};

export const validateFormUpdateBiblio = () => {
  console.log("action validateFormUpdateBiblio");
  return {
    type: 'VALIDATE_FORM_UPDATE_BIBLIO'
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

export const setWorkflowModalText = (payload) => {
  return {
    type: 'SET_WORKFLOW_MODAL_TEXT',
    payload: payload
  };
};

export const setEntityModalText = (payload) => {
  return {
    type: 'SET_ENTITY_MODAL_TEXT',
    payload: payload
  };
};

export const setBiblioEditorModalText = (payload) => {
  return {
    type: 'SET_BIBLIO_EDITOR_MODAL_TEXT',
    payload: payload
  };
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

export const setGetReferenceCurieFlag = (true_false) => {
  console.log("action setReferenceCurie");
  return {
    type: 'SET_GET_REFERENCE_CURIE_FLAG',
    payload: true_false
  };
};

export const addLoadingFileName = (fileName) => {
  return {
    type: 'ADD_LOADING_FILE_NAME',
    payload: fileName
  }
}

export const removeLoadingFileName = (fileName) => {
  return {
    type: 'REMOVE_LOADING_FILE_NAME',
    payload: fileName
  }
}

export const queryId = (id) => {
  return dispatch => {
    if (id.startsWith('AGR:') || id.startsWith('AGRKB:')) {
      dispatch(setReferenceCurie(id));
    } else {
      console.log('in queryId action');
      console.log("payload " + id);
      const url = restUrl + '/cross_reference/' + id;
      fetch(url, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'content-type': 'application/json'
        }
      }).then(res => {
        res.json().then(response => {
          let response_payload = id;
          if (response.reference_curie !== undefined) {
            console.log('response not undefined');
            response_payload = response.reference_curie;
          }
          dispatch(setReferenceCurie(response_payload));
        });
      })
    }
  }
};

export const downloadReferencefile = (referencefileId, filename, accessToken, referenceId) => {
  return dispatch => {
    dispatch(addLoadingFileName(filename));
    let url = process.env.REACT_APP_RESTAPI;
    if (referenceId !== undefined) {
      url += '/reference/referencefile/additional_files_tarball/' + referenceId
    } else {
      url += '/reference/referencefile/download_file/' + referencefileId
    }
    axios({
      url: url,
      method: "GET",
      headers: {
        'content-type': 'application/octet-stream',
        'authorization': 'Bearer ' + accessToken
      },
      responseType: "blob" // important
    }).then(response => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
          "download",
          filename
      );
      document.body.appendChild(link);
      link.click();
    }).finally(() => {
      dispatch(removeLoadingFileName(filename));
    })
  }
}

export const setFileUploadingCount = (payload) => { return { type: 'SET_FILE_UPLOADING_COUNT', payload: payload }; };

export const fileUploadResult = (filename, resultMessage) => { 
  return { 
    type: 'FILE_UPLOAD_RESULT',
        payload: {
          filename: filename,
          resultMessage: resultMessage
        }
}; };

export const setFileUploadingShowSuccess = (payload) => {
  return {
    type: 'SET_FILE_UPLOADING_SHOW_SUCCESS',
    payload: payload
  };
};

export const setFileUploadingShowModal = (payload) => {
  return {
    type: 'SET_FILE_UPLOADING_SHOW_MODAL',
    payload: payload
  };
};

export const setFileUploadingModalText = (modalText) => ({
  type: 'SET_FILE_UPLOADING_MODAL_TEXT',
  payload: modalText
})
