
const initialState = {
  biblioAction: '',
  biblioUpdating: false,
  referenceCurie: '',
  referenceJson: {},
  loadingQuery: true,
  queryFailure: false,
  alreadyGotJson: false,
  updateAlert: ''
};

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
      let newUpdateAlert = '';
      if (action.payload === "update success") {
        console.log('reducer UPDATE_BUTTON_BIBLIO ' + action.payload);
        newUpdateAlert = action.payload;
        // alert('Update success');
      } else {
        newUpdateAlert = action.payload.detail;
        // alert('Update failure ' + action.payload.detail);
      }
      return {
        ...state,
        updateAlert: newUpdateAlert,
        biblioUpdating: false
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
        updateAlert: ''
      }

    case 'CHANGE_FIELD_ARRAY_REFERENCE_JSON':
      // console.log(action.payload);
      let stringArray = action.payload.field.split(" ");
      let field = stringArray[0];
      let index = stringArray[1];
      let newArrayChange = state.referenceJson[field];
      newArrayChange[index] = action.payload.value;
      return {
        ...state,
        referenceJson: {
          ...state.referenceJson,
          [field]: newArrayChange
        }
      }
//       return state.updateIn(['biblio', 'referenceJson'], x => x.set(action.field, action.payload));	// this might work with Immutable.js
    case 'BIBLIO_ADD_NEW_ROW':
      // console.log(action.payload);
      let newArrayPush = state.referenceJson[action.payload.field];
      newArrayPush.push('');
      return {
        ...state,
        referenceJson: {
          ...state.referenceJson,
          [action.payload.field]: newArrayPush
        }
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
        return {
          ...state,
          referenceCurie: action.payload.curie,
          referenceJson: action.payload,
          loadingQuery: false,
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
