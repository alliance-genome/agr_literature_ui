// import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import RowDivider from './RowDivider';

import { BiblioSubmitUpdateRouter } from './BiblioEditor';
import { AuthorExpandToggler } from './BiblioEditor';
import { splitCurie } from './BiblioEditor';
import { aggregateCitation } from './BiblioEditor';

import { changeBiblioMeshExpandToggler } from '../../actions/biblioActions';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';

import { fieldsSimple, fieldsArrayString, fieldsOrdered } from './BiblioEditor';


// constants available in BiblioEditor
// import { 
//   fieldsSimple, fieldsArrayString, fieldsOrdered, fieldsPubmed, fieldsDisplayOnly, fieldsDatePublished,
//   fieldTypeDict, enumDict
// } from './BiblioEditor';


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


export const RowDisplaySimple = ({fieldName, value, updatedFlag}) => {
  return (  <Row key={fieldName} className="Row-general" xs={2} md={4} lg={6}>
              <Col className="Col-general Col-display Col-display-left">{fieldName}</Col>
              <Col className={`Col-general Col-display Col-display-right ${updatedFlag}`} lg={{ span: 10 }}>{value}</Col>
            </Row>); }

export const RowDisplayString = ({fieldName, referenceJsonLive, referenceJsonDb}) => {
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

const RowDisplayModAssociation = ({fieldIndex, fieldName, referenceJsonLive, referenceJsonDb}) => {
//   fieldName = 'mod_corpus_associations';
  if ('mod_corpus_associations' in referenceJsonLive && referenceJsonLive['mod_corpus_associations'] !== null) {
    const rowModAssociationElements = []
    for (const[index, modAssociationDict] of referenceJsonLive['mod_corpus_associations'].entries()) {
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

        rowModAssociationElements.push(
          <Row key={`${fieldIndex} ${index}`} className="Row-general" xs={2} md={4} lg={6}>
            <Col className="Col-general Col-display Col-display-left">mod_corpus_associations</Col>
            <Col className={`Col-general Col-display ${updatedFlagMod} `} lg={{ span: 2 }}>{valueLiveMod}</Col>
            <Col className={`Col-general Col-display ${updatedFlagCorpus} `} lg={{ span: 4 }}>{valueLiveCorpus}</Col>
            <Col className={`Col-general Col-display Col-display-right ${updatedFlagSource} `} lg={{ span: 4 }}>{valueLiveSource}</Col>
          </Row>);
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

export const RowDisplayMeshTerms = ({fieldIndex, fieldName, referenceJsonLive, displayOrEditor}) => {
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
    else if (fieldName === 'date_published') {
      rowOrderedElements.push(<RowDisplayString key={fieldName} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />); }
  } // for (const [fieldIndex, fieldName] of fieldsOrdered.entries())

  return (<Container><BiblioSubmitUpdateRouter />{rowOrderedElements}</Container>);
} // const BiblioDisplay


export default BiblioDisplay
