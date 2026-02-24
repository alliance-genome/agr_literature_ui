
const initialState = {
  createAction: '',
  redirectCurie: 'unknown reference',
  redirectToBiblio: false,
  searchPmidLoading: false,
  createPmidLoading: false,
  createAllianceLoading: false,
  createModalText: '',
//   biblioUpdating: 0,
//   referenceCurie: '',
//   referenceJsonLive: {},
//   referenceJsonDb: {},
//   referenceJsonHasChange: {},
//   loadingQuery: true,
//   queryFailure: false,
//   getReferenceCurieFlag: true,
//   meshExpand: 'short',
//   authorExpand: 'first',
//   hasPmid: false,
  modIdent: '',
  modPrefix: '',
  allianceOnly: false,
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
       
//       let getReferenceCurieFlagUpdateButton = false;
//       let hasChangeUpdateButton = state.referenceJsonHasChange;
      if (action.payload.responseMessage === "update success") {
        console.log('reducer UPDATE_BUTTON_CREATE ' + action.payload.responseMessage);
        newArrayUpdateMessages = [];
        redirectToBiblio = true;
        redirectCurie = action.payload.value;
//         getReferenceCurieFlagUpdateButton = true;
//         hasChangeUpdateButton = {};
      } else {
        newArrayUpdateMessages.push(action.payload.responseMessage);
        newUpdateFailure = 1;
        console.log('Update failure ' + action.payload.responseMessage);
      }
//       let referenceJsonLive = state.referenceJsonLive;
//       if ((action.payload.field !== null) && 		// POST to a field, assign its db id to redux store
//           (action.payload.subField !== null)) {		// but only for related tables that create a dbid, not for cross_references
//         referenceJsonLive[action.payload.field][action.payload.index][action.payload.subField] = action.payload.value; }
      return {
        ...state,
        createPmidLoading: createPmidLoading,
        createAllianceLoading: createAllianceLoading,
        modIdent: '',
//         referenceJsonLive: referenceJsonLive,
        redirectCurie: redirectCurie,
        redirectToBiblio: redirectToBiblio,
        updateAlert: state.updateAlert + 1,
        updateFailure: state.updateFailure + newUpdateFailure,
        updateMessages: newArrayUpdateMessages
//         getReferenceCurieFlag: getReferenceCurieFlagUpdateButton,
//         referenceJsonHasChange: hasChangeUpdateButton,
//         biblioUpdating: state.biblioUpdating - 1
      }
    default:
      return state;
  }
}
