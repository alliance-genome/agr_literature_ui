
import _ from "lodash";

//   biblioEntityDisplayType: 'textarea-disabled',
//   biblioEntityDisplayType: 'div-line-breaks',
//   biblioEntityDisplayType: 'entity-container-rows',
//   biblioEntityDisplayType: 'entity-side-by-side',
//   biblioEntityDisplayType: 'entity-container-rows',
const initialState = {
  biblioAction: '',
  biblioUpdatingEntityAdd: 0,
  entityAdd: {},
  isAddingEntity: false,
  entityModalText: '',
  entityEntitiesToMap: {},
  entityEntityMappings: {},

  biblioUpdating: 0,
  updateCitationFlag: false,
  referenceCurie: '',
  referenceJsonLive: {},
  referenceJsonDb: {},
  referenceJsonHasChange: {},
  // loadingQuery: true,
  isLoading: true,
  queryFailure: false,
  getReferenceCurieFlag: true,
  meshExpand: 'short',
  authorExpand: 'first',
  hasPmid: false,
  updateAlert: 0,
  updateFailure: 0,
  updateMessages: []
};

const deriveEntitiesToMap = (referenceJson) => {
  let biblioGetReferenceCurieEntityEntitiesToMap = {};
  console.log('referenceJson')
  console.log(referenceJson)
  if ('topic_entity_tags' in referenceJson && referenceJson['topic_entity_tags'].length > 0) {
    for (const tet of referenceJson['topic_entity_tags']) {
      if (('taxon' in tet && tet['taxon'] !== '') &&
          ('entity_type' in tet && tet['entity_type'] !== '') &&
          ('alliance_entity' in tet && tet['alliance_entity'] !== '')) {
            console.log(tet['taxon'] + " " + tet['entity_type'] + " " + tet['alliance_entity']);
            if (!(tet['entity_type'] in biblioGetReferenceCurieEntityEntitiesToMap)) {
              biblioGetReferenceCurieEntityEntitiesToMap[tet['entity_type']] = {}; }
            if (!(tet['taxon'] in biblioGetReferenceCurieEntityEntitiesToMap[tet['entity_type']])) {
              biblioGetReferenceCurieEntityEntitiesToMap[tet['entity_type']][tet['taxon']] = new Set(); }
            console.log('SET');
            console.log(biblioGetReferenceCurieEntityEntitiesToMap[tet['entity_type']][tet['taxon']]);
            biblioGetReferenceCurieEntityEntitiesToMap[tet['entity_type']][tet['taxon']].add(tet['alliance_entity']);
  } } }
  return biblioGetReferenceCurieEntityEntitiesToMap;
}

export const checkHasPmid = (referenceJsonLive) => {
  // console.log('called checkHasPmid ' + referenceJsonLive.curie);
  let checkingHasPmid = false;
  if (referenceJsonLive.constructor === Object && 'cross_references' in referenceJsonLive && referenceJsonLive['cross_references'] != null) {
    for (const xref of referenceJsonLive.cross_references) {
      if ( (xref.curie.match(/^PMID:/)) && (xref.is_obsolete === false) ) {
        checkingHasPmid = true; } } }
  return checkingHasPmid;
}

export const splitCurie = (curie) => {
  let curiePrefix = ''; let curieId = '';
  if ( curie.match(/^([^:]*):(.*)$/) ) {
    [curie, curiePrefix, curieId] = curie.match(/^([^:]*):(.*)$/) }
  return [ curiePrefix, curieId ]
}

