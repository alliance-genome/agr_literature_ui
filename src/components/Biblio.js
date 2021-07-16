// import { useState } from 'react'
// import { useEffect } from 'react';
// import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { useSelector, useDispatch } from 'react-redux';
// import { useSelector } from 'react-redux';

// import { resetQueryRedirect } from '../actions/biblioActions';
import { setReferenceCurie } from '../actions/biblioActions';
import { setBiblioAction } from '../actions/biblioActions';
// import { setLoadingQuery } from '../actions/biblioActions';
import { biblioQueryReferenceCurie } from '../actions/biblioActions';
import { setBiblioUpdating } from '../actions/biblioActions';

import { changeFieldReferenceJson } from '../actions/biblioActions';
import { changeFieldArrayReferenceJson } from '../actions/biblioActions';
import { changeFieldModReferenceReferenceJson } from '../actions/biblioActions';
import { changeFieldCrossReferencesReferenceJson } from '../actions/biblioActions';
import { changeBiblioActionToggler } from '../actions/biblioActions';
import { biblioAddNewRowString } from '../actions/biblioActions';
import { biblioAddNewRowDict } from '../actions/biblioActions';
import { updateButtonBiblio } from '../actions/biblioActions';
import { closeUpdateAlert } from '../actions/biblioActions';
import { changeBiblioMeshExpandToggler } from '../actions/biblioActions';
import { changeBiblioAuthorExpandToggler } from '../actions/biblioActions';
import { biblioRevertField } from '../actions/biblioActions';
import { biblioRevertFieldArray } from '../actions/biblioActions';

import { useLocation } from 'react-router-dom';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'

import loading_gif from '../images/loading_cat.gif';

// http://dev.alliancegenome.org:49161/reference/AGR:AGR-Reference-0000000001


// if passing an object with <Redirect push to={{ pathname: "/Biblio", state: { pie: "the pie" } }} />, would access new state with
// const Biblio = ({ appState, someAction, location }) => {
// console.log(location.state);  }

