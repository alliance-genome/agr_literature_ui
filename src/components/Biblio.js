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
import { changeBiblioActionToggler } from '../actions/biblioActions';
import { biblioAddNewRowString } from '../actions/biblioActions';
import { biblioAddNewRowDict } from '../actions/biblioActions';
import { updateButtonBiblio } from '../actions/biblioActions';
import { closeUpdateAlert } from '../actions/biblioActions';
import { changeBiblioMeshExpandToggler } from '../actions/biblioActions';
import { changeBiblioAuthorExpandToggler } from '../actions/biblioActions';

import { useLocation } from 'react-router-dom';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert'

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
const fieldsDisplayOnly = [ 'citation', 'pubmed_type', 'date_arrived_in_pubmed', 'date_last_modified', 'mesh_terms' ];


const fieldTypeDict = {}
fieldTypeDict['abstract'] = 'textarea'
fieldTypeDict['category'] = 'select'

const enumDict = {}
enumDict['category'] = ['research_article', 'review_article', 'thesis', 'book', 'other', 'preprint', 'conference_publication', 'personal_communication', 'direct_data_submission', 'internal_process_reference', 'unknown', 'retraction']

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

const RowDisplaySimple = ({fieldName, value}) => {
  return (
            <Row key={fieldName} className="Row-general" xs={2} md={4} lg={6}>
              <Col className="Col-general Col-display Col-display-left">{fieldName}</Col>
              <Col className="Col-general Col-display Col-display-right" lg={{ span: 10 }}>{value}</Col>
            </Row>); }

const RowDisplayArrayString = ({fieldIndex, fieldName, referenceJson}) => {
  if (fieldName in referenceJson && referenceJson[fieldName] !== null) {	// need this because referenceJson starts empty before values get added
    const rowArrayStringElements = []
    if (referenceJson[fieldName].length === 0) {
      rowArrayStringElements.push(<RowDisplaySimple key={fieldName} fieldName={fieldName} value="" />); }
    else {
      for (const [index, value] of referenceJson[fieldName].entries()) {
        rowArrayStringElements.push(<RowDisplaySimple key={`${fieldIndex} ${index}`} fieldName={fieldName} value={value} />); } }
    return (<>{rowArrayStringElements}</>); }
  else { return null; } }

