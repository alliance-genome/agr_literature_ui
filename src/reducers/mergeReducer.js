
const initialState = {
//     message: 'Enter a Reference Agr ID or cross reference curie',
  referenceMetaDefault: {
    input: '',
    curie: '',
    referenceJson: '',
    queryRefSuccess: '',
    message: 'Enter a cross reference curie',
    messageColor: 'black',
    disableInput: '',
    blah: ''
  },
  referenceMeta1: {
    input: 'PMID:1',
    curie: '',
    referenceJson: '',
    queryRefSuccess: '',
    message: 'Enter a cross reference curie',
    messageColor: 'black',
    disableInput: '',
    blah: ''
  },
//     input: 'AGR:AGR-Reference-0000852278',
  referenceMeta2: {
    input: 'PMID:10',
    curie: '',
    referenceJson: '',
    queryRefSuccess: '',
    message: 'Enter a cross reference curie',
    messageColor: 'black',
    disableInput: '',
    blah: ''
  },

  referenceQuerySuccess1: '',
  referenceQuerySuccess2: '',
  queryColorDefault: 'blue',
  queryColorSuccess: '#188753',
  queryColorFailure: 'red',
  referenceMessageDefault: 'Enter a Reference Agr ID or cross reference curie',
  referenceMessage1: 'Enter a Reference Agr ID or cross reference curie',
  referenceMessage2: 'Enter a Reference Agr ID or cross reference curie',
  queryDoubleSuccess: false,
  blah: 'blah'
};

// to ignore a warning about Unexpected default export of anonymous function
// eslint-disable-next-line
export default function(state = initialState, action) {
  // action will have a type.  common to evaluate with a switch
  switch (action.type) {
    case 'MERGE_CHANGE_FIELD_INPUT':
      // console.log(action.payload);
      const changeObjectCopy = JSON.parse(JSON.stringify(state[action.payload.object]));
      changeObjectCopy[action.payload.key1] = action.payload.value;
      return {
        ...state,
        [action.payload.object]: changeObjectCopy
      }
    case 'MERGE_RESET_REFERENCES':
      console.log(action.type);
      return {
        ...state,
        referenceMeta1: JSON.parse(JSON.stringify(state.referenceMetaDefault)),
        referenceMeta2: JSON.parse(JSON.stringify(state.referenceMetaDefault)),
        queryDoubleSuccess: false,
        blah: 'blah'
      }
    case 'MERGE_QUERY_REFERENCES':
      console.log('reducer MERGE_QUERY_REFERENCES');
      console.log(action.payload);

      const referenceMeta1Copy = JSON.parse(JSON.stringify(state.referenceMeta1));
      referenceMeta1Copy.curie = (action.payload.referenceFound1) ? action.payload.curieValue1 : '';
      referenceMeta1Copy.message = action.payload.curieValue1;
      referenceMeta1Copy.queryRefSuccess = action.payload.referenceFound1;
      referenceMeta1Copy.messageColor = (action.payload.referenceFound1) ? state.queryColorSuccess : state.queryColorFailure;
      referenceMeta1Copy.referenceJson = (action.payload.referenceFound1) ? action.payload.referenceJson1 : '';

      const referenceMeta2Copy = JSON.parse(JSON.stringify(state.referenceMeta2));
      referenceMeta2Copy.curie = (action.payload.referenceFound2) ? action.payload.curieValue2 : '';
      referenceMeta2Copy.message = action.payload.curieValue2;
      referenceMeta2Copy.queryRefSuccess = action.payload.referenceFound2;
      referenceMeta2Copy.messageColor = (action.payload.referenceFound2) ? state.queryColorSuccess : state.queryColorFailure;
      referenceMeta2Copy.referenceJson = (action.payload.referenceFound2) ? action.payload.referenceJson2 : '';

      let queryDoubleSuccess = false;
      if (action.payload.referenceFound1 && action.payload.referenceFound2) {
        queryDoubleSuccess = true;
        referenceMeta1Copy.disableInput = 'disabled'; referenceMeta2Copy.disableInput = 'disabled'; }
      else {
        referenceMeta1Copy.disableInput = ''; referenceMeta2Copy.disableInput = ''; }

      return {
        ...state,
        referenceMeta1: referenceMeta1Copy,
        referenceMeta2: referenceMeta2Copy,
        queryDoubleSuccess: queryDoubleSuccess,
        blah: 'blah'
      }


//     case 'QUERY_CHANGE_QUERY_FIELD':
//       // console.log(action.payload);
//       return {
//         ...state,
//         queryField: action.payload
//       }
//     case 'RESET_QUERY_REDIRECT':
//       console.log("reset query redirect");
//       return {
//         ...state,
//         redirectToBiblio: false
//       }
// 
//     case 'QUERY_BUTTON':
//       console.log("query button reducer set " + action.payload);
//       let responseField = action.payload;
//       let responseFound = action.responseFound;
//       let responseColor = 'blue';
//       let redirectToBiblio = false;
//       let querySuccess = false;
//       if (responseFound === 'not found') { responseColor = 'red'; }
//         else { redirectToBiblio = true; querySuccess = true; }
//       return {
//         ...state,
//         responseColor: responseColor,
//         responseField: responseField,
//         redirectToBiblio: redirectToBiblio,
//         querySuccess: querySuccess
//       }
    default:
      return state;
  }
}
  

// const crossRefCurieQueryFieldReducer = (state = 'ab', action) => {
//   switch (action.type) {
//     case 'CHANGE_FIELD':
//       // console.log(action.payload);
//       return action.payload;
//     case 'QUERY_BUTTON':
//       console.log("query button reducer set " + action.payload);
//       return action.payload;
//     default:
//       return state;
//   }
// }
// export default crossRefCurieQueryFieldReducer;
