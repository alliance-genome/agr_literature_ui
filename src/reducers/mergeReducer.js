
const initialState = {
  referenceMetaDefault: {
    input: '',
    curie: '',
    referenceJson: '',
    queryRefSuccess: null,
    message: 'Enter a cross reference curie',
    disableInput: '',
    blah: ''
  },
  referenceMeta1: {
    input: 'PMID:10025402',
    curie: '',
    referenceJson: '',
    referenceKeep: {},
    queryRefSuccess: null,
    message: 'Enter a cross reference curie',
    disableInput: '',
    blah: ''
  },
//     input: 'AGR:AGR-Reference-0000852278',
//     input: 'PMID:23524264',
//     input: 'PMID:29664630',	-> orcid
//     input: 'PMID:28049701',  -> keywords
  referenceMeta2: {
    input: 'PMID:28049701',
    curie: '',
    referenceJson: '',
    referenceKeep: {},
    queryRefSuccess: null,
    message: 'Enter a cross reference curie',
    disableInput: '',
    blah: ''
  },
  referenceSwap: {},

  keepReference: 1,
  referenceQuerySuccess1: '',
  referenceQuerySuccess2: '',
//   referenceMessageDefault: 'Enter a Reference Agr ID or cross reference curie',
//   referenceMessage1: 'Enter a Reference Agr ID or cross reference curie',
//   referenceMessage2: 'Enter a Reference Agr ID or cross reference curie',
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
    case 'MERGE_SWAP_KEEP':
      console.log(action.type);
      const newKeepValue = (state.keepReference === 1) ? 2 : 1;
      return {
        ...state,
        keepReference: newKeepValue
      }
    case 'MERGE_SWAP_PAIR_SIMPLE':
      console.log(action.type);
      let newReferenceSwap = {};
      if (Object.keys(state.referenceSwap).length > 0) {
        newReferenceSwap = JSON.parse(JSON.stringify(state.referenceSwap)); }
      if (action.payload.fieldName in newReferenceSwap) {
        delete newReferenceSwap[action.payload.fieldName] }
      else {
        newReferenceSwap[action.payload.fieldName] = true; }
      return {
        ...state,
        referenceSwap: newReferenceSwap
      }
    case 'MERGE_TOGGLE_INDEPENDENT':
      console.log(action.type);
      console.log(action.payload);
      let toggleIndependentJson1 = JSON.parse(JSON.stringify(state.referenceMeta1));
      let toggleIndependentJson2 = JSON.parse(JSON.stringify(state.referenceMeta2));
      
      if (action.payload.oneOrTwo === 1) {
        ('toggle' in toggleIndependentJson1['referenceJson'][action.payload.fieldName][action.payload.index]) ?
          delete toggleIndependentJson1['referenceJson'][action.payload.fieldName][action.payload.index]['toggle'] :
          toggleIndependentJson1['referenceJson'][action.payload.fieldName][action.payload.index]['toggle'] = true }
      if (action.payload.oneOrTwo === 2) {
        ('toggle' in toggleIndependentJson2['referenceJson'][action.payload.fieldName][action.payload.index]) ?
          delete toggleIndependentJson2['referenceJson'][action.payload.fieldName][action.payload.index]['toggle'] :
          toggleIndependentJson2['referenceJson'][action.payload.fieldName][action.payload.index]['toggle'] = true }
      return {
        ...state,
        referenceMeta1: toggleIndependentJson1,
        referenceMeta2: toggleIndependentJson2
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
      referenceMeta1Copy.referenceJson = (action.payload.referenceFound1) ? action.payload.referenceJson1 : '';

      const referenceMeta2Copy = JSON.parse(JSON.stringify(state.referenceMeta2));
      referenceMeta2Copy.curie = (action.payload.referenceFound2) ? action.payload.curieValue2 : '';
      referenceMeta2Copy.message = action.payload.curieValue2;
      referenceMeta2Copy.queryRefSuccess = action.payload.referenceFound2;
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
