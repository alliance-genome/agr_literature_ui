// import history from "../history";

// import notGithubVariables from './notGithubVariables';

import axios from "axios";

import { generateRelationsSimple } from './biblioActions';

const restUrl = process.env.REACT_APP_RESTAPI;

const ateamApiBaseUrl = process.env.REACT_APP_ATEAM_API_BASE_URL;

export const changeFieldInput = (e, object, key1) => {
  // console.log('merge action change field array reference json ' + e.target.id + ' to ' + e.target.value);
  return {
    type: 'MERGE_CHANGE_FIELD_INPUT',
    payload: {
      field: e.target.id,
      object: object,
      key1: key1,
      value: e.target.value
    }
  };
};

export const changeFieldTetCheckbox = (e, object) => {
  // console.log('merge action change field array reference json ' + e.target.id + ' to ' + e.target.value);
  const value = (e.target.checked) ? true : false;
  return {
    type: 'MERGE_CHANGE_FIELD_TET_CHECKBOX',
    payload: {
      field: e.target.id,
      object: object,
      value: value
    }
  };
};

export const mergeResetReferences = () => { return { type: 'MERGE_RESET_REFERENCES' }; };

export const mergeSwapKeep = () => { return { type: 'MERGE_SWAP_KEEP' }; };

export const mergeSwapKeepPmid = () => { return { type: 'MERGE_SWAP_KEEP_PMID' }; };

export const mergeSwapPairSimple = (fieldName) => { 
  console.log("action mergeSwapPairSimple " + fieldName);
  return { type: 'MERGE_SWAP_PAIR_SIMPLE',
           payload: { fieldName: fieldName } }; };

export const mergeToggleIndependent = (fieldName, oneOrTwo, index, subtype) => {
  console.log("action mergeToggleIndependent " + fieldName + ' ' + oneOrTwo + ' ' + index + ' ' + subtype);
  return { type: 'MERGE_TOGGLE_INDEPENDENT',
           payload: { fieldName: fieldName, oneOrTwo: oneOrTwo, index: index, subtype: subtype } }; };

// export const mergeSwapPairSimple = (fieldName) => dispatch => {
//   console.log("action mergeSwapPairSimple " + fieldName);
// }

export const mergeAteamQueryAtp = (accessToken, atpParents) => dispatch => {
  console.log("action mergeAteamQueryAtp " + atpParents);

  const queryAteamAtpChildren = async (atp) => {
    const ateamApiUrl = ateamApiBaseUrl + 'api/atpterm/' + atp + '/children';
    const response = await axios.get(ateamApiUrl, {
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      }
    });
    dispatch({
      type: 'MERGE_ATEAM_ATP_RESULT',
      payload: { atp: atp, response: response.data.entities }
    });
  }

  atpParents.forEach( (atp) => {
    // console.log('foreach queryAteamAtpChildren ' + atp);
    queryAteamAtpChildren(atp);
  });
}