const fieldsSimple = ['curie', 'reference_id', 'title', 'category', 'citation', 'volume', 'pages', 'language', 'abstract', 'publisher', 'issue_name', 'issue_date', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified', 'resource_curie', 'resource_title' ];
const fieldsArrayString = ['keywords', 'pubmed_type' ];
const fieldsOrdered = [ 'title', 'cross_references', 'authors', 'citation', 'abstract', 'DIVIDER', 'category', 'pubmed_type', 'mod_reference_types', 'DIVIDER', 'resource_curie', 'resource_title', 'volume', 'issue_name', 'pages', 'DIVIDER', 'editors', 'publisher', 'language', 'DIVIDER', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified', 'issue_date', 'DIVIDER', 'tags', 'DIVIDER', 'keywords', 'mesh_terms' ];
// const fieldsOrdered = [ 'title', 'mod_reference_types' ];

const fieldsPubmed = [ 'title', 'authors', 'abstract', 'pubmed_type', 'resource_curie', 'resource_title', 'volume', 'issue_name', 'pages', 'editors', 'publisher', 'language', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified', 'issue_date', 'keywords', 'mesh_terms' ];
const fieldsDisplayOnly = [ 'citation', 'pubmed_type', 'resource_title', 'date_arrived_in_pubmed', 'date_last_modified', 'mesh_terms' ];


const fieldTypeDict = {}
fieldTypeDict['abstract'] = 'textarea'
fieldTypeDict['category'] = 'select'

const enumDict = {}
enumDict['category'] = ['research_article', 'review_article', 'thesis', 'book', 'other', 'preprint', 'conference_publication', 'personal_communication', 'direct_data_submission', 'internal_process_reference', 'unknown', 'retraction']
enumDict['mods'] = ['', 'FB', 'MGI', 'RGD', 'SGD', 'WB', 'ZFIN']
enumDict['referenceXrefPrefix'] = ['', 'PMID', 'DOI', 'PMCID', 'ISBN', 'FB', 'MGI', 'RGD', 'SGD', 'WB', 'ZFIN']

// title
// cross_references (doi, pmid, modID)
// authors (collapsed [in a list, or only first author])
// citation (generated from other fields, curators will decide later)
// abstract
// 
// category
// pubmed_type
// mod_reference_types
// 
// resource (resource_curie resource_title ?)
// volume
// issue_name
// pages
// 
// editors
// publisher
// language
// 
// date_published
// date_arrived_in_pubmed
// date_last_modified
// issue_date
// 
// tags (in separate tab)
// 
// keywords
// mesh_terms


function splitCurie(curie) {
  let curiePrefix = ''; let curieId = '';
  if ( curie.match(/^([^:]*):(.*)$/) ) {
    [curie, curiePrefix, curieId] = curie.match(/^([^:]*):(.*)$/) }
  return [ curiePrefix, curieId ] }


const BiblioActionToggler = () => { 
  const dispatch = useDispatch();
  const biblioAction = useSelector(state => state.biblio.biblioAction);
  let displayChecked = ''; 
  let editorChecked = ''; 
  if (biblioAction === 'editor') { editorChecked = 'checked'; }
    else { displayChecked = 'checked'; }

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
      <Form.Check 
        inline
        checked={displayChecked}
        type='radio'
        label='display'
        id='biblio-toggler-display'
        onChange={(e) => dispatch(changeBiblioActionToggler(e))}
      />
      <Form.Check
        inline
        checked={editorChecked}
        type='radio'
        label='editor'
        id='biblio-toggler-editor'
        onChange={(e) => dispatch(changeBiblioActionToggler(e))}
      />
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
  if (valueLive !== valueDb) { updatedFlag = 'updated'; }
  return (
        <RowDisplaySimple key={fieldName} fieldName={fieldName} value={valueLive} updatedFlag={updatedFlag} />); }

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

const RowDisplayCrossReferences = ({fieldIndex, fieldName, referenceJson, referenceJsonLive, referenceJsonDb}) => {
  if ('cross_references' in referenceJson && referenceJson['cross_references'] !== null) {
    const rowCrossReferenceElements = []
    for (const[index, crossRefDict] of referenceJson['cross_references'].entries()) {
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

const RowDisplayTags = ({fieldIndex, fieldName, referenceJson}) => {
  if ('tags' in referenceJson && referenceJson['tags'] !== null) {
    const rowTagElements = []
    for (const[index, value] of referenceJson['tags'].entries()) {
      rowTagElements.push(
        <Row key={`${fieldIndex} ${index}`} className="Row-general" xs={2} md={4} lg={6}>
          <Col className="Col-general Col-display Col-display-left">tags</Col>
          <Col className="Col-general Col-display " lg={{ span: 2 }}>{value['tag_source']}</Col>
          <Col className="Col-general Col-display Col-display-right" lg={{ span: 8 }}>{value['tag_name']}</Col>
        </Row>); }
    return (<>{rowTagElements}</>); }
  else { return null; } }

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

const RowDisplayMeshTerms = ({fieldIndex, fieldName, referenceJson, displayOrEditor}) => {
  const meshExpand = useSelector(state => state.biblio.meshExpand);
  let cssDisplayLeft = 'Col-display Col-display-left';
  let cssDisplay = 'Col-display';
  let cssDisplayRight = 'Col-display Col-display-right';
  if (displayOrEditor === 'editor') { 
    cssDisplay = 'Col-editor-disabled';
    cssDisplayRight = 'Col-editor-disabled';
    cssDisplayLeft = ''; }
  if ('mesh_terms' in referenceJson && referenceJson['mesh_terms'] !== null) {
    const rowMeshTermsElements = []
    rowMeshTermsElements.push(<MeshExpandToggler key="meshExpandTogglerComponent" displayOrEditor={displayOrEditor} />);
    if (meshExpand === 'detailed') {
      for (const[index, value] of referenceJson['mesh_terms'].entries()) {
        rowMeshTermsElements.push(
          <Row key={`${fieldIndex} ${index}`} className="Row-general" xs={2} md={4} lg={6}>
            <Col className={`Col-general ${cssDisplayLeft} `}>mesh_terms</Col>
            <Col className={`Col-general ${cssDisplay} `} lg={{ span: 5 }}>{value['heading_term']}</Col>
            <Col className={`Col-general ${cssDisplayRight} `} lg={{ span: 5 }}>{value['qualifier_term']}</Col>
          </Row>); } }
    else {
      const meshTextArray = []
      for (const value of referenceJson['mesh_terms']) {
        let term = value['heading_term'];
        if (value['qualifier_term'] !== null) { term += ' ' + value['qualifier_term']; }
        meshTextArray.push(term); }
//       const meshText = meshTextArray.join('<span className="affiliation">; </span>');	// renders markup
      const meshText = meshTextArray.join('; ');
      rowMeshTermsElements.push(
        <Row key="meshTermsText" className="Row-general" xs={2} md={4} lg={6}>
          <Col className={`Col-general ${cssDisplayLeft}  `}>mesh_terms</Col>
          <Col className={`Col-general ${cssDisplayRight} `} lg={{ span: 10 }}>{meshText}</Col>
        </Row>);
    }
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

const RowDisplayAuthors = ({fieldIndex, fieldName, referenceJson}) => {
  // e.g. orcid/affiliation PMID:24895670   affiliations PMID:24913562   out of order PMID:33766856
  const authorExpand = useSelector(state => state.biblio.authorExpand);
  if ('authors' in referenceJson && referenceJson['authors'] !== null) {
    const rowAuthorElements = [];
    rowAuthorElements.push(<AuthorExpandToggler key="authorExpandTogglerComponent" />);
    const orderedAuthors = [];
    for (const value  of referenceJson['authors'].values()) {
      let index = value['order'] - 1;
      if (index < 0) { index = 0 }	// temporary fix for fake authors have an 'order' field value of 0
      orderedAuthors[index] = value; }

    if (authorExpand === 'first') {
      rowAuthorElements.push(
        <Row key="author first" className="Row-general" xs={2} md={4} lg={6}>
          <Col className="Col-general Col-display Col-display-left">first author</Col>
          <Col className="Col-general Col-display Col-display-right" lg={{ span: 10 }}><div>{orderedAuthors[0]['name']}</div></Col>
        </Row>); }
    else if (authorExpand === 'list') {
      let authorNames = orderedAuthors.map((dict, index) => ( dict['name'] )).join('; ');
      rowAuthorElements.push(
        <Row key="author list" className="Row-general" xs={2} md={4} lg={6}>
          <Col className="Col-general Col-display Col-display-left">all authors</Col>
          <Col className="Col-general Col-display Col-display-right" lg={{ span: 10 }}><div>{authorNames}</div></Col>
        </Row>); }
    else if (authorExpand === 'detailed') {
      for (const [index, value]  of orderedAuthors.entries()) {
        let orcid_curie = '';
        let orcid_url = '';
        if ('orcid' in value && value['orcid'] !== null) {
          orcid_curie = value['orcid']['curie'] || '';
          orcid_url = value['orcid']['url'] || ''; }
        let affiliations = [];
        if ('affiliation' in value) {
          for (const index_aff in value['affiliation']) {
            affiliations.push(<div key={`index_aff ${index_aff}`} className="affiliation">- {value['affiliation'][index_aff]}</div>); } }
        rowAuthorElements.push(
          <Row key={`author ${index}`} className="Row-general" xs={2} md={4} lg={6}>
            <Col className="Col-general Col-display Col-display-left">author {value['order']}</Col>
            <Col className="Col-general Col-display " lg={{ span: 10 }}><div key={`author ${index}`}>{value['name']} <a href={orcid_url}  rel="noreferrer noopener" target="_blank">{orcid_curie}</a>{affiliations}</div></Col>
          </Row>); } }
    return (<>{rowAuthorElements}</>); }
  else { return null; }
} // const RowDisplayAuthors

const AuthorExpandToggler = () => {
  const dispatch = useDispatch();
  const authorExpand = useSelector(state => state.biblio.authorExpand);
  let firstChecked = ''; 
  let listChecked = ''; 
  let detailedChecked = ''; 
  if (authorExpand === 'first') { firstChecked = 'checked'; }
    else if (authorExpand === 'list') { listChecked = 'checked'; }
    else { detailedChecked = 'checked'; }
  return (
    <Row key="authorExpandTogglerRow" className="Row-general" xs={2} md={4} lg={6}>
      <Col className="Col-general Col-display Col-display-left">authors</Col>
      <Col className="Col-general Col-display Col-display-right" lg={{ span: 10 }}>
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



const BiblioDisplay = () => {
  const referenceJson = useSelector(state => state.biblio.referenceJsonLive);
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const referenceJsonDb = useSelector(state => state.biblio.referenceJsonDb);
  const rowOrderedElements = []
  for (const [fieldIndex, fieldName] of fieldsOrdered.entries()) {
    if (fieldName === 'DIVIDER') {
        rowOrderedElements.push(<RowDivider key={fieldIndex} />); }
    else if (fieldsSimple.includes(fieldName)) {
        rowOrderedElements.push(<RowDisplayString key={fieldName} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />); }
    else if (fieldsArrayString.includes(fieldName)) {
      rowOrderedElements.push(<RowDisplayArrayString key={`RowDisplayArrayString ${fieldName}`} fieldIndex={fieldIndex} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />); }
    else if (fieldName === 'cross_references') {
      rowOrderedElements.push(<RowDisplayCrossReferences key="RowDisplayCrossReferences" fieldIndex={fieldIndex} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} referenceJson={referenceJson} />); }
    else if (fieldName === 'tags') {
      rowOrderedElements.push(<RowDisplayTags key="RowDisplayTags" fieldIndex={fieldIndex} fieldName={fieldName} referenceJson={referenceJson} />); }
    else if (fieldName === 'mod_reference_types') {
      rowOrderedElements.push(<RowDisplayModReferenceTypes key="RowDisplayModReferenceTypes" fieldIndex={fieldIndex} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />); }
    else if (fieldName === 'mesh_terms') {
      rowOrderedElements.push(<RowDisplayMeshTerms key="RowDisplayMeshTerms" fieldIndex={fieldIndex} fieldName={fieldName} referenceJson={referenceJson} displayOrEditor="display" />); }
    else if (fieldName === 'authors') {
      rowOrderedElements.push(<RowDisplayAuthors key="RowDisplayAuthors" fieldIndex={fieldIndex} fieldName={fieldName} referenceJson={referenceJson} />); }
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
    return (
      <Alert variant={variant} onClose={() => dispatch(closeUpdateAlert())} dismissible>
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
      let [valueLiveCuriePrefix, valueLiveCurieId] = splitCurie(crossRefCurie);
      hasPages = (enumDict['mods'].includes(valueLiveCuriePrefix)) ? true : false; }
    if (hasPages) { updateJson['pages'] = [ 'reference' ] }
    if (('is_obsolete' in crossRefDict) && (crossRefDict['is_obsolete'] !== '')) {
      updateJson['is_obsolete'] = crossRefDict['is_obsolete'] }
    return updateJson }

  function updateBiblio(referenceCurie, referenceJsonLive) {
    // console.log('updateBiblio')
    const forApiArray = []
    let updateJson = {}
    const fieldsSimpleNotPatch = ['reference_id', 'curie', 'resource_curie', 'resource_title' ];
    for (const field of fieldsSimple.values()) {
      if ((field in referenceJsonLive) && !(fieldsSimpleNotPatch.includes(field))) {
        updateJson[field] = referenceJsonLive[field] } }
    for (const field of fieldsArrayString.values()) {
      if (field in referenceJsonLive) {
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

    if ('cross_references' in referenceJsonLive && referenceJsonLive['cross_references'] !== null) {
      const crossRefFields = [ 'curie', 'is_obsolete' ];
      let field = 'cross_references';
      for (const[index, crossRefDict] of referenceJsonLive['cross_references'].entries()) {
        if ('needsChange' in crossRefDict) {
          let needsCreate = false
          if (('cross_reference_id' in crossRefDict)) {		// whole new entries needs create
            needsCreate = true }
          else if ('curie' in crossRefDict) {			// pre-existing entries need delete or update
            let crossRefCurieDb = referenceJsonDb[field][index]['curie']
            let crossRefCurieLive = crossRefDict['curie']
            let subPath = 'cross-reference/' + referenceJsonDb[field][index]['curie']
            if ( crossRefCurieLive !== crossRefCurieDb ) {	// xref curie has changed, delete+create
              needsCreate = true
              let array = [ subPath, null, 'DELETE', index, field, null ]
              forApiArray.push( array ); }
            else {	// xref curie same, update (delete+create async would cause create failure before delete
              let updateJson = generateCrossReferenceUpdateJson(crossRefDict, referenceCurie)
              // console.log(updateJson)
              let array = [ subPath, updateJson, 'PATCH', index, field, null ]
              forApiArray.push( array ); } }
          if ((needsCreate === true) && ('curie' in crossRefDict) && (crossRefDict['curie'] !== '')) {
            let createJson = generateCrossReferenceUpdateJson(crossRefDict, referenceCurie)
            createJson['curie'] = crossRefDict['curie']		// createJson is same as updateJson + crossRef curie
            // console.log(createJson)
            let subPath = 'cross-reference/'
            let array = [ subPath, createJson, 'POST', index, field, null ]
// UNDO put this back and test it when API for post is working
            forApiArray.push( array ); }
    } } }

    let dispatchCount = forApiArray.length;

    // console.log('dispatchCount ' + dispatchCount)
    dispatch(setBiblioUpdating(dispatchCount))

    for (const arrayData of forApiArray.values()) {
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

const ColEditorCheckbox = ({colSize, label, updatedFlag, disabled, fieldKey, checked, dispatchAction}) => {
  const dispatch = useDispatch();
  return (  <Col sm={colSize} className={`Col-checkbox ${updatedFlag}`} >
              <Form.Check inline checked={checked} disabled={disabled} type='checkbox' label={label} id={fieldKey} onChange={(e) => dispatch(changeFieldCrossReferencesReferenceJson(e))} />
            </Col>); }

const RowEditorSimple = ({fieldName, referenceJsonLive, referenceJsonDb}) => {
  const dispatch = useDispatch();
  const hasPmid = useSelector(state => state.biblio.hasPmid);
  let disabled = ''
  if (hasPmid && (fieldsPubmed.includes(fieldName))) { disabled = 'disabled'; }
  if (fieldsDisplayOnly.includes(fieldName)) { disabled = 'disabled'; }
  let valueLive = ''; let valueDb = ''; let updatedFlag = '';
  if (fieldName in referenceJsonDb) { valueDb = referenceJsonDb[fieldName] }
  if (fieldName in referenceJsonLive) { valueLive = referenceJsonLive[fieldName] }
  if (valueLive !== valueDb) { updatedFlag = 'updated'; }
  valueLive = valueLive || '';
  let fieldType = 'input';
  if (fieldName in fieldTypeDict) { fieldType = fieldTypeDict[fieldName] }
  let otherColSize = 9;
  let revertElement = (<Col sm="1"><Button id={`revert ${fieldName}`} variant="outline-secondary" onClick={(e) => dispatch(biblioRevertField(e))} >Revert</Button>{' '}</Col>);
  if (disabled === 'disabled') { revertElement = (<></>); otherColSize = 10; }
  let colEditorElement = (<ColEditorSimple key={`colElement ${fieldName}`} fieldType={fieldType} fieldName={fieldName} colSize={otherColSize} value={valueLive} updatedFlag={updatedFlag} placeholder={fieldName} disabled={disabled} fieldKey={fieldName} dispatchAction={changeFieldReferenceJson} />)
  if (fieldType === 'select') {
    colEditorElement = (<ColEditorSelect key={`colElement ${fieldName}`} fieldType={fieldType} fieldName={fieldName} colSize={otherColSize} value={valueLive} updatedFlag={updatedFlag} disabled={disabled} fieldKey={fieldName} dispatchAction={changeFieldReferenceJson} enumType={fieldName} />) }
  return ( <Form.Group as={Row} key={fieldName} >
             <Form.Label column sm="2" className={`Col-general`} >{fieldName}</Form.Label>
             {colEditorElement}
             {revertElement}
           </Form.Group>);
} // const RowEditorSimple

// TODO resource_curie should update differently (like a xref ?)
//                  <Button variant="outline-secondary"><span style={{fontSize:'1em'}}>&#9100;</span></Button>{' '}

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
        let revertElement = (<Col sm="1"><Button id={`revert ${fieldName} ${index}`} variant="outline-secondary" onClick={(e) => dispatch(biblioRevertFieldArray(e))} >Revert</Button>{' '}</Col>);
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
//   const revertDictFields = ['source', 'reference_type']
  const revertDictFields = 'source, reference_type'
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
      let revertElement = (<Col sm="1"><Button id={`revert ${fieldName} ${index}`} variant="outline-secondary" value={revertDictFields} onClick={(e) => dispatch(biblioRevertFieldArray(e))} >Revert</Button>{' '}</Col>);
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

const RowEditorCrossReferences = ({fieldIndex, fieldName, referenceJsonLive, referenceJsonDb}) => {
  const dispatch = useDispatch();
  const hasPmid = useSelector(state => state.biblio.hasPmid);
  const revertDictFields = 'curie prefix, curie id, is_obsolete'
  const initializeDict = {'curie': '', 'url': null, 'is_obsolete': false, 'cross_reference_id': 'new'}
  let disabled = ''
  if (hasPmid && (fieldsPubmed.includes(fieldName))) { disabled = 'disabled'; }
  if (fieldsDisplayOnly.includes(fieldName)) { disabled = 'disabled'; }
  const rowCrossReferencesElements = []

  if ('cross_references' in referenceJsonLive && referenceJsonLive['cross_references'] !== null) {
    for (const[index, crossRefDict] of referenceJsonLive['cross_references'].entries()) {
      let otherColSize = 6;
      let revertElement = (<Col sm="1"><Button id={`revert ${fieldName} ${index}`} variant="outline-secondary" value={revertDictFields} onClick={(e) => dispatch(biblioRevertFieldArray(e))} >Revert</Button>{' '}</Col>);
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
          <Col className="Col-general form-label col-form-label" sm="2" >{fieldName}</Col>
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
//       <Form.Check 
//         inline
//         checked={obsoleteChecked}
//         type='checkbox'
//         label='obsolete'
//         id={`${fieldName} ${index} is_obsolete`}
//         onChange={(e) => dispatch(changeFieldCrossReferencesReferenceJson(e))}
//       />
//           <ColEditorSimple key={`colElement ${fieldName} ${index} is_obsolete`} fieldType="input" fieldName={fieldName} colSize="2" value={valueLiveReferenceType} updatedFlag={updatedFlagReferenceType} placeholder="is_obsolete" disabled={disabled} fieldKey={`${fieldName} ${index} is_obsolete`} dispatchAction={changeFieldCrossReferencesReferenceJson} />
//           <ColEditorSelect key={`colElement ${fieldName} ${index} curie`} fieldType="select" fieldName={fieldName} colSize="4" value={valueLiveCurie} updatedFlag={updatedFlagCurie} placeholder="curie" disabled={disabled} fieldKey={`${fieldName} ${index} curie`} enumType="mods" dispatchAction={changeFieldModReferenceReferenceJson} />

const BiblioEditor = () => {
  const referenceJson = useSelector(state => state.biblio.referenceJsonLive);
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const referenceJsonDb = useSelector(state => state.biblio.referenceJsonDb);
  const rowOrderedElements = []
  for (const [fieldIndex, fieldName] of fieldsOrdered.entries()) {
    if (fieldName === 'DIVIDER') {
        rowOrderedElements.push(<RowDivider key={fieldIndex} />); }
    else if (fieldsSimple.includes(fieldName)) {
        rowOrderedElements.push(<RowEditorSimple key={fieldName} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />); }
    else if (fieldsArrayString.includes(fieldName)) {
      rowOrderedElements.push(<RowEditorArrayString key={`RowEditorArrayString ${fieldName}`} fieldIndex={fieldIndex} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />); }
    else if (fieldName === 'cross_references') {
      rowOrderedElements.push(<RowEditorCrossReferences key={`RowEditorCrossReferences ${fieldName}`} fieldIndex={fieldIndex} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />); }
    else if (fieldName === 'mod_reference_types') {
      rowOrderedElements.push(<RowEditorModReferenceTypes key="RowEditorModReferenceTypes" fieldIndex={fieldIndex} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />); }
    else if (fieldName === 'mesh_terms') {
      rowOrderedElements.push(<RowDisplayMeshTerms key="RowDisplayMeshTerms" fieldIndex={fieldIndex} fieldName={fieldName} referenceJson={referenceJson} displayOrEditor="editor" />); }
  } // for (const [fieldIndex, fieldName] of fieldsOrdered.entries())

  return (<Container><Form><BiblioSubmitUpdateRouter />{rowOrderedElements}</Form></Container>);
} // const BiblioEditor

const Biblio = () => {

  const dispatch = useDispatch();

  const crossRefCurieQueryRedirectToBiblio = useSelector(state => state.query.redirectToBiblio);
//   console.log("biblio crossRefCurieQueryRedirectToBiblio " + crossRefCurieQueryRedirectToBiblio);

  const crossRefCurieQueryResponseField = useSelector(state => state.query.responseField);
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
  const loadingQuery = useSelector(state => state.biblio.loadingQuery);
//   const queryFailure = useSelector(state => state.biblio.queryFailure);	// do something when user puts in invalid curie

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

  if (referenceCurie !== '' && (getReferenceCurieFlag === true)) {
    console.log('biblio DISPATCH biblioQueryReferenceCurie ' + referenceCurie);
    dispatch(biblioQueryReferenceCurie(referenceCurie));
  }

// set in reducer when BIBLIO_GET_REFERENCE_CURIE populates referenceJson
//   if ((setLoadingQuery === true) && (getReferenceCurieFlag === false)) { 
//     console.log('biblio dispatch setLoadingQuery false');
//     dispatch(setLoadingQuery(false));
//   }

//   const referenceJson = useSelector(state => state.biblio.referenceJson);

//     <Row className="Row-general" xs={2} md={4} lg={6}>
//       <Col className="Col-general Col-display">reference_id</Col>
//       <Col className="Col-general Col-display" lg={{ span: 10 }}>{referenceJson.reference_id}</Col>
//     </Row>

//       <Row className="Row-general" xs={2} md={4} lg={6}>
//         <Col className="Col-general Col-display">value</Col>
//         <Col className="Col-general Col-display" lg={{ span: 10 }}>{referenceJson.value}</Col>
//       </Row>

// this works, but want to try jsx map
//   const items = []
//   for (const [index, value] of fieldsSimple.entries()) {
// //     items.push(<div align="left" className="task" key={index}>{value} to {referenceJson[value]}</div>)
//     if (referenceJson[value] !== null) {
//     items.push(
//       <Row className="Row-general" xs={2} md={4} lg={6}>
//         <Col className="Col-general Col-display">{value}</Col>
//         <Col className="Col-general Col-display" lg={{ span: 10 }}>{referenceJson[value]}</Col>
//       </Row>);
//     }
//   }
//       {items}

//   const fieldsSimple = ['curie', 'reference_id', 'title', 'category', 'citation', 'volume', 'pages', 'language', 'abstract', 'publisher', 'issue_name', 'issue_date', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified', 'resource_curie', 'resource_title' ];


  function LoadingElement() {
    return (<Container><img src={loading_gif} className="loading_gif" alt="loading" /></Container>);
  }

  return (
    <div>
      <h4>Biblio about this Reference</h4>
      <div align="center" className="task" >{referenceCurie}</div>
      { loadingQuery ? <LoadingElement /> : <BiblioActionRouter /> }
      <Link to='/'>Go Back</Link>
    </div>
  )

// this in return works
//       <input type="text" name="crossRefCurieQuery" value={tempField} onChange={(e) => dispatch(changeTemp(e))} />

// all of these in return lose focus if they're defined as functional components inside the Biblio functional component, but work fine if created outside
//       <BiblioEditor />
//       { loadingQuery ? <LoadingElement /> : <BiblioDisplay /> }
//       { loadingQuery ? <LoadingElement /> : <BiblioEditor /> }

// manual field definition
//       <div align="left" className="task" >reference_id: {referenceJson.reference_id}</div>
//       <div align="left" className="task" >title: {referenceJson.title}</div>
//       <div align="left" className="task" >volume: {referenceJson.volume}</div>
//       <div align="left" className="task" >date_updated: {referenceJson.date_updated}</div>
//       <div align="left" className="task" >abstract: {referenceJson.abstract}</div>


//   const [tasks, setTasks] = useState([
//     {
//       id: 1,
//       text: 'something first',
//       day: 'Feb 5th at 2:30pm',
//       reminder: true,
//     },
//     {
//       id: 2,
//       text: 'something second',
//       day: 'Feb 6th at 1:30pm',
//       reminder: true,
//     },
//     {
//       id: 3,
//       text: 'something third',
//       day: 'Feb 5th at 1:00pm',
//       reminder: false,
//     }
//   ])

//   const [tasks, setTasks] = useState({
//     "data": [
//         {
//             "datePublished": "1978",
//             "citation": "Abdul Kader N et al. (1978) Revue de Nematologie \"Induction, detection and isolation of temperature-sensitive lethal and/or ....\"",
//             "pages": "27-37",
//             "primaryId": "WB:WBPaper00000003",
//             "volume": "1"
//         }]
//   })
// 
//   useEffect(() => {
//     const getTasks = async () => {
//       const tasksFromServer = await fetchTasks()
//       setTasks(tasksFromServer)
//     }
// 
//     getTasks()
//   }, [])
// 
//   const fetchTasks = async () => {
//     const res = await fetch('http://dev.alliancegenome.org/azurebrd/agr-lit/sample.json', {mode: 'cors'})
//     const data = await res.json()
//     return data
//   }
// 
//   return (
//     <div>
//       <h4>Biblio about this Reference</h4>
//       <div>{crossRefCurieQueryResponseField}</div>
//       <Link to='/'>Go Back</Link>
//       {tasks['data'].map((task, index) => (
//         <div align="left" key={index} className={`task ${task.reminder && 'reminder'}`}><h5>{task.primaryId}</h5>pages : {task.pages}<div>{task.citation}</div></div>
//       ))}
//     </div>
//   )

}

//       {tasks.length > 0 ? ( <div>hello</div> ) : ( <div>nothing</div> )}
//       {tasks.map((task, index) => (
//         <>
//         <div className={`task ${task.reminder && 'reminder'}`}>{task.id} : {task.text}<div>{task.day}</div></div>
//         </>
//       ))}

export default Biblio
