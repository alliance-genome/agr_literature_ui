// import { useState } from 'react'
// import { useEffect } from 'react';
// import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// import { useHistory } from "react-router-dom";

import { useSelector, useDispatch } from 'react-redux';
// import { useSelector } from 'react-redux';

// import { resetQueryRedirect } from '../actions/biblioActions';
import { setReferenceCurie } from '../actions/biblioActions';
import { setBiblioAction } from '../actions/biblioActions';
// import { setLoadingQuery } from '../actions/biblioActions';
import { biblioQueryReferenceCurie } from '../actions/biblioActions';
// import { biblioMock1QueryReferenceCurie } from '../actions/biblioMock1Actions';
import { setBiblioUpdating } from '../actions/biblioActions';
import { setUpdateCitationFlag } from '../actions/biblioActions';

import { changeFieldReferenceJson } from '../actions/biblioActions';
import { changeFieldArrayReferenceJson } from '../actions/biblioActions';
import { changeFieldModReferenceReferenceJson } from '../actions/biblioActions';
import { changeFieldModAssociationReferenceJson } from '../actions/biblioActions';
import { changeFieldCrossReferencesReferenceJson } from '../actions/biblioActions';
import { changeFieldCommentsCorrectionsReferenceJson } from '../actions/biblioActions';
import { changeFieldAuthorsReferenceJson } from '../actions/biblioActions';
import { changeBiblioActionToggler } from '../actions/biblioActions';
import { biblioAddNewRowString } from '../actions/biblioActions';
import { biblioAddNewAuthorAffiliation } from '../actions/biblioActions';
import { biblioAddNewRowDict } from '../actions/biblioActions';
import { updateButtonBiblio } from '../actions/biblioActions';
import { closeBiblioUpdateAlert } from '../actions/biblioActions';
import { changeBiblioMeshExpandToggler } from '../actions/biblioActions';
import { changeBiblioAuthorExpandToggler } from '../actions/biblioActions';
import { biblioRevertField } from '../actions/biblioActions';
import { biblioRevertFieldArray } from '../actions/biblioActions';
import { biblioRevertAuthorArray } from '../actions/biblioActions';

import { changeFieldEntityGeneList } from '../actions/biblioActions';

import { useLocation } from 'react-router-dom';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'

import loading_gif from '../images/loading_cat.gif';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUndo } from '@fortawesome/free-solid-svg-icons'

// http://dev.alliancegenome.org:49161/reference/AGR:AGR-Reference-0000000001


// if passing an object with <Redirect push to={{ pathname: "/Biblio", state: { pie: "the pie" } }} />, would access new state with
// const Biblio = ({ appState, someAction, location }) => {
// console.log(location.state);  }

const fieldsSimple = ['curie', 'reference_id', 'title', 'category', 'citation', 'volume', 'page_range', 'language', 'abstract', 'plain_language_abstract', 'publisher', 'issue_name', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified_in_pubmed', 'resource_curie', 'resource_title' ];
const fieldsArrayString = ['keywords', 'pubmed_abstract_languages', 'pubmed_types', 'obsolete_references' ];
const fieldsOrdered = [ 'title', 'mod_corpus_associations', 'cross_references', 'obsolete_references', 'corrections', 'authors', 'DIVIDER', 'citation', 'abstract', 'pubmed_abstract_languages', 'plain_language_abstract', 'DIVIDER', 'category', 'pubmed_types', 'mod_reference_types', 'DIVIDER', 'resource_curie', 'resource_title', 'volume', 'issue_name', 'page_range', 'DIVIDER', 'editors', 'publisher', 'language', 'DIVIDER', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified_in_pubmed', 'DIVIDER', 'keywords', 'mesh_terms' ];
// const fieldsOrdered = [ 'title', 'mod_reference_types' ];

const fieldsPubmed = [ 'title', 'corrections', 'authors', 'abstract', 'pubmed_types', 'resource_curie', 'resource_title', 'volume', 'issue_name', 'page_range', 'editors', 'publisher', 'language', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified_in_pubmed', 'keywords', 'mesh_terms', 'pubmed_abstract_languages', 'plain_language_abstract' ];
const fieldsDisplayOnly = [ 'citation', 'pubmed_types', 'resource_title', 'date_arrived_in_pubmed', 'date_last_modified_in_pubmed', 'mesh_terms', 'pubmed_abstract_languages', 'plain_language_abstract', 'obsolete_references' ];


const fieldTypeDict = {}
fieldTypeDict['abstract'] = 'textarea'
fieldTypeDict['citation'] = 'textarea'
fieldTypeDict['plain_language_abstract'] = 'textarea'
fieldTypeDict['category'] = 'select'

const enumDict = {}
enumDict['category'] = ['research_article', 'review_article', 'thesis', 'book', 'other', 'preprint', 'conference_publication', 'personal_communication', 'direct_data_submission', 'internal_process_reference', 'unknown', 'retraction', 'obsolete', 'correction']
enumDict['mods'] = ['', 'FB', 'MGI', 'RGD', 'SGD', 'WB', 'XB', 'ZFIN']
enumDict['personXrefPrefix'] = ['', 'ORCID']
enumDict['referenceXrefPrefix'] = ['', 'PMID', 'DOI', 'PMCID', 'ISBN', 'Xenbase', 'FB', 'MGI', 'RGD', 'SGD', 'WB', 'ZFIN']
enumDict['referenceComcorType'] = ['', 'RetractionOf', 'HasRetraction', 'ErratumFor', 'HasErratum', 'ReprintOf', 'HasReprintA', 'RepublishedFrom', 'RepublishedIn', 'UpdateOf', 'HasUpdate', 'ExpressionOfConcernFor', 'HasExpressionOfConcernFor']
enumDict['modAssociationCorpus'] = ['needs_review', 'inside_corpus', 'outside_corpus']
enumDict['modAssociationSource'] = ['', 'mod_pubmed_search', 'dqm_files', 'manual_creation', 'assigned_for_review']

// title
// cross_references (doi, pmid, modID)
// authors (collapsed [in a list, or only first author])
// citation (generated from other fields, curators will decide later)
// abstract
//
// category
// pubmed_types
// mod_reference_types
//
// resource (resource_curie resource_title ?)
// volume
// issue_name
// page_range
//
// editors
// publisher
// language
//
// date_published
// date_arrived_in_pubmed
// date_last_modified_in_pubmed
//
// keywords
// mesh_terms


export function splitCurie(curie, toReturn) {
  let curiePrefix = ''; let curieId = '';
  if ( curie.match(/^([^:]*):(.*)$/) ) {
    [curie, curiePrefix, curieId] = curie.match(/^([^:]*):(.*)$/) }
  if (toReturn === undefined) { return [ curiePrefix, curieId ] }
  else if (toReturn === 'id') { return curieId }
  else if (toReturn === 'prefix') { return curiePrefix }
  else { return [ curiePrefix, curieId ] } }

function aggregateCitation(referenceJson) {
  // Authors, (year) title.   Journal  volume (issue): page_range
  let year = ''
  if ( ('date_published' in referenceJson) && referenceJson['date_published'] !== null && (referenceJson['date_published'].match(/(\d{4})/)) ) {
    let match = referenceJson['date_published'].match(/(\d{4})/)
    if (match[1] !== undefined) { year = match[1] } }
  let title = referenceJson['title'] || ''
  if (!(title.match(/\.$/))) { title = title + '.' }
  let authorNames = ''
  if ('authors' in referenceJson && referenceJson['authors'] !== null) {
    const orderedAuthors = [];
    for (const value  of referenceJson['authors'].values()) {
      let index = value['order'] - 1;
      if (index < 0) { index = 0 }	// temporary fix for fake authors have an 'order' field value of 0
      orderedAuthors[index] = value; }
    authorNames = orderedAuthors.map((dict, index) => ( dict['name'] )).join('; '); }
  const journal = referenceJson['resource_title'] || ''
  const volume = referenceJson['volume'] || ''
  const issue = referenceJson['issue_name'] || ''
  const page_range = referenceJson['page_range'] || ''
  const citation = `${authorNames}, (${year}) ${title}  ${journal} ${volume} (${issue}): ${page_range}`
  return citation }

// helper function for processing directly from database 'comment_and_corrections' field, but data format does't work for RowEditor
// function convertCommentCorrectionType(type) {
//   let comcorMapping = {}
//   comcorMapping['CommentOn'] = 'HasComment'
//   comcorMapping['ErratumFor'] = 'HasErratum'
//   comcorMapping['ExpressionOfConcernFor'] = 'HasExpressionOfConcernFor'
//   comcorMapping['ReprintOf'] = 'HasReprint'
//   comcorMapping['RepublishedFrom'] = 'RepublishedIn'
//   comcorMapping['RetractionOf'] = 'HasRetraction'
//   comcorMapping['UpdateOf'] = 'HasUpdate'
//   if (type in comcorMapping) { return comcorMapping[type]; }
//     else { return type } }

const BiblioActionToggler = () => {
  const dispatch = useDispatch();
  const biblioAction = useSelector(state => state.biblio.biblioAction);
  let displayChecked = '';
  let editorChecked = '';
  let entityChecked = '';
  let radioFormEditorClassname = 'radio-form';
  let radioFormEntityClassname = 'radio-form';
  let radioFormDisplayClassname = 'radio-form';
  let biblioActionTogglerSelected = 'display';
  if (biblioAction === 'editor') { 
      radioFormEditorClassname += ' underlined';
      editorChecked = 'checked';
      biblioActionTogglerSelected = 'editor'; }
    else if (biblioAction === 'entity') { 
      radioFormEntityClassname += ' underlined';
      entityChecked = 'checked';
      biblioActionTogglerSelected = 'entity'; }
    else {
      radioFormDisplayClassname += ' underlined';
      displayChecked = 'checked'; }
  const referenceCurie = useSelector(state => state.biblio.referenceCurie);
  let newUrl = "/Biblio/?action=" + biblioActionTogglerSelected + "&referenceCurie=" + referenceCurie
  window.history.replaceState({}, null, newUrl)

// calling below
//         onChange={(e) => dispatch(toggleBiblioAction(e))}
// doesn't work because
//         Error: Actions must be plain objects. Use custom middleware for async actions.
// still need a way to change history (url)
//   const referenceCurie = useSelector(state => state.biblio.referenceCurie);
//   const history = useHistory();
//   function toggleBiblioAction(e) {
//     let biblioActionTogglerSelected = 'display';
//     if (e.target.id === 'biblio-toggler-editor') { biblioActionTogglerSelected = 'editor'; }
//     // console.log(biblioActionTogglerSelected)
//     dispatch(changeBiblioActionToggler(e))
//     history.push("/Biblio/?action=" + biblioActionTogglerSelected + "&referenceCurie=" + referenceCurie);
//   }

  return (
    <Form>
    <div key={`default-radio`} className="mb-3">
      <div className='radio-span'>
        <Form.Check
          inline
          className={radioFormDisplayClassname}
          checked={displayChecked}
          type='radio'
          label='biblio display'
          id='biblio-toggler-display'
          onChange={(e) => dispatch(changeBiblioActionToggler(e))}
        />
      </div>
      <div className='radio-span'>
        <Form.Check
          inline
          className={radioFormEditorClassname}
          checked={editorChecked}
          type='radio'
          label='biblio editor'
          id='biblio-toggler-editor'
          onChange={(e) => dispatch(changeBiblioActionToggler(e))}
        />
      </div>
      <div className='radio-span'>
        <Form.Check
          inline
          className={radioFormEntityClassname}
          checked={entityChecked}
          type='radio'
          label='entity editor'
          id='biblio-toggler-entity'
          onChange={(e) => dispatch(changeBiblioActionToggler(e))}
        />
      </div>
    </div>
    </Form>);
} // const BiblioActionToggler

const RowDivider = () => { return (<Row><Col>&nbsp;</Col></Row>); }

const BiblioActionRouter = () => {
  const biblioAction = useSelector(state => state.biblio.biblioAction);
  switch (biblioAction) {
    case 'display':
      return (<Container><BiblioActionToggler /><RowDivider /><BiblioDisplay /></Container>);
    case 'editor':
      return (<Container><BiblioActionToggler /><RowDivider /><BiblioEditor /></Container>);
    case 'entity':
      return (<Container><BiblioActionToggler /><RowDivider /><BiblioEntity /></Container>);
    default:
      return (<Container><BiblioActionToggler /><RowDivider /><BiblioDisplay /></Container>);
  }
}


const RowDisplaySimple = ({fieldName, value, updatedFlag}) => {
  return (  <Row key={fieldName} className="Row-general" xs={2} md={4} lg={6}>
              <Col className="Col-general Col-display Col-display-left">{fieldName}</Col>
              <Col className={`Col-general Col-display Col-display-right ${updatedFlag}`} lg={{ span: 10 }}>{value}</Col>
            </Row>); }

const RowDisplayString = ({fieldName, referenceJsonLive, referenceJsonDb}) => {
  let valueLive = ''; let valueDb = ''; let updatedFlag = '';
  if (fieldName in referenceJsonDb) { valueDb = referenceJsonDb[fieldName] }
  if (fieldName in referenceJsonLive) { valueLive = referenceJsonLive[fieldName] }
  if (fieldName === 'citation') {
    valueDb = aggregateCitation(referenceJsonDb)
    valueLive = aggregateCitation(referenceJsonLive) }
  if (valueLive !== valueDb) { updatedFlag = 'updated'; }
  let valueToDisplay = valueLive;
  if ( (fieldName === 'title') || (fieldName === 'abstract') || (fieldName === 'citation') ) {
    valueToDisplay = (<span dangerouslySetInnerHTML={{__html: valueLive}} />) }
  return (
        <RowDisplaySimple key={fieldName} fieldName={fieldName} value={valueToDisplay} updatedFlag={updatedFlag} />); }

const RowDisplayArrayString = ({fieldIndex, fieldName, referenceJson, referenceJsonLive, referenceJsonDb}) => {
  if (fieldName in referenceJsonLive && referenceJsonLive[fieldName] !== null) {	// need this because referenceJsonLive starts empty before values get added
    const rowArrayStringElements = []
    if (referenceJsonLive[fieldName].length === 0) {
      rowArrayStringElements.push(<RowDisplaySimple key={fieldName} fieldName={fieldName} value="" updatedFlag="" />); }
    else {
      for (const [index, valueLive] of referenceJsonLive[fieldName].entries()) {
        let valueDb = ''; let updatedFlag = '';
        if (typeof referenceJsonDb[fieldName][index] !== 'undefined') { valueDb = referenceJsonDb[fieldName][index] }
        if (valueLive !== valueDb) { updatedFlag = 'updated'; }
        rowArrayStringElements.push(<RowDisplaySimple key={`${fieldIndex} ${index}`} fieldName={fieldName} value={valueLive} updatedFlag={updatedFlag} />); } }
    return (<>{rowArrayStringElements}</>); }
  else { return null; } }

// TODO to make live, copy RowDisplayModAssociation  RowEditorModAssociation  to Biblio.js   replace values of BiblioMock1 with Biblio  add (fieldName === 'mod_corpus_associations')  in BiblioDisplay and BiblioEditor   add mod_corpus_associations to fields_ordered
const RowDisplayModAssociation = ({fieldIndex, fieldName, referenceJsonLive, referenceJsonDb}) => {
//   fieldName = 'mod_corpus_associations';
  if ('mod_corpus_associations' in referenceJsonLive && referenceJsonLive['mod_corpus_associations'] !== null) {
    const rowModAssociationElements = []
    for (const[index, modAssociationDict] of referenceJsonLive['mod_corpus_associations'].entries()) {
//       let url = modAssociationDict['url'];
//       let valueLiveCurie = modAssociationDict['curie']; let valueDbCurie = ''; let updatedFlagCurie = '';
// //       let [valueLiveCuriePrefix, valueLiveCurieId] = splitCurie(valueLiveCurie);
//       let valueLiveCuriePrefix = splitCurie(valueLiveCurie, 'prefix');
      let valueLiveMod = modAssociationDict['mod_abbreviation']; let valueDbMod = ''; let updatedFlagMod = '';
      let valueLiveCorpus = modAssociationDict['corpus']; let valueDbCorpus = ''; let updatedFlagCorpus = '';
      let valueLiveSource = modAssociationDict['mod_corpus_sort_source']; let valueDbSource = ''; let updatedFlagSource = '';

//       if (enumDict['mods'].includes(valueLiveMod)) {
//         let valueLiveIsObsolete = modAssociationDict['is_obsolete']; let valueDbIsObsolete = ''; let updatedFlagIsObsolete = '';
        if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
             (typeof referenceJsonDb[fieldName][index]['mod_abbreviation'] !== 'undefined') ) {
               valueDbMod = referenceJsonDb[fieldName][index]['mod_abbreviation'] }
        if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
             (typeof referenceJsonDb[fieldName][index]['corpus'] !== 'undefined') ) {
               valueDbCorpus = referenceJsonDb[fieldName][index]['corpus'] }
        if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
             (typeof referenceJsonDb[fieldName][index]['mod_corpus_sort_source'] !== 'undefined') ) {
               valueDbSource = referenceJsonDb[fieldName][index]['mod_corpus_sort_source'] }
//         if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
//              (typeof referenceJsonDb[fieldName][index]['is_obsolete'] !== 'undefined') ) {
//                valueDbIsObsolete = referenceJsonDb[fieldName][index]['is_obsolete'] }
        if (valueLiveMod !== valueDbMod) { updatedFlagMod = 'updated'; }
//         if (valueLiveIsObsolete !== valueDbIsObsolete) { updatedFlagIsObsolete = 'updated'; }
        if (valueLiveCorpus !== valueDbCorpus) { updatedFlagCorpus = 'updated'; }
        if (valueLiveSource !== valueDbSource) { updatedFlagSource = 'updated'; }

//         let isObsolete = '';
//         if ( (typeof referenceJsonLive[fieldName][index] !== 'undefined') &&
//              (typeof referenceJsonLive[fieldName][index]['is_obsolete'] !== 'undefined') ) {
//                if (referenceJsonLive[fieldName][index]['is_obsolete'] === true) { isObsolete = 'obsolete'; }
//                else { isObsolete = ''; } }
//         let updatedFlag = '';
//         if ( (updatedFlagCurie === 'updated') || (updatedFlagCorpus === 'updated') || (updatedFlagSource === 'updated') ) { updatedFlag = 'updated' }
//         if ('pages' in modAssociationDict && modAssociationDict['pages'] !== null) { url = modAssociationDict['pages'][0]['url']; }
//         const xrefValue = (<div><span style={{color: 'red'}}>{isObsolete}</span> <a href={url}  rel="noreferrer noopener" target="_blank">{valueLiveCurie}</a></div>);
//         const modAssociationValue = (<div>{valueLiveCuriePrefix} {valueLiveCorpus} {valueLiveSource}</div>);
//         rowModAssociationElements.push(<RowDisplaySimple key={`${fieldIndex} ${index}`} fieldName={fieldName} value={modAssociationValue} updatedFlag={updatedFlag} />);
        rowModAssociationElements.push(
          <Row key={`${fieldIndex} ${index}`} className="Row-general" xs={2} md={4} lg={6}>
            <Col className="Col-general Col-display Col-display-left">mod_corpus_associations</Col>
            <Col className={`Col-general Col-display ${updatedFlagMod} `} lg={{ span: 2 }}>{valueLiveMod}</Col>
            <Col className={`Col-general Col-display ${updatedFlagCorpus} `} lg={{ span: 4 }}>{valueLiveCorpus}</Col>
            <Col className={`Col-general Col-display Col-display-right ${updatedFlagSource} `} lg={{ span: 4 }}>{valueLiveSource}</Col>
          </Row>); 
//         }
      } // if (enumDict['mods'].includes(valueLiveCuriePrefix))
    return (<>{rowModAssociationElements}</>); }
  else { return null; } }