export const mergeQueryReferences = (referenceInput1, referenceInput2, swapBool) => dispatch => {
  // console.log("ref1 " + referenceInput1);
  // console.log("ref2 " + referenceInput2);
  dispatch({
    type: 'MERGE_SET_IS_LOADING_REFERENCES',
    payload: true
  });

  const queryXref = async (referenceInput) => {
    const urlApi = restUrl + '/cross_reference/' + referenceInput;
    console.log(urlApi);
    const res = await fetch(urlApi, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'content-type': 'application/json'
      }
    })
    const response = await res.json();
    let response_curie = referenceInput + ' not found';
    let response_success = false;
    if (response.reference_curie !== undefined) {
      response_curie = response.reference_curie;
      response_success = true; }
    return [response_curie, response_success]
  }

  const queryRefTet = async (referenceCurie) => {
    const url = restUrl + '/topic_entity_tag/by_reference/' + referenceCurie
    const res = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'content-type': 'application/json'
      }
    })
    const response = await res.json();
    let response_payload = referenceCurie + ' not found';
    let response_success = false;
    if (Array.isArray(response)) {
      response_success = true;
      response_payload = response; }
    return [response_payload, response_success]
  }

  const queryRefFiles = async (referenceCurie) => {
    const url = restUrl + '/reference/referencefile/show_all/' + referenceCurie;
    console.log(url);
    const res = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'content-type': 'application/json'
      }
    })
    const response = await res.json();
    console.log(response);
    let response_payload = referenceCurie + ' not found';
    let response_success = false;
    if (Array.isArray(response)) {
      response_success = true;
      response_payload = response; }
    return [response_payload, response_success]
  }

  const queryRef = async (referenceCurie) => {
    const url = restUrl + '/reference/' + referenceCurie;
    console.log(url);
    const res = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'content-type': 'application/json'
      }
    })
    const response = await res.json();
    console.log(response);
    let response_payload = referenceCurie + ' not found';
    let response_success = false;
    if (response.curie !== undefined) {
      // console.log('response not undefined');
      response_success = true;
      response_payload = response; }
    return [response_payload, response_success]
  }

  const resolveReferenceCurie = async (referenceInput) => {
    let curieValue = '';
    let curieFound = false;
    // let successXref = false;
    // const regexMatch = referenceInput.toLowerCase().match(/(AGR:AGR-Reference-\d{10})/i);
    const regexMatch = referenceInput.toLowerCase().match(/(AGRKB:101\d{12})/i);
    // console.log('regexMatch');
    // console.log( regexMatch);
    if (regexMatch !== null) {
      curieFound = true;
      // const regexMatch = referenceInput.toLowerCase().match(/(AGR:AGR-Reference-\d{10})/i);
      // curieValue = regexMatch[0].replace('agr:agr-reference', 'AGR:AGR-Reference');
      const regexMatch = referenceInput.toLowerCase().match(/(AGRKB:101\d{12})/i);
      curieValue = regexMatch[0].replace('agrkb:', 'AGRKB:'); }
    else {
      const promiseXref = queryXref(referenceInput);
      let valuesXref = await Promise.allSettled([promiseXref]);
      curieValue = valuesXref[0]['value'][0];
      curieFound = valuesXref[0]['value'][1]; }
    return [curieValue, curieFound];
  }

  const queryBothXrefs = async (referenceInput1, referenceInput2, swapBool) => {
    let promiseXref1 = resolveReferenceCurie(referenceInput1);
    let promiseXref2 = resolveReferenceCurie(referenceInput2);
    let valuesXref = await Promise.allSettled([promiseXref1, promiseXref2]);
    let curieValue1 = valuesXref[0]['value'][0];
    let curieFound1 = valuesXref[0]['value'][1];
    let curieValue2 = valuesXref[1]['value'][0];
    let curieFound2 = valuesXref[1]['value'][1];

    // console.log('curieValue1 ' + curieValue1);
    // console.log('curieFound1 ' + curieFound1);
    // console.log('curieValue2 ' + curieValue2);
    // console.log('curieFound2 ' + curieFound2);

    let referenceJson1 = '';
    let referenceFound1 = false
    let referenceJson2 = '';
    let referenceFound2 = false
    if (curieFound1 && curieFound2) {
      const promiseRef1 = queryRef(curieValue1);
      const promiseRef2 = queryRef(curieValue2);
      let valuesRef = await Promise.allSettled([promiseRef1, promiseRef2]);

      referenceJson1 = valuesRef[0]['value'][0];
      referenceFound1 = valuesRef[0]['value'][1];

      if (referenceJson1.constructor === Object && 'reference_relations' in referenceJson1 &&
          referenceJson1['reference_relations'] !== null) {
        generateRelationsSimple(referenceJson1); }

      referenceJson2 = valuesRef[1]['value'][0];
      referenceFound2 = valuesRef[1]['value'][1];

      curieValue1 = (referenceFound1) ? referenceJson1['curie'] : curieValue1 + ' not found';
      curieValue2 = (referenceFound2) ? referenceJson2['curie'] : curieValue2 + ' not found';

      if (referenceJson2.constructor === Object && 'reference_relations' in referenceJson2 &&
          referenceJson2['reference_relations'] !== null) {
        generateRelationsSimple(referenceJson2); }

      const promiseRefFile1 = queryRefFiles(curieValue1);
      const promiseRefFile2 = queryRefFiles(curieValue2);
      let valuesRefFiles = await Promise.allSettled([promiseRefFile1, promiseRefFile2]);
      referenceJson1['reference_files'] = valuesRefFiles[0]['value'][0];
      referenceJson2['reference_files'] = valuesRefFiles[1]['value'][0];

      const promiseRefTet1 = queryRefTet(curieValue1);
      const promiseRefTet2 = queryRefTet(curieValue2);
      let valuesRefTets = await Promise.allSettled([promiseRefTet1, promiseRefTet2]);
      referenceJson1['topic_entity_tags'] = valuesRefTets[0]['value'][0];
      referenceJson2['topic_entity_tags'] = valuesRefTets[1]['value'][0];

      if (curieValue1 === curieValue2) {
        curieValue2 = curieValue2 + ' is the same as the reference curie to keep';
        referenceFound2 = false; curieFound2 = false; }
    } // if (curieFound1 && curieFound2)

    dispatch({
      type: 'MERGE_SET_IS_LOADING_REFERENCES',
      payload: false
    });
    dispatch({
      type: 'MERGE_QUERY_REFERENCES',
      payload: {
        curieValue1: curieValue1,
        referenceJson1: referenceJson1,
        referenceFound1: referenceFound1,
        curieValue2: curieValue2,
        referenceJson2: referenceJson2,
        referenceFound2: referenceFound2,
        swapBool: swapBool,
        blah: 'blah'
    }});
  }

  queryBothXrefs(referenceInput1, referenceInput2, swapBool);
}

