
const initialState = {
  modsField: '',
  referencesToSortLive: [],
  referencesToSortDb: [],
  getPapersToSortFlag: false,
  sortUpdating: 0,
  updateAlert: 0,
  updateFailure: 0,
  updateMessages: []
};

// const initialState = {
//   queryField: '',
//   querySuccess: false,
//   responseColor: 'black',
//   responseField: 'unknown reference',
//   redirectToBiblio: false
// };

// to ignore a warning about Unexpected default export of anonymous function
// eslint-disable-next-line
export default function(state = initialState, action) {
  // action will have a type.  common to evaluate with a switch
  switch (action.type) {

    case 'CHANGE_FIELD_SORT_MODS':
      console.log(action.payload);
      return {
        ...state,
        modsField: action.payload.value
      }

    case 'CLOSE_SORT_UPDATE_ALERT':
      console.log('CLOSE_SORT_UPDATE_ALERT reducer');
      return {
        ...state,
        updateAlert: 0
      }

    case 'SET_SORT_UPDATING':
      console.log('SET_SORT_UPDATING reducer ' + action.payload);
      return {
        ...state,
        sortUpdating: action.payload
      }

    case 'SORT_BUTTON_SET_RADIO_ALL':
      console.log('SORT_BUTTON_SET_RADIO_ALL reducer ' + action.payload);
      const referencesToSortSetRadioAll = JSON.parse(JSON.stringify(state.referencesToSortLive))
      for (const[index, reference] of referencesToSortSetRadioAll.entries()) { reference['corpus'] = action.payload }
      return {
        ...state,
        referencesToSortLive: referencesToSortSetRadioAll
      }

    case 'SORT_BUTTON_MODS_QUERY':
      console.log(action.payload);
      // The endpoint only returns values that are 'needs_review', so inject those values to the objects
      for (let reference of action.payload) {
        reference['corpus'] = 'needs_review'
      }
      // have to make copy of dictionary, otherwise deep elements in dictionary are the same and changing Live or Db change both copies
      const referencesToSortDb = JSON.parse(JSON.stringify(action.payload))
      return {
        ...state,
        getPapersToSortFlag: false,
        referencesToSortLive: action.payload,
        referencesToSortDb: referencesToSortDb
      }
//         referencesToSort: [{'title': "A conserved serine residue regulates the stability of Drosophila Salvador and human WW domain-containing adaptor 45 through proteasomal degradation.", 'abstract': "The abstract one goes here" }, {'title': "Phylogenetic-based propagation of functional annotations within the Gene Ontology consortium.", 'abstract': "The abstract two goes here" }]

    case 'CHANGE_SORT_CORPUS_TOGGLER':
      console.log('reducer SORT_BUTTON_MODS_QUERY');
      console.log(action.payload);
      let corpusArray = action.payload.split(" ");
      let fieldCorpusValue = corpusArray[0].replace(/_toggle$/, '');
      let indexReferenceCorpus = corpusArray[1];
      let sortToggleCorpusReferencesToSortLive = JSON.parse(JSON.stringify(state.referencesToSortLive))
      sortToggleCorpusReferencesToSortLive[indexReferenceCorpus]['corpus'] = fieldCorpusValue;
      return {
        ...state,
        referencesToSortLive: sortToggleCorpusReferencesToSortLive
      }

    case 'UPDATE_BUTTON_SORT':
      // console.log('reducer UPDATE_BUTTON_SORT ' + action.payload.responseMessage);
      // console.log('action.payload'); console.log(action.payload);
      let newUpdateFailure = 0;
      let newArrayUpdateMessages = state.updateMessages;
      let getPapersToSortFlagUpdateButton = false;
//       let hasChangeUpdateButton = state.referenceJsonHasChange;
      if (action.payload.responseMessage === "update success") {
        console.log('reducer UPDATE_BUTTON_SORT ' + action.payload.responseMessage);
        getPapersToSortFlagUpdateButton = true;
//         hasChangeUpdateButton = {};
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
      return {
        ...state,
        referenceJsonLive: referenceJsonLive,
        getPapersToSortFlag: getPapersToSortFlagUpdateButton,
        updateAlert: state.updateAlert + 1,
        updateFailure: state.updateFailure + newUpdateFailure,
        updateMessages: newArrayUpdateMessages,
        sortUpdating: state.sortUpdating - 1
      }
//         referenceJsonHasChange: hasChangeUpdateButton,

    default:
      return state;
  }
}
  