const RowDisplayCrossReferences = ({fieldIndex, fieldName, referenceJsonLive, referenceJsonDb}) => {
  if ('cross_references' in referenceJsonLive && referenceJsonLive['cross_references'] !== null) {
    const rowCrossReferenceElements = []
    for (const[index, crossRefDict] of referenceJsonLive['cross_references'].entries()) {
      let url = crossRefDict['url'];
      let valueLiveCurie = crossRefDict['curie']; let valueDbCurie = ''; let updatedFlagCurie = '';

      let valueLiveIsObsolete = crossRefDict['is_obsolete']; let valueDbIsObsolete = ''; let updatedFlagIsObsolete = '';
      if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
           (typeof referenceJsonDb[fieldName][index]['curie'] !== 'undefined') ) {
             valueDbCurie = referenceJsonDb[fieldName][index]['curie'] }
      if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
           (typeof referenceJsonDb[fieldName][index]['is_obsolete'] !== 'undefined') ) {
             valueDbIsObsolete = referenceJsonDb[fieldName][index]['is_obsolete'] }
      if (valueLiveCurie !== valueDbCurie) { updatedFlagCurie = 'updated'; }
      if (valueLiveIsObsolete !== valueDbIsObsolete) { updatedFlagIsObsolete = 'updated'; }
      let isObsolete = '';
      if ( (typeof referenceJsonLive[fieldName][index] !== 'undefined') &&
           (typeof referenceJsonLive[fieldName][index]['is_obsolete'] !== 'undefined') ) {
             if (referenceJsonLive[fieldName][index]['is_obsolete'] === true) { isObsolete = 'obsolete'; }
             else { isObsolete = ''; } }
      let updatedFlag = '';
      if ( (updatedFlagCurie === 'updated') || (updatedFlagIsObsolete === 'updated') ) { updatedFlag = 'updated' }
      if ('pages' in crossRefDict && crossRefDict['pages'] !== null) { url = crossRefDict['pages'][0]['url']; }
      const xrefValue = (<div><span style={{color: 'red'}}>{isObsolete}</span> <a href={url}  rel="noreferrer noopener" target="_blank">{valueLiveCurie}</a></div>);
      rowCrossReferenceElements.push(<RowDisplaySimple key={`${fieldIndex} ${index}`} fieldName={fieldName} value={xrefValue} updatedFlag={updatedFlag} />); }
    return (<>{rowCrossReferenceElements}</>); }
  else { return null; } }

const RowDisplayCommentsCorrections = ({fieldIndex, fieldName, referenceJsonLive, referenceJsonDb}) => {
  if (fieldName in referenceJsonLive && referenceJsonLive[fieldName] !== null) {
    const rowCommentsCorrectionsElements = []
    for (const[index, comcorDict] of referenceJsonLive[fieldName].entries()) {
      let valueLiveCurie = comcorDict['curie']; let valueDbCurie = ''; let updatedFlagCurie = '';
      const url = '/Biblio/?action=display&referenceCurie=' + valueLiveCurie
      let valueLiveType = comcorDict['type']; let valueDbType = ''; let updatedFlagType = '';
      if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
           (typeof referenceJsonDb[fieldName][index]['curie'] !== 'undefined') ) {
             valueDbCurie = referenceJsonDb[fieldName][index]['curie'] }
      if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
           (typeof referenceJsonDb[fieldName][index]['type'] !== 'undefined') ) {
             valueDbType = referenceJsonDb[fieldName][index]['type'] }
      if (valueLiveCurie !== valueDbCurie) { updatedFlagCurie = 'updated'; }
      if (valueLiveType !== valueDbType) { updatedFlagType = 'updated'; }
      let updatedFlag = '';
      if ( (updatedFlagCurie === 'updated') || (updatedFlagType === 'updated') ) { updatedFlag = 'updated' }
      const comcorValue = (<div>{valueLiveType} <a href={url} rel="noreferrer noopener">{valueLiveCurie}</a></div>);
      rowCommentsCorrectionsElements.push(<RowDisplaySimple key={`${fieldIndex} ${index}`} fieldName={fieldName} value={comcorValue} updatedFlag={updatedFlag} />); }
    return (<>{rowCommentsCorrectionsElements}</>); }
  else { return null; } }

// processing directly from database 'comment_and_corrections' field, but data format does't work for RowEditor
// const RowDisplayCommentsCorrections = ({fieldIndex, fieldName, referenceJson, referenceJsonLive, referenceJsonDb}) => {
//   if ('comment_and_corrections' in referenceJson && referenceJson['comment_and_corrections'] !== null) {
//     const rowCommentsCorrectionsElements = []
//     const comcorDirections = ['to_references', 'from_references']
//     for (const direction of comcorDirections) {
//       for (const[index, comcorDict] of referenceJson['comment_and_corrections'][direction].entries()) {
//         let curieFieldInDict = (direction === 'to_references') ? 'reference_curie_to' : 'reference_curie_from';
//         let valueLiveCurie = comcorDict[curieFieldInDict]; let valueDbCurie = ''; let updatedFlagCurie = '';
//         const url = '/Biblio/?action=display&referenceCurie=' + valueLiveCurie
//         let valueLiveType = comcorDict['reference_comment_and_correction_type']; let valueDbType = ''; let updatedFlagType = '';
//         if ( (typeof referenceJsonDb[fieldName][direction][index] !== 'undefined') &&
//              (typeof referenceJsonDb[fieldName][direction][index][curieFieldInDict] !== 'undefined') ) {
//                valueDbCurie = referenceJsonDb[fieldName][direction][index][curieFieldInDict] }
//         if ( (typeof referenceJsonDb[fieldName][direction][index] !== 'undefined') &&
//              (typeof referenceJsonDb[fieldName][direction][index]['reference_comment_and_correction_type'] !== 'undefined') ) {
//                valueDbType = referenceJsonDb[fieldName][direction][index]['reference_comment_and_correction_type'] }
//         if (valueLiveCurie !== valueDbCurie) { updatedFlagCurie = 'updated'; }
//         if (valueLiveType !== valueDbType) { updatedFlagType = 'updated'; }
//         if (direction === 'from_references') {
//           valueLiveType = convertCommentCorrectionType(valueLiveType)
//           valueDbType = convertCommentCorrectionType(valueDbType) }
//         let updatedFlag = '';
//         if ( (updatedFlagCurie === 'updated') || (updatedFlagType === 'updated') ) { updatedFlag = 'updated' }
//         const comcorValue = (<div>{valueLiveType} <a href={url} rel="noreferrer noopener">{valueLiveCurie}</a></div>);
//         rowCommentsCorrectionsElements.push(<RowDisplaySimple key={`${fieldIndex} ${direction} ${index}`} fieldName={fieldName} value={comcorValue} updatedFlag={updatedFlag} />); } }
//     return (<>{rowCommentsCorrectionsElements}</>); }
//   else { return null; } }

const RowDisplayModReferenceTypes = ({fieldIndex, fieldName, referenceJsonLive, referenceJsonDb}) => {
  if ('mod_reference_types' in referenceJsonLive && referenceJsonLive['mod_reference_types'] !== null) {
    const rowModReferenceTypesElements = []
    for (const[index, modRefDict] of referenceJsonLive['mod_reference_types'].entries()) {
      let valueLiveSource = modRefDict['source']; let valueDbSource = ''; let updatedFlagSource = '';
      let valueLiveReferenceType = modRefDict['reference_type']; let valueDbReferenceType = ''; let updatedFlagReferenceType = '';
      if (typeof referenceJsonDb[fieldName][index]['source'] !== 'undefined') { valueDbSource = referenceJsonDb[fieldName][index]['source'] }
      if (typeof referenceJsonDb[fieldName][index]['reference_type'] !== 'undefined') { valueDbReferenceType = referenceJsonDb[fieldName][index]['reference_type'] }
      if (valueLiveSource !== valueDbSource) { updatedFlagSource = 'updated'; }
      if (valueLiveReferenceType !== valueDbReferenceType) { updatedFlagReferenceType = 'updated'; }
      rowModReferenceTypesElements.push(
        <Row key={`${fieldIndex} ${index}`} className="Row-general" xs={2} md={4} lg={6}>
          <Col className="Col-general Col-display Col-display-left">mod_reference_types</Col>
          <Col className={`Col-general Col-display ${updatedFlagSource} `} lg={{ span: 2 }}>{valueLiveSource}</Col>
          <Col className={`Col-general Col-display Col-display-right ${updatedFlagReferenceType} `} lg={{ span: 8 }}>{valueLiveReferenceType}</Col>
        </Row>); }
    return (<>{rowModReferenceTypesElements}</>); }
  else { return null; } }