const getStoreAuthorIndexFromDomIndex = (indexDomAuthorInfo, newAuthorInfoChange) => {
  // indexDomAuthorInfo is the index of the author info in the DOM
  // indexAuthorInfo is the index of the author info in the redux store, for updating non-order info
  let indexAuthorInfo = newAuthorInfoChange[indexDomAuthorInfo]['order']	// replace placeholder with index from store order value matches dom
  for (let authorReorderIndexDictIndex in newAuthorInfoChange) {
// console.log('loop index ' + authorReorderIndexDictIndex + ' for ' + indexDomAuthorInfo);
    if (newAuthorInfoChange[authorReorderIndexDictIndex]['order'] - 1 === indexDomAuthorInfo) { 
// console.log('loop index match ' + authorReorderIndexDictIndex + ' to ' + indexDomAuthorInfo);
      indexAuthorInfo = authorReorderIndexDictIndex
      break } }
  return indexAuthorInfo
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
    case 'CHANGE_FIELD_ENTITY_ADD_GENERAL_FIELD':
      // console.log(action.payload);
      return {
        ...state,
        entityAdd: {
          ...state.entityAdd,
          [action.payload.field]: action.payload.value
        }
      }
    case 'SET_GENE_RESULT_LIST':
      // console.log(action.payload);
      return {
        ...state,
        entityAdd: {
          ...state.entityAdd,
          geneResultList: action.payload.geneResultList
        }
      }
    case 'ENTITY_ADD_ENTITY_MAPPINGS':
      // console.log('reducer ENTITY_ADD_ENTITY_MAPPINGS');
      // console.log(action.payload);
      // payload: { entityType: entityType, taxon: taxon, entityMappings: entityMappings }
      const biblioEntityEntityMappingsAddEntityMappings = state.entityEntityMappings;
      if (!(action.payload.entityType in biblioEntityEntityMappingsAddEntityMappings)) {
        biblioEntityEntityMappingsAddEntityMappings[action.payload.entityType] = {}; }
      if (!(action.payload.taxon in biblioEntityEntityMappingsAddEntityMappings[action.payload.entityType])) {
        biblioEntityEntityMappingsAddEntityMappings[action.payload.entityType][action.payload.taxon] = {}; }
      for (const [entityCurie, entityName] of Object.entries(action.payload.entityMappings)) {
        console.log('REDUCER set ' + entityCurie + ' to ' + entityName);
        biblioEntityEntityMappingsAddEntityMappings[action.payload.entityType][action.payload.taxon][entityCurie] = entityName; }
      // must update referenceJsonLive to trigger rendering it again with new entityEntityMappings giving the entity names
      return {
        ...state,
        referenceJsonLive: _.cloneDeep(state.referenceJsonLive),
        entityEntityMappings: biblioEntityEntityMappingsAddEntityMappings
      }
    case 'SET_ENTITY_MODAL_TEXT':
      console.log('SET_ENTITY_MODAL_TEXT reducer ' + action.payload);
      return {
        ...state,
        entityModalText: action.payload
      }
    case 'SET_BIBLIO_UPDATING_ENTITY_ADD':
      console.log('SET_BIBLIO_UPDATING_ENTITY_ADD reducer ' + action.payload);
      return {
        ...state,
        biblioUpdatingEntityAdd: action.payload
      }
    case 'UPDATE_BUTTON_BIBLIO_ENTITY_ADD':
      console.log('UPDATE_BUTTON_BIBLIO_ENTITY_ADD reducer ');
      // console.log(action.payload);
      let getReferenceCurieFlagUpdateButtonEntityAdd = false;			// redirect to a reference if all updates successful
      let entityModalTextUpdateButtonEntityAdd = state.entityModalText;
      if (action.payload.responseMessage === "update success") {
        console.log('reducer UPDATE_BUTTON_BIBLIO_ENTITY_ADD ' + action.payload.responseMessage);
        console.log('state.biblioUpdatingEntityAdd ' + state.biblioUpdatingEntityAdd);
        if (state.biblioUpdatingEntityAdd === 1) {
          entityModalTextUpdateButtonEntityAdd = '';
          getReferenceCurieFlagUpdateButtonEntityAdd = true; }
      } else {
        entityModalTextUpdateButtonEntityAdd += "<br>\n" + action.payload.responseMessage;
        console.log('Add failure ' + action.payload.responseMessage);
      }

      return {
        ...state,
        entityModalText: entityModalTextUpdateButtonEntityAdd,
        getReferenceCurieFlag: getReferenceCurieFlagUpdateButtonEntityAdd,
        biblioUpdatingEntityAdd: state.biblioUpdatingEntityAdd - 1
      }

    case 'UPDATE_BUTTON_BIBLIO':
      // console.log('reducer UPDATE_BUTTON_BIBLIO ' + action.payload.responseMessage);
      // console.log('action.payload'); console.log(action.payload);
      let newUpdateFailure = 0;
      let newArrayUpdateMessages = state.updateMessages;
      let getReferenceCurieFlagUpdateButton = false;			// redirect to a reference if successful update
      let hasChangeUpdateButton = state.referenceJsonHasChange;		// update button color changes if any data changed, reset on updates
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
          (action.payload.index !== null) &&
          (action.payload.index in referenceJsonLive[action.payload.field]) &&
          ('subField' in action.payload) &&
          (action.payload.subField !== null) &&		// but only for related tables that create a dbid, not for cross_references
          (action.payload.subField in referenceJsonLive[action.payload.field][action.payload.index])) {
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
    case 'CLOSE_BIBLIO_UPDATE_ALERT':
      console.log('CLOSE_BIBLIO_UPDATE_ALERT reducer');
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
      // console.log('action.payload'); console.log(action.payload);
      let authorInfoArray = action.payload.field.split(" ");
      let fieldAuthorInfo = authorInfoArray[0];
//       let indexAuthorInfo = authorInfoArray[1];
      let indexDomAuthorInfo = parseInt(authorInfoArray[1]);
      let subfieldAuthorInfo = authorInfoArray[2];
      let subindexDomAuthorInfo = null;
      if (subfieldAuthorInfo === 'affiliations') {
        subindexDomAuthorInfo = parseInt(authorInfoArray[3]) }
      let authorInfoNewValue = action.payload.value;
      if ( (subfieldAuthorInfo === 'first_author') || (subfieldAuthorInfo === 'corresponding_author') ) {
        authorInfoNewValue = action.payload.checked || false }

      let newAuthorInfoChange = state.referenceJsonLive[fieldAuthorInfo];

//       // indexDomAuthorInfo is the index of the author info in the DOM
//       // indexAuthorInfo is the index of the author info in the redux store, for updating non-order info
//       let indexAuthorInfo = newAuthorInfoChange[indexDomAuthorInfo]['order']	// replace placeholder with index from store order value matches dom
//       for (let authorReorderIndexDictIndex in newAuthorInfoChange) {
//         if (newAuthorInfoChange[authorReorderIndexDictIndex]['order'] - 1 === indexDomAuthorInfo) { 
//           indexAuthorInfo = authorReorderIndexDictIndex } }
      let indexAuthorInfo = getStoreAuthorIndexFromDomIndex(indexDomAuthorInfo, newAuthorInfoChange)

      let hasChangeAuthorField = state.referenceJsonHasChange
      if ( (state.referenceJsonDb[fieldAuthorInfo][indexAuthorInfo][subfieldAuthorInfo] === action.payload.value) ||
           ( (subindexDomAuthorInfo !== null) && 
             (state.referenceJsonDb[fieldAuthorInfo][indexAuthorInfo][subfieldAuthorInfo][subindexDomAuthorInfo] === action.payload.value) ) ) {
        if (action.payload.field in hasChangeAuthorField) {
          delete hasChangeAuthorField[action.payload.field] } }
      else {
        hasChangeAuthorField[action.payload.field] = 'diff' }
      if (subfieldAuthorInfo === 'orcid') {
        newAuthorInfoChange[indexAuthorInfo][subfieldAuthorInfo] = {}
        newAuthorInfoChange[indexAuthorInfo][subfieldAuthorInfo]['url'] = null;
        newAuthorInfoChange[indexAuthorInfo][subfieldAuthorInfo]['curie'] = authorInfoNewValue; }
      else if (subfieldAuthorInfo === 'affiliations') {
//         let subindexDomAuthorInfo = parseInt(authorInfoArray[3])
        newAuthorInfoChange[indexAuthorInfo][subfieldAuthorInfo][subindexDomAuthorInfo] = authorInfoNewValue; }
      else if (subfieldAuthorInfo === 'order') {
        let oldAuthorOrder = indexDomAuthorInfo + 1
        let newAuthorOrder = parseInt(authorInfoNewValue)
        // console.log('reorder ' + oldAuthorOrder + " into " + newAuthorOrder)
        // authors have to be reordered based on their order field, not the store array index, because second+ reorders would not work
        for (let authorReorderDict of newAuthorInfoChange) {
          if (newAuthorOrder < oldAuthorOrder) {
            if (authorReorderDict['order'] === oldAuthorOrder) {
              authorReorderDict['needsChange'] = true;
              authorReorderDict['order'] = newAuthorOrder }
            else if ( (authorReorderDict['order'] >= newAuthorOrder) && (authorReorderDict['order'] < oldAuthorOrder) ) {
              authorReorderDict['needsChange'] = true;
              authorReorderDict['order'] += 1 } }
          else if (newAuthorOrder > oldAuthorOrder) {
            if (authorReorderDict['order'] === oldAuthorOrder) {
              authorReorderDict['needsChange'] = true;
              authorReorderDict['order'] = newAuthorOrder }
            else if ( (authorReorderDict['order'] <= newAuthorOrder) && (authorReorderDict['order'] > oldAuthorOrder) ) {
              authorReorderDict['needsChange'] = true;
              authorReorderDict['order'] -= 1 } } } }
      else {
        newAuthorInfoChange[indexAuthorInfo][subfieldAuthorInfo] = authorInfoNewValue; }
      // console.log(newAuthorInfoChange)
      newAuthorInfoChange[indexAuthorInfo]['needsChange'] = true;
      return {
        ...state,
        referenceJsonHasChange: hasChangeAuthorField,
        referenceJsonLive: {
          ...state.referenceJsonLive,
          [fieldAuthorInfo]: newAuthorInfoChange
        }
      }

    case 'CHANGE_FIELD_COMMENTS_CORRECTIONS_REFERENCE_JSON':
      console.log(action.payload);
      let commentsCorrectionsArray = action.payload.field.split(" ");
      console.log(commentsCorrectionsArray);
      let fieldCommentsCorrections = commentsCorrectionsArray[0];
      let indexCommentsCorrections = commentsCorrectionsArray[1];
      let typeOrCurieCommentsCorrections = commentsCorrectionsArray[2];
      let commentsCorrectionsNewValue = action.payload.value;

      let newCommentsCorrectionsChange = state.referenceJsonLive[fieldCommentsCorrections];
      newCommentsCorrectionsChange[indexCommentsCorrections]['needsChange'] = true;
      newCommentsCorrectionsChange[indexCommentsCorrections][typeOrCurieCommentsCorrections] = commentsCorrectionsNewValue;

      let hasChangeCommentsCorrectionsField = state.referenceJsonHasChange
      if (state.referenceJsonDb[fieldCommentsCorrections][indexCommentsCorrections][typeOrCurieCommentsCorrections] === commentsCorrectionsNewValue) {
        if (action.payload.field in hasChangeCommentsCorrectionsField) {
          delete hasChangeCommentsCorrectionsField[action.payload.field] } }
      else {
        hasChangeCommentsCorrectionsField[action.payload.field] = 'diff' }

      return {
        ...state,
        referenceJsonHasChange: hasChangeCommentsCorrectionsField,
        referenceJsonLive: {
          ...state.referenceJsonLive,
          [fieldCommentsCorrections]: newCommentsCorrectionsChange
        }
      }

    case 'CHANGE_FIELD_MOD_ASSOCIATION_REFERENCE_JSON':
      console.log(action.payload);
      let modAssociationArray = action.payload.field.split(" ");
      let fieldModAssociation = modAssociationArray[0];
      let indexModAssociation = modAssociationArray[1];
      let subfieldModAssociation = modAssociationArray[2];
      let modAssociationNewValue = action.payload.value;

      let newModAssociationChange = state.referenceJsonLive[fieldModAssociation];
      newModAssociationChange[indexModAssociation]['needsChange'] = true;
      newModAssociationChange[indexModAssociation][subfieldModAssociation] = modAssociationNewValue

      let hasChangeModAssociationField = state.referenceJsonHasChange
      if (state.referenceJsonDb[fieldModAssociation][indexModAssociation][subfieldModAssociation] === modAssociationNewValue) {
        if (action.payload.field in hasChangeModAssociationField) {
          delete hasChangeModAssociationField[action.payload.field] } }
      else {
        hasChangeModAssociationField[action.payload.field] = 'diff' }

      return {
        ...state,
        referenceJsonHasChange: hasChangeModAssociationField,
        referenceJsonLive: {
          ...state.referenceJsonLive,
          [fieldModAssociation]: newModAssociationChange
        }
      }

    case 'CHANGE_FIELD_CROSS_REFERENCES_REFERENCE_JSON':
      // console.log(action.payload);
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
      else if (action.payload.type === 'author_array') {
        let indexDomAuthorRevert = parseInt(stringArrayRevert[1]);
        let indexStoreAuthorRevert = getStoreAuthorIndexFromDomIndex(indexDomAuthorRevert, state.referenceJsonLive[fieldStringArrayRevert])
//         console.log('author revert indexDomAuthorRevert ' + indexDomAuthorRevert + ' indexStoreAuthorRevert ' + indexStoreAuthorRevert )
        let revertAuthorId = state.referenceJsonLive[fieldStringArrayRevert][indexStoreAuthorRevert]['author_id']
//         console.log('author revert indexDomAuthorRevert ' + indexDomAuthorRevert + ' indexStoreAuthorRevert ' + indexStoreAuthorRevert + ' raid ' + revertAuthorId)
        if (revertAuthorId === 'new') {
//           console.log('reset to initialize dict indexDomAuthorRevert ' + indexDomAuthorRevert)
          const revertNewAuthorDict = JSON.parse(JSON.stringify(action.payload.initializeDict))
          revertNewAuthorDict['order'] = state.referenceJsonLive[fieldStringArrayRevert][indexStoreAuthorRevert]['order']
//           console.log('reset to initialize dict set order to ' + state.referenceJsonLive[fieldStringArrayRevert][indexStoreAuthorRevert]['order'])
// console.log(revertNewAuthorDict)
          revertValue[indexStoreAuthorRevert] = revertNewAuthorDict }
        else {
//           console.log('reset to initialize dict revertAuthorId ' + revertAuthorId)
          for (const dbRevertAuthorDict of state.referenceJsonDb[fieldStringArrayRevert]) {
// console.log('loop ' + dbRevertAuthorDict['author_id'] + ' for ' + revertAuthorId);
            if (dbRevertAuthorDict['author_id'] === revertAuthorId) {
// console.log('loop match ' + dbRevertAuthorDict['author_id'] + ' to ' + revertAuthorId);
              const revertNewAuthorDict = JSON.parse(JSON.stringify(dbRevertAuthorDict))
              revertNewAuthorDict['order'] = state.referenceJsonLive[fieldStringArrayRevert][indexStoreAuthorRevert]['order']
//               console.log('reset to initialize dict set order to ' + state.referenceJsonLive[fieldStringArrayRevert][indexStoreAuthorRevert]['order'])
// console.log(revertNewAuthorDict)
              revertValue[indexStoreAuthorRevert] = revertNewAuthorDict
              break } } } }
      let hasChangeFieldRevert = state.referenceJsonHasChange
      for (const fieldRevertEntry in hasChangeFieldRevert) {
        if (fieldRevertEntry.startsWith(fieldIdRevert)) {
          delete hasChangeFieldRevert[fieldRevertEntry] } }
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
    case 'BIBLIO_ADD_NEW_AUTHOR_AFFILIATION':
      // adding to author dict requires deriving the author store index, so it's simpler in its own action and reducer
      // console.log(action.payload);
      let authorInfoNewAffArray = action.payload.field.split(" ");
      let fieldAuthorInfoNewAff = authorInfoNewAffArray[0];
      let indexDomAuthorInfoNewAff = parseInt(authorInfoNewAffArray[1]);
      let subfieldAuthorInfoNewAff = authorInfoNewAffArray[2];
      let authorInfoNewAffDb = state.referenceJsonDb[fieldAuthorInfoNewAff] || [];
      let authorInfoNewAffLive = state.referenceJsonLive[fieldAuthorInfoNewAff] || [];
      let indexAuthorInfoNewAff = getStoreAuthorIndexFromDomIndex(indexDomAuthorInfoNewAff, authorInfoNewAffLive)
      let newAuthorAffiliationDb = state.referenceJsonDb[fieldAuthorInfoNewAff][indexAuthorInfoNewAff][subfieldAuthorInfoNewAff] || [];
      let newAuthorAffiliationLive = state.referenceJsonLive[fieldAuthorInfoNewAff][indexAuthorInfoNewAff][subfieldAuthorInfoNewAff] || [];
      if (action.payload.type === 'string') {
        newAuthorAffiliationDb.push('')
        authorInfoNewAffDb[indexAuthorInfoNewAff][subfieldAuthorInfoNewAff] = newAuthorAffiliationDb
        newAuthorAffiliationLive.push('')
        authorInfoNewAffLive[indexAuthorInfoNewAff][subfieldAuthorInfoNewAff] = newAuthorAffiliationLive
      }
      return {
        ...state,
        referenceJsonDb: {
          ...state.referenceJsonDb,
          [authorInfoNewAffArray]: newAuthorAffiliationDb
        },
        referenceJsonLive: {
          ...state.referenceJsonLive,
          [authorInfoNewAffArray]: newAuthorAffiliationLive
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
//     case 'CHANGE_BIBLIO_ENTITY_DISPLAY_TYPE_TOGGLER':
//       // console.log(action.payload);
//       return {
//         ...state,
//         biblioEntityDisplayType: action.payload
//       }
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
    case 'SET_UPDATE_CITATION_FLAG':
      console.log("reducer set update citation flag");
      return {
        ...state,
        updateCitationFlag: action.payload
      }
    case 'SET_REFERENCE_CURIE':
      console.log("reducer set reference curie, also clear store");
      // also clear store from the previous reference data
      return {
        ...state,
        isLoading: true,
        referenceJsonLive: {},
        referenceJsonDb: {},
        referenceJsonHasChange: {},
        referenceCurie: action.payload
      }
    case 'SET_GET_REFERENCE_CURIE_FLAG':
      console.log("biblio reducer set get reference curie flag");
      return {
        ...state,
        getReferenceCurieFlag: action.payload
      }
//     case 'SET_LOADING_QUERY':	// replaced by RESET_BIBLIO_IS_LOADING
//       console.log("reducer set loading query");
//       return {
//         ...state,
//         loadingQuery: action.payload
//       }
    case 'RESET_BIBLIO_IS_LOADING':
      console.log("biblio reducer reset isLoading");
      return {
        ...state,
        isLoading: true
      }
// replaced by setReferenceCurie + setGetReferenceCurieFlag
//     // case 'RESET_QUERY_STATE':
//     case 'RESET_BIBLIO_REFERENCE_CURIE':
//       console.log("reducer biblio reset reference curie");
//       return {
//         ...state,
//         referenceCurie: '',
//         getReferenceCurieFlag: true,
//         // isLoading: true
//         // loadingQuery: true
//       }

//     case 'BIBLIO_GET_REFERENCE_CURIE':
//       console.log("reducer biblio get reference curie");
//       if (action.payload.detail === "Reference with the id AGR:AGR-Reference is not available") {
//         return {
//           ...state,
//           referenceCurie: action.payload.detail,
//           queryFailure: true,
//           getReferenceCurieFlag: false,
//           isLoading: false
//           // loadingQuery: false
//         }
//       } else {  
//         const pmidBool = checkHasPmid(action.payload)
//         // have to make copy of dictionary, otherwise deep elements in dictionary are the same and changing Live or Db change both copies
//         const dbCopyGetReferenceCurie = JSON.parse(JSON.stringify(action.payload))
//         return {
//           ...state,
//           referenceCurie: action.payload.curie,
//           referenceJsonLive: action.payload,
//           referenceJsonDb: dbCopyGetReferenceCurie,
//           hasPmid: pmidBool,
//           getReferenceCurieFlag: false,
//           isLoading: false
//           // loadingQuery: false
//         }
//       }

    // TODO to make live, rename this case to appropriate name, remove action that assigns prepopulated corpus and source
    case 'BIBLIO_GET_REFERENCE_CURIE':
      console.log("reducer biblio get reference curie");
      if (action.payload.detail === "Reference with the id AGR:AGR-Reference is not available") {
        return {
          ...state,
          referenceCurie: action.payload.detail,
          queryFailure: true,
          getReferenceCurieFlag: false,
          isLoading: false
          // loadingQuery: false
        }
      } else {  
        const pmidBool = checkHasPmid(action.payload)
        for (let modAssociationIndex in action.payload.mod_corpus_associations) {	// change boolean into displayable value
          if (action.payload.mod_corpus_associations[modAssociationIndex]['corpus'] === null) {
                   action.payload.mod_corpus_associations[modAssociationIndex]['corpus'] = 'needs_review'; }
          else if (action.payload.mod_corpus_associations[modAssociationIndex]['corpus'] === true) {
                   action.payload.mod_corpus_associations[modAssociationIndex]['corpus'] = 'inside_corpus'; }
          else if (action.payload.mod_corpus_associations[modAssociationIndex]['corpus'] === false) {
                   action.payload.mod_corpus_associations[modAssociationIndex]['corpus'] = 'outside_corpus'; }
        }

        const biblioGetReferenceCurieEntityEntitiesToMap = deriveEntitiesToMap(action.payload)
        // console.log(biblioGetReferenceCurieEntityEntitiesToMap);

        // have to make copy of dictionary, otherwise deep elements in dictionary are the same and changing Live or Db change both copies
        const dbCopyGetReferenceCurie = _.cloneDeep(action.payload);
        return {
          ...state,
          referenceCurie: action.payload.curie,
          referenceJsonLive: action.payload,
          referenceJsonDb: dbCopyGetReferenceCurie,
          entityEntitiesToMap: biblioGetReferenceCurieEntityEntitiesToMap,
          hasPmid: pmidBool,
          getReferenceCurieFlag: false,
          isLoading: false
          // loadingQuery: false
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