export const mergeButtonApiDispatch = (updateArrayData) => dispatch => {
  // console.log('in mergeButtonApiDispatch action');
  const [accessToken, mergeType, subPath, payload, method, index, field, subField] = updateArrayData;
  // console.log("payload " + payload);
  // console.log("payload "); console.log(updateArrayData);
  let newId = null;
  const createUpdateButtonMerge = async () => {
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
    if ((method === 'DELETE') && (res.status === 204)) { }      // success of delete has no res.text so can't process like others
    else {
      // const response = await res.json();     // successful POST to related table (e.g. mod_reference_types) returns an id that is not in json format
      const response_text = await res.text();
      const response = JSON.parse(response_text);
      if ( ((method === 'PATCH') && (res.status !== 202)) ||
           ((method === 'DELETE') && (res.status !== 204)) ||
           ((method === 'POST') && (res.status !== 201)) ) {
        console.log('mergeButtonApiDispatch action response not updated');
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
      console.log('dispatch MERGE_BUTTON_API_DISPATCH');
    }
    setTimeout(() => {
      dispatch({
        type: 'MERGE_BUTTON_API_DISPATCH',
        payload: {
          responseMessage: response_message,
          index: index,
          value: newId,
          field: field,
          subField: subField,
          mergeType: mergeType
        }
      })
    }, 500);
  }
  createUpdateButtonMerge()
};

export const setMergeCompleting = (payload) => {
  return {
    type: 'SET_MERGE_COMPLETING',
    payload: payload
  };
};

export const setMergeUpdating = (payload) => {
  return {
    type: 'SET_MERGE_UPDATING',
    payload: payload
  };
};

export const setDataTransferHappened = (payload) => {
  return {
    type: 'SET_DATA_TRANSFER_HAPPENED',
    payload: payload
  };
};

export const setShowDataTransferModal = (payload) => {
  return {
    type: 'SET_SHOW_DATA_TRANSFER_MODAL',
    payload: payload
  };
};

// export const setCompletionMergeHappened = (payload) => {
//   return {
//     type: 'SET_COMPLETION_MERGE_HAPPENED',
//     payload: payload
//   };
// };

export const closeMergeUpdateAlert = () => {
  console.log("action closeMergeUpdateAlert");
  return {
    type: 'CLOSE_MERGE_UPDATE_ALERT'
  };
};