const RowDisplayMeshTerms = ({fieldIndex, fieldName, referenceJsonLive, displayOrEditor}) => {
  const meshExpand = useSelector(state => state.biblio.meshExpand);
  let cssDisplayLeft = 'Col-display Col-display-left';
  let cssDisplay = 'Col-display';
  let cssDisplayRight = 'Col-display Col-display-right';
  if (displayOrEditor === 'editor') {
    cssDisplay = 'Col-editor-disabled';
    cssDisplayRight = 'Col-editor-disabled';
    cssDisplayLeft = ''; }
  if ('mesh_terms' in referenceJsonLive && referenceJsonLive['mesh_terms'] !== null) {

    const rowMeshTermsElements = []
    rowMeshTermsElements.push(<MeshExpandToggler key="meshExpandTogglerComponent" displayOrEditor={displayOrEditor} />);

    const sortableMeshTermElements = {};
    const meshTextArray = [];
    for (const[index, value] of referenceJsonLive['mesh_terms'].entries()) {
      let term = value['heading_term'];
      if (value['qualifier_term'] !== null) { term += ' ' + value['qualifier_term']; }
      const lcTerm = term.toLowerCase();
      if (meshExpand === 'detailed') {
        sortableMeshTermElements[lcTerm] = (
        <Row key={`${fieldIndex} ${index}`} className="Row-general" xs={2} md={4} lg={6}>
          <Col className={`Col-general ${cssDisplayLeft} `}>mesh_terms</Col>
          <Col className={`Col-general ${cssDisplay} `} lg={{ span: 5 }}>{value['heading_term']}</Col>
          <Col className={`Col-general ${cssDisplayRight} `} lg={{ span: 5 }}>{value['qualifier_term']}</Col>
        </Row>); }
      else {
        meshTextArray.push(term); } }

    if (meshExpand === 'detailed') {
      const sortedKeys = Object.keys(sortableMeshTermElements).sort();
      for (let i = 0; i < sortedKeys.length; i++) {
        rowMeshTermsElements.push(sortableMeshTermElements[sortedKeys[i]]); } }
    else {
      const meshText = (<span dangerouslySetInnerHTML={{__html: meshTextArray.sort(function (a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); }).join('; ')}} />)
      rowMeshTermsElements.push(
        <Row key="meshTermsText" className="Row-general" xs={2} md={4} lg={6}>
          <Col className={`Col-general ${cssDisplayLeft}  `}>mesh_terms</Col>
          <Col className={`Col-general ${cssDisplayRight} `} lg={{ span: 10 }}>{meshText}</Col>
        </Row>); }

    return (<>{rowMeshTermsElements}</>); }
  else { return null; } }

const MeshExpandToggler = ({displayOrEditor}) => {
  const dispatch = useDispatch();
  const meshExpand = useSelector(state => state.biblio.meshExpand);
  let cssDisplayLeft = 'Col-display Col-display-left';
//   let cssDisplay = 'Col-display';
  let cssDisplayRight = 'Col-display Col-display-right';
  if (displayOrEditor === 'editor') {
//     cssDisplay = 'Col-editor-disabled';
    cssDisplayRight = 'Col-editor-disabled';
    cssDisplayLeft = ''; }
  let shortChecked = '';
  let detailedChecked = '';
  if (meshExpand === 'short') { shortChecked = 'checked'; }
    else { detailedChecked = 'checked'; }
  return (
    <Row key="meshExpandTogglerRow" className="Row-general" xs={2} md={4} lg={6}>
      <Col className={`Col-general ${cssDisplayLeft}  `}>mesh_terms</Col>
      <Col className={`Col-general ${cssDisplayRight} `} lg={{ span: 10 }}>
        <Form.Check
          inline
          checked={shortChecked}
          type='radio'
          label='short'
          id='biblio-mesh-expand-toggler-short'
          onChange={(e) => dispatch(changeBiblioMeshExpandToggler(e))}
        />
        <Form.Check
          inline
          checked={detailedChecked}
          type='radio'
          label='detailed'
          id='biblio-mesh-expand-toggler-detailed'
          onChange={(e) => dispatch(changeBiblioMeshExpandToggler(e))}
        />
      </Col>
    </Row>);
} // const MeshExpandToggler

const RowDisplayAuthors = ({fieldIndex, fieldName, referenceJsonLive, referenceJsonDb}) => {
  // e.g. orcid/affiliations PMID:24895670   affiliations PMID:24913562   out of order PMID:33766856
  const authorExpand = useSelector(state => state.biblio.authorExpand);
  if ('authors' in referenceJsonLive && referenceJsonLive['authors'] !== null) {
    const rowAuthorElements = [];
    rowAuthorElements.push(<AuthorExpandToggler key="authorExpandTogglerComponent" displayOrEditor="display" />);
    const orderedAuthorsLive = []; const orderedAuthorsDb = [];
    for (const value  of referenceJsonLive['authors'].values()) {
      let index = value['order'] - 1;
      if (index < 0) { index = 0 }	// temporary fix for fake authors have an 'order' field value of 0
      orderedAuthorsLive[index] = value; }
    for (const value  of referenceJsonDb['authors'].values()) {
      let index = value['order'] - 1;
      if (index < 0) { index = 0 }	// temporary fix for fake authors have an 'order' field value of 0
      orderedAuthorsDb[index] = value; }

    if (authorExpand === 'first') {
      if ((orderedAuthorsLive.length > 0) && (typeof orderedAuthorsLive[0] !== 'undefined') && ('name' in orderedAuthorsLive[0])) {
        rowAuthorElements.push(
          <Row key="author first" className="Row-general" xs={2} md={4} lg={6}>
            <Col className="Col-general Col-display Col-display-left">first author</Col>
            <Col className="Col-general Col-display Col-display-right" lg={{ span: 10 }}><div>{orderedAuthorsLive[0]['name']}</div></Col>
          </Row>); } }
    else if (authorExpand === 'list') {
      let authorNames = orderedAuthorsLive.map((dict, index) => ( dict['name'] )).join('; ');
      rowAuthorElements.push(
        <Row key="author list" className="Row-general" xs={2} md={4} lg={6}>
          <Col className="Col-general Col-display Col-display-left">all authors</Col>
          <Col className="Col-general Col-display Col-display-right" lg={{ span: 10 }}><div>{authorNames}</div></Col>
        </Row>); }
    else if (authorExpand === 'detailed') {
      for (const [index, value]  of orderedAuthorsLive.entries()) {
        let updatedFlagAuthor = '';
        if (typeof value === 'undefined') { continue; }
        let orcid_curie = '';
        let orcid_url = '';
        if ('orcid' in value && value['orcid'] !== null) {
          if (value['orcid']['curie'] && value['orcid']['curie'] !== null) {
            orcid_curie = value['orcid']['curie'].toUpperCase();
            if (!( orcid_curie.match(/^ORCID:(.*)$/) ) ) {
              orcid_curie = 'ORCID:' + orcid_curie; } }
          orcid_url = value['orcid']['url'] || ''; }
        let affiliations = []; let affiliationsJoined = '';
        if ('affiliations' in value && value['affiliations'] !== null) {
          affiliationsJoined = (value['affiliations'].length > 0) ? value['affiliations'].join('') : '';
          for (const index_aff in value['affiliations']) {
            affiliations.push(<div key={`index_aff ${index_aff}`} className="affiliation">- {value['affiliations'][index_aff]}</div>); } }
        let orcid_link = (orcid_url === '') ? (<span>{orcid_curie}</span>) : (<a href={orcid_url}  rel="noreferrer noopener" target="_blank">{orcid_curie}</a>)

        if (orderedAuthorsDb[index] !== undefined) {
          if ('orcid' in orderedAuthorsDb[index] && orderedAuthorsDb[index]['orcid'] !== null && 'curie' in orderedAuthorsDb[index]['orcid'] &&
              'ORCID:' + splitCurie(orderedAuthorsDb[index]['orcid']['curie'], 'id') !== orcid_curie) { updatedFlagAuthor = 'updated'; }
          if ('name' in orderedAuthorsDb[index] && orderedAuthorsDb[index]['name'] !== value['name']) { updatedFlagAuthor = 'updated'; }
          if ('affiliations' in orderedAuthorsDb[index] && orderedAuthorsDb[index]['affiliations'] &&
              orderedAuthorsDb[index]['affiliations'].join('') !== affiliationsJoined) { updatedFlagAuthor = 'updated'; }
        }
        rowAuthorElements.push(
          <Row key={`author ${index}`} className="Row-general" xs={2} md={4} lg={6}>
            <Col className="Col-general Col-display Col-display-left">author {value['order']}</Col>
            <Col className={`Col-general Col-display ${updatedFlagAuthor} `} lg={{ span: 10 }}><div key={`author ${index}`}>{value['name']} {orcid_link}{affiliations}</div></Col>
          </Row>); } }
    return (<>{rowAuthorElements}</>); }
  else { return null; }
} // const RowDisplayAuthors

//             <Col className="Col-general Col-display " lg={{ span: 10 }}><div key={`author ${index}`}>{value['name']} <a href={orcid_url}  rel="noreferrer noopener" target="_blank">{orcid_curie}</a>{affiliations}</div></Col>

const AuthorExpandToggler = ({displayOrEditor}) => {
  const dispatch = useDispatch();
  const authorExpand = useSelector(state => state.biblio.authorExpand);
  let cssDisplayLeft = 'Col-display Col-display-left';
  let cssDisplayRight = 'Col-display Col-display-right';
  if (displayOrEditor === 'editor') {
    cssDisplayRight = 'Col-editor-disabled';
    cssDisplayLeft = ''; }
  let firstChecked = '';
  let listChecked = '';
  let detailedChecked = '';
  if (authorExpand === 'first') { firstChecked = 'checked'; }
    else if (authorExpand === 'list') { listChecked = 'checked'; }
    else { detailedChecked = 'checked'; }
  return (
    <Row key="authorExpandTogglerRow" className="Row-general" xs={2} md={4} lg={6}>
      <Col className={`Col-general ${cssDisplayLeft}  `}>authors</Col>
      <Col className={`Col-general ${cssDisplayRight} `} lg={{ span: 10 }}>
        <Form.Check
          inline
          checked={firstChecked}
          type='radio'
          label='first'
          id='biblio-author-expand-toggler-first'
          onChange={(e) => dispatch(changeBiblioAuthorExpandToggler(e))}
        />
        <Form.Check
          inline
          checked={listChecked}
          type='radio'
          label='list'
          id='biblio-author-expand-toggler-list'
          onChange={(e) => dispatch(changeBiblioAuthorExpandToggler(e))}
        />
        <Form.Check
          inline
          checked={detailedChecked}
          type='radio'
          label='detailed'
          id='biblio-author-expand-toggler-detailed'
          onChange={(e) => dispatch(changeBiblioAuthorExpandToggler(e))}
        />
      </Col>
    </Row>);
} // const AuthorExpandToggler


const BiblioEntity = () => {
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const referenceJsonDb = useSelector(state => state.biblio.referenceJsonDb);
  if (!('date_created' in referenceJsonLive)) { 
    let message = 'No AGR Reference Curie found';
    if ('detail' in referenceJsonLive) { message = referenceJsonLive['detail']; }
    return(<>{message}</>); }
  const rowOrderedElements = []
  rowOrderedElements.push(<RowDisplayString key="title" fieldName="title" referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />);
  rowOrderedElements.push(<RowDisplayString key="abstract" fieldName="abstract" referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />);
  rowOrderedElements.push(<GeneAutocomplete />);
  return (<Container>{rowOrderedElements}</Container>);
} // const BiblioEntity

const GeneAutocomplete = () => {
  const dispatch = useDispatch();
  const value = useSelector(state => state.biblio.entityStuff.genetextarea);
  const geneStringList = useSelector(state => state.biblio.entityStuff.geneStringList);
  const geneStringsJoined = (geneStringList) ? geneStringList.join("\n") : '';
//   let dispatchAction={changeFieldReferenceJson};
  return (
    <Row className="form-group row" >
      <Col className="form-label col-form-label" sm="6" >
        <Form.Control as="textarea" id="genetextarea" type="genetextarea" value={value} onChange={(e) => dispatch(changeFieldEntityGeneList(e))} />
      </Col>
      <Col sm="6" ><Form.Control as="textarea" id="geneStrings" disabled="disabled" value={geneStringsJoined} /></Col>
    </Row>);
//   return null;
//               <Form.Control as={fieldType} id={fieldKey} type="{fieldName}" value={value} className={`form-control ${updatedFlag}`} disabled={disabled} placeholder={placeholder} onChange={(e) => dispatch(dispatchAction(e))} />
//   let colEditorElement = (<ColEditorSimple key={`colElement ${fieldName}`} fieldType={fieldType} fieldName={fieldName} colSize={otherColSize} value={valueLive} updatedFlag={updatedFlag} placeholder={fieldName} disabled={disabled} fieldKey={fieldName} dispatchAction={changeFieldReferenceJson} />)
}


