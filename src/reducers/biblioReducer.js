
const initialState = {
  biblioAction: '',
  biblioUpdating: 0,
  referenceCurie: '',
  referenceJson: {},
  loadingQuery: true,
  queryFailure: false,
  alreadyGotJson: false,
  meshExpand: 'short',
  authorExpand: 'first',
  hasPmid: false,
  updateAlert: 0,
  updateFailure: 0,
  updateMessages: []
};

const checkHasPmid = (referenceJson) => {
  // console.log('called checkHasPmid ' + referenceJson.curie);
  let checkingHasPmid = false;
  for (const xref of referenceJson.cross_references) {
    if (xref.curie.match(/^PMID:/)) {
      // console.log('checkHasPmid ' + xref.curie);
      checkingHasPmid = true; } }
  return checkingHasPmid;
}

// to ignore a warning about Unexpected default export of anonymous function
// eslint-disable-next-line
export default function(state = initialState, action) {
  // action will have a type.  common to evaluate with a switch
  switch (action.type) {
    case 'CHANGE_FIELD_REFERENCE_JSON':
      // console.log(action.payload);
      return {
        ...state,
        referenceJson: {
          ...state.referenceJson,
          [action.payload.field]: action.payload.value
        }
      }
    case 'UPDATE_BUTTON_BIBLIO':
      // console.log('reducer UPDATE_BUTTON_BIBLIO ' + action.payload);
      let newUpdateFailure = 0;
      let newArrayUpdateMessages = state.updateMessages;
      if (action.payload === "update success") {
        console.log('reducer UPDATE_BUTTON_BIBLIO ' + action.payload);
        // newUpdateMessage = action.payload;
        // alert('Update success');
      } else {
        // newUpdateMessage = action.payload;
        newArrayUpdateMessages.push(action.payload);
        newUpdateFailure = 1;
        // alert('Update failure ' + action.payload.detail);
      }
      return {
        ...state,
        updateAlert: state.updateAlert + 1,
        updateFailure: state.updateFailure + newUpdateFailure,
        updateMessages: newArrayUpdateMessages,
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
      // console.log(action.payload);
      let stringArray = action.payload.field.split(" ");
      let fieldStringArray = stringArray[0];
      let indexStringArray = stringArray[1];
      let newArrayChange = state.referenceJson[fieldStringArray];
      newArrayChange[indexStringArray] = action.payload.value;
      return {
        ...state,
        referenceJson: {
          ...state.referenceJson,
          [fieldStringArray]: newArrayChange
        }
      }
//       return state.updateIn(['biblio', 'referenceJson'], x => x.set(action.field, action.payload));	// this might work with Immutable.js

    case 'CHANGE_FIELD_MOD_REFERENCE_REFERENCE_JSON':
      console.log(action.payload);
      let modReferenceArray = action.payload.field.split(" ");
      let fieldModReference = modReferenceArray[0];
      let subfieldModReference = modReferenceArray[1];
      let indexModReference = modReferenceArray[2];
      let newModReferenceChange = state.referenceJson[fieldModReference];
      newModReferenceChange[indexModReference][subfieldModReference] = action.payload.value;
      newModReferenceChange[indexModReference]['needsChange'] = true;
      return {
        ...state,
        referenceJson: {
          ...state.referenceJson,
          [fieldModReference]: newModReferenceChange
        }
      }
    case 'BIBLIO_ADD_NEW_ROW':
      // console.log(action.payload);
      let newArrayPush = state.referenceJson[action.payload.field] || [];
      if (action.payload.type === 'string') {
        newArrayPush.push(''); }
      else if (action.payload.type === 'dict') {
        newArrayPush.push({[action.payload.field]: 'new'}); }
      return {
        ...state,
        referenceJson: {
          ...state.referenceJson,
          [action.payload.field]: newArrayPush
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
        loadingQuery: true,
        alreadyGotJson: false
      }
    case 'BIBLIO_GET_REFERENCE_CURIE':
      console.log("reducer biblio get reference curie");
      if (action.payload.detail === "Reference with the id AGR:AGR-Reference is not available") {
        return {
          ...state,
          referenceCurie: action.payload.detail,
          queryFailure: true,
          loadingQuery: false,
          alreadyGotJson: true
        }
      } else {  
        const pmidBool = checkHasPmid(action.payload)
        return {
          ...state,
          referenceCurie: action.payload.curie,
          referenceJson: action.payload,
          loadingQuery: false,
          hasPmid: pmidBool,
          alreadyGotJson: true
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
