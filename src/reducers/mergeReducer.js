
import { checkHasPmid } from './biblioReducer';
import { splitCurie } from '../components/biblio/BiblioEditor';

const initialState = {
  referenceMetaDefault: {
    input: '',
    curie: '',
    referenceJson: '',
    queryRefSuccess: null,
    message: 'Enter an AGR reference or cross reference curie',
    disableInput: '',
    blah: ''
  },
  referenceMeta1: {
    input: 'AGRKB:101000001829083',
    curie: '',
    referenceJson: '',
    referenceKeep: {},
    queryRefSuccess: null,
    message: 'Enter an AGR reference or cross reference curie',
    disableInput: '',
    blah: ''
  },
//     input: 'CGC:cgc3',
//     input: 'AGR:AGR-Reference-0000569189',
//     input: 'AGR:AGR-Reference-0000852278',
//     input: 'PMID:23524264',	-> reference 1
//     input: 'PMID:29664630',	-> orcid
//     input: 'PMID:28049701',  -> keywords
//     input: 'PMID:24699224',  -> more keywords
//     input: 'PMID:10704882',  -> relations
//     input: 'PMID:10025402',	-> mesh terms
//     input: 'PMID:24699224',  -> mesh terms
//     input: 'AGR:AGR-Reference-0000869188',	-> empty paper in lit-4002
//     input: 'AGR:AGR-Reference-0000790218',	-> reorder authors
//     input: 'AGR:AGR-Reference-0000744531',	-> reorder authors
//     input: 'AGR:AGR-Reference-0000869178',	-> test pmid 5432
//     input: 'PMID:28049701',
  referenceMeta2: {
    input: 'AGRKB:101000001829084',
    curie: '',
    referenceJson: '',
    referenceKeep: {},
    queryRefSuccess: null,
    message: 'Enter an AGR reference or cross reference curie',
    disableInput: '',
    blah: ''
  },
  referenceDb1: {},
  referenceDb2: {},
  referenceSwap: {},

  ateamResults: 0,
  atpParents: ['ATP:0000140'],
  atpFileUpload: {'ATP:0000134': {'priority': 5, 'name': 'files uploaded'},
                  'ATP:0000141': {'priority': 2, 'name': 'file needed'} },
// PUT THIS BACK
//                   'ATP:0000135': {'priority': 4, 'name': 'file unavailable'},
//                   'ATP:0000139': {'priority': 3, 'name': 'file upload in progress'},

  hasPmid: false,
  isLoadingReferences: false,
  keepReference: 1,
  pmidKeepReference: 1,
  referenceQuerySuccess1: '',
  referenceQuerySuccess2: '',
//   referenceMessageDefault: 'Enter a Reference Agr ID or cross reference curie',
//   referenceMessage1: 'Enter a Reference Agr ID or cross reference curie',
//   referenceMessage2: 'Enter a Reference Agr ID or cross reference curie',
  queryDoubleSuccess: false,

  mergeTransferringCount: 0,
  mergeCompletingCount: 0,
  dataTransferHappened: false,
  showDataTransferModal: false,
  completionMergeHappened: false,
  updateAlert: 0,
  updateFailure: 0,
  updateMessages: [],
  blah: 'blah'
};


const initializeQueriedData = (referenceJson1, referenceJson2) => {
  if (referenceJson1.constructor !== Object || referenceJson2.constructor !== Object) { return; }

  // mca that only has value for 2nd reference should be toggled based on mod pairs
  const mca1 = {}; const mca2 = {};
  if ('mod_corpus_associations' in referenceJson1 && referenceJson1['mod_corpus_associations'] != null) {
    for (const [index, val1] of referenceJson1['mod_corpus_associations'].entries()) {
      if ('mod_abbreviation' in val1 && val1['mod_abbreviation'] !== null && val1['mod_abbreviation'] !== '') {
        mca1[val1['mod_abbreviation']] = index; } } }
  if ('mod_corpus_associations' in referenceJson2 && referenceJson2['mod_corpus_associations'] != null) {
    for (const [index, val2] of referenceJson2['mod_corpus_associations'].entries()) {
      if ('mod_abbreviation' in val2 && val2['mod_abbreviation'] !== null && val2['mod_abbreviation'] !== '') {
        mca2[val2['mod_abbreviation']] = index; } } }
  for (const mod in mca2) {
    if (mca1[mod] === undefined) { 
      referenceJson2['mod_corpus_associations'][mca2[mod]]['toggle'] = true; } }

  // xref that only has value for 2nd reference should be toggled based on xref prefix pairs
  const xref1 = {}; const xref2 = {};
  if ('cross_references' in referenceJson1 && referenceJson1['cross_references'] != null) {
    for (const [index, val1] of referenceJson1['cross_references'].entries()) {
      if ('curie' in val1 && val1['curie'] !== null && val1['curie'] !== '') {
        let xref1Prefix = splitCurie(val1['curie'], 'prefix');
        xref1[xref1Prefix] = index; } } }
  if ('cross_references' in referenceJson2 && referenceJson2['cross_references'] != null) {
    for (const [index, val2] of referenceJson2['cross_references'].entries()) {
      if ('curie' in val2 && val2['curie'] !== null && val2['curie'] !== '') {
        let xref2Prefix = splitCurie(val2['curie'], 'prefix');
        xref2[xref2Prefix] = index; } } }
  for (const prefix in xref2) {
    if (xref1[prefix] === undefined) { 
      referenceJson2['cross_references'][xref2[prefix]]['toggle'] = true; } }

  return
}