const BiblioDisplay = () => {
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const referenceJsonDb = useSelector(state => state.biblio.referenceJsonDb);
  if (!('date_created' in referenceJsonLive)) { 
    let message = 'No AGR Reference Curie found';
    if ('detail' in referenceJsonLive) { message = referenceJsonLive['detail']; }
    return(<>{message}</>); }
  const rowOrderedElements = []
  for (const [fieldIndex, fieldName] of fieldsOrdered.entries()) {
    if (fieldName === 'DIVIDER') {
        rowOrderedElements.push(<RowDivider key={fieldIndex} />); }
    else if (fieldsSimple.includes(fieldName)) {
        rowOrderedElements.push(<RowDisplayString key={fieldName} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />); }
    else if (fieldsArrayString.includes(fieldName)) {
      rowOrderedElements.push(<RowDisplayArrayString key={`RowDisplayArrayString ${fieldName}`} fieldIndex={fieldIndex} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />); }
    else if (fieldName === 'mod_corpus_associations') {
      rowOrderedElements.push(<RowDisplayModAssociation key="RowDisplayModAssociation" fieldIndex={fieldIndex} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />); }
    else if (fieldName === 'cross_references') {
      rowOrderedElements.push(<RowDisplayCrossReferences key="RowDisplayCrossReferences" fieldIndex={fieldIndex} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />); }
    else if (fieldName === 'corrections') {
      rowOrderedElements.push(<RowDisplayCommentsCorrections key="RowDisplayCommentsCorrections" fieldIndex={fieldIndex} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />); }
    else if (fieldName === 'mod_reference_types') {
      rowOrderedElements.push(<RowDisplayModReferenceTypes key="RowDisplayModReferenceTypes" fieldIndex={fieldIndex} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />); }
    else if (fieldName === 'mesh_terms') {
      rowOrderedElements.push(<RowDisplayMeshTerms key="RowDisplayMeshTerms" fieldIndex={fieldIndex} fieldName={fieldName} referenceJsonLive={referenceJsonLive} displayOrEditor="display" />); }
    else if (fieldName === 'authors') {
      rowOrderedElements.push(<RowDisplayAuthors key="RowDisplayAuthors" fieldIndex={fieldIndex} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />); }
  } // for (const [fieldIndex, fieldName] of fieldsOrdered.entries())

  return (<Container><BiblioSubmitUpdateRouter />{rowOrderedElements}</Container>);
} // const BiblioDisplay

const BiblioSubmitUpdateRouter = () => {
  const biblioUpdating = useSelector(state => state.biblio.biblioUpdating);

  if (biblioUpdating > 0) {
    return (<BiblioSubmitUpdating />); }
  else {
    return (<><AlertDismissibleBiblioUpdate /><BiblioSubmitUpdateButton /></>); }
} // const BiblioSubmitUpdateRouter

const AlertDismissibleBiblioUpdate = () => {
  const dispatch = useDispatch();
  const updateAlert = useSelector(state => state.biblio.updateAlert);
  const updateFailure = useSelector(state => state.biblio.updateFailure);
  const updateMessages = useSelector(state => state.biblio.updateMessages);
  let variant = 'danger';
  let header = 'Update Failure';
  if (updateFailure === 0) {
    header = 'Update Success';
    variant = 'success'; }
  else {
    header = 'Update Failure';
    variant = 'danger'; }
  if (updateAlert) {
    if (updateFailure === 0) {
      setTimeout(() => {
        dispatch(closeBiblioUpdateAlert())
      }, 2000) }
    return (
      <Alert variant={variant} onClose={() => dispatch(closeBiblioUpdateAlert())} dismissible>
        <Alert.Heading>{header}</Alert.Heading>
        {updateMessages.map((message, index) => (
          <div key={`${message} ${index}`}>{message}</div>
        ))}
      </Alert>
    );
  } else { return null; }
}


const BiblioSubmitUpdating = () => {
  return (
       <Row className="form-group row" >
         <Col className="form-label col-form-label" sm="2" ></Col>
         <Col sm="10" ><div className="form-control biblio-updating" >updating Biblio data</div></Col>
       </Row>
  );
}

const BiblioSubmitUpdateButton = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const referenceJsonDb = useSelector(state => state.biblio.referenceJsonDb);
  const referenceJsonHasChange = useSelector(state => state.biblio.referenceJsonHasChange);
  let updatedFlag = '';
  if (Object.keys(referenceJsonHasChange).length > 0) { updatedFlag = 'updated-biblio-button'; }

  function generateCrossReferenceUpdateJson(crossRefDict, referenceCurie) {
    let crossRefCurie = crossRefDict['curie']
    let hasPages = false
    let updateJson = { 'reference_curie': referenceCurie }
    if (('curie' in crossRefDict) && (crossRefDict['curie'] !== '')) {
      // let [valueLiveCuriePrefix, valueLiveCurieId] = splitCurie(crossRefCurie);
      let valueLiveCuriePrefix = splitCurie(crossRefCurie, 'prefix');
      hasPages = (enumDict['mods'].includes(valueLiveCuriePrefix)) ? true : false; }
    if (hasPages) { updateJson['pages'] = [ 'reference' ] }
    if (('is_obsolete' in crossRefDict) && (crossRefDict['is_obsolete'] !== '')) {
      updateJson['is_obsolete'] = crossRefDict['is_obsolete'] }
    return updateJson }

  function updateBiblio(referenceCurie, referenceJsonLive) {
    // console.log('updateBiblio')
    const forApiArray = []
    let updateJson = {}
    const fieldsSimpleNotPatch = ['reference_id', 'curie', 'resource_curie', 'resource_title'];
    for (const field of fieldsSimple.values()) {
      if ((field in referenceJsonLive) && !(fieldsSimpleNotPatch.includes(field)) && !(fieldsDisplayOnly.includes(field))) {
        updateJson[field] = referenceJsonLive[field] } }
    const fieldsArrayStringNotPatch = ['obsolete_references'];
    for (const field of fieldsArrayString.values()) {
      if ((field in referenceJsonLive) && !(fieldsArrayStringNotPatch.includes(field)) && !(fieldsDisplayOnly.includes(field))) {
        updateJson[field] = referenceJsonLive[field] } }
    let subPath = 'reference/' + referenceCurie;
    let array = [ subPath, updateJson, 'PATCH', 0, null, null]
    forApiArray.push( array );

    if ('mod_reference_types' in referenceJsonLive && referenceJsonLive['mod_reference_types'] !== null) {
      const modRefFields = [ 'reference_type', 'source' ];
      for (const[index, modRefDict] of referenceJsonLive['mod_reference_types'].entries()) {
        if (('needsChange' in modRefDict) && ('mod_reference_type_id' in modRefDict)) {
          let updateJson = { 'reference_curie': referenceCurie }
          for (const field of modRefFields.values()) {
            if (field in modRefDict) {
              updateJson[field] = modRefDict[field] } }
          let subPath = 'reference/mod_reference_type/';
          let method = 'POST';
          let field = 'mod_reference_types';
          let subField = 'mod_reference_type_id';
          if (modRefDict['mod_reference_type_id'] !== 'new') {
            subPath = 'reference/mod_reference_type/' + modRefDict['mod_reference_type_id'];
            field = null;
            subField = null;
            method = 'PATCH' }
          let array = [ subPath, updateJson, method, index, field, subField ]
          forApiArray.push( array );
    } } }

    if ('authors' in referenceJsonLive && referenceJsonLive['authors'] !== null) {
      const authorFields = [ 'order', 'name', 'first_name', 'last_name', 'orcid', 'first_author', 'corresponding_author', 'affiliations' ];
      for (const[index, authorDict] of referenceJsonLive['authors'].entries()) {
        if (('needsChange' in authorDict) && ('author_id' in authorDict)) {
          let updateJson = { 'reference_curie': referenceCurie }
          for (const field of authorFields.values()) {
            if (field in authorDict) {
              updateJson[field] = authorDict[field]
              if (field === 'orcid') {		// orcids just pass the orcid string, not the whole dict
                let orcidValue = null;
                if ( (authorDict['orcid'] !== null) && ('curie' in authorDict['orcid']) && 
                     (authorDict['orcid']['curie'] !== null) && (authorDict['orcid']['curie'] !== '') ) {
                  orcidValue = authorDict['orcid']['curie'].toUpperCase();
                  if (!( orcidValue.match(/^ORCID:(.*)$/) ) ) {
                    orcidValue = 'ORCID:' + orcidValue; } }
                updateJson['orcid'] = orcidValue; } } }
          let subPath = 'author/';
          let method = 'POST';
          let field = 'authors';
          let subField = 'author_id';
          if (authorDict['author_id'] !== 'new') {
            subPath = 'author/' + authorDict['author_id'];
            field = null;
            subField = null;
            method = 'PATCH' }
          let array = [ subPath, updateJson, method, index, field, subField ]
          forApiArray.push( array );
    } } }

    if ('corrections' in referenceJsonLive && referenceJsonLive['corrections'] !== null) {
      let field = 'corrections';
      let comcorMapping = {}
      comcorMapping['HasComment'] = 'CommentOn'
      comcorMapping['HasErratum'] = 'ErratumFor'
      comcorMapping['HasExpressionOfConcernFor'] = 'ExpressionOfConcernFor'
      comcorMapping['HasReprint'] = 'ReprintOf'
      comcorMapping['RepublishedIn'] = 'RepublishedFrom'
      comcorMapping['HasRetraction'] = 'RetractionOf'
      comcorMapping['HasUpdate'] = 'UpdateOf'
      for (const[index, comcorDict] of referenceJsonLive['corrections'].entries()) {
        if ('needsChange' in comcorDict) {
          let fromCurie = referenceCurie
          let toCurie = comcorDict['curie']
          let comcorType = comcorDict['type']
          if (comcorType in comcorMapping) {
            toCurie = referenceCurie
            fromCurie = comcorDict['curie']
            comcorType = comcorMapping[comcorType] }
          let apiJson = {'reference_curie_from': fromCurie, 'reference_curie_to': toCurie, 'reference_comment_and_correction_type': comcorType}
          let method = 'POST'
          let subPath = 'reference_comment_and_correction/'
          if (('reference_comment_and_correction_id' in comcorDict) && 
              (comcorDict['reference_comment_and_correction_id'] !== 'new')) {	// whole new entries needs create
            method = 'PATCH'
            subPath = 'reference_comment_and_correction/' + comcorDict['reference_comment_and_correction_id'] }
          if (comcorType === '') {
            method = 'DELETE'
            apiJson = null }
          let array = [ subPath, apiJson, method, index, field, null ]
          forApiArray.push( array );
    } } }

    if ('mod_corpus_associations' in referenceJsonLive && referenceJsonLive['mod_corpus_associations'] !== null) {
      const modAssociationFields = [ 'mod_abbreviation', 'corpus', 'mod_corpus_sort_source' ];
      for (const[index, modAssociationDict] of referenceJsonLive['mod_corpus_associations'].entries()) {
//         if ('needsChange' in modAssociationDict) { console.log('needsChange') }
//         if ('mod_corpus_association_id' in modAssociationDict) { console.log('mod_corpus_association_id') }
        if (('needsChange' in modAssociationDict) && ('mod_corpus_association_id' in modAssociationDict)) {
//           console.log('both')
          let updateJson = { 'reference_curie': referenceCurie }
          for (const field of modAssociationFields.values()) {
            if (field in modAssociationDict) {
              let fieldValue = modAssociationDict[field]
              if (field === 'corpus') {
                if      (fieldValue === 'needs_review')   { fieldValue = null; }
                else if (fieldValue === 'inside_corpus')  { fieldValue = true; }
                else if (fieldValue === 'outside_corpus') { fieldValue = false; } }
              updateJson[field] = fieldValue } }
          let subPath = 'reference/mod_corpus_association/';
          let method = 'POST';
          let field = 'mod_corpus_associations';
          let subField = 'mod_corpus_association_id';
          if (modAssociationDict['mod_corpus_association_id'] !== 'new') {
            subPath = 'reference/mod_corpus_association/' + modAssociationDict['mod_corpus_association_id'];
            field = null;
            subField = null;
            method = 'PATCH' }
          let array = [ subPath, updateJson, method, index, field, subField ]
// comment these out when the endpoint allows null corpus to mean needs_review
          console.log(updateJson)
          console.log(array)
          forApiArray.push( array );
    } } }

    if ('cross_references' in referenceJsonLive && referenceJsonLive['cross_references'] !== null) {
      // const crossRefFields = [ 'curie', 'is_obsolete' ];
      let field = 'cross_references';
      for (const[index, crossRefDict] of referenceJsonLive['cross_references'].entries()) {
        if ('needsChange' in crossRefDict) {
          let needsCreate = false
          if ('cross_reference_id' in crossRefDict) {		// whole new entries needs create
            needsCreate = true }
          else if ('curie' in crossRefDict) {			// pre-existing entries need delete or update
            let crossRefCurieDb = referenceJsonDb[field][index]['curie']
            let crossRefCurieLive = crossRefDict['curie']
            let subPath = 'cross_reference/' + referenceJsonDb[field][index]['curie']
            if ( crossRefCurieLive !== crossRefCurieDb ) {	// xref curie has changed, delete+create
              needsCreate = true
              let array = [ subPath, null, 'DELETE', index, field, null ]
              forApiArray.push( array ); }
            else {	// xref curie same, update (delete+create async would cause create failure before delete
              let updateJson = generateCrossReferenceUpdateJson(crossRefDict, referenceCurie)
              // console.log('updateJson'); console.log(updateJson)
              let array = [ subPath, updateJson, 'PATCH', index, field, null ]
              forApiArray.push( array ); } }
          if ((needsCreate === true) && ('curie' in crossRefDict) && (crossRefDict['curie'] !== '')) {
            let createJson = generateCrossReferenceUpdateJson(crossRefDict, referenceCurie)
            createJson['curie'] = crossRefDict['curie']		// createJson is same as updateJson + crossRef curie
            // console.log('createJson'); console.log(createJson)
            let subPath = 'cross_reference/'
            let array = [ subPath, createJson, 'POST', index, field, null ]
            forApiArray.push( array ); }
    } } }

    let dispatchCount = forApiArray.length;

    // console.log('dispatchCount ' + dispatchCount)
    dispatch(setBiblioUpdating(dispatchCount))

    // set flag to update citation once all these api calls are done
    dispatch(setUpdateCitationFlag(true))

    for (const arrayData of forApiArray.values()) {
      arrayData.unshift(accessToken)
      dispatch(updateButtonBiblio(arrayData))
    }
    // console.log('end updateBiblio')
  } // function updateBiblio(referenceCurie, referenceJsonLive)

  return (
       <Row className="form-group row" >
         <Col className="form-label col-form-label" sm="2" ></Col>
         <Col sm="10" ><div className={`form-control biblio-button ${updatedFlag}`} type="submit" onClick={() => updateBiblio(referenceJsonLive.curie, referenceJsonLive)}>Update Biblio Data</div></Col>
       </Row>
  );
} // const BiblioSubmitUpdateButton


