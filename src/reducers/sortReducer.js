
const initialState = {
  modsField: '',
  referencesToSortLive: [],
  referencesToSortDb: []
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

//       let modReferenceArray = action.payload.field.split(" ");
//       let fieldModReference = modReferenceArray[0];
//       let indexModReference = modReferenceArray[1];
//       let subfieldModReference = modReferenceArray[2];
//       let newModReferenceChange = state.referenceJsonLive[fieldModReference];
//       newModReferenceChange[indexModReference][subfieldModReference] = action.payload.value;
//       newModReferenceChange[indexModReference]['needsChange'] = true;
//       let hasChangeModReferenceField = state.referenceJsonHasChange
//       if (state.referenceJsonDb[fieldModReference][indexModReference][subfieldModReference] === action.payload.value) {
//         if (action.payload.field in hasChangeModReferenceField) {
//           delete hasChangeModReferenceField[action.payload.field] } }
//       else {
//         hasChangeModReferenceField[action.payload.field] = 'diff' }
//       return {
//         ...state,
//         referenceJsonHasChange: hasChangeModReferenceField,
//         referenceJsonLive: {
//           ...state.referenceJsonLive,
//           [fieldModReference]: newModReferenceChange
//         }
//       }

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
  
