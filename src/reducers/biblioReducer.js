
const initialState = {
  biblioAction: '',
  biblioUpdating: 0,
  referenceCurie: '',
  referenceJsonLive: {},
  referenceJsonDb: {},
  referenceJsonHasChange: {},
  loadingQuery: true,
  queryFailure: false,
  getReferenceCurieFlag: true,
  meshExpand: 'short',
  authorExpand: 'first',
  hasPmid: false,
  updateAlert: 0,
  updateFailure: 0,
  updateMessages: []
};

const checkHasPmid = (referenceJsonLive) => {
  // console.log('called checkHasPmid ' + referenceJsonLive.curie);
  let checkingHasPmid = false;
  for (const xref of referenceJsonLive.cross_references) {
    if ( (xref.curie.match(/^PMID:/)) && (xref.is_obsolete === false) ) {
      checkingHasPmid = true; } }
  return checkingHasPmid;
}

const splitCurie = (curie) => {
  let curiePrefix = ''; let curieId = '';
  if ( curie.match(/^([^:]*):(.*)$/) ) {
    [curie, curiePrefix, curieId] = curie.match(/^([^:]*):(.*)$/) }
  return [ curiePrefix, curieId ]
}


// to ignore a warning about Unexpected default export of anonymous function
// eslint-disable-next-line
export default function(state = initialState, action) {
  // action will have a type.  common to evaluate with a switch
  switch (action.type) {
    case 'CHANGE_FIELD_REFERENCE_JSON':
      // console.log(action.payload);
      let hasChangeField = state.referenceJsonHasChange
      if (state.referenceJsonDb[action.payload.field] === action.payload.value) {
        if (action.payload.field in hasChangeField) {
          delete hasChangeField[action.payload.field] } }
      else {
        hasChangeField[action.payload.field] = 'diff' }
      return {
        ...state,
        referenceJsonHasChange: hasChangeField,
        referenceJsonLive: {
          ...state.referenceJsonLive,
          [action.payload.field]: action.payload.value
        }
      }
    case 'UPDATE_BUTTON_BIBLIO':
      // console.log('reducer UPDATE_BUTTON_BIBLIO ' + action.payload.responseMessage);
      let newUpdateFailure = 0;
      let newArrayUpdateMessages = state.updateMessages;
      let getReferenceCurieFlagUpdateButton = false;
      let hasChangeUpdateButton = state.referenceJsonHasChange;
      if (action.payload.responseMessage === "update success") {
        console.log('reducer UPDATE_BUTTON_BIBLIO ' + action.payload.responseMessage);
        getReferenceCurieFlagUpdateButton = true;
        hasChangeUpdateButton = {};
      } else {
        newArrayUpdateMessages.push(action.payload.responseMessage);
        newUpdateFailure = 1;
        // console.log('Update failure ' + action.payload.responseMessage);
      }
      let referenceJsonLive = state.referenceJsonLive;
      if ((action.payload.field !== null) && 		// POST to a field, assign its db id to redux store
          (action.payload.subField !== null)) {		// but only for related tables that create a dbid, not for cross_references
        referenceJsonLive[action.payload.field][action.payload.index][action.payload.subField] = action.payload.value; }
      return {
        ...state,
        referenceJsonLive: referenceJsonLive,
        updateAlert: state.updateAlert + 1,
        updateFailure: state.updateFailure + newUpdateFailure,
        updateMessages: newArrayUpdateMessages,
        getReferenceCurieFlag: getReferenceCurieFlagUpdateButton,
        referenceJsonHasChange: hasChangeUpdateButton,
        biblioUpdating: state.biblioUpdating - 1
      }
    case 'SET_BIBLIO_UPDATING':
      console.log('SET_BIBLIO_UPDATING reducer ' + action.payload);
      return {
        ...state,
        biblioUpdating: action.payload
      }
    case 'CLOSE_UPDATE_ALERT':
      console.log('CLOSE_UPDATE_ALERT reducer');
      return {
        ...state,
        updateAlert: 0
      }

    case 'CHANGE_FIELD_ARRAY_REFERENCE_JSON':
      // console.log('reducer CHANGE_FIELD_ARRAY_REFERENCE_JSON ' + action.payload);
      let stringArray = action.payload.field.split(" ");
      let fieldStringArray = stringArray[0];
      let indexStringArray = stringArray[1];
      let newArrayChange = state.referenceJsonLive[fieldStringArray];
      newArrayChange[indexStringArray] = action.payload.value;
      let hasChangeArrayField = state.referenceJsonHasChange
      if (state.referenceJsonDb[fieldStringArray][indexStringArray] === action.payload.value) {
        if (action.payload.field in hasChangeArrayField) {
          delete hasChangeArrayField[action.payload.field] } }
      else {
        hasChangeArrayField[action.payload.field] = 'diff' }
      return {
        ...state,
        referenceJsonHasChange: hasChangeArrayField,
        referenceJsonLive: {
          ...state.referenceJsonLive,
          [fieldStringArray]: newArrayChange
        }
      }
//       return state.updateIn(['biblio', 'referenceJsonLive'], x => x.set(action.field, action.payload));	// this might work with Immutable.js

    case 'CHANGE_FIELD_MOD_REFERENCE_REFERENCE_JSON':
      console.log(action.payload);
      let modReferenceArray = action.payload.field.split(" ");
      let fieldModReference = modReferenceArray[0];
      let indexModReference = modReferenceArray[1];
      let subfieldModReference = modReferenceArray[2];
      let newModReferenceChange = state.referenceJsonLive[fieldModReference];
      newModReferenceChange[indexModReference][subfieldModReference] = action.payload.value;
      newModReferenceChange[indexModReference]['needsChange'] = true;
      let hasChangeModReferenceField = state.referenceJsonHasChange
      if (state.referenceJsonDb[fieldModReference][indexModReference][subfieldModReference] === action.payload.value) {
        if (action.payload.field in hasChangeModReferenceField) {
          delete hasChangeModReferenceField[action.payload.field] } }
      else {
        hasChangeModReferenceField[action.payload.field] = 'diff' }
      return {
        ...state,
        referenceJsonHasChange: hasChangeModReferenceField,
        referenceJsonLive: {
          ...state.referenceJsonLive,
          [fieldModReference]: newModReferenceChange
        }
      }

    case 'CHANGE_FIELD_AUTHORS_REFERENCE_JSON':
      console.log(action.payload);
      let authorInfoArray = action.payload.field.split(" ");
      let fieldAuthorInfo = authorInfoArray[0];
      let indexAuthorInfo = authorInfoArray[1];
      let subfieldAuthorInfo = authorInfoArray[2];
      let authorInfoNewValue = action.payload.value;
      if ( (subfieldAuthorInfo === 'first_author') || (subfieldAuthorInfo === 'corresponding_author') ) {
        authorInfoNewValue = action.payload.checked || false }

//         // have to make copy of dictionary, otherwise deep elements in dictionary are the same and changing Live or Db change both copies
//         const dbCopyGetReferenceCurie = JSON.parse(JSON.stringify(action.payload))
// TODO  revert button only on one author line
// revert button disabled if any order changes, otherwise the author order reverts only on that author, might want a revert all order button

      let newAuthorInfoChange = state.referenceJsonLive[fieldAuthorInfo];
      if (subfieldAuthorInfo === 'orcid') {
        newAuthorInfoChange[indexAuthorInfo][subfieldAuthorInfo] = {}
        newAuthorInfoChange[indexAuthorInfo][subfieldAuthorInfo]['url'] = null;
        newAuthorInfoChange[indexAuthorInfo][subfieldAuthorInfo]['curie'] = authorInfoNewValue; }
      else if (subfieldAuthorInfo === 'order') {
        let oldAuthorOrder = parseInt(indexAuthorInfo) + 1
        let newAuthorOrder = parseInt(authorInfoNewValue)
        console.log('reorder ' + oldAuthorOrder + " into " + newAuthorOrder)
        // authors have to be reordered based on their order field, not the store array index, because second+ reorders would not work
        for (let authorReorderDict of newAuthorInfoChange) {
          if (newAuthorOrder < oldAuthorOrder) {
            if (authorReorderDict['order'] === oldAuthorOrder) {
              authorReorderDict['order'] = newAuthorOrder }
            else if ( (authorReorderDict['order'] >= newAuthorOrder) && (authorReorderDict['order'] < oldAuthorOrder) ) {
              authorReorderDict['order'] += 1 } }
          else if (newAuthorOrder > oldAuthorOrder) {
            if (authorReorderDict['order'] === oldAuthorOrder) {
              authorReorderDict['order'] = newAuthorOrder }
            else if ( (authorReorderDict['order'] <= newAuthorOrder) && (authorReorderDict['order'] > oldAuthorOrder) ) {
              authorReorderDict['order'] -= 1 } } } }
      else {
        newAuthorInfoChange[indexAuthorInfo][subfieldAuthorInfo] = authorInfoNewValue; }
      // console.log(newAuthorInfoChange)
      newAuthorInfoChange[indexAuthorInfo]['needsChange'] = true;
      return {
        ...state,
        referenceJsonLive: {
          ...state.referenceJsonLive,
          [fieldAuthorInfo]: newAuthorInfoChange
        }
      }

    case 'CHANGE_FIELD_CROSS_REFERENCES_REFERENCE_JSON':
      console.log(action.payload);
      let crossReferencesArray = action.payload.field.split(" ");
      let fieldCrossReferences = crossReferencesArray[0];
      let indexCrossReferences = crossReferencesArray[1];
      let subfieldCrossReferences = crossReferencesArray[2];
      let prefixOrIdCrossReferences = crossReferencesArray[3];
      let crossReferencesNewValue = action.payload.value;

      if (subfieldCrossReferences === 'curie') {
        let crossReferenceLiveCurie = state.referenceJsonLive[fieldCrossReferences][indexCrossReferences][subfieldCrossReferences]
        let [ crossReferenceLiveCuriePrefix, crossReferenceLiveCurieId ] = splitCurie(crossReferenceLiveCurie)
        if (prefixOrIdCrossReferences === 'prefix') {
          crossReferencesNewValue = action.payload.value + ':' + crossReferenceLiveCurieId }
        else if (prefixOrIdCrossReferences === 'id') {
          crossReferencesNewValue = crossReferenceLiveCuriePrefix + ':' + action.payload.value }
        if (crossReferencesNewValue === ':') { crossReferencesNewValue = ''} }
      else if (subfieldCrossReferences === 'is_obsolete') {
        crossReferencesNewValue = action.payload.checked || false }

      let newCrossReferencesChange = state.referenceJsonLive[fieldCrossReferences];
      newCrossReferencesChange[indexCrossReferences]['needsChange'] = true;
      newCrossReferencesChange[indexCrossReferences][subfieldCrossReferences] = crossReferencesNewValue

      const pmidBoolCrossReference = checkHasPmid(state.referenceJsonLive)

      let hasChangeCrossReferencesField = state.referenceJsonHasChange
      if (state.referenceJsonDb[fieldCrossReferences][indexCrossReferences][subfieldCrossReferences] === crossReferencesNewValue) {
        if (action.payload.field in hasChangeCrossReferencesField) {
          delete hasChangeCrossReferencesField[action.payload.field] } }
      else {
        hasChangeCrossReferencesField[action.payload.field] = 'diff' }

      return {
        ...state,
        referenceJsonHasChange: hasChangeCrossReferencesField,
        hasPmid: pmidBoolCrossReference,
        referenceJsonLive: {
          ...state.referenceJsonLive,
          [fieldCrossReferences]: newCrossReferencesChange
        }
      }

    case 'BIBLIO_REVERT':
      // console.log('BIBLIO_REVERT'); console.log(action.payload);
      let fieldIdRevert = action.payload.field.replace(/^revert /, '');
      let stringArrayRevert = fieldIdRevert.split(" ");
      let fieldStringArrayRevert = stringArrayRevert[0];
      let revertValue = state.referenceJsonLive[fieldStringArrayRevert]
      if (action.payload.type === 'string') {
        revertValue = state.referenceJsonDb[fieldStringArrayRevert] }
      else if (action.payload.type === 'array') {
        let indexStringArrayRevert = stringArrayRevert[1];
        revertValue[indexStringArrayRevert] = JSON.parse(JSON.stringify(state.referenceJsonDb[fieldStringArrayRevert][indexStringArrayRevert])) }
      let hasChangeFieldRevert = state.referenceJsonHasChange
      if (fieldIdRevert in hasChangeFieldRevert) {
        delete hasChangeFieldRevert[fieldIdRevert] }
      if (action.payload.value !== undefined) {
        const subFieldDictArrayRevert = action.payload.value.split(", ");
        for (const subField of subFieldDictArrayRevert) {
          let keySubFieldIdRevert = fieldIdRevert + ' ' + subField
          if (keySubFieldIdRevert in hasChangeFieldRevert) {
            delete hasChangeFieldRevert[keySubFieldIdRevert] } } }
      const pmidBoolRevert = checkHasPmid(state.referenceJsonLive)
      return {
        ...state,
        referenceJsonHasChange: hasChangeFieldRevert,
        hasPmid: pmidBoolRevert,
        referenceJsonLive: {
          ...state.referenceJsonLive,
          [fieldStringArrayRevert]: revertValue
        }
      }
    case 'BIBLIO_ADD_NEW_ROW':
      // console.log(action.payload);
      let newArrayPushDb = state.referenceJsonDb[action.payload.field] || [];
      let newArrayPushLive = state.referenceJsonLive[action.payload.field] || [];
      if (action.payload.type === 'string') {
        newArrayPushDb.push('');
        newArrayPushLive.push(''); }
      else if (action.payload.type === 'dict') {
        // have to make copy of dictionary, otherwise deep elements in dictionary are the same and changing Live or Db change both copies
        const dbCopyAddNewRow = JSON.parse(JSON.stringify(action.payload.initializeDict))
        newArrayPushDb.push(dbCopyAddNewRow);
        newArrayPushLive.push(action.payload.initializeDict); }
      return {
        ...state,
        referenceJsonDb: {
          ...state.referenceJsonDb,
          [action.payload.field]: newArrayPushDb
        },
        referenceJsonLive: {
          ...state.referenceJsonLive,
          [action.payload.field]: newArrayPushLive
        }
      }
    case 'CHANGE_BIBLIO_MESH_EXPAND_TOGGLER':
      // console.log(action.payload);
      return {
        ...state,
        meshExpand: action.payload
      }
    case 'CHANGE_BIBLIO_AUTHOR_EXPAND_TOGGLER':
      // console.log(action.payload);
      return {
        ...state,
        authorExpand: action.payload
      }
    case 'CHANGE_BIBLIO_ACTION_TOGGLER':
      // console.log(action.payload);
      return {
        ...state,
        biblioAction: action.payload
      }
    case 'SET_BIBLIO_ACTION':
      console.log("reducer set biblio action");
      return {
        ...state,
        biblioAction: action.payload
      }
    case 'SET_REFERENCE_CURIE':
      console.log("reducer set reference curie");
      return {
        ...state,
        referenceCurie: action.payload
      }
//     case 'SET_LOADING_QUERY':
//       console.log("reducer set loading query");
//       return {
//         ...state,
//         loadingQuery: action.payload
//       }
    case 'RESET_QUERY_STATE':
      console.log("reducer reset reference curie");
      return {
        ...state,
        referenceCurie: '',
        getReferenceCurieFlag: true,
        loadingQuery: true
      }
    case 'BIBLIO_GET_REFERENCE_CURIE':
      console.log("reducer biblio get reference curie");
      if (action.payload.detail === "Reference with the id AGR:AGR-Reference is not available") {
        return {
          ...state,
          referenceCurie: action.payload.detail,
          queryFailure: true,
          getReferenceCurieFlag: false,
          loadingQuery: false
        }
      } else {  
        const pmidBool = checkHasPmid(action.payload)
        // have to make copy of dictionary, otherwise deep elements in dictionary are the same and changing Live or Db change both copies
        const dbCopyGetReferenceCurie = JSON.parse(JSON.stringify(action.payload))
        return {
          ...state,
          referenceCurie: action.payload.curie,
          referenceJsonLive: action.payload,
          referenceJsonDb: dbCopyGetReferenceCurie,
          hasPmid: pmidBool,
          getReferenceCurieFlag: false,
          loadingQuery: false
        }
      }

//     case 'QUERY_BUTTON':
//       console.log("query button reducer set " + action.payload);
//       let responseField = action.payload;
//       let responseColor = 'blue';
//       let redirectToBiblio = false;
//       let querySuccess = false;
//       if (responseField === 'not found') { responseColor = 'red'; }
//         else { redirectToBiblio = true; querySuccess = true; }
//       return {
//         ...state,
//         responseColor: responseColor,
//         responseField: responseField,
//         redirectToBiblio: redirectToBiblio,
//         querySuccess: querySuccess
//       }

//     case 'FETCH_POSTS':
//       console.log('in postReducer case FETCH_POSTS');
//       return {
//         ...state,
//         items: action.payload   // from postActions.js
//       }
//     case 'NEW_POSTS':
//       console.log('in postReducer case NEW_POSTS');
//       return {
//         ...state,
//         items: [action.payload, ...state.items],        // from postActions.js
//         item: action.payload    // from postActions.js
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