const ColEditorSimple = ({fieldType, fieldName, value, colSize, updatedFlag, disabled, placeholder, fieldKey, dispatchAction}) => {
  const dispatch = useDispatch();
  if (value === null) { value = '' }
  return (  <Col sm={colSize}>
              <Form.Control as={fieldType} id={fieldKey} type="{fieldName}" value={value} className={`form-control ${updatedFlag}`} disabled={disabled} placeholder={placeholder} onChange={(e) => dispatch(dispatchAction(e))} />
            </Col>); }

const ColEditorSelect = ({fieldType, fieldName, value, colSize, updatedFlag, disabled, placeholder, fieldKey, dispatchAction, enumType}) => {
  const dispatch = useDispatch();
  return (  <Col sm={colSize}>
              <Form.Control as={fieldType} id={fieldKey} type="{fieldName}" value={value} className={`form-control ${updatedFlag}`} disabled={disabled} placeholder={placeholder} onChange={(e) => dispatch(dispatchAction(e))} >
                {enumType in enumDict && enumDict[enumType].map((optionValue, index) => (
                  <option key={`${fieldKey} ${optionValue}`}>{optionValue}</option>
                ))}
              </Form.Control>
            </Col>); }

const ColEditorSelectNumeric = ({fieldType, fieldName, value, colSize, updatedFlag, disabled, placeholder, fieldKey, dispatchAction, minNumber, maxNumber}) => {
  const dispatch = useDispatch();
  const numericOptionElements = []
  for (let i = minNumber; i <= maxNumber; i++) {
    numericOptionElements.push(<option key={`${fieldKey} ${i}`}>{i}</option>) }
  return (  <Col sm={colSize}>
              <Form.Control as={fieldType} id={fieldKey} type="{fieldName}" value={value} className={`form-control ${updatedFlag}`} disabled={disabled} placeholder={placeholder} onChange={(e) => dispatch(dispatchAction(e))} >
              {numericOptionElements}
              </Form.Control>
            </Col>); }

const ColEditorCheckbox = ({colSize, label, updatedFlag, disabled, fieldKey, checked, dispatchAction}) => {
  const dispatch = useDispatch();
  return (  <Col sm={colSize} className={`Col-checkbox ${updatedFlag}`} >
              <Form.Check inline className={`ColEditorCheckbox`} checked={checked} disabled={disabled} type='checkbox' label={label} id={fieldKey} onChange={(e) => dispatch(dispatchAction(e))} />
            </Col>); }

const RowEditorString = ({fieldName, referenceJsonLive, referenceJsonDb}) => {
  const dispatch = useDispatch();
  const hasPmid = useSelector(state => state.biblio.hasPmid);
  let disabled = ''
  if (hasPmid && (fieldsPubmed.includes(fieldName))) { disabled = 'disabled'; }
  if (fieldsDisplayOnly.includes(fieldName)) { disabled = 'disabled'; }
  let valueLive = ''; let valueDb = ''; let updatedFlag = '';
  if (fieldName in referenceJsonDb) { valueDb = referenceJsonDb[fieldName] }
  if (fieldName in referenceJsonLive) { valueLive = referenceJsonLive[fieldName] }
  if (fieldName === 'citation') {
    valueDb = aggregateCitation(referenceJsonDb)
    valueLive = aggregateCitation(referenceJsonLive) }
  if (valueLive !== valueDb) { updatedFlag = 'updated'; }
  valueLive = valueLive || '';
  let fieldType = 'input';
  if (fieldName in fieldTypeDict) { fieldType = fieldTypeDict[fieldName] }
  let otherColSize = 9;
  let revertElement = (<Col sm="1"><Button id={`revert ${fieldName}`} variant="outline-secondary" onClick={(e) => dispatch(biblioRevertField(e))} ><FontAwesomeIcon icon={faUndo} /></Button>{' '}</Col>);
  if (disabled === 'disabled') { revertElement = (<></>); otherColSize = 10; }
  let colEditorElement = (<ColEditorSimple key={`colElement ${fieldName}`} fieldType={fieldType} fieldName={fieldName} colSize={otherColSize} value={valueLive} updatedFlag={updatedFlag} placeholder={fieldName} disabled={disabled} fieldKey={fieldName} dispatchAction={changeFieldReferenceJson} />)
  if (fieldType === 'select') {
    colEditorElement = (<ColEditorSelect key={`colElement ${fieldName}`} fieldType={fieldType} fieldName={fieldName} colSize={otherColSize} value={valueLive} updatedFlag={updatedFlag} disabled={disabled} fieldKey={fieldName} dispatchAction={changeFieldReferenceJson} enumType={fieldName} />) }
  return ( <Form.Group as={Row} key={fieldName} >
             <Form.Label column sm="2" className={`Col-general`} >{fieldName}</Form.Label>
             {colEditorElement}
             {revertElement}
           </Form.Group>);
} // const RowEditorString

const RowEditorArrayString = ({fieldIndex, fieldName, referenceJsonLive, referenceJsonDb}) => {
  const dispatch = useDispatch();
  const hasPmid = useSelector(state => state.biblio.hasPmid);
  let disabled = ''
  if (hasPmid && (fieldsPubmed.includes(fieldName))) { disabled = 'disabled'; }
  if (fieldsDisplayOnly.includes(fieldName)) { disabled = 'disabled'; }
  const rowArrayStringElements = []
  if (fieldName in referenceJsonLive && referenceJsonLive[fieldName] !== null) {	// need this because referenceJsonLive starts empty before values get added
      let fieldType = 'input';
      for (const [index, valueLive] of referenceJsonLive[fieldName].entries()) {
        let otherColSize = 9;
        let revertElement = (<Col sm="1"><Button id={`revert ${fieldName} ${index}`} variant="outline-secondary" onClick={(e) => dispatch(biblioRevertFieldArray(e))} ><FontAwesomeIcon icon={faUndo} /></Button>{' '}</Col>);
        if (disabled === 'disabled') { revertElement = (<></>); otherColSize = 10; }
        let valueDb = ''; let updatedFlag = '';
        if (typeof referenceJsonDb[fieldName][index] !== 'undefined') { valueDb = referenceJsonDb[fieldName][index] }
        if (valueLive !== valueDb) { updatedFlag = 'updated'; }
//           <Form.Group as={Row} key={`${fieldName} ${index}`} controlId={`${fieldName} ${index}`}>
        rowArrayStringElements.push(
          <Form.Group as={Row} key={`${fieldName} ${index}`} >
            <Form.Label column sm="2" className="Col-general" >{fieldName}</Form.Label>
            <ColEditorSimple key={`colElement ${fieldName} ${index}`} fieldType={fieldType} fieldName={fieldName} colSize={otherColSize} value={valueLive} updatedFlag={updatedFlag} placeholder={fieldName} disabled={disabled} fieldKey={`${fieldName} ${index}`} dispatchAction={changeFieldArrayReferenceJson} />
            {revertElement}
          </Form.Group>); } }
  if (disabled === '') {
    rowArrayStringElements.push(
      <Row className="form-group row" key={fieldName} >
        <Col className="Col-general form-label col-form-label" sm="2" >{fieldName}</Col>
        <Col sm="10" ><div id={fieldName} className="form-control biblio-button" onClick={(e) => dispatch(biblioAddNewRowString(e))} >add {fieldName}</div></Col>
      </Row>);
  }
  return (<>{rowArrayStringElements}</>); }

const RowEditorModReferenceTypes = ({fieldIndex, fieldName, referenceJsonLive, referenceJsonDb}) => {
  const dispatch = useDispatch();
  const hasPmid = useSelector(state => state.biblio.hasPmid);
//   const revertDictFields = 'source, reference_type'
  const initializeDict = {'source': '', 'reference_type': '', 'mod_reference_type_id': 'new'}
  let disabled = ''
  if (hasPmid && (fieldsPubmed.includes(fieldName))) { disabled = 'disabled'; }
  if (fieldsDisplayOnly.includes(fieldName)) { disabled = 'disabled'; }
  const rowModReferenceTypesElements = []
  if ('mod_reference_types' in referenceJsonLive && referenceJsonLive['mod_reference_types'] !== null) {
//     let fieldType = 'input';
//     if (fieldName in fieldTypeDict) { fieldType = fieldTypeDict[fieldName] }
    for (const[index, modRefDict] of referenceJsonLive['mod_reference_types'].entries()) {
      let otherColSize = 5;
//       let revertElement = (<Col sm="1"><Button id={`revert ${fieldName} ${index}`} variant="outline-secondary" value={revertDictFields} onClick={(e) => dispatch(biblioRevertFieldArray(e))} ><FontAwesomeIcon icon={faUndo} /></Button>{' '}</Col>);
      let revertElement = (<Col sm="1"><Button id={`revert ${fieldName} ${index}`} variant="outline-secondary" onClick={(e) => dispatch(biblioRevertFieldArray(e))} ><FontAwesomeIcon icon={faUndo} /></Button>{' '}</Col>);
      if (disabled === 'disabled') { revertElement = (<></>); otherColSize = 6; }
      let valueLiveSource = modRefDict['source']; let valueDbSource = ''; let updatedFlagSource = '';
      let valueLiveReferenceType = modRefDict['reference_type']; let valueDbReferenceType = ''; let updatedFlagReferenceType = '';
      if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
           (typeof referenceJsonDb[fieldName][index]['source'] !== 'undefined') ) {
             valueDbSource = referenceJsonDb[fieldName][index]['source'] }
      if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
           (typeof referenceJsonDb[fieldName][index]['reference_type'] !== 'undefined') ) {
             valueDbReferenceType = referenceJsonDb[fieldName][index]['reference_type'] }
      if (valueLiveSource !== valueDbSource) { updatedFlagSource = 'updated'; }
      if (valueLiveReferenceType !== valueDbReferenceType) { updatedFlagReferenceType = 'updated'; }
      rowModReferenceTypesElements.push(
        <Form.Group as={Row} key={`${fieldName} ${index}`}>
          <Col className="Col-general form-label col-form-label" sm="2" >{fieldName}</Col>
          <ColEditorSelect key={`colElement ${fieldName} ${index} source`} fieldType="select" fieldName={fieldName} colSize="4" value={valueLiveSource} updatedFlag={updatedFlagSource} placeholder="source" disabled={disabled} fieldKey={`${fieldName} ${index} source`} enumType="mods" dispatchAction={changeFieldModReferenceReferenceJson} />
          <ColEditorSimple key={`colElement ${fieldName} ${index} reference_type`} fieldType="input" fieldName={fieldName} colSize={otherColSize} value={valueLiveReferenceType} updatedFlag={updatedFlagReferenceType} placeholder="reference_type" disabled={disabled} fieldKey={`${fieldName} ${index} reference_type`} dispatchAction={changeFieldModReferenceReferenceJson} />
          {revertElement}
        </Form.Group>); } }
  if (disabled === '') {
    rowModReferenceTypesElements.push(
      <Row className="form-group row" key={fieldName} >
        <Col className="Col-general form-label col-form-label" sm="2" >{fieldName}</Col>
        <Col sm="10" ><div id={fieldName} className="form-control biblio-button" onClick={(e) => dispatch(biblioAddNewRowDict(e, initializeDict))} >add {fieldName}</div></Col>
      </Row>);
  }
  return (<>{rowModReferenceTypesElements}</>); }

//           <Col sm={otherColSize}>
//               <Form.Control as={fieldType} id={`${fieldName} ${index} reference_type`} type="{fieldName}" value={valueLiveReferenceType} className={`form-control ${updatedFlagReferenceType}`} disabled={disabled} placeholder="reference_type" onChange={(e) => dispatch(changeFieldModReferenceReferenceJson(e))} />
//           </Col>

//         <Row key={`${fieldIndex} ${index}`} className="Row-general" xs={2} md={4} lg={6}>
//         </Row>); }

//                  <Form.Control as={fieldType} type="{fieldName}" value={value} disabled={disabled} placeholder={fieldName} onChange={(e) => dispatch(changeFieldReferenceJson(e))} >
//                    {fieldName in enumDict && enumDict[fieldName].map((optionValue, index) => (
//                      <option key={`${fieldName} ${optionValue}`}>{optionValue}</option>
//                    ))}
//                  </Form.Control>

//           <Col className="Col-general Col-display Col-display-left">mod_reference_types</Col>
//           <Col className="Col-general Col-display " lg={{ span: 2 }}>{value['source']}</Col>
//           <Col className="Col-general Col-display Col-display-right" lg={{ span: 8 }}>{value['reference_type']}</Col>