// to ignore a warning about Unexpected default export of anonymous function
// eslint-disable-next-line
export default function(state = initialState, action) {
  // action will have a type.  common to evaluate with a switch
  switch (action.type) {
    case 'MERGE_SET_IS_LOADING_REFERENCES':
      return {
        ...state,
        isLoadingReferences: action.payload
      }
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
      // swap used to swap which reference to keep by changing its colors, instead of changing the reference, now it swaps the whole referenceMeta
      let swapReferenceMeta2Copy = JSON.parse(JSON.stringify(state.referenceDb1));
      let swapReferenceMeta1Copy = JSON.parse(JSON.stringify(state.referenceDb2));
      let newKeepValue = 2;
      if (state.keepReference === 2) {
        swapReferenceMeta1Copy = JSON.parse(JSON.stringify(state.referenceDb1));
        swapReferenceMeta2Copy = JSON.parse(JSON.stringify(state.referenceDb2));
        newKeepValue = 1; }
      // const newKeepValue = (state.keepReference === 1) ? 2 : 1;
      
      return {
        ...state,
        referenceMeta1: swapReferenceMeta1Copy,
        referenceMeta2: swapReferenceMeta2Copy,
        referenceSwap: {},
        keepReference: newKeepValue
      }
    case 'MERGE_SWAP_KEEP_PMID':
      console.log(action.type);
      let newPmidKeepValue = 2;
      if (state.pmidKeepReference === 2) { newPmidKeepValue = 1; }
      return {
        ...state,
        pmidKeepReference: newPmidKeepValue
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
      
      if (action.payload.subtype === null) {
        if (action.payload.oneOrTwo === 1) {
          ('toggle' in toggleIndependentJson1['referenceJson'][action.payload.fieldName][action.payload.index]) ?
            delete toggleIndependentJson1['referenceJson'][action.payload.fieldName][action.payload.index]['toggle'] :
            toggleIndependentJson1['referenceJson'][action.payload.fieldName][action.payload.index]['toggle'] = true }
        if (action.payload.oneOrTwo === 2) {
          ('toggle' in toggleIndependentJson2['referenceJson'][action.payload.fieldName][action.payload.index]) ?
            delete toggleIndependentJson2['referenceJson'][action.payload.fieldName][action.payload.index]['toggle'] :
            toggleIndependentJson2['referenceJson'][action.payload.fieldName][action.payload.index]['toggle'] = true } }
      else {
        if (action.payload.oneOrTwo === 1) {
          ('toggle' in toggleIndependentJson1['referenceJson'][action.payload.fieldName][action.payload.subtype][action.payload.index]) ?
            delete toggleIndependentJson1['referenceJson'][action.payload.fieldName][action.payload.subtype][action.payload.index]['toggle'] :
            toggleIndependentJson1['referenceJson'][action.payload.fieldName][action.payload.subtype][action.payload.index]['toggle'] = true }
        if (action.payload.oneOrTwo === 2) {
          ('toggle' in toggleIndependentJson2['referenceJson'][action.payload.fieldName][action.payload.subtype][action.payload.index]) ?
            delete toggleIndependentJson2['referenceJson'][action.payload.fieldName][action.payload.subtype][action.payload.index]['toggle'] :
            toggleIndependentJson2['referenceJson'][action.payload.fieldName][action.payload.subtype][action.payload.index]['toggle'] = true } }
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
        referenceDb1: {},
        referenceDb2: {},
        referenceSwap: {},
        hasPmid: false,
        isLoadingReferences: false,
        keepReference: 1,
        pmidKeepReference: 1,
        referenceQuerySuccess1: '',
        referenceQuerySuccess2: '',
        queryDoubleSuccess: false,
        mergeCompletingCount: 0,
        dataTransferHappened: false,
        showDataTransferModal: false,
        completionMergeHappened: false,
        updateAlert: 0,
        updateFailure: 0,
        updateMessages: [],
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

      const mergeQueryHasPmid1 = checkHasPmid(referenceMeta1Copy.referenceJson);
      const mergeQueryHasPmid2 = checkHasPmid(referenceMeta2Copy.referenceJson);
      const mergeQueryHasPmid = (mergeQueryHasPmid1 || mergeQueryHasPmid2) ? true : false;

      initializeQueriedData(referenceMeta1Copy.referenceJson, referenceMeta2Copy.referenceJson);

      if (action.payload.swapBool) {
        referenceMeta1Copy.input = state.referenceMeta2.input;
        referenceMeta2Copy.input = state.referenceMeta1.input; }

      return {
        ...state,
        referenceMeta1: referenceMeta1Copy,
        referenceMeta2: referenceMeta2Copy,
        referenceDb1: referenceMeta1Copy,
        referenceDb2: referenceMeta2Copy,
        queryDoubleSuccess: queryDoubleSuccess,
        hasPmid: mergeQueryHasPmid,
        blah: 'blah'
      }

    case 'SET_MERGE_UPDATING':
      console.log('SET_MERGE_UPDATING reducer ' + action.payload);
      return {
        ...state,
        dataTransferHappened: true,
        showDataTransferModal: true,
        mergeTransferringCount: action.payload
      }

    case 'SET_MERGE_COMPLETING':
      console.log('SET_MERGE_COMPLETING reducer ' + action.payload);
      return {
        ...state,
        completionMergeHappened: true,
        mergeCompletingCount: action.payload
      }

    case 'SET_DATA_TRANSFER_HAPPENED':
      console.log('SET_DATA_TRANSFER_HAPPENED reducer ' + action.payload);
      return {
        ...state,
        dataTransferHappened: action.payload
      }

    case 'SET_SHOW_DATA_TRANSFER_MODAL':
      console.log('SET_SHOW_DATA_TRANSFER_MODAL reducer ' + action.payload);
      return {
        ...state,
        showDataTransferModal: action.payload
      }

//     case 'SET_COMPLETION_MERGE_HAPPENED':
//       console.log('SET_COMPLETION_MERGE_HAPPENED reducer ' + action.payload);
//       return {
//         ...state,
//         completionMergeHappened: action.payload
//       }

    case 'MERGE_BUTTON_API_DISPATCH':
      console.log('reducer MERGE_BUTTON_API_DISPATCH ' + action.payload.responseMessage);
      console.log('action.payload'); console.log(action.payload);
      let newUpdateFailure = 0;
      let newArrayUpdateMessages = state.updateMessages;
      // let getReferenceCurieFlagUpdateButton = false;			// biblio redirect to biblio 
      // let hasChangeUpdateButton = state.referenceJsonHasChange;	// biblio set update button color if any changes
      if (action.payload.responseMessage === "update success") {
        console.log('reducer MERGE_BUTTON_API_DISPATCH ' + action.payload.responseMessage);
        // getReferenceCurieFlagUpdateButton = true;
        // hasChangeUpdateButton = {};
      } else {
        newArrayUpdateMessages.push(action.payload.responseMessage);
        newUpdateFailure = 1;
        // console.log('Update failure ' + action.payload.responseMessage);
      }
      let referenceJsonLive = state.referenceJsonLive;
      if ((action.payload.field !== null) &&            // POST to a field, assign its db id to redux store
          (action.payload.index !== null) &&
          (action.payload.index in referenceJsonLive[action.payload.field]) &&
          ('subField' in action.payload) &&
          (action.payload.subField !== null) &&         // but only for related tables that create a dbid, not for cross_references
          (action.payload.subField in referenceJsonLive[action.payload.field][action.payload.index])) {
        referenceJsonLive[action.payload.field][action.payload.index][action.payload.subField] = action.payload.value; }
      const mergeTransferringCountApiDispatch = (action.payload.mergeType === 'mergeData') ? state.mergeTransferringCount - 1 : state.mergeTransferringCount;
      const mergeCompletingCountApiDispatch = (action.payload.mergeType === 'mergeComplete') ? state.mergeCompletingCount - 1 : state.mergeCompletingCount;
      return {
        ...state,
        referenceJsonLive: referenceJsonLive,
        updateAlert: state.updateAlert + 1,
        updateFailure: state.updateFailure + newUpdateFailure,
        updateMessages: newArrayUpdateMessages,
        // getReferenceCurieFlag: getReferenceCurieFlagUpdateButton,
        // referenceJsonHasChange: hasChangeUpdateButton,
        mergeCompletingCount: mergeCompletingCountApiDispatch,
        mergeTransferringCount: mergeTransferringCountApiDispatch
      }
    case 'CLOSE_MERGE_UPDATE_ALERT':
      console.log('CLOSE_MERGE_UPDATE_ALERT reducer');
      return {
        ...state,
        updateAlert: 0
      }

    case 'MERGE_ATEAM_ATP_RESULT':
      console.log('MERGE_ATEAM_ATP_RESULT reducer');
      const maar_atpFileUpload = JSON.parse(JSON.stringify(state.atpFileUpload))
      action.payload.response.forEach( (entity) => {
        if (!(entity.curie in maar_atpFileUpload)) {
          maar_atpFileUpload[entity.curie] = {};
          maar_atpFileUpload[entity.curie]['priority'] = 1; }
        maar_atpFileUpload[entity.curie]['name'] = entity.name;
      });
      // console.log(maar_atpFileUpload);
      return {
        ...state,
        ateamResults: state.ateamResults + 1,
        atpFileUpload: maar_atpFileUpload
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
