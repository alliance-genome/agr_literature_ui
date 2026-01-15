// import history from "../history";

// import notGithubVariables from './notGithubVariables';

import axios from "axios";
import { api } from "../api";

const restUrl = process.env.REACT_APP_RESTAPI;
// const restUrl = 'stage-literature-rest.alliancegenome.org';
// const port = 11223;
// const port = 49161;

const sgdApiBaseUrl = process.env.REACT_APP_SGD_API_BASE_URL;
const wbApiBaseUrl = process.env.REACT_APP_WB_API_BASE_URL;

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

export const deleteFieldModReferenceReferenceJson = (e) => {
  console.log('action delete field mod reference json ' + e.target.id + ' to delete');
//   console.log(e);
  const activeElement = getRevertButtonFromFontAwesomeElement(e.target);
  return {
    type: 'DELETE_FIELD_MOD_REFERENCE_REFERENCE_JSON',
    payload: {
      field: activeElement.id
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

export const deleteFieldCrossReferencesReferenceJson = (e) => {
  console.log('action delete field cross references json ' + e.target.id + ' to delete');
//   console.log(e);
  const activeElement = getRevertButtonFromFontAwesomeElement(e.target);
  return {
    type: 'DELETE_FIELD_CROSS_REFERENCES_REFERENCE_JSON',
    payload: {
      field: activeElement.id
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

export const deleteFieldModAssociationReferenceJson = (e) => {
  console.log('action delete field mod association json ' + e.target.id + ' to delete');
//   console.log(e);
  const activeElement = getRevertButtonFromFontAwesomeElement(e.target);
  return {
    type: 'DELETE_FIELD_MOD_ASSOCIATION_REFERENCE_JSON',
    payload: {
      field: activeElement.id
    }
  };
};

export const changeFieldModAssociationReferenceJson = (e) => {
  console.log('action change field mod association json ' + e.target.id + ' to ' + e.target.value + ' checked ' + e.target.checked);
//   console.log(e);
  return {
    type: 'CHANGE_FIELD_MOD_ASSOCIATION_REFERENCE_JSON',
    payload: {
      field: e.target.id,
      checked: e.target.checked,
      value: e.target.value
    }
  };
};


export const changeFieldReferenceRelationsJson = (e) => {
  console.log('action change field reference relations json ' + e.target.id + ' to ' + e.target.value);
//   console.log(e);
  return {
    type: 'CHANGE_FIELD_REFERENCE_RELATIONS_JSON',
    payload: {
      field: e.target.id,
      value: e.target.value
    }
  };
};

export const deleteFieldAuthorsReferenceJson = (e) => {
  console.log('action delete field authors json ' + e.target.id + ' to delete');
  const activeElement = getRevertButtonFromFontAwesomeElement(e.target);
  return {
    type: 'DELETE_FIELD_AUTHORS_REFERENCE_JSON',
    payload: {
      field: activeElement.id
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

export const getCuratorSourceId = async (mod) => {
  try {
    // /source/{source_type}/{source_method}/{mod_abbreviation}
    const res = await api.get('/topic_entity_tag/source/ATP:0000036/abc_literature_system/' + mod + '/' + mod);
    return res.data.topic_entity_tag_source_id;
  } catch (error) {
    if (error.response?.status === 404) {
      try {
        const newSourceId = await api.post('/topic_entity_tag/source', {
          "source_evidence_assertion": "ATP:0000036",
          "source_method": "abc_literature_system",
          "validation_type": "professional_curator",
          "description": "Trained professional biocurator specializing in curation of model organism data using the ABC data entry form.",
          "secondary_data_provider_abbreviation": mod,
          "data_provider": mod,
          "created_by": "00u1mhf3mf28xjpPt5d7",
          "updated_by": "00u1mhf3mf28xjpPt5d7",
        });
        return newSourceId;
      } catch (error) {
        return undefined;
      }
    }
  }
}

export const getXrefPatterns = (datatype) => { return dispatch => {
  const url = process.env.REACT_APP_RESTAPI + '/cross_reference/check/patterns/' + datatype;
  axios({ url: url })
    .then(res => {
      console.log(res);
      dispatch({
        type: 'UPDATE_XREF_PATTERNS',
        payload: { datatype: datatype, data: res.data }
      })
    })
    .catch(err =>
      console.log(err)
    );
} }

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

export const setBiblioEntityRemoveEntity = (tetId, value) => ({
  type: 'SET_BIBLIO_ENTITY_REMOVE_ENTITY',
  payload: { tetId: tetId, value: value }
});

export const updateButtonBiblioEntityEditEntity = (accessToken, tetId, payload, method, dispatchAction) => { return dispatch => {
  // accessToken parameter kept for backwards compatibility - auth handled by API client interceptor
  const url = '/topic_entity_tag/' + tetId;
  let response_message = 'update success';

  api.request({
    url: url,
    method: method,
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

export const updateButtonBiblioEntityAdd = (updateArrayData, accessLevel) => {
  return dispatch => {
    return new Promise((resolve, reject) => {
      // accessToken in updateArrayData kept for backwards compatibility - auth handled by API client interceptor
      const [, subPath, payload, method] = updateArrayData;
      const url = '/' + subPath;

      api.request({
        url: url,
        method: method,
        data: payload
      })
        .then(res => {
          let response_message;
          //console.log('API Response:', res);
          if (((method === 'PATCH') && (res.status !== 202)) ||
            ((method === 'DELETE') && (res.status !== 204)) ||
            ((method === 'POST') && (res.status !== 201))) {
            response_message = 'error: ' + subPath + ' : API status code ' + res.status + ' for method ' + method;
            reject(new Error(response_message));
          } else {
            // response_message = `${JSON.stringify(res.data)}`;
            resolve(res.data);
            dispatch({
              type: 'UPDATE_BUTTON_BIBLIO_ENTITY_ADD',
              payload: { responseMessage: 'update success', accessLevel: accessLevel  }
            });
          }
        })
        .catch(err => {
          const errorMessage = 'error: ' + subPath + ' ' + err;
          console.error(errorMessage);
          dispatch({
            type: 'UPDATE_BUTTON_BIBLIO_ENTITY_ADD',
            payload: { responseMessage: errorMessage, accessLevel: accessLevel }
          });
          reject(new Error(errorMessage));
        });
    });
  };
};


async function fetchJsonData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch data:', error);
    return null;
  }
};

export const sgd_entity_validation = (dispatch, entityType, entityInputList, callback) => {

  const url = sgdApiBaseUrl + "entity/" + entityType + '/' + entityInputList.join('|').replace(/ /g, '+');
  fetchJsonData(url).then(data => {
    const searchMap = {};
    // console.log("data =" + JSON.stringify(data, null, 2));
    for (const entityResult of data) {
      // console.log("entityResult = " + JSON.stringify(entityResult, null, 2));
      searchMap[entityResult['query'].toLowerCase()] = entityResult['modEntityId'];
    }
    let entityResultList = [];
    for (const entity  of entityInputList) {
      const lowerEntity = entity.toLowerCase();
      if (lowerEntity in searchMap) {
        entityResultList.push({
          'entityTypeSymbol': entity,
          'curie': searchMap[lowerEntity]
        });
      } else {
        entityResultList.push({'entityTypeSymbol': entity, 'curie': 'no SGD curie'});
      }
    }
    dispatch(setEntityResultList(entityResultList));
    if (callback) {
      callback(entityResultList); // Call the callback with the result list
    }
  }).catch(error => {
    console.error('Error fetching data:', error);
    if (callback) {
      callback([]); // Call the callback with an empty list in case of error
    }
  });

};


export const wb_entity_validation = (dispatch, entityType, entityInputList, callback) => {
  let postData = {
    "datatype": entityType,
    "entities": entityInputList.join('|').replace(/ /g, '+')
  };
  // let postData = {"datatype":"gene","entities":"let-60|abc-1|WB:WBGeneQUACK|WB:WBGene99901234|WB:WBGene00001234|quack"};
  axios.post(wbApiBaseUrl, postData,
    {
      headers: {
        'content-type': 'application/json'
      }
    })
    .then(res => {
      if (res.data) {
        const searchMap = {};
        for (const [curie, name] of Object.entries(res.data)) {
          searchMap[name.toLowerCase()] = curie;
          if (name.toLowerCase() === 'not found at wb') {
            searchMap[curie.toLowerCase()] = name; }
          else {
            searchMap[curie.toLowerCase()] = curie; }
        }
        let entityResultList = [];
        for (const entityTypeSymbol of entityInputList) {
          if (entityTypeSymbol.toLowerCase() in searchMap) {
            entityResultList.push({
              'entityTypeSymbol': entityTypeSymbol,
              'curie': searchMap[entityTypeSymbol.toLowerCase()]
            });
          } else {
            entityResultList.push({'entityTypeSymbol': entityTypeSymbol, 'curie': 'no WB curie'});
          }
        }
        dispatch(setEntityResultList(entityResultList));
        if (callback) {
          callback(entityResultList); // Call the callback with the result list
        }
      }
    }).catch(error => {
    console.error('Error fetching data:', error);
    if (callback) {
      callback([]); // Call the callback with an empty list in case of error
    }
  });
};


export const abc_entity_validation = (dispatch, entityType, entityInputList, taxon, callback) => {

  const entityListStr = entityInputList.join('|');
  const encodedEntityList = encodeURIComponent(entityListStr);
  const url = `/ontology/entity_validation/${taxon}/${entityType}/${encodedEntityList}`;
  api.get(url).then(res => {
    const data = res.data;
    const searchMap = {};
    const obsoleteMap = {};
    for (const entityResult of data) {
      if (entityResult['is_obsolete'] === false) {
        searchMap[entityResult['entity'].toLowerCase()] = entityResult['entity_curie'];
      } else {
        obsoleteMap[entityResult['entity'].toLowerCase()] = entityResult['entity_curie'];
      }
    }
    let entityResultList = [];
    for (const entity  of entityInputList) {
      const lowerEntity = entity.toLowerCase();
      if (lowerEntity in searchMap) {
        entityResultList.push({
          'entityTypeSymbol': entity,
          'curie': searchMap[lowerEntity]
        });
      } else if (lowerEntity in obsoleteMap) {
        entityResultList.push({'entityTypeSymbol': entity, 'curie': 'obsolete entity'});
      } else {
        entityResultList.push({'entityTypeSymbol': entity, 'curie': 'no mod curie'});
      }
    }
    dispatch(setEntityResultList(entityResultList));
    if (callback) {
      callback(entityResultList); // Call the callback with the result list
    }
  }).catch(error => {
    console.error('Error fetching data:', error);
    if (callback) {
      callback([]); // Call the callback with an empty list in case of error
    }
  });

};

export const changeFieldEntityEntityList = (entityText, accessToken, entityIdValidation, taxon, entityType, callback) => {

  return async (dispatch) => {
    if (entityType.includes('allele')) {
      entityType = 'allele';
    }
    let entityInputList = [];
    if (entityText && entityText.trim() !== '') {
      entityInputList = entityText.split('\n').map(element => element.trim()).filter(item => item !== '');
    }

    if (entityIdValidation === 'sgd' && (entityType === 'complex' || entityType === 'pathway')) {
      return sgd_entity_validation(dispatch, entityType, entityInputList, callback);
    }

    if (entityIdValidation === 'wb') {
      return wb_entity_validation(dispatch, entityType, entityInputList, callback);
    }

    // Default case
    if (entityType.includes('construct')) {
      entityType = 'construct';
    }

    return abc_entity_validation(dispatch, entityType, entityInputList, taxon, callback)

  };
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

export const setTypeaheadName2CurieMap = (typeaheadName2CurieMap) => ({
  type: 'SET_TYPEAHEAD_NAME_2_CURIE_MAP',
  payload: typeaheadName2CurieMap
})

export const changeFieldEntityAddTaxonSelect = (taxon) => ({
  type: 'CHANGE_FIELD_ENTITY_ADD_GENERAL_FIELD',
  payload: { field: 'taxonSelect', value: taxon }
});

export const changeFieldEntityAddDisplayTag = (displayTag) => ({
  type: 'CHANGE_FIELD_ENTITY_ADD_GENERAL_FIELD',
  payload: { field: 'tetdisplayTagSelect', value: displayTag }
});

const setEntityResultList = (entityResultList) => ({
  type: 'SET_ENTITY_RESULT_LIST',
  payload: { entityResultList: entityResultList }
});

export const setEditTag = (editTag) => ({
  type: 'SET_EDIT_TAG',
  payload: editTag
});

export const setFilteredTags = (filteredTags) => ({
  type: 'SET_FILTERED_TAGS',
  payload: filteredTags
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

export function generateRelationsSimple(referenceJson) {
  let comcorMapping = {}
  comcorMapping['CommentOn'] = 'HasComment'
  comcorMapping['ErratumFor'] = 'HasErratum'
  comcorMapping['ExpressionOfConcernFor'] = 'HasExpressionOfConcernFor'
  comcorMapping['ReprintOf'] = 'HasReprint'
  comcorMapping['RepublishedFrom'] = 'RepublishedIn'
  comcorMapping['RetractionOf'] = 'HasRetraction'
  comcorMapping['UpdateOf'] = 'HasUpdate'
  comcorMapping['ChapterIn'] = 'hasChapter'
  const comcorDirections = ['to_references', 'from_references']
  referenceJson['relations'] = []
  for (const direction of comcorDirections) {
    for (const comcorDict of referenceJson['reference_relations'][direction].values()) {
      let curieFieldInDict = (direction === 'to_references') ? 'reference_curie_to' : 'reference_curie_from';
      let curie = comcorDict[curieFieldInDict]
      let dbid = comcorDict['reference_relation_id']
      let type = comcorDict['reference_relation_type']
      //if (type === 'hasChapter' || type === 'ChapterIn'){continue }
      if (direction === 'from_references') {
        if (type in comcorMapping) { type = comcorMapping[type] } }
      let newComcorDict = {}
      newComcorDict['reference_relation_id'] = dbid
      newComcorDict['type'] = type
      newComcorDict['curie'] = curie
      referenceJson['relations'].push(newComcorDict)
    } }
}

export const fetchModReferenceTypes = async (mods) => {
  const baseUrl = '/reference/mod_reference_type/by_mod/';
  let modReferenceTypes = {}
  for (const mod of mods) {
    if (mod !== '') {
      const result = await api.get(baseUrl + mod)
      modReferenceTypes[mod] = await result.data;
      modReferenceTypes[mod].unshift('');
    }
  }
  return modReferenceTypes
}


export const getDescendantATPIds = async (atpID) => {

  const url = `/ontology/search_descendants/${encodeURIComponent(atpID)}`;

  try {
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("Error occurred in getDescendantATPIds:", error);
    throw error;
  }
};

export const fetchDisplayTagData = async () => {
  // Fallback if the endpoint returns nothing or fails:
  const fallbackDisplayTagData = [
    { curie: "ATP:0000147", name: "primary display" },
    { curie: "ATP:0000148", name: "OMICs display" },
    { curie: "ATP:0000132", name: "additional display" },
    { curie: "ATP:0000130", name: "review display" },
  ];

  const url = `/ontology/search_descendants/ATP:0000136`;

  try {
    const response = await api.get(url);

    // If response.data is a non-empty array, return it; otherwise fallback
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    } else {
      return fallbackDisplayTagData;
    }
  } catch (error) {
    console.error("Error occurred:", error);
    return fallbackDisplayTagData;
  }
};

export const biblioQueryReferenceCurie = (referenceCurie) => dispatch => {
  console.log('action in biblioQueryReferenceCurie action');
  const createBiblioQueryReferenceCurie = async () => {
    const url = '/reference/' + referenceCurie;
    try {
      const res = await api.get(url);
      const response = res.data;
      let response_payload = 'not found';
      if (response !== undefined) {
        const referenceJson = response;
        if ('reference_relations' in referenceJson && referenceJson['reference_relations'] !== null) {
          generateRelationsSimple(referenceJson);
        }
        response_payload = referenceJson;
      }
      // need dispatch because "Actions must be plain objects. Use custom middleware for async actions."
      dispatch({
        type: 'BIBLIO_GET_REFERENCE_CURIE',
        payload: response_payload
      })
    } catch (error) {
      dispatch({
        type: 'BIBLIO_GET_REFERENCE_CURIE',
        payload: 'not found'
      })
    }
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

// citation now updates from database triggers
// export const setUpdateCitationFlag = (updateCitationFlag) => {
//   console.log("action setUpdateCitationFlag");
//   return {
//     type: 'SET_UPDATE_CITATION_FLAG',
//     payload: updateCitationFlag
//   };
// };

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
  // accessToken in updateArrayData kept for backwards compatibility - auth handled by API client interceptor
  const [, subPath, payload, method, index, field, subField] = updateArrayData;
  let newId = null;

  const createUpdateButtonBiblio = async () => {
    const url = '/' + subPath;
    console.log(restUrl + url);

    try {
      const res = await api.request({
        url: url,
        method: method,
        data: payload
      });

      let response_message = 'update success';
      if ((method === 'DELETE') && (res.status === 204)) {
        // success of delete has no response body
      } else {
        const response = res.data;
        if (((method === 'PATCH') && (res.status !== 202)) ||
            ((method === 'DELETE') && (res.status !== 204)) ||
            ((method === 'POST') && (res.status !== 201))) {
          console.log('updateButtonBiblio action response not updated');
          if (typeof(response.detail) !== 'object') {
            response_message = response.detail;
          } else if (typeof(response.detail[0].msg) !== 'object') {
            response_message = 'error: ' + subPath + ' : ' + response.detail[0].msg + ': ' + response.detail[0].loc[1];
          } else {
            response_message = 'error: ' + subPath + ' : API status code ' + res.status;
          }
        }
        if ((method === 'POST') && (res.status === 201)) {
          newId = typeof response === 'number' ? response : parseInt(response);
        }
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
        });
      }, 500);
    } catch (error) {
      console.error('updateButtonBiblio error:', error);
      const response_message = error.response?.data?.detail || 'error: ' + subPath + ' : ' + error.message;
      setTimeout(() => {
        dispatch({
          type: 'UPDATE_BUTTON_BIBLIO',
          payload: {
            responseMessage: response_message,
            index: index,
            value: null,
            field: field,
            subField: subField
          }
        });
      }, 500);
    }
  };
  createUpdateButtonBiblio();
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


export const setEntityModalText = (payload) => {
  return {
    type: 'SET_ENTITY_MODAL_TEXT',
    payload: payload
  };
};

export const setReferenceFiles = (payload) => {
  return {
    type: 'SET_REFERENCE_FILES',
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

export const downloadPDFfile = (referencefileId, filename, accessToken, referenceId) => {
  // accessToken parameter kept for backwards compatibility - auth handled by API client interceptor
  return dispatch => {
    dispatch(addLoadingFileName(filename));
    const url = '/reference/referencefile/download_file/' + referencefileId;

    api.get(url, {
      responseType: 'blob' // important for handling binary data
    }).then(response => {
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const pdfUrl = window.URL.createObjectURL(blob);
      window.open(pdfUrl, '_blank');
    }).finally(() => {
      dispatch(removeLoadingFileName(filename));
    });
  };
}

export const downloadReferencefile = (referencefileId, filename, accessToken, referenceId) => {
  // accessToken parameter kept for backwards compatibility - auth handled by API client interceptor
  if (filename.endsWith('.pdf')) {
    return downloadPDFfile(referencefileId, filename, accessToken, referenceId);
  }

  return dispatch => {
    dispatch(addLoadingFileName(filename));
    let url;
    if (referenceId !== undefined) {
      url = '/reference/referencefile/additional_files_tarball/' + referenceId;
    } else {
      url = '/reference/referencefile/download_file/' + referencefileId;
    }
    api.get(url, {
      responseType: "blob" // important
    }).then(response => {
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
    }).finally(() => {
      dispatch(removeLoadingFileName(filename));
    });
  };
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
export const setCurieToNameTaxon = (taxonMappings) => ({
  type: 'SET_CURIE_TO_NAME_TAXON',
  payload: taxonMappings
});

export const setAllSpecies = (allSpecies) => ({
  type: 'SET_ALL_SPECIES',
  payload: allSpecies
});

export const setAllEntities = (allEntities) => ({
  type: 'SET_ALL_ENTITIES',
  payload: allEntities
});

export const setAllTopics = (allTopics) => ({
  type: 'SET_ALL_TOPICS',
  payload: allTopics
});

export const setAllEntityTypes = (allEntityTypes) => ({
  type: 'SET_ALL_ENTITY_TYPES',
  payload: allEntityTypes
});

export const setTopicEntitySourceId = (topicEntitySourceId) => ({
  type: 'SET_TOPIC_ENTITY_SOURCE_ID',
  payload: topicEntitySourceId
});