const RowEditorModAssociation = ({fieldIndex, fieldName, referenceJsonLive, referenceJsonDb}) => {
//   const xrefFieldName = fieldName;
//   fieldName = 'mod_corpus_associations';
  const dispatch = useDispatch();
//   const hasPmid = useSelector(state => state.biblio.hasPmid);
//   const revertDictFields = 'curie prefix, curie id, is_obsolete'
  const initializeDict = {'mod_abbreviation': '', 'corpus': 'needs_review', 'mod_corpus_sort_source': 'assigned_for_review', 'mod_corpus_association_id': 'new'}
  let disabled = ''
//   if (hasPmid && (fieldsPubmed.includes(fieldName))) { disabled = 'disabled'; }
//   if (fieldsDisplayOnly.includes(fieldName)) { disabled = 'disabled'; }
  const rowModAssociationElements = []

  if ('mod_corpus_associations' in referenceJsonLive && referenceJsonLive['mod_corpus_associations'] !== null) {
    for (const[index, modAssociationDict] of referenceJsonLive['mod_corpus_associations'].entries()) {
      let otherColSize = 3;
      let otherColSizeB = 4;
//       let revertElement = (<Col sm="1"><Button id={`revert ${fieldName} ${index}`} variant="outline-secondary" value={revertDictFields} onClick={(e) => dispatch(biblioRevertFieldArray(e))} ><FontAwesomeIcon icon={faUndo} /></Button>{' '}</Col>);
      let revertElement = (<Col sm="1"><Button id={`revert ${fieldName} ${index}`} variant="outline-secondary" onClick={(e) => dispatch(biblioRevertFieldArray(e))} ><FontAwesomeIcon icon={faUndo} /></Button>{' '}</Col>);
      if (disabled === 'disabled') { revertElement = (<></>); otherColSize = 8; }

      let valueLiveMod = modAssociationDict['mod_abbreviation']; let valueDbMod = ''; let updatedFlagMod = '';
      let valueLiveCorpus = modAssociationDict['corpus']; let valueDbCorpus = ''; let updatedFlagCorpus = '';
      let valueLiveSource = modAssociationDict['mod_corpus_sort_source']; let valueDbSource = ''; let updatedFlagSource = '';

        if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
             (typeof referenceJsonDb[fieldName][index]['mod_abbreviation'] !== 'undefined') ) {
               valueDbMod = referenceJsonDb[fieldName][index]['mod_abbreviation'] }
        if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
             (typeof referenceJsonDb[fieldName][index]['corpus'] !== 'undefined') ) {
               valueDbCorpus = referenceJsonDb[fieldName][index]['corpus'] }
        if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
             (typeof referenceJsonDb[fieldName][index]['mod_corpus_sort_source'] !== 'undefined') ) {
               valueDbSource = referenceJsonDb[fieldName][index]['mod_corpus_sort_source'] }
        if (valueLiveMod !== valueDbMod) { updatedFlagMod = 'updated'; }
        if (valueLiveCorpus !== valueDbCorpus) { updatedFlagCorpus = 'updated'; }
        if (valueLiveSource !== valueDbSource) { updatedFlagSource = 'updated'; }

// // In This Mock, a bunch of variables are not used, clean them up
//       let valueLiveCurie = crossRefDict['curie']; let valueDbCurie = '';
//       let updatedFlagCuriePrefix = ''; // let updatedFlagCurieId = '';
// //       let [valueLiveCuriePrefix, valueLiveCurieId] = splitCurie(valueLiveCurie);
//       let valueLiveCuriePrefix = splitCurie(valueLiveCurie, 'prefix');
// //       let valueLiveIsObsolete = crossRefDict['is_obsolete']; let valueDbIsObsolete = ''; let updatedFlagIsObsolete = '';
//       let valueLiveCorpus = crossRefDict['corpus']; let valueDbCorpus = ''; let updatedFlagCorpus = '';
//       let valueLiveSource = crossRefDict['source']; let valueDbSource = ''; let updatedFlagSource = '';
// 
//       if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
//            (typeof referenceJsonDb[fieldName][index]['curie'] !== 'undefined') ) {
//              valueDbCurie = referenceJsonDb[fieldName][index]['curie'] }
//       if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
//            (typeof referenceJsonDb[fieldName][index]['corpus'] !== 'undefined') ) {
//              valueDbCorpus = referenceJsonDb[fieldName][index]['corpus'] }
//       if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
//            (typeof referenceJsonDb[fieldName][index]['source'] !== 'undefined') ) {
//              valueDbSource = referenceJsonDb[fieldName][index]['source'] }
// //       let [valueDbCuriePrefix, valueDbCurieId] = splitCurie(valueDbCurie);
//       let valueDbCuriePrefix = splitCurie(valueDbCurie, 'prefix');
//       if (valueLiveCuriePrefix !== valueDbCuriePrefix) { updatedFlagCuriePrefix = 'updated'; }
// //       if (valueLiveCurieId !== valueDbCurieId) { updatedFlagCurieId = 'updated'; }
//       if (valueLiveCorpus !== valueDbCorpus) { updatedFlagCorpus = 'updated'; }
//       if (valueLiveSource !== valueDbSource) { updatedFlagSource = 'updated'; }

//       if (enumDict['mods'].includes(valueLiveCuriePrefix)) {
        rowModAssociationElements.push(
          <Form.Group as={Row} key={`${fieldName} ${index}`}>
            <Col className="Col-general form-label col-form-label" sm="2" >{fieldName} </Col>
            <ColEditorSelect key={`colElement ${fieldName} ${index} mod_abbreviation`} fieldType="select" fieldName={fieldName} colSize="2" value={valueLiveMod} updatedFlag={updatedFlagMod} placeholder="mod_abbreviation" disabled={disabled} fieldKey={`${fieldName} ${index} mod_abbreviation`} enumType="mods" dispatchAction={changeFieldModAssociationReferenceJson} />
            <ColEditorSelect key={`colElement ${fieldName} ${index} corpus`} fieldType="select" fieldName={fieldName} colSize={otherColSize} value={valueLiveCorpus} updatedFlag={updatedFlagCorpus} placeholder="corpus" disabled={disabled} fieldKey={`${fieldName} ${index} corpus`} enumType="modAssociationCorpus" dispatchAction={changeFieldModAssociationReferenceJson} />
            <ColEditorSelect key={`colElement ${fieldName} ${index} mod_corpus_sort_source`} fieldType="select" fieldName={fieldName} colSize={otherColSizeB} value={valueLiveSource} updatedFlag={updatedFlagSource} placeholder="mod_corpus_sort_source" disabled={disabled} fieldKey={`${fieldName} ${index} mod_corpus_sort_source`} enumType="modAssociationSource" dispatchAction={changeFieldModAssociationReferenceJson} />
            {revertElement}
          </Form.Group>); } } 
//           }
//             <ColEditorSimple key={`colElement ${fieldName} ${index} curieId`} fieldType="input" fieldName={fieldName} colSize={otherColSize} value={valueLiveCurieId} updatedFlag={updatedFlagCurieId} placeholder="curie" disabled={disabled} fieldKey={`${fieldName} ${index} curie id`} dispatchAction={changeFieldModAssociationReferenceJson} />
//             <ColEditorCheckbox key={`colElement ${fieldName} ${index} is_obsolete`} colSize="1" label="obsolete" updatedFlag={updatedFlagIsObsolete} disabled={disabled} fieldKey={`${fieldName} ${index} is_obsolete`} checked={obsoleteChecked} dispatchAction={changeFieldModAssociationReferenceJson} />
  if (disabled === '') {
    rowModAssociationElements.push(
      <Row className="form-group row" key={fieldName} >
        <Col className="Col-general form-label col-form-label" sm="2" >{fieldName}</Col>
        <Col sm="10" ><div id={fieldName} className="form-control biblio-button" onClick={(e) => dispatch(biblioAddNewRowDict(e, initializeDict))} >add {fieldName}</div></Col>
      </Row>);
  }
  return (<>{rowModAssociationElements}</>); }


const RowEditorCrossReferences = ({fieldIndex, fieldName, referenceJsonLive, referenceJsonDb}) => {
  const dispatch = useDispatch();
  const hasPmid = useSelector(state => state.biblio.hasPmid);
//   const revertDictFields = 'curie prefix, curie id, is_obsolete'
  const initializeDict = {'curie': '', 'url': null, 'is_obsolete': false, 'cross_reference_id': 'new'}
  let disabled = ''
  if (hasPmid && (fieldsPubmed.includes(fieldName))) { disabled = 'disabled'; }
  if (fieldsDisplayOnly.includes(fieldName)) { disabled = 'disabled'; }
  const rowCrossReferencesElements = []

  if ('cross_references' in referenceJsonLive && referenceJsonLive['cross_references'] !== null) {
    for (const[index, crossRefDict] of referenceJsonLive['cross_references'].entries()) {
      let otherColSize = 6;
//       let revertElement = (<Col sm="1"><Button id={`revert ${fieldName} ${index}`} variant="outline-secondary" value={revertDictFields} onClick={(e) => dispatch(biblioRevertFieldArray(e))} ><FontAwesomeIcon icon={faUndo} /></Button>{' '}</Col>);
      let revertElement = (<Col sm="1"><Button id={`revert ${fieldName} ${index}`} variant="outline-secondary" onClick={(e) => dispatch(biblioRevertFieldArray(e))} ><FontAwesomeIcon icon={faUndo} /></Button>{' '}</Col>);
      if (disabled === 'disabled') { revertElement = (<></>); otherColSize = 7; }

      let valueLiveCurie = crossRefDict['curie']; let valueDbCurie = '';
      let updatedFlagCuriePrefix = ''; let updatedFlagCurieId = '';
      let [valueLiveCuriePrefix, valueLiveCurieId] = splitCurie(valueLiveCurie);
      let valueLiveIsObsolete = crossRefDict['is_obsolete']; let valueDbIsObsolete = ''; let updatedFlagIsObsolete = '';

      if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
           (typeof referenceJsonDb[fieldName][index]['curie'] !== 'undefined') ) {
             valueDbCurie = referenceJsonDb[fieldName][index]['curie'] }
      if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
           (typeof referenceJsonDb[fieldName][index]['is_obsolete'] !== 'undefined') ) {
             valueDbIsObsolete = referenceJsonDb[fieldName][index]['is_obsolete'] }
      let [valueDbCuriePrefix, valueDbCurieId] = splitCurie(valueDbCurie);
      if (valueLiveCuriePrefix !== valueDbCuriePrefix) { updatedFlagCuriePrefix = 'updated'; }
      if (valueLiveCurieId !== valueDbCurieId) { updatedFlagCurieId = 'updated'; }
      if (valueLiveIsObsolete !== valueDbIsObsolete) { updatedFlagIsObsolete = 'updated'; }

      let obsoleteChecked = '';
      if ( (typeof referenceJsonLive[fieldName][index] !== 'undefined') &&
           (typeof referenceJsonLive[fieldName][index]['is_obsolete'] !== 'undefined') ) {
             if (referenceJsonLive[fieldName][index]['is_obsolete'] === true) { obsoleteChecked = 'checked'; }
             else { obsoleteChecked = ''; } }

      rowCrossReferencesElements.push(
        <Form.Group as={Row} key={`${fieldName} ${index}`}>
          <Col className="Col-general form-label col-form-label" sm="2" >{fieldName} </Col>
          <ColEditorSelect key={`colElement ${fieldName} ${index} curiePrefix`} fieldType="select" fieldName={fieldName} colSize="2" value={valueLiveCuriePrefix} updatedFlag={updatedFlagCuriePrefix} placeholder="curie" disabled={disabled} fieldKey={`${fieldName} ${index} curie prefix`} enumType="referenceXrefPrefix" dispatchAction={changeFieldCrossReferencesReferenceJson} />
          <ColEditorSimple key={`colElement ${fieldName} ${index} curieId`} fieldType="input" fieldName={fieldName} colSize={otherColSize} value={valueLiveCurieId} updatedFlag={updatedFlagCurieId} placeholder="curie" disabled={disabled} fieldKey={`${fieldName} ${index} curie id`} dispatchAction={changeFieldCrossReferencesReferenceJson} />
          <ColEditorCheckbox key={`colElement ${fieldName} ${index} is_obsolete`} colSize="1" label="obsolete" updatedFlag={updatedFlagIsObsolete} disabled={disabled} fieldKey={`${fieldName} ${index} is_obsolete`} checked={obsoleteChecked} dispatchAction={changeFieldCrossReferencesReferenceJson} />
          {revertElement}
        </Form.Group>); } }
  if (disabled === '') {
    rowCrossReferencesElements.push(
      <Row className="form-group row" key={fieldName} >
        <Col className="Col-general form-label col-form-label" sm="2" >{fieldName}</Col>
        <Col sm="10" ><div id={fieldName} className="form-control biblio-button" onClick={(e) => dispatch(biblioAddNewRowDict(e, initializeDict))} >add {fieldName}</div></Col>
      </Row>);
  }
  return (<>{rowCrossReferencesElements}</>); }