const RowDisplayCrossReferences = ({fieldIndex, fieldName, referenceJson}) => {
  if ('cross_references' in referenceJson && referenceJson['cross_references'] !== null) {
    const rowCrossReferenceElements = []
    for (const[index, value] of referenceJson['cross_references'].entries()) {
      let url = value['url'];
      if ('pages' in value && value['pages'] !== null) { url = value['pages'][0]['url']; }
      const xrefValue = (<a href={url}  rel="noreferrer noopener" target="_blank">{value['curie']}</a>);
      rowCrossReferenceElements.push(<RowDisplaySimple key={`${fieldIndex} ${index}`} fieldName={fieldName} value={xrefValue} />); }
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

const RowDisplayModReferenceTypes = ({fieldIndex, fieldName, referenceJson}) => {
  if ('mod_reference_types' in referenceJson && referenceJson['mod_reference_types'] !== null) {
    const rowModReferenceTypesElements = []
    for (const[index, value] of referenceJson['mod_reference_types'].entries()) {
      rowModReferenceTypesElements.push(
        <Row key={`${fieldIndex} ${index}`} className="Row-general" xs={2} md={4} lg={6}>
          <Col className="Col-general Col-display Col-display-left">mod_reference_types</Col>
          <Col className="Col-general Col-display " lg={{ span: 2 }}>{value['source']}</Col>
          <Col className="Col-general Col-display Col-display-right" lg={{ span: 8 }}>{value['reference_type']}</Col>
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
  const referenceJson = useSelector(state => state.biblio.referenceJson);
  const rowOrderedElements = []
  for (const [fieldIndex, fieldName] of fieldsOrdered.entries()) {
    if (fieldName === 'DIVIDER') {
        rowOrderedElements.push(<RowDivider key={fieldIndex} />); }
    else if (fieldsSimple.includes(fieldName)) {
        rowOrderedElements.push(<RowDisplaySimple key={fieldName} fieldName={fieldName} value={referenceJson[fieldName]} />); }
    else if (fieldsArrayString.includes(fieldName)) {
      rowOrderedElements.push(<RowDisplayArrayString key={`RowDisplayArrayString ${fieldName}`} fieldIndex={fieldIndex} fieldName={fieldName} referenceJson={referenceJson} />); }
    else if (fieldName === 'cross_references') {
      rowOrderedElements.push(<RowDisplayCrossReferences key="RowDisplayCrossReferences" fieldIndex={fieldIndex} fieldName={fieldName} referenceJson={referenceJson} />); }
    else if (fieldName === 'tags') {
      rowOrderedElements.push(<RowDisplayTags key="RowDisplayTags" fieldIndex={fieldIndex} fieldName={fieldName} referenceJson={referenceJson} />); }
    else if (fieldName === 'mod_reference_types') {
      rowOrderedElements.push(<RowDisplayModReferenceTypes key="RowDisplayModReferenceTypes" fieldIndex={fieldIndex} fieldName={fieldName} referenceJson={referenceJson} />); }
    else if (fieldName === 'mesh_terms') {
      rowOrderedElements.push(<RowDisplayMeshTerms key="RowDisplayMeshTerms" fieldIndex={fieldIndex} fieldName={fieldName} referenceJson={referenceJson} displayOrEditor="display" />); }
    else if (fieldName === 'authors') {
      rowOrderedElements.push(<RowDisplayAuthors key="RowDisplayAuthors" fieldIndex={fieldIndex} fieldName={fieldName} referenceJson={referenceJson} />); }
  } // for (const [fieldIndex, fieldName] of fieldsOrdered.entries())

  return (<Container>{rowOrderedElements}</Container>);
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
  const referenceJson = useSelector(state => state.biblio.referenceJson);

  function updateBiblio(referenceCurie, referenceJson) {
    // console.log('updateBiblio')
    const forApiArray = []
    let updateJson = {}
    const fieldsSimpleNotPatch = ['reference_id', 'curie', 'resource_curie', 'resource_title' ];
    for (const field of fieldsSimple.values()) {
      if ((field in referenceJson) && !(fieldsSimpleNotPatch.includes(field))) {
        updateJson[field] = referenceJson[field] } }
    for (const field of fieldsArrayString.values()) {
      if (field in referenceJson) {
        updateJson[field] = referenceJson[field] } }
    let subPath = 'reference/' + referenceCurie;
    let array = [ subPath, updateJson, 'PATCH', 0, null, null]
    forApiArray.push( array );

    if ('mod_reference_types' in referenceJson && referenceJson['mod_reference_types'] !== null) {
      const modRefFields = [ 'reference_type', 'source' ];
      for (const[index, modRefDict] of referenceJson['mod_reference_types'].entries()) {
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

    let dispatchCount = forApiArray.length;

    // console.log('dispatchCount ' + dispatchCount)
    dispatch(setBiblioUpdating(dispatchCount))

    for (const arrayData of forApiArray.values()) {
      dispatch(updateButtonBiblio(arrayData))
    }
    // console.log('end updateBiblio')
  } // function updateBiblio(referenceCurie, referenceJson)

  return (
       <Row className="form-group row" >
         <Col className="form-label col-form-label" sm="2" ></Col>
         <Col sm="10" ><div className="form-control biblio-button" type="submit" onClick={() => updateBiblio(referenceJson.curie, referenceJson)}>Update Biblio Data</div></Col>
       </Row>
  );
} // const BiblioSubmitUpdateButton

//          <Col sm="10" ><div className="form-control biblio-button" type="submit" onClick={() => updateBiblio(referenceJson.curie, updateJson)}>Update Biblio Data</div></Col>

//   const rowOrderedElements = []
//   for (const [fieldIndex, fieldName] of fieldsOrdered.entries()) {
//     if (fieldName === 'DIVIDER') {
//         rowOrderedElements.push(<RowDivider key={fieldIndex} />); }
//     else if (fieldsSimple.includes(fieldName)) {
//         rowOrderedElements.push(<RowDisplaySimple key={fieldName} fieldName={fieldName} value={referenceJson[fieldName]} />); }
//     else if (fieldsArrayString.includes(fieldName)) {
//       rowOrderedElements.push(<RowDisplayArrayString key={`RowDisplayArrayString ${fieldName}`} fieldIndex={fieldIndex} fieldName={fieldName} referenceJson={referenceJson} />); }
//     else if (fieldName === 'cross_references') {
//       rowOrderedElements.push(<RowDisplayCrossReferences key="RowDisplayCrossReferences" fieldIndex={fieldIndex} fieldName={fieldName} referenceJson={referenceJson} />); }
//     else if (fieldName === 'tags') {
//       rowOrderedElements.push(<RowDisplayTags key="RowDisplayTags" fieldIndex={fieldIndex} fieldName={fieldName} referenceJson={referenceJson} />); }
//     else if (fieldName === 'mod_reference_types') {
//       rowOrderedElements.push(<RowDisplayModReferenceTypes key="RowDisplayModReferenceTypes" fieldIndex={fieldIndex} fieldName={fieldName} referenceJson={referenceJson} />); }
//     else if (fieldName === 'mesh_terms') {
//       rowOrderedElements.push(<RowDisplayMeshTerms key="RowDisplayMeshTerms" fieldIndex={fieldIndex} fieldName={fieldName} referenceJson={referenceJson} />); }
//     else if (fieldName === 'authors') {
//       rowOrderedElements.push(<RowDisplayAuthors key="RowDisplayAuthors" fieldIndex={fieldIndex} fieldName={fieldName} referenceJson={referenceJson} />); }
//   } // for (const [fieldIndex, fieldName] of fieldsOrdered.entries())
// 
//   return (<Container>{rowOrderedElements}</Container>);

const RowEditorSimple = ({fieldName, value}) => {
  const dispatch = useDispatch();
  const hasPmid = useSelector(state => state.biblio.hasPmid);
  let disabled = ''
  if (hasPmid && (fieldsPubmed.includes(fieldName))) { disabled = 'disabled'; }
  if (fieldsDisplayOnly.includes(fieldName)) { disabled = 'disabled'; }
  value = value || '';
  let fieldType = 'input';
  if (fieldName in fieldTypeDict) { fieldType = fieldTypeDict[fieldName] }
//   if (fieldType === 'enum') { return null; }
// fieldTypeDict['abstract'] = 'textarea'
// fieldTypeDict['category'] = 'enum'
//   if (fieldName === 'abstract') { fieldType = 'textarea'; }
//   let selectOptions = []
  if (fieldName in enumDict) {
    return ( <Form.Group as={Row} key={fieldName} controlId={fieldName}>
               <Form.Label column sm="2" className="Col-general" >{fieldName}</Form.Label>
               <Col sm="10">
                 <Form.Control as={fieldType} type="{fieldName}" value={value} disabled={disabled} placeholder={fieldName} onChange={(e) => dispatch(changeFieldReferenceJson(e))} >
                   {fieldName in enumDict && enumDict[fieldName].map((optionValue, index) => (
                     <option key={`${fieldName} ${optionValue}`}>{optionValue}</option>
                   ))}
                 </Form.Control>
               </Col>
             </Form.Group>); }
  else {
    return ( <Form.Group as={Row} key={fieldName} controlId={fieldName}>
               <Form.Label column sm="2" className="Col-general" >{fieldName}</Form.Label>
               <Col sm="10">
                 <Form.Control as={fieldType} type="{fieldName}" value={value} disabled={disabled} placeholder={fieldName} onChange={(e) => dispatch(changeFieldReferenceJson(e))} />
               </Col>
             </Form.Group>); }
} // const RowEditorSimple

// const RowDisplaySimple = ({fieldName, value}) => {
//   return (
//             <Row key={fieldName} className="Row-general" xs={2} md={4} lg={6}>
//               <Col className="Col-general Col-display Col-display-left">{fieldName}</Col>
//               <Col className="Col-general Col-display Col-display-right" lg={{ span: 10 }}>{value}</Col>
//             </Row>); }

const RowEditorArrayString = ({fieldIndex, fieldName, referenceJson}) => {
  const dispatch = useDispatch();
  const hasPmid = useSelector(state => state.biblio.hasPmid);
  let disabled = ''
  if (hasPmid && (fieldsPubmed.includes(fieldName))) { disabled = 'disabled'; }
  if (fieldsDisplayOnly.includes(fieldName)) { disabled = 'disabled'; }
  const rowArrayStringElements = []
  if (fieldName in referenceJson && referenceJson[fieldName] !== null) {	// need this because referenceJson starts empty before values get added
      let fieldType = 'input';
      for (const [index, value] of referenceJson[fieldName].entries()) {
//         const key = field + ' ' + index;
        rowArrayStringElements.push(
          <Form.Group as={Row} key={`${fieldName} ${index}`} controlId={`${fieldName} ${index}`}>
            <Form.Label column sm="2" className="Col-general" >{fieldName}</Form.Label>
            <Col sm="10">
              <Form.Control as={fieldType} type="{fieldName}" value={value} disabled={disabled} placeholder={fieldName} onChange={(e) => dispatch(changeFieldArrayReferenceJson(e))} />
            </Col>
          </Form.Group>); } }
  if (disabled === '') {
    rowArrayStringElements.push(
      <Row className="form-group row" key={fieldName} >
        <Col className="form-label col-form-label Col-general" sm="2" >{fieldName}</Col>
        <Col sm="10" ><div id={fieldName} className="form-control biblio-button" onClick={(e) => dispatch(biblioAddNewRowString(e))} >add {fieldName}</div></Col>
      </Row>);
  }
  return (<>{rowArrayStringElements}</>); }

const RowEditorModReferenceTypes = ({fieldIndex, fieldName, referenceJson}) => {
  const dispatch = useDispatch();
  const hasPmid = useSelector(state => state.biblio.hasPmid);
//   const dictFields = ['source', 'reference_type']
  const initializeDict = {'source': '', 'reference_type': '', 'mod_reference_type_id': 'new'}
  let disabled = ''
  if (hasPmid && (fieldsPubmed.includes(fieldName))) { disabled = 'disabled'; }
  if (fieldsDisplayOnly.includes(fieldName)) { disabled = 'disabled'; }
  const rowModReferenceTypesElements = []
  if ('mod_reference_types' in referenceJson && referenceJson['mod_reference_types'] !== null) {
    let fieldType = 'input';
//     if (fieldName in fieldTypeDict) { fieldType = fieldTypeDict[fieldName] }
    for (const[index, modRefDict] of referenceJson['mod_reference_types'].entries()) {
      rowModReferenceTypesElements.push(
        <Form.Group as={Row} key={`${fieldName} ${index}`}>
          <Col className="form-label col-form-label" sm="2" >{fieldName}</Col>
          <Col sm="5">
              <Form.Control as={fieldType} id={`${fieldName} source ${index}`} type="{fieldName}" value={modRefDict['source']} disabled={disabled} placeholder="source" onChange={(e) => dispatch(changeFieldModReferenceReferenceJson(e))} />
          </Col>
          <Col sm="5">
              <Form.Control as={fieldType} id={`${fieldName} reference_type ${index}`} type="{fieldName}" value={modRefDict['reference_type']} disabled={disabled} placeholder="reference_type" onChange={(e) => dispatch(changeFieldModReferenceReferenceJson(e))} />
          </Col>
        </Form.Group>); } }
  if (disabled === '') {
    rowModReferenceTypesElements.push(
      <Row className="form-group row" key={fieldName} >
        <Col className="form-label col-form-label" sm="2" >{fieldName}</Col>
        <Col sm="10" ><div id={fieldName} className="form-control biblio-button" onClick={(e) => dispatch(biblioAddNewRowDict(e, initializeDict))} >add {fieldName}</div></Col>
      </Row>);
  }
  return (<>{rowModReferenceTypesElements}</>); }

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

const BiblioEditor = () => {
  const referenceJson = useSelector(state => state.biblio.referenceJson);
  const rowOrderedElements = []
  for (const [fieldIndex, fieldName] of fieldsOrdered.entries()) {
    if (fieldName === 'DIVIDER') {
        rowOrderedElements.push(<RowDivider key={fieldIndex} />); }
    else if (fieldsSimple.includes(fieldName)) {
        rowOrderedElements.push(<RowEditorSimple key={fieldName} fieldName={fieldName} value={referenceJson[fieldName]} />); }
    else if (fieldsArrayString.includes(fieldName)) {
      rowOrderedElements.push(<RowEditorArrayString key={`RowEditorArrayString ${fieldName}`} fieldIndex={fieldIndex} fieldName={fieldName} referenceJson={referenceJson} />); }
    else if (fieldName === 'mod_reference_types') {
      rowOrderedElements.push(<RowEditorModReferenceTypes key="RowEditorModReferenceTypes" fieldIndex={fieldIndex} fieldName={fieldName} referenceJson={referenceJson} />); }
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
  const alreadyGotJson = useSelector(state => state.biblio.alreadyGotJson);
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

  if (referenceCurie !== '' && (alreadyGotJson === false)) {
    console.log('biblio DISPATCH biblioQueryReferenceCurie ' + referenceCurie);
    dispatch(biblioQueryReferenceCurie(referenceCurie));
  }

// set in reducer when BIBLIO_GET_REFERENCE_CURIE populates referenceJson
//   if ((setLoadingQuery === true) && (alreadyGotJson === true)) { 
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
