
const initialState = {
  createAction: '',
  redirectCurie: 'unknown reference',
  redirectToBiblio: false,
  searchPmidLoading: false,
  createPmidLoading: false,
  createAllianceLoading: false,
  createModalText: '',
  modIdent: '',
  modPrefix: '',
  pmid: '',
  doi: '',
  pmidTitle: '',
  pmidXml: '',
  updateAlert: 0,
  updateFailure: 0,
  updateMessages: []
};

// to ignore a warning about Unexpected default export of anonymous function
// eslint-disable-next-line
export default function(state = initialState, action) {
  // action will have a type.  common to evaluate with a switch
  switch (action.type) {
    case 'CHANGE_CREATE_ACTION_TOGGLER':
      // console.log(action.payload);
      return {
        ...state,
        createAction: action.payload
      }
    case 'CREATE_CHANGE_FIELD':
      // console.log(action.payload);
      return {
        ...state,
        [action.payload.field]: action.payload.value
      }
    case 'CREATE_CHANGE_PMID_FIELD':
      // console.log(action.payload);
      return {
        ...state,
        pmidTitle: '',
        pmid: action.payload.value
      }
    case 'CREATE_SET_PMID_SEARCH_LOADING':
      // console.log(action.payload);
      return {
        ...state,
        searchPmidLoading: true
      }
    case 'SET_CREATE_MODAL_TEXT':
      // console.log('SET_CREATE_MODAL_TEXT reducer ' + action.payload);
      return {
        ...state,
        createModalText: action.payload
      }
    case 'SET_CREATE_ACTION':
      console.log("reducer set create action");
      return {
        ...state,
        createAction: action.payload
      }
    case 'RESET_CREATE_REDIRECT':
      console.log("reset create redirect");
      return {
        ...state,
        redirectCurie: 'unknown reference',
        redirectToBiblio: false
      }
    case 'CREATE_QUERY_PMID_PUBMED':
      console.log("reducer create query pmid pubmed");
      return {
        ...state,
        searchPmidLoading: false,
        pmidTitle: action.payload
      }
    case 'CREATE_QUERY_PMID_XREF':
      console.log("reducer create query pmid xref");
      return {
        ...state,
        searchPmidLoading: false,
        redirectCurie: action.payload,
        redirectToBiblio: true
      }
    case 'CREATE_SET_PMID_CREATE_LOADING':
      // console.log(action.payload);
      return {
        ...state,
        createPmidLoading: true
      }
    case 'CREATE_SET_ALLIANCE_CREATE_LOADING':
      // console.log(action.payload);
      return {
        ...state,
        createAllianceLoading: true
      }
    case 'UPDATE_BUTTON_CREATE_ALREADY_EXISTS':
      let createAlreadyPmidLoading = state.createPmidLoading;
      let createAlreadyAllianceLoading = state.createAllianceLoading;
      if (action.payload.pmidOrAlliance === "pmid") {
          createAlreadyPmidLoading = false; }
        else if (action.payload.pmidOrAlliance === "alliance") {
          createAlreadyAllianceLoading = false; }
      return {
        ...state,
        createPmidLoading: createAlreadyPmidLoading,
        createAllianceLoading: createAlreadyAllianceLoading,
        createModalText: action.payload.responseMessage
      }
    case 'UPDATE_BUTTON_CREATE':
      console.log('reducer UPDATE_BUTTON_CREATE ' + action.payload.responseMessage);
      console.log('reducer value ' + action.payload.value);
      let newUpdateFailure = 0;
      let newArrayUpdateMessages = state.updateMessages;
      let redirectCurie = state.redirectCurie;
      let redirectToBiblio = false;
      let createPmidLoading = state.createPmidLoading;
      let createAllianceLoading = state.createAllianceLoading;
      if (action.payload.pmidOrAlliance === "pmid") {
          createPmidLoading = false; }
        else if (action.payload.pmidOrAlliance === "alliance") {
          createAllianceLoading = false; }

      if (action.payload.responseMessage === "update success") {
        console.log('reducer UPDATE_BUTTON_CREATE ' + action.payload.responseMessage);
        newArrayUpdateMessages = [];
        redirectToBiblio = true;
        redirectCurie = action.payload.value;
      } else {
        newArrayUpdateMessages.push(action.payload.responseMessage);
        newUpdateFailure = 1;
        console.log('Update failure ' + action.payload.responseMessage);
      }
      return {
        ...state,
        createPmidLoading: createPmidLoading,
        createAllianceLoading: createAllianceLoading,
        modIdent: '',
        redirectCurie: redirectCurie,
        redirectToBiblio: redirectToBiblio,
        updateAlert: state.updateAlert + 1,
        updateFailure: state.updateFailure + newUpdateFailure,
        updateMessages: newArrayUpdateMessages
      }
    default:
      return state;
  }
}