const RowEditorCommentsCorrections = ({fieldIndex, fieldName, referenceJsonLive, referenceJsonDb}) => {
  const dispatch = useDispatch();
  const hasPmid = useSelector(state => state.biblio.hasPmid);
//   const revertDictFields = 'curie prefix, curie id, is_obsolete'
  const initializeDict = {'curie': '', 'type': '', 'reference_comment_and_correction_id': 'new'}
  let disabled = ''
  if (hasPmid && (fieldsPubmed.includes(fieldName))) { disabled = 'disabled'; }
  if (fieldsDisplayOnly.includes(fieldName)) { disabled = 'disabled'; }
  const rowCommentsCorrectionsElements = []
  if (fieldName in referenceJsonLive && referenceJsonLive[fieldName] !== null) {
    for (const[index, comcorDict] of referenceJsonLive[fieldName].entries()) {
      let otherColSize = 6;
      let revertElement = (<Col sm="1"><Button id={`revert ${fieldName} ${index}`} variant="outline-secondary" onClick={(e) => dispatch(biblioRevertFieldArray(e))} ><FontAwesomeIcon icon={faUndo} /></Button>{' '}</Col>);
      if (disabled === 'disabled') { revertElement = (<></>); otherColSize = 7; }
      let valueLiveCurie = comcorDict['curie']; let valueDbCurie = ''; let updatedFlagCurie = '';
      // const url = '/Biblio/?action=display&referenceCurie=' + valueLiveCurie
      let valueLiveType = comcorDict['type']; let valueDbType = ''; let updatedFlagType = '';
      if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
           (typeof referenceJsonDb[fieldName][index]['curie'] !== 'undefined') ) {
             valueDbCurie = referenceJsonDb[fieldName][index]['curie'] }
      if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
           (typeof referenceJsonDb[fieldName][index]['type'] !== 'undefined') ) {
             valueDbType = referenceJsonDb[fieldName][index]['type'] }
      if (valueLiveCurie !== valueDbCurie) { updatedFlagCurie = 'updated'; }
      if (valueLiveType !== valueDbType) { updatedFlagType = 'updated'; }
      rowCommentsCorrectionsElements.push(
        <Form.Group as={Row} key={`${fieldName} ${index}`}>
          <Col className="Col-general form-label col-form-label" sm="2" >{fieldName}</Col>
          <ColEditorSelect key={`colElement ${fieldName} ${index} comcorType`} fieldType="select" fieldName={fieldName} colSize="3" value={valueLiveType} updatedFlag={updatedFlagType} placeholder="curie" disabled={disabled} fieldKey={`${fieldName} ${index} type`} enumType="referenceComcorType" dispatchAction={changeFieldCommentsCorrectionsReferenceJson} />
          <ColEditorSimple key={`colElement ${fieldName} ${index} curieId`} fieldType="input" fieldName={fieldName} colSize={otherColSize} value={valueLiveCurie} updatedFlag={updatedFlagCurie} placeholder="curie" disabled={disabled} fieldKey={`${fieldName} ${index} curie`} dispatchAction={changeFieldCommentsCorrectionsReferenceJson} />
          {revertElement}
        </Form.Group>); } }
  if (disabled === '') {
    rowCommentsCorrectionsElements.push(
      <Row className="form-group row" key={fieldName} >
        <Col className="Col-general form-label col-form-label" sm="2" >{fieldName}</Col>
        <Col sm="10" ><div id={fieldName} className="form-control biblio-button" onClick={(e) => dispatch(biblioAddNewRowDict(e, initializeDict))} >add {fieldName}</div></Col>
      </Row>);
  }
  return (<>{rowCommentsCorrectionsElements}</>); }

const RowEditorAuthors = ({fieldIndex, fieldName, referenceJsonLive, referenceJsonDb}) => {
  // author editing is complicated.  There's the author order of the array in the browser dom.  The author order of the array in the redux store.  The order field in the author store entry (should be 1 more than the order in the dom).  The author_id field in the author store entry, used for comparing what was in the db.  The copy of author values in the store that reflect the db value (with its array order, order field, and author_id field).
  const dispatch = useDispatch();
  const hasPmid = useSelector(state => state.biblio.hasPmid);
  const authorExpand = useSelector(state => state.biblio.authorExpand);
//   const revertDictFields = 'order, name, first_name, last_name, orcid, first_author, corresponding_author, affiliations'
  const updatableFields = ['order', 'name', 'first_name', 'last_name', 'orcid', 'first_author', 'corresponding_author', 'affiliations']
  let authorOrder = 1;
  if ('authors' in referenceJsonLive && referenceJsonLive['authors'] !== null) { authorOrder = referenceJsonLive['authors'].length + 1; }
  const initializeDict = {'order': authorOrder, 'name': '', 'first_name': '', 'last_name': '', orcid: null, first_author: false, corresponding_author: false, affiliations: [], 'author_id': 'new'}
  let disabled = ''
  if (hasPmid && (fieldsPubmed.includes(fieldName))) { disabled = 'disabled'; }
  if (fieldsDisplayOnly.includes(fieldName)) { disabled = 'disabled'; }

  function getStoreAuthorIndexFromDomIndex(indexDomAuthorInfo, newAuthorInfoChange) {
    let indexAuthorInfo = newAuthorInfoChange[indexDomAuthorInfo]['order']        // replace placeholder with index from store order value matches dom
    for (let authorReorderIndexDictIndex in newAuthorInfoChange) {
      if (newAuthorInfoChange[authorReorderIndexDictIndex]['order'] - 1 === indexDomAuthorInfo) {
        indexAuthorInfo = authorReorderIndexDictIndex
        break } }
    return indexAuthorInfo }

  const rowAuthorsElements = []
  rowAuthorsElements.push(<AuthorExpandToggler key="authorExpandTogglerComponent" displayOrEditor="editor" />);
  const orderedAuthors = [];
  if ('authors' in referenceJsonLive && referenceJsonLive['authors'] !== null) {
    for (const value  of referenceJsonLive['authors'].values()) {
      let index = value['order'] - 1;
      if (index < 0) { index = 0 }	// temporary fix for fake authors have an 'order' field value of 0
      orderedAuthors[index] = value; }
//     for (const[index, authorDict] of referenceJsonLive['authors'].entries()) { }

    if (authorExpand === 'first') {
      if ((orderedAuthors.length > 0) && (typeof orderedAuthors[0] !== 'undefined') && ('name' in orderedAuthors[0])) {
        rowAuthorsElements.push(
          <Row key="author first" className="Row-general" xs={2} md={4} lg={6}>
            <Col className="Col-general ">first author</Col>
            <Col className="Col-general Col-editor-disabled" lg={{ span: 10 }}><div>{orderedAuthors[0]['name']}</div></Col>
          </Row>); } }

    else if (authorExpand === 'list') {
      let authorNames = orderedAuthors.map((dict, index) => ( dict['name'] )).join('; ');
      rowAuthorsElements.push(
        <Row key="author list" className="Row-general" xs={2} md={4} lg={6}>
          <Col className="Col-general ">all authors</Col>
          <Col className="Col-general Col-editor-disabled" lg={{ span: 10 }}><div>{authorNames}</div></Col>
        </Row>); }

    else if (authorExpand === 'detailed') {
      for (const[index, authorDict] of orderedAuthors.entries()) {
        if (typeof authorDict === 'undefined') { continue; }
        let rowEvenness = (index % 2 === 0) ? 'row-even' : 'row-odd'
        let affiliationsLength = 0
        if ('affiliations' in authorDict && authorDict['affiliations'] !== null) {
          affiliationsLength = authorDict['affiliations'].length }

//         let otherColSizeName = 7; let otherColSizeNames = 4; let otherColSizeOrcid = 2; let otherColSizeAffiliation = 9;
        let otherColSizeName = 7; let otherColSizeNames = 5; let otherColSizeAffiliation = 10;
//         let revertElement = (<Col sm="1"><Button id={`revert ${fieldName} ${index}`} variant="outline-secondary" value={revertDictFields} onClick={(e) => dispatch(biblioRevertAuthorArray(e, initializeDict))} ><FontAwesomeIcon icon={faUndo} /></Button>{' '}</Col>);
        let revertElement = (<Col sm="1"><Button id={`revert ${fieldName} ${index}`} variant="outline-secondary" onClick={(e) => dispatch(biblioRevertAuthorArray(e, initializeDict))} ><FontAwesomeIcon icon={faUndo} /></Button>{' '}</Col>);
        // if (disabled === 'disabled') { revertElement = (<></>); otherColSizeName = 8; otherColSizeNames = 5; otherColSizeOrcid = 3; otherColSizeAffiliation = 10; }
        let disabledName = disabled
        // if first or last name, make name be concatenation of both and disable editing name
        if ( ( (authorDict['first_name'] !== null) && (authorDict['first_name'] !== '') ) ||
             ( (authorDict['last_name'] !== null) && (authorDict['last_name'] !== '') ) ) {
          disabledName = 'disabled'
          if ( ( (authorDict['first_name'] !== null) && (authorDict['first_name'] !== '') ) &&
               ( (authorDict['last_name'] !== null) && (authorDict['last_name'] !== '') ) ) {
            authorDict['name'] = authorDict['first_name'] + ' ' + authorDict['last_name'] }
          else if ( (authorDict['first_name'] !== null) && (authorDict['first_name'] !== '') ) {
            authorDict['name'] = authorDict['first_name'] }
          else if ( (authorDict['last_name'] !== null) && (authorDict['last_name'] !== '') ) {
            authorDict['name'] = authorDict['last_name'] } }

//         let valueLiveSource = authorDict['source']; let valueDbSource = ''; let updatedFlagSource = '';
//         let valueLiveReferenceType = authorDict['reference_type']; let valueDbReferenceType = ''; let updatedFlagReferenceType = '';
//         if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
//              (typeof referenceJsonDb[fieldName][index]['source'] !== 'undefined') ) {
//                valueDbSource = referenceJsonDb[fieldName][index]['source'] }
//         if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
//              (typeof referenceJsonDb[fieldName][index]['reference_type'] !== 'undefined') ) {
//                valueDbReferenceType = referenceJsonDb[fieldName][index]['reference_type'] }
//         if (valueLiveSource !== valueDbSource) { updatedFlagSource = 'updated'; }
//         if (valueLiveReferenceType !== valueDbReferenceType) { updatedFlagReferenceType = 'updated'; }

        let orcidValue = ''
        if ('orcid' in authorDict && authorDict['orcid'] !== null && 'curie' in authorDict['orcid'] && authorDict['orcid']['curie'] !== null) {
          const orcidId = splitCurie(authorDict['orcid']['curie'], 'id');
          orcidValue = (orcidId) ? orcidId : authorDict['orcid']['curie']; }

        // map author dom index to live store index to author id to db store index, to compare live values to store values
        let indexStoreAuthorLive = getStoreAuthorIndexFromDomIndex(index, referenceJsonLive[fieldName])
        let authorId = referenceJsonLive[fieldName][indexStoreAuthorLive]['author_id']
        let indexStoreAuthorDb = indexStoreAuthorLive
        for (const dbStoreIndex in referenceJsonDb[fieldName]) {
          if (referenceJsonDb[fieldName][dbStoreIndex]['author_id'] === authorId) {
            indexStoreAuthorDb = dbStoreIndex } }

        let updatedDict = {}
        for (const updatableField of updatableFields.values()) {
          if (updatableField === 'affiliations') {
            updatedDict[updatableField] = []
            for (let i = 0; i < affiliationsLength; i++) {
              let valueDb = ''; let updatedFlag = ''; let valueLive = authorDict[updatableField][i];
              if ( (typeof referenceJsonDb[fieldName][indexStoreAuthorDb] !== 'undefined') &&
                   (typeof referenceJsonDb[fieldName][indexStoreAuthorDb][updatableField] !== 'undefined') &&
                   (typeof referenceJsonDb[fieldName][indexStoreAuthorDb][updatableField][i] !== 'undefined') ) {
                     valueDb = referenceJsonDb[fieldName][indexStoreAuthorDb][updatableField][i] }
              if (valueLive !== valueDb) { updatedFlag = 'updated'; }
              updatedDict[updatableField][i] = updatedFlag } }
          else { 
            let valueDb = ''; let updatedFlag = ''; let valueLive = authorDict[updatableField];
            if (updatableField === 'orcid') {
              valueLive = orcidValue;
              if ( (typeof referenceJsonDb[fieldName][indexStoreAuthorDb] !== 'undefined') &&
                   (typeof referenceJsonDb[fieldName][indexStoreAuthorDb][updatableField] !== 'undefined') &&
                   (referenceJsonDb[fieldName][indexStoreAuthorDb][updatableField] !== null) &&
                   (typeof referenceJsonDb[fieldName][indexStoreAuthorDb][updatableField]['curie'] !== 'undefined') ) {
                     valueDb = splitCurie(referenceJsonDb[fieldName][indexStoreAuthorDb][updatableField]['curie'], 'id'); } }
            else {
              if ( (typeof referenceJsonDb[fieldName][indexStoreAuthorDb] !== 'undefined') &&
                   (typeof referenceJsonDb[fieldName][indexStoreAuthorDb][updatableField] !== 'undefined') ) {
                     valueDb = referenceJsonDb[fieldName][indexStoreAuthorDb][updatableField] } }
            if (valueLive !== valueDb) { updatedFlag = 'updated'; }
            updatedDict[updatableField] = updatedFlag } }

        let firstAuthorChecked = '';
        if ( (typeof referenceJsonLive[fieldName][indexStoreAuthorDb] !== 'undefined') &&
             (typeof referenceJsonLive[fieldName][indexStoreAuthorDb]['first_author'] !== 'undefined') ) {
               if (referenceJsonLive[fieldName][indexStoreAuthorDb]['first_author'] === true) { firstAuthorChecked = 'checked'; }
               else { firstAuthorChecked = ''; } }
        let correspondingChecked = '';
        if ( (typeof referenceJsonLive[fieldName][indexStoreAuthorDb] !== 'undefined') &&
             (typeof referenceJsonLive[fieldName][indexStoreAuthorDb]['corresponding_author'] !== 'undefined') ) {
               if (referenceJsonLive[fieldName][indexStoreAuthorDb]['corresponding_author'] === true) { correspondingChecked = 'checked'; }
               else { correspondingChecked = ''; } }

        rowAuthorsElements.push(
          <Form.Group as={Row} key={`${fieldName} ${index} name`} className={`${rowEvenness}`}>
            <Col className="Col-general form-label col-form-label" sm="2" >{fieldName} {index + 1}</Col>
            <ColEditorSimple key={`colElement ${fieldName} ${index} name`} fieldType="input" fieldName={fieldName} colSize={otherColSizeName} value={authorDict['name']} updatedFlag={updatedDict['name']} placeholder="name" disabled={disabledName} fieldKey={`${fieldName} ${index} name`} dispatchAction={changeFieldAuthorsReferenceJson} />
            <Col className="Col-general form-label col-form-label" sm="1" >order </Col>
            <ColEditorSelectNumeric key={`colElement ${fieldName} ${index} order`} fieldType="select" fieldName={fieldName} colSize="1" value={authorDict['order']} updatedFlag={updatedDict['order']} placeholder="order" disabled={disabled} fieldKey={`${fieldName} ${index} order`} minNumber="1" maxNumber={`${referenceJsonLive['authors'].length}`} dispatchAction={changeFieldAuthorsReferenceJson} />
            {revertElement}
          </Form.Group>);
//             <ColEditorSelect key={`colElement ${fieldName} ${index} source`} fieldType="select" fieldName={fieldName} colSize="4" value={valueLiveSource} updatedFlag={updatedFlagSource} placeholder="source" disabled={disabled} fieldKey={`${fieldName} ${index} source`} enumType="mods" dispatchAction={changeFieldModReferenceReferenceJson} />
//             <ColEditorSimple key={`colElement ${fieldName} ${index} order`} fieldType="input" fieldName={fieldName} colSize="1" value={authorDict['order']} updatedFlag={updatedDict['order']} placeholder="order" disabled={disabled} fieldKey={`${fieldName} ${index} order`} dispatchAction={changeFieldAuthorsReferenceJson} />
        rowAuthorsElements.push(
          <Form.Group as={Row} key={`${fieldName} ${index} first last`} className={`${rowEvenness}`}>
            <Col className="Col-general form-label col-form-label" sm="2" >first last </Col>
            <ColEditorSimple key={`colElement ${fieldName} ${index} first_name`} fieldType="input" fieldName={fieldName} colSize="5" value={authorDict['first_name']} updatedFlag={updatedDict['first_name']} placeholder="first name" disabled={disabled} fieldKey={`${fieldName} ${index} first_name`} dispatchAction={changeFieldAuthorsReferenceJson} />
            <ColEditorSimple key={`colElement ${fieldName} ${index} last_name`} fieldType="input" fieldName={fieldName} colSize={otherColSizeNames} value={authorDict['last_name']} updatedFlag={updatedDict['last_name']} placeholder="last name" disabled={disabled} fieldKey={`${fieldName} ${index} last_name`} dispatchAction={changeFieldAuthorsReferenceJson} />
          </Form.Group>);

        rowAuthorsElements.push(
          <Form.Group as={Row} key={`${fieldName} ${index} role`} className={`${rowEvenness}`}>
            <Col className="Col-general form-label col-form-label" sm="2" >role </Col>
            <Col sm="1" > </Col>
            <ColEditorCheckbox key={`colElement ${fieldName} ${index} corresponding_author`} colSize="2" label="corresponding" updatedFlag={updatedDict['corresponding_author']} disabled="" fieldKey={`${fieldName} ${index} corresponding_author`} checked={correspondingChecked} dispatchAction={changeFieldAuthorsReferenceJson} />
            <ColEditorCheckbox key={`colElement ${fieldName} ${index} first_author`} colSize="7" label="first author" updatedFlag={updatedDict['first_author']} disabled="" fieldKey={`${fieldName} ${index} first_author`} checked={firstAuthorChecked} dispatchAction={changeFieldAuthorsReferenceJson} />
          </Form.Group>);
        rowAuthorsElements.push(
          <Form.Group as={Row} key={`${fieldName} ${index} orcid`} className={`${rowEvenness}`}>
            <Col className="Col-general form-label col-form-label" sm="2" >person identifier </Col>
            <ColEditorSelect key={`colElement ${fieldName} ${index} orcidPrefix`} fieldType="select" fieldName={fieldName} colSize="2" value="ORCID" updatedFlag="" placeholder="curie" disabled="disabled" fieldKey={`${fieldName} ${index} orcid prefix`} enumType="personXrefPrefix" dispatchAction="" />
            <ColEditorSimple key={`colElement ${fieldName} ${index} orcid`} fieldType="input" fieldName={fieldName} colSize="8"  value={orcidValue} updatedFlag={updatedDict['orcid']} placeholder="orcid" disabled={disabled} fieldKey={`${fieldName} ${index} orcid`} dispatchAction={changeFieldAuthorsReferenceJson} />
          </Form.Group>);
        // rowAuthorsElements.push(
        //   <Form.Group as={Row} key={`${fieldName} ${index} orcid`} className={`${rowEvenness}`}>
        //     <Col className="Col-general form-label col-form-label" sm="2" >orcid </Col>
        //     <ColEditorSimple key={`colElement ${fieldName} ${index} orcid`} fieldType="input" fieldName={fieldName} colSize="5"  value={orcidValue} updatedFlag={updatedDict['orcid']} placeholder="orcid" disabled={disabled} fieldKey={`${fieldName} ${index} orcid`} dispatchAction={changeFieldAuthorsReferenceJson} />
        //     <ColEditorCheckbox key={`colElement ${fieldName} ${index} corresponding_author`} colSize="2" label="corresponding" updatedFlag={updatedDict['corresponding_author']} disabled="" fieldKey={`${fieldName} ${index} corresponding_author`} checked={correspondingChecked} dispatchAction={changeFieldAuthorsReferenceJson} />
        //     <ColEditorCheckbox key={`colElement ${fieldName} ${index} first_author`} colSize={otherColSizeOrcid} label="first author" updatedFlag={updatedDict['first_author']} disabled="" fieldKey={`${fieldName} ${index} first_author`} checked={firstAuthorChecked} dispatchAction={changeFieldAuthorsReferenceJson} />
        //   </Form.Group>);

        if ('affiliations' in authorDict && authorDict['affiliations'] !== null && authorDict['affiliations'].length > 0) {
          for (const[indexAff, affiliationsValue] of authorDict['affiliations'].entries()) {
            rowAuthorsElements.push(
              <Form.Group as={Row} key={`${fieldName} ${index} affiliations ${indexAff}`} className={`${rowEvenness}`}>
                <Col className="Col-general form-label col-form-label" sm="2" >affiliations {index + 1} {indexAff + 1}</Col>
                <ColEditorSimple key={`colElement ${fieldName} ${index} affiliations ${indexAff}`} fieldType="input" fieldName={fieldName} colSize={otherColSizeAffiliation}  value={affiliationsValue} updatedFlag={updatedDict['affiliations'][indexAff]} placeholder="affiliations" disabled={disabled} fieldKey={`${fieldName} ${index} affiliations ${indexAff}`} dispatchAction={changeFieldAuthorsReferenceJson} />
              </Form.Group>);
        } }
        if (disabled === '') {
          rowAuthorsElements.push(
            <Row key={`${fieldName} ${index} affiliations`} className={`form-group row ${rowEvenness}`} >
              <Col className="Col-general form-label col-form-label" sm="2" >auth {index + 1} add affiliations</Col>
              <Col sm="10" ><div id={`${fieldName} ${index} affiliations`} className="form-control biblio-button" onClick={(e) => dispatch(biblioAddNewAuthorAffiliation(e))} >add affiliations</div></Col>
            </Row>);
        }
    } } // else if (authorExpand === 'detailed')
  } // if ('authors' in referenceJsonLive && referenceJsonLive['authors'] !== null)
  if (disabled === '' && authorExpand === 'detailed') {
    let rowEvennessLast = (orderedAuthors.length % 2 === 0) ? 'row-even' : 'row-odd'
    rowAuthorsElements.push(
      <Row key={fieldName} className={`form-group row ${rowEvennessLast}`} >
        <Col className="Col-general form-label col-form-label" sm="2" >{fieldName}</Col>
        <Col sm="10" ><div id={fieldName} className="form-control biblio-button" onClick={(e) => dispatch(biblioAddNewRowDict(e, initializeDict))} >add {fieldName}</div></Col>
      </Row>);
  }
  return (<>{rowAuthorsElements}</>);
} // const RowEditorAuthors = ({fieldIndex, fieldName, referenceJsonLive, referenceJsonDb})

