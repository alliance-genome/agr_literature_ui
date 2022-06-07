// import history from "../history";

// import notGithubVariables from './notGithubVariables';

const restUrl = process.env.REACT_APP_RESTAPI;

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

export const mergeResetReferences = () => { return { type: 'MERGE_RESET_REFERENCES' }; };

export const mergeSwapKeep = () => { return { type: 'MERGE_SWAP_KEEP' }; };

export const mergeSwapPairSimple = (fieldName) => { 
  console.log("action mergeSwapPairSimple " + fieldName);
  return { type: 'MERGE_SWAP_PAIR_SIMPLE',
           payload: { fieldName: fieldName } }; };

export const mergeToggleIndependent = (fieldName, oneOrTwo, index) => {
  console.log("action mergeToggleIndependent " + fieldName + ' ' + oneOrTwo + ' ' + index);
  return { type: 'MERGE_TOGGLE_INDEPENDENT',
           payload: { fieldName: fieldName, oneOrTwo: oneOrTwo, index: index } }; };

// export const mergeSwapPairSimple = (fieldName) => dispatch => {
//   console.log("action mergeSwapPairSimple " + fieldName);
// }

export const mergeQueryReferences = (referenceInput1, referenceInput2) => dispatch => {
  // console.log("ref1 " + referenceInput1);
  // console.log("ref2 " + referenceInput2);

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
    const regexMatch = referenceInput.toLowerCase().match(/(AGR:AGR-Reference-\d{10})/i);
    // console.log('regexMatch');
    // console.log( regexMatch);
    if (regexMatch !== null) {
      curieFound = true;
      const regexMatch = referenceInput.toLowerCase().match(/(AGR:AGR-Reference-\d{10})/i);
      curieValue = regexMatch[0].replace('agr:agr-reference', 'AGR:AGR-Reference'); }
    else {
      const promiseXref = queryXref(referenceInput);
      let valuesXref = await Promise.allSettled([promiseXref]);
      curieValue = valuesXref[0]['value'][0];
      curieFound = valuesXref[0]['value'][1]; }
    return [curieValue, curieFound];
  }

  const queryBothXrefs = async (referenceInput1, referenceInput2) => {
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

    if (curieValue1 === curieValue2) {
      curieValue2 = curieValue2 + ' is the same as the reference curie to keep';
      curieFound2 = false; }

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
      if (!referenceFound1) {
        curieValue1 = curieValue1 + ' not found'; }
      console.log(referenceJson1);
      console.log(referenceFound1);
      referenceJson2 = valuesRef[1]['value'][0];
      referenceFound2 = valuesRef[1]['value'][1];
      if (!referenceFound2) { 
        curieValue2 = curieValue2 + ' not found'; } }

    dispatch({
      type: 'MERGE_QUERY_REFERENCES',
      payload: {
        curieValue1: curieValue1,
        referenceJson1: referenceJson1,
        referenceFound1: referenceFound1,
        curieValue2: curieValue2,
        referenceJson2: referenceJson2,
        referenceFound2: referenceFound2,
        blah: 'blah'
    }})
  }

  queryBothXrefs(referenceInput1, referenceInput2);
}
