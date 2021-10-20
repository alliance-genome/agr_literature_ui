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

  const queryBothXrefs = async (referenceInput1, referenceInput2) => {
    const promise1 = queryXref(referenceInput1);
    const promise2 = queryXref(referenceInput2);
    let values = await Promise.allSettled([promise1, promise2]);
    const value1 = values[0]['value'][0];
    const success1 = values[0]['value'][1];
    let value2 = values[1]['value'][0];
    let success2 = values[1]['value'][1];
    if (value1 === value2) {
      value2 = value2 + ' is the same as the reference curie to keep';
      success2 = false; }
// TODO  make queryRef
//     if (success1 && success2) {
//       const promiseRef1 = queryRef(value1);
//       const promiseRef2 = queryRef(value2);
//       let valuesRef = await Promise.allSettled([promiseRef1, promiseRef2]);
//     }
    dispatch({
      type: 'MERGE_QUERY_REFERENCES',
      payload: {
        curieValue1: value1,
        curieSuccess1: success1,
        curieValue2: value2,
        curieSuccess2: success2,
        blah: 'blah'
      }})}
  queryBothXrefs(referenceInput1, referenceInput2);
}