const BiblioEditor = () => {
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const referenceJsonDb = useSelector(state => state.biblio.referenceJsonDb);
  if (!('date_created' in referenceJsonLive)) { 
    let message = 'No AGR Reference Curie found';
    if ('detail' in referenceJsonLive) { message = referenceJsonLive['detail']; }
    return(<>{message}</>); }
  const rowOrderedElements = []
  for (const [fieldIndex, fieldName] of fieldsOrdered.entries()) {
    if (fieldName === 'DIVIDER') {
        rowOrderedElements.push(<RowDivider key={fieldIndex} />); }
    else if (fieldsSimple.includes(fieldName)) {
        rowOrderedElements.push(<RowEditorString key={fieldName} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />); }
    else if (fieldsArrayString.includes(fieldName)) {
      rowOrderedElements.push(<RowEditorArrayString key={`RowEditorArrayString ${fieldName}`} fieldIndex={fieldIndex} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />); }
    else if (fieldName === 'mod_corpus_associations') {
      rowOrderedElements.push(<RowEditorModAssociation key={`RowEditorModAssociation ${fieldName}`} fieldIndex={fieldIndex} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />); }
    else if (fieldName === 'cross_references') {
      rowOrderedElements.push(<RowEditorCrossReferences key={`RowEditorCrossReferences ${fieldName}`} fieldIndex={fieldIndex} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />); }
    else if (fieldName === 'corrections') {
      rowOrderedElements.push(<RowEditorCommentsCorrections key={`RowEditorCommentsCorrections ${fieldName}`} fieldIndex={fieldIndex} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />); }
    else if (fieldName === 'mod_reference_types') {
      rowOrderedElements.push(<RowEditorModReferenceTypes key="RowEditorModReferenceTypes" fieldIndex={fieldIndex} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />); }
    else if (fieldName === 'mesh_terms') {
      rowOrderedElements.push(<RowDisplayMeshTerms key="RowDisplayMeshTerms" fieldIndex={fieldIndex} fieldName={fieldName} referenceJsonLive={referenceJsonLive} displayOrEditor="editor" />); }
// PUT THIS BACK
    else if (fieldName === 'authors') {
      rowOrderedElements.push(<RowEditorAuthors key="RowEditorAuthors" fieldIndex={fieldIndex} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />); }
  } // for (const [fieldIndex, fieldName] of fieldsOrdered.entries())

  return (<Container><Form><BiblioSubmitUpdateRouter />{rowOrderedElements}</Form></Container>);
} // const BiblioEditor

const Biblio = () => {

  const dispatch = useDispatch();

  const crossRefCurieQueryRedirectToBiblio = useSelector(state => state.search.redirectToBiblio);
//   console.log("biblio crossRefCurieQueryRedirectToBiblio " + crossRefCurieQueryRedirectToBiblio);

  const crossRefCurieQueryResponseField = useSelector(state => state.search.responseField);
  if ( crossRefCurieQueryRedirectToBiblio ) {
    console.log('biblio from redirect');
// this is needed to keep the query page from redirecting here if going back to it, but changing it triggers a change there, which somehow triggers a dispatch of a bunch of stuff, including a double dispatch(biblioQueryReferenceCurie(referenceCurie)), which is wrong
// Warning: Cannot update a component (`Biblio`) while rendering a different component (`Biblio`). To locate the bad setState() call inside `Biblio`, follow the stack trace as described in https://reactjs.org/link/setstate-in-render
//     dispatch(resetQueryRedirect());
    dispatch(setReferenceCurie(crossRefCurieQueryResponseField));
  }

  const biblioAction = useSelector(state => state.biblio.biblioAction);
  const referenceCurie = useSelector(state => state.biblio.referenceCurie);
  const getReferenceCurieFlag = useSelector(state => state.biblio.getReferenceCurieFlag);
//   const loadingQuery = useSelector(state => state.biblio.loadingQuery);
  const isLoading = useSelector(state => state.biblio.isLoading);
//   const queryFailure = useSelector(state => state.biblio.queryFailure);	// do something when user puts in invalid curie
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const updateCitationFlag = useSelector(state => state.biblio.updateCitationFlag);

  const useQuery = () => { return new URLSearchParams(useLocation().search); }
  let query = useQuery();
  if (referenceCurie === '' || biblioAction === '') {
    console.log(query);
    let paramAction = query.get('action');
    let paramReferenceCurie = query.get('referenceCurie');
    console.log("biblio urlParam paramAction", paramAction);
    console.log("biblio urlParam paramReferenceCurie", paramReferenceCurie);
//     if (paramReferenceCurie !== null) { dispatch(setLoadingQuery(true)); }
    if (paramReferenceCurie !== null) { dispatch(setReferenceCurie(paramReferenceCurie)); }
    if (paramAction !== null) { dispatch(setBiblioAction(paramAction)); }
  }

  // citation needs to be updated after processing separate biblio api calls. update citation and make flag false
  if (referenceCurie !== '' && (updateCitationFlag === true)) {
    console.log('biblio DISPATCH update citation for ' + referenceCurie);
    dispatch(updateButtonBiblio( [accessToken, 'reference/citationupdate/' + referenceCurie, null, 'POST', 0, null, null] ));
    dispatch(setUpdateCitationFlag(false))
  }

  // if there's a curie, biblio has stopped updating therefore get curie, and citation has been updated, requery the reference data
  if (referenceCurie !== '' && (getReferenceCurieFlag === true) && (updateCitationFlag === false)) {
    console.log('biblio DISPATCH biblioQueryReferenceCurie ' + referenceCurie);
    dispatch(biblioQueryReferenceCurie(referenceCurie));
  }

  function LoadingElement() {
    return (<Container><img src={loading_gif} className="loading_gif" alt="loading" /></Container>);
  }

  if (referenceCurie === '') { 
    return (<div><h4>Select a reference curie through <Link to='/Search'>Search</Link> or something else first</h4></div>) }
  else {
    return (
      <div>
        <h4>Biblio about this Reference</h4>
        <div align="center" className="task" >{referenceCurie}</div>
        { isLoading ? <LoadingElement /> : <BiblioActionRouter /> }
        <Link to='/'>Go Back</Link>
      </div>
    ) }

} // const Biblio = () =>


export default Biblio
