// import { Link } from 'react-router-dom'
// import { useHistory } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';

import { changeFieldInput } from '../actions/mergeActions';
import { mergeQueryReferences } from '../actions/mergeActions';
import { mergeResetReferences } from '../actions/mergeActions';
import { mergeSwapKeep } from '../actions/mergeActions';
import { mergeSwapKeepPmid } from '../actions/mergeActions';
import { mergeSwapPairSimple } from '../actions/mergeActions';
import { mergeToggleIndependent } from '../actions/mergeActions';
import { mergeButtonApiDispatch } from '../actions/mergeActions';
import { setMergeUpdating } from '../actions/mergeActions';
import { closeMergeUpdateAlert } from '../actions/mergeActions';

import { splitCurie } from './Biblio';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button'
import Badge from 'react-bootstrap/Badge'
import Alert from 'react-bootstrap/Alert'
import Tooltip from 'react-bootstrap/Tooltip'
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import {Spinner} from "react-bootstrap";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExchangeAlt } from '@fortawesome/free-solid-svg-icons'
import { faLock } from '@fortawesome/free-solid-svg-icons'
import { faLockOpen } from '@fortawesome/free-solid-svg-icons'
// import { faLongArrowAltLeft } from '@fortawesome/free-solid-svg-icons'


const RowDivider = () => { return (<Row><Col>&nbsp;</Col></Row>); }

const fieldsSimple = ['curie', 'reference_id', 'title', 'category', 'citation', 'volume', 'page_range', 'language', 'abstract', 'plain_language_abstract', 'publisher', 'issue_name', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified_in_pubmed', 'resource_curie', 'resource_title' ];
const fieldsPubmedArrayString = ['keywords', 'pubmed_abstract_languages', 'pubmed_types' ];

const fieldsOrdered = [ 'title', 'DIVIDER', 'mod_corpus_associations', 'DIVIDER', 'cross_references', 'DIVIDER', 'corrections', 'authors', 'DIVIDER', 'abstract', 'pubmed_abstract_languages', 'plain_language_abstract', 'DIVIDER', 'category', 'pubmed_types', 'mod_reference_types', 'DIVIDER', 'resource_curie', 'resource_title', 'volume', 'issue_name', 'page_range', 'DIVIDER', 'publisher', 'language', 'DIVIDER', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified_in_pubmed', 'DIVIDER', 'keywords', 'mesh_terms' ];
// const fieldsOrdered = [ 'title', 'mod_corpus_associations', 'cross_references', 'corrections', 'authors', 'DIVIDER', 'abstract', 'pubmed_abstract_languages', 'plain_language_abstract', 'DIVIDER', 'category', 'pubmed_types', 'mod_reference_types', 'DIVIDER', 'resource_curie', 'resource_title', 'volume', 'issue_name', 'page_range', 'DIVIDER', 'editors', 'publisher', 'language', 'DIVIDER', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified_in_pubmed', 'DIVIDER', 'tags', 'DIVIDER', 'keywords', 'mesh_terms' ];
// const fieldsOrdered = [ 'title', 'mod_corpus_associations', 'cross_references', 'corrections', 'authors', 'DIVIDER', 'citation', 'abstract', 'pubmed_abstract_languages', 'plain_language_abstract', 'DIVIDER', 'category', 'pubmed_types', 'mod_reference_types', 'DIVIDER', 'resource_curie', 'resource_title', 'volume', 'issue_name', 'page_range', 'DIVIDER', 'editors', 'publisher', 'language', 'DIVIDER', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified_in_pubmed', 'DIVIDER', 'tags', 'DIVIDER', 'keywords', 'mesh_terms' ];

// const fieldsPubmed = [ 'title', 'corrections', 'authors', 'abstract', 'pubmed_types', 'resource_curie', 'resource_title', 'volume', 'issue_name', 'page_range', 'editors', 'publisher', 'language', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified_in_pubmed', 'keywords', 'mesh_terms', 'pubmed_abstract_languages', 'plain_language_abstract' ];

const fieldsNoLock = [ 'mod_corpus_associations', 'cross_references', 'mod_reference_types' ];
const fieldsPubmedUnlocked = [ 'authors', 'category', 'resource_curie', 'date_published' ];
const fieldsPubmedLocked = [ 'title', 'abstract', 'volume', 'issue_name', 'page_range', 'publisher', 'language' ];
const fieldsPubmedOnly = [ 'correction', 'pubmed_types', 'date_arrived_in_pubmed', 'date_last_modified_in_pubmed', 'mesh_terms', 'pubmed_abstract_languages', 'plain_language_abstract', 'keywords', 'corrections' ];
// const fieldsDisplayOnly = [ 'citation', 'pubmed_types', 'resource_title', 'date_arrived_in_pubmed', 'date_last_modified_in_pubmed', 'mesh_terms', 'pubmed_abstract_languages', 'plain_language_abstract' ];

const GenerateFieldLabel = (fieldName, isLocked) => {
  const renderTooltipLock = ( <Tooltip id="lock-tooltip" > Data in this field cannot be manually changed during a merge. </Tooltip> );
  const renderTooltipUnlock = ( <Tooltip id="unlock-tooltip" > Data in this field is tied to the PMID, but may be manually changed during a merge. </Tooltip> );
  if ( isLocked === 'lock' ) { 
    return (<div className={`div-merge div-merge-grey`}> 
      <OverlayTrigger placement="right" delay={{ show: 250, hide: 400 }} overlay={renderTooltipLock} >
        <FontAwesomeIcon icon={faLock} />
      </OverlayTrigger> {fieldName}</div>); }
  else if ( isLocked === 'unlock' ) { 
    return (<div className={`div-merge div-merge-grey`}> 
      <OverlayTrigger placement="right" delay={{ show: 250, hide: 400 }} overlay={renderTooltipUnlock} >
        <FontAwesomeIcon icon={faLockOpen} />
      </OverlayTrigger> {fieldName}</div>); }
  return (<div className={`div-merge div-merge-grey`}>{fieldName}</div>);
}

const GenerateIsLocked = (fieldName, hasPmid) => {
  if ( (fieldsPubmedOnly.includes(fieldName)) || ( (hasPmid) && (fieldsPubmedLocked.includes(fieldName)) ) ) { 
    return 'lock'; }
  else if ( (hasPmid) && (fieldsPubmedUnlocked.includes(fieldName)) ) {
    return 'unlock'; }
  else if (fieldsNoLock.includes(fieldName)) {
    return 'nolock'; }
  return 'nolock';
}

const MergeSelectionSection = () => {
  // const keepReference = useSelector(state => state.merge.keepReference);
  const isLoadingReferences = useSelector(state => state.merge.isLoadingReferences);
  const pmidKeepReference = useSelector(state => state.merge.pmidKeepReference);
  const referenceMeta1 = useSelector(state => state.merge.referenceMeta1);
  const referenceMeta2 = useSelector(state => state.merge.referenceMeta2);
  const referenceSwap = useSelector(state => state.merge.referenceSwap);
  const queryDoubleSuccess = useSelector(state => state.merge.queryDoubleSuccess);
  const hasPmid = useSelector(state => state.merge.hasPmid);
  // swap icon fa-exchange
  // left arrow icon fa-arrow-left 
  // <FontAwesomeIcon size='lg' icon={faLongArrowAltLeft} />

  let header1 = (<span className={`span-merge-header-success`} >Keep</span>)
  let header2 = (<span className={`span-merge-header-failure`} >Obsolete</span>)
  // if (keepReference === 2) {
  //   header2 = (<span className={`span-merge-header-success`} >Keep</span>)
  //   header1 = (<span className={`span-merge-header-failure`} >Obsolete</span>) }

  let curie1Class = 'span-merge-message-init';
  if (referenceMeta1.queryRefSuccess === null) { curie1Class = 'span-merge-message-init'; }
    else if (referenceMeta1.queryRefSuccess === true) { curie1Class = 'span-merge-message-success'; }
    else if (referenceMeta1.queryRefSuccess === false) { curie1Class = 'span-merge-message-failure'; }
  let curie2Class = 'span-merge-message-init';
  if (referenceMeta2.queryRefSuccess === null) { curie2Class = 'span-merge-message-init'; }
    else if (referenceMeta2.queryRefSuccess === true) { curie2Class = 'span-merge-message-success'; }
    else if (referenceMeta2.queryRefSuccess === false) { curie2Class = 'span-merge-message-failure'; }
  
  const dispatch = useDispatch();
  return (
    <>
    <Container>
      <Row>
        <Col sm="5" >{header1}<br/>
          <Form.Control as="input" id="referenceMeta1.input" value={referenceMeta1.input} disabled={referenceMeta1.disableInput} onChange={(e) => dispatch(changeFieldInput(e, 'referenceMeta1', 'input'))} />
          <span className={curie1Class} >{referenceMeta1.message}</span>
        </Col>
        <Col sm="2" ><br/>
          <Button onClick={(e) => dispatch(mergeSwapKeep())}>Swap <FontAwesomeIcon icon={faExchangeAlt} /></Button>
        </Col>
        <Col sm="5" >{header2}<br/>
          <Form.Control as="input" id="referenceMeta2.input" value={referenceMeta2.input} disabled={referenceMeta2.disableInput} onChange={(e) => dispatch(changeFieldInput(e, 'referenceMeta2', 'input'))} />
          <span className={curie2Class} >{referenceMeta2.message}</span>
        </Col>
      </Row>
      <Row>
        <Col sm="12" >
          {(() => {
            if (queryDoubleSuccess) { return (<Button variant='warning' onClick={() => dispatch(mergeResetReferences())} >Discard changes and new query</Button>) }
            return (<Button variant='primary' onClick={(e) => dispatch(mergeQueryReferences(referenceMeta1.input, referenceMeta2.input))} >
              {isLoadingReferences ? <Spinner animation="border" size="sm"/> : "Query for these references"}</Button>);
          })()}
        </Col>
      </Row>
      <RowDivider />
      <RowDivider />
    </Container>

    {(() => {
      if (queryDoubleSuccess) { return (
        <>
        <MergeSubmitUpdateRouter />
        <MergePairsSection referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} pmidKeepReference={pmidKeepReference} />
        </>
      ) }
    })()}
    </>
  );
}

const MergeSubmitUpdateRouter = () => {
  return (<><AlertDismissibleMergeUpdate /><MergeSubmitUpdateButton /></>);
//   const mergeUpdating = useSelector(state => state.merge.mergeUpdating);
// 
//   if (mergeUpdating > 0) {
//     return (<MergeSubmitUpdating />); }	// this does not exist, find out what curators want when updating and after update
//   else {
//     return (<><AlertDismissibleMergeUpdate /><MergeSubmitUpdateButton /></>); }
}

const AlertDismissibleMergeUpdate = () => {
  const dispatch = useDispatch();
  const updateAlert = useSelector(state => state.merge.updateAlert);
  const updateFailure = useSelector(state => state.merge.updateFailure);
  const updateMessages = useSelector(state => state.merge.updateMessages);
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
        dispatch(closeMergeUpdateAlert())
      }, 2000) }
    return (
      <Alert variant={variant} onClose={() => dispatch(closeMergeUpdateAlert())} dismissible>
        <Alert.Heading>{header}</Alert.Heading>
        {updateMessages.map((message, index) => (
          <div key={`${message} ${index}`}>{message}</div>
        ))}
      </Alert>
    );
  } else { return null; }
}

const MergeSubmitUpdateButton = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const mergeUpdating = useSelector(state => state.merge.mergeUpdating);
  const pmidKeepReference = useSelector(state => state.merge.pmidKeepReference);
  const referenceMeta1 = useSelector(state => state.merge.referenceMeta1);
  const referenceMeta2 = useSelector(state => state.merge.referenceMeta2);
  const referenceSwap = useSelector(state => state.merge.referenceSwap);
//   const queryDoubleSuccess = useSelector(state => state.merge.queryDoubleSuccess);
  const hasPmid = useSelector(state => state.merge.hasPmid);

  function mergeReferences() {
    const forApiArray = [];
    let updateJsonReferenceMain = {};

    const remapFieldNamesApi = { 'resource_curie': 'resource' };

    const fieldsSimpleNotPatch = ['reference_id', 'curie', 'resource_title', 'citation'];
    for (const fieldName of fieldsSimple.values()) {
      if (fieldsSimpleNotPatch.includes(fieldName)) { continue; }
      if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
           (referenceMeta2['referenceJson'][fieldName] === null ) ) { continue; }

      let keep1 = true;
      if ( ( fieldsPubmedUnlocked.includes(fieldName) || fieldsPubmedLocked.includes(fieldName) || fieldsPubmedOnly.includes(fieldName) ) &&
           (pmidKeepReference === 2 && hasPmid) ) { keep1 = !keep1; }
      if ( (fieldName in referenceSwap) && (referenceSwap[fieldName] === true) ) { keep1 = !keep1; }

      if (!keep1) {
        console.log(keep1 + ' simple field ' + fieldName + ' one ' + referenceMeta1['referenceJson'][fieldName] + ' two ' + referenceMeta2['referenceJson'][fieldName]);
        const fieldNameJson = ( fieldName in remapFieldNamesApi ) ? remapFieldNamesApi[fieldName] : fieldName;
        updateJsonReferenceMain[fieldNameJson] = referenceMeta2['referenceJson'][fieldName];
      }
    }

    for (const fieldName of fieldsPubmedArrayString.values()) {
      if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
           (referenceMeta2['referenceJson'][fieldName] === null ) ) { continue; }
      let keep1 = true;
      if ( pmidKeepReference === 2 && hasPmid ) { keep1 = !keep1; }
      if (!keep1) {
        const fieldNameJson = ( fieldName in remapFieldNamesApi ) ? remapFieldNamesApi[fieldName] : fieldName;
        updateJsonReferenceMain[fieldNameJson] = referenceMeta2['referenceJson'][fieldName] } }

    console.log(updateJsonReferenceMain);
    if (Object.keys(updateJsonReferenceMain).length !== 0) {
      const referenceCurie = referenceMeta1.curie;
      let subPath = 'reference/' + referenceCurie;
      let array = [ subPath, updateJsonReferenceMain, 'PATCH', 0, null, null]
      forApiArray.push( array );
    }

    if ('mod_reference_types' in referenceMeta1['referenceJson'] && referenceMeta1['referenceJson']['mod_reference_types'] !== null) {
      for (const modRefDict of referenceMeta1['referenceJson']['mod_reference_types'].values()) {
        if (modRefDict['toggle']) {
          let subPath = 'reference/mod_reference_type/' + modRefDict['mod_reference_type_id'];
          let array = [ subPath, null, 'DELETE', 0, null, null]
          forApiArray.push( array );
    } } }
    if ('mod_reference_types' in referenceMeta2['referenceJson'] && referenceMeta2['referenceJson']['mod_reference_types'] !== null) {
      for (const modRefDict of referenceMeta2['referenceJson']['mod_reference_types'].values()) {
        if (modRefDict['toggle']) {
          const referenceCurie = referenceMeta1.curie;
          const updateJsonMrt2 = { 'reference_curie': referenceCurie }
          let subPath = 'reference/mod_reference_type/' + modRefDict['mod_reference_type_id'];
          let array = [ subPath, updateJsonMrt2, 'PATCH', 0, null, null]
          forApiArray.push( array );
    } } }

    if ('mod_corpus_associations' in referenceMeta1['referenceJson'] && referenceMeta1['referenceJson']['mod_corpus_associations'] !== null) {
      for (const mcaDict of referenceMeta1['referenceJson']['mod_corpus_associations'].values()) {
        if (mcaDict['toggle']) {
          let subPath = 'reference/mod_corpus_association/' + mcaDict['mod_corpus_association_id'];
          let array = [ subPath, null, 'DELETE', 0, null, null]
          forApiArray.push( array );
    } } }
    if ('mod_corpus_associations' in referenceMeta2['referenceJson'] && referenceMeta2['referenceJson']['mod_corpus_associations'] !== null) {
      for (const mcaDict of referenceMeta2['referenceJson']['mod_corpus_associations'].values()) {
        if (mcaDict['toggle']) {
          const referenceCurie = referenceMeta1.curie;
          const updateJsonMrt2 = { 'reference_curie': referenceCurie }
          let subPath = 'reference/mod_corpus_association/' + mcaDict['mod_corpus_association_id'];
          let array = [ subPath, updateJsonMrt2, 'PATCH', 0, null, null]
          forApiArray.push( array );
    } } }

    if ('cross_references' in referenceMeta1['referenceJson'] && referenceMeta1['referenceJson']['cross_references'] !== null) {
      for (const xrefDict of referenceMeta1['referenceJson']['cross_references'].values()) {
        const curie = xrefDict['curie'];
        const subPath = 'cross_reference/' + xrefDict['curie'];
        if ('is_obsolete' in xrefDict && xrefDict['is_obsolete'] !== null) {
          if (xrefDict['is_obsolete'] === false && xrefDict['toggle']) {		// was valid, now toggle, set obsolete
            const updateJsonXref1Obsolete = { 'is_obsolete': true }
            let array = [ subPath, updateJsonXref1Obsolete, 'PATCH', 0, null, null];
            forApiArray.push( array ); } } } }
    if ('cross_references' in referenceMeta2['referenceJson'] && referenceMeta2['referenceJson']['cross_references'] !== null) {
      for (const xrefDict of referenceMeta2['referenceJson']['cross_references'].values()) {
        if ('is_obsolete' in xrefDict && xrefDict['is_obsolete'] !== null) {
          const curie = xrefDict['curie'];
          const subPath = 'cross_reference/' + xrefDict['curie'];
          const referenceCurie = referenceMeta1.curie;
          const updateJsonXref2 = { 'reference_curie': referenceCurie }
          if (xrefDict['is_obsolete'] === false) {		// was valid
            if (xrefDict['toggle']) { }				// yes toggle, keep to ref1
            else {						// no toggle, set obsolete to ref1
              updateJsonXref2['is_obsolete'] = true; } }
          else if (xrefDict['is_obsolete'] === true) { }	// was obsolete, set to ref1
          let array = [ subPath, updateJsonXref2, 'PATCH', 0, null, null];
          forApiArray.push( array ); } } }

    // TODO  mesh_terms authors   corrections 

// need to figure out how to know which direction .  editing corrections is also broken, but creating works.  
//     if ('corrections' in referenceMeta2['referenceJson'] && referenceMeta2['referenceJson']['corrections'] !== null) {
//       for (const corrDict of referenceMeta2['referenceJson']['corrections'].values()) {
//         if (corrDict['toggle']) {
//           const type = corrDict['type'];
//           const corrCurie = corrDict['curie'];
//           const referenceCurie1 = referenceMeta1.curie;
//           const referenceCurie2 = referenceMeta2.curie;
//           const updateJsonCorr2 = { 'reference_curie_from': referenceCurie, 'reference_curie_to': referenceCurie }	// figure this out
//           let subPath = 'reference_comment_and_correction/' + corrDict['reference_comment_and_correction_id'];
//           let array = [ subPath, updateJsonCorr2, 'PATCH', 0, null, null]
//           forApiArray.push( array );
//     } } }

    let dispatchCount = forApiArray.length;

    // console.log('dispatchCount ' + dispatchCount)
    dispatch(setMergeUpdating(dispatchCount))

    console.log(forApiArray);
    for (const arrayData of forApiArray.values()) {
      arrayData.unshift(accessToken)
      dispatch(mergeButtonApiDispatch(arrayData))
    }

  } // function mergeReferences()

  return (<>
           <Button variant='primary' onClick={() => mergeReferences()} >
             {mergeUpdating > 0 ? <Spinner animation="border" size="sm"/> : "Merge these references"}</Button>
           <RowDivider />
          </>
         );
}

// <RowDisplayString key={fieldName} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />

//       <RowDisplayPairSimple key="title" fieldName="title" referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} />
//       <RowDisplayPairSimple key="category" fieldName="category" referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} />

//       <Row>
//         <Col sm="2" >Title</Col>
//         <Col sm="5" >{referenceMeta1.referenceJson.title}</Col>
//         <Col sm="5" >{referenceMeta2.referenceJson.title}</Col>
//       </Row>
//       <Row>
//         <Col sm="2" >Category</Col>
//         <Col sm="5" >{referenceMeta1.referenceJson.category}</Col>
//         <Col sm="5" >{referenceMeta2.referenceJson.category}</Col>
//       </Row>

const MergePairsSection = ({referenceMeta1, referenceMeta2, referenceSwap, hasPmid, pmidKeepReference}) => {
  const rowOrderedElements = []
  for (const [fieldIndex, fieldName] of fieldsOrdered.entries()) {
    if (fieldName === 'DIVIDER') {
      rowOrderedElements.push(<RowDivider key={fieldIndex} />); }
    else if (fieldsSimple.includes(fieldName)) {
      rowOrderedElements.push(
        <RowDisplayPairSimple key={fieldName} fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} pmidKeepReference={pmidKeepReference} /> ); }
    else if (fieldsPubmedArrayString.includes(fieldName)) {
      rowOrderedElements.push(
        <RowDisplayPairPubmedArrayString key={fieldName} fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} pmidKeepReference={pmidKeepReference} /> ); }
    else if (fieldName === 'authors') {
      rowOrderedElements.push(
        <RowDisplayPairAuthors key="RowDisplayPairAuthors" fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} pmidKeepReference={pmidKeepReference} /> ); }
    else if (fieldName === 'mod_reference_types') {
      rowOrderedElements.push(
        <RowDisplayPairModReferenceTypes key="RowDisplayPairModReferenceTypes" fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} /> ); }
    else if (fieldName === 'mod_corpus_associations') {
      rowOrderedElements.push(
        <RowDisplayPairModCorpusAssociations key="RowDisplayPairModCorpusAssociations" fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} /> ); }
    else if (fieldName === 'corrections') {
      rowOrderedElements.push(
        <RowDisplayPairCorrections key="RowDisplayPairCorrections" fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} pmidKeepReference={pmidKeepReference} /> ); }
    else if (fieldName === 'cross_references') {
      rowOrderedElements.push(
        <RowDisplayPairCrossReferencesValid key="RowDisplayPairCrossReferencesValid" fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} /> );
      rowOrderedElements.push(<RowDivider key={fieldIndex} />);
      rowOrderedElements.push(
        <RowDisplayPairCrossReferencesObsolete key="RowDisplayPairCrossReferencesObsolete" fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} /> ); }
    else if (fieldName === 'mesh_terms') {
      rowOrderedElements.push(
        <RowDisplayPairPubmedMeshTerms key="RowDisplayPairPubmedMeshTerms" fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} pmidKeepReference={pmidKeepReference} /> ); }
  }
  return (<Container fluid>{rowOrderedElements}</Container>);
} // const MergePairsSection

const RowDisplayPairSimple = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, hasPmid, pmidKeepReference}) => {
  const dispatch = useDispatch();
//   const hasPmid = true;
  if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
       (referenceMeta2['referenceJson'][fieldName] === null ) ) { return null; }
    // keep resource_title in fieldsOrdered in case it's useful later, but only display it when looking at resource_curie
  if (fieldName === 'resource_title') { return null; }
  let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete'; let swapColor = false;
  // if (keepReference === 2) { swapColor = !swapColor; }
  if ( ( fieldsPubmedUnlocked.includes(fieldName) || fieldsPubmedLocked.includes(fieldName) || fieldsPubmedOnly.includes(fieldName) ) &&
       (pmidKeepReference === 2) && hasPmid) { swapColor = !swapColor; }
  if ( (fieldName in referenceSwap) && (referenceSwap[fieldName] === true) ) { swapColor = !swapColor; }
  if (swapColor) { keepClass2 = [keepClass1, keepClass1 = keepClass2][0]; }
  
  const isLocked = GenerateIsLocked(fieldName, hasPmid);
  const element0 = GenerateFieldLabel(fieldName, isLocked);
//   const element0 = (hasPmid) ?
//     <div className={`div-merge div-merge-grey`}> <FontAwesomeIcon icon={faLockOpen} /> {fieldName}</div> :
//     <div className={`div-merge div-merge-grey`}>{fieldName}</div>;

  let fieldValue1 = (referenceMeta1['referenceJson'][fieldName]);
  let fieldValue2 = (referenceMeta2['referenceJson'][fieldName]);
  if (fieldName === 'resource_curie') { 
    fieldValue1 = (<>{fieldValue1} <br/> {referenceMeta1['referenceJson']['resource_title']}</>); 
    fieldValue2 = (<>{fieldValue2} <br/> {referenceMeta2['referenceJson']['resource_title']}</>); }
  let element1 = (<div></div>); let element2 = (<div></div>);
  if (referenceMeta1['referenceJson'][fieldName] !== null && referenceMeta1['referenceJson'][fieldName] !== '') { 
    element1 = (!hasPmid || isLocked === 'unlock') ?
               (<div className={`div-merge ${keepClass1}`} onClick={() => dispatch(mergeSwapPairSimple(fieldName))} >{fieldValue1}</div>) :
               (<div className={`div-merge ${keepClass1}`} >{fieldValue1}</div>); } 
  if (referenceMeta2['referenceJson'][fieldName] !== null && referenceMeta2['referenceJson'][fieldName] !== '') { 
    element2 = (!hasPmid || isLocked === 'unlock') ?
               (<div className={`div-merge ${keepClass2}`} onClick={() => dispatch(mergeSwapPairSimple(fieldName))} >{fieldValue2}</div>) :
               (<div className={`div-merge ${keepClass2}`} >{fieldValue2}</div>); }
  return (
    <Row>
      <Col sm="2" >{element0}</Col>
      <Col sm="5" >{element1}</Col>
      <Col sm="5" >{element2}</Col>
    </Row>
  )
}
//       <Col sm="2" ><div className={`div-merge div-merge-grey`}>{fieldName}</div></Col>
//       <Col sm="2" className={`div-merge div-merge-grey`}>{fieldName}</Col>
//       <Col sm="5" className={`div-merge div-merge-keep`}>{referenceMeta1['referenceJson'][fieldName]}</Col>
//       <Col sm="5" className={`div-merge div-merge-obsolete`}>{referenceMeta2['referenceJson'][fieldName]}</Col>

const RowDisplayPairPubmedArrayString = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, hasPmid, pmidKeepReference}) => {
//   console.log(' e1 ' + referenceMeta1['referenceJson'][fieldName]);
//   console.log(' e2 ' + referenceMeta2['referenceJson'][fieldName]);
  if ( (referenceMeta1['referenceJson'][fieldName] === null || referenceMeta1['referenceJson'][fieldName].length === 0) &&
       (referenceMeta2['referenceJson'][fieldName] === null || referenceMeta2['referenceJson'][fieldName].length === 0) ) { return null; }
  let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete'; let swapColor = false;
  if ( ( fieldsPubmedUnlocked.includes(fieldName) || fieldsPubmedLocked.includes(fieldName) || fieldsPubmedOnly.includes(fieldName) ) &&
       (pmidKeepReference === 2) ) { swapColor = !swapColor; }
  if (swapColor) { keepClass2 = [keepClass1, keepClass1 = keepClass2][0]; }
  const isLocked = GenerateIsLocked(fieldName, hasPmid);
  const element0 = GenerateFieldLabel(fieldName, isLocked);
  let element1 = (<div></div>); let element2 = (<div></div>);
  if (referenceMeta1['referenceJson'][fieldName] !== null && referenceMeta1['referenceJson'][fieldName] !== undefined) {
    const string1 = referenceMeta1['referenceJson'][fieldName].join(', ');
    element1 = (<div className={`div-merge ${keepClass1}`} >{string1}</div>); }
  if (referenceMeta2['referenceJson'][fieldName] !== null && referenceMeta2['referenceJson'][fieldName] !== undefined) {
    const string2 = referenceMeta2['referenceJson'][fieldName].join(', ');
    element2 = (<div className={`div-merge ${keepClass2}`} >{string2}</div>); }
  return (
      <Row key={`nontoggle ${fieldName}`}>
        <Col sm="2" >{element0}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
} // const RowDisplayPairPubmedArrayString 

const RowDisplayPairPubmedMeshTerms = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, hasPmid, pmidKeepReference}) => {
  if ( (referenceMeta1['referenceJson'][fieldName] === null || referenceMeta1['referenceJson'][fieldName].length === 0) &&
       (referenceMeta2['referenceJson'][fieldName] === null || referenceMeta2['referenceJson'][fieldName].length === 0) ) { return null; }
  let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete'; let swapColor = false;
  if ( ( fieldsPubmedUnlocked.includes(fieldName) || fieldsPubmedLocked.includes(fieldName) || fieldsPubmedOnly.includes(fieldName) ) &&
       (pmidKeepReference === 2) ) { swapColor = !swapColor; }
  if (swapColor) { keepClass2 = [keepClass1, keepClass1 = keepClass2][0]; }
  const isLocked = GenerateIsLocked(fieldName, hasPmid);
  const element0 = GenerateFieldLabel(fieldName, isLocked);
  let element1 = (<div></div>); let element2 = (<div></div>);
  if (referenceMeta1['referenceJson'][fieldName] !== null && referenceMeta1['referenceJson'][fieldName] !== undefined) {
    const meshTextArray = []
    for (const value of referenceMeta1['referenceJson'][fieldName]) {
      let term = value['heading_term'];
      if (value['qualifier_term'] !== null) { term += ' ' + value['qualifier_term']; }
      meshTextArray.push(term); }
    const meshText = (<span dangerouslySetInnerHTML={{__html: meshTextArray.join('; ')}} />)
    element1 = (<div className={`div-merge ${keepClass1}`} >{meshText}</div>); }
  if (referenceMeta2['referenceJson'][fieldName] !== null && referenceMeta2['referenceJson'][fieldName] !== undefined) {
    const meshTextArray = []
    for (const value of referenceMeta2['referenceJson'][fieldName]) {
      let term = value['heading_term'];
      if (value['qualifier_term'] !== null) { term += ' ' + value['qualifier_term']; }
      meshTextArray.push(term); }
    const meshText = (<span dangerouslySetInnerHTML={{__html: meshTextArray.join('; ')}} />)
    element2 = (<div className={`div-merge ${keepClass2}`} >{meshText}</div>); }
  return (
      <Row key={`nontoggle ${fieldName}`}>
        <Col sm="2" >{element0}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
} // const RowDisplayPairPubmedMeshTerms 


const RowDisplayPairAuthors = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, hasPmid, pmidKeepReference}) => {
  const dispatch = useDispatch();
  if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
       (referenceMeta2['referenceJson'][fieldName] === null ) ) { return null; }
  const rowPairAuthorsElements = [];
  const author1Elements = [];
  const author2Elements = [];
  let maxLength = 0;
  if (referenceMeta1['referenceJson'][fieldName] !== null && referenceMeta1['referenceJson'][fieldName].length > maxLength) {
    maxLength = referenceMeta1['referenceJson'][fieldName].length; }
  if (referenceMeta2['referenceJson'][fieldName] !== null && referenceMeta2['referenceJson'][fieldName].length > maxLength) {
    maxLength = referenceMeta2['referenceJson'][fieldName].length; }
  const autFields = ['first_name', 'last_name', 'name', 'order', 'corresponding_author', 'first_author', 'toggle'];
  let maxOrder = 0;
  const isLocked = GenerateIsLocked(fieldName, hasPmid);
  const element0 = GenerateFieldLabel(fieldName, isLocked);
  for (let i = 0; i < maxLength; i++) {
    let element1 = (<div></div>); let element2 = (<div></div>);
    let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete';
    let string1 = ''; let string2 = '';
    let swapColor1 = false; let swapColor2 = false;
    if ( ( fieldsPubmedUnlocked.includes(fieldName) || fieldsPubmedLocked.includes(fieldName) || fieldsPubmedOnly.includes(fieldName) ) &&
         (pmidKeepReference === 2) ) { swapColor1 = !swapColor1; swapColor2 = !swapColor2; }
    // if (keepReference === 2) { swapColor1 = !swapColor1; swapColor2 = !swapColor2; }
    if (referenceMeta1['referenceJson'][fieldName] !== null &&
        referenceMeta1['referenceJson'][fieldName][i] !== null && referenceMeta1['referenceJson'][fieldName][i] !== undefined) {
      let aut1 = referenceMeta1['referenceJson'][fieldName][i];
      let aut1Data = {};
      autFields.forEach( (x) => { aut1Data[x] = (aut1[x] !== null && aut1[x] !== '') ? aut1[x] : ''; } );
      aut1Data['orcid'] = ('orcid' in aut1 && aut1['orcid'] !== null && 'curie' in aut1['orcid'] && aut1['orcid']['curie'] !== null) ?
        aut1['orcid']['curie'] : '';
      if ( aut1Data['toggle'] ) { swapColor1 = !swapColor1; }
      keepClass1 = (swapColor1) ? 'div-merge-obsolete' : 'div-merge-keep';
      // console.log('toggle1 swapColor1 ' + swapColor1 + ' on index ' + i)
      if ( aut1Data['first_name'] !== '' && aut1Data['last_name'] !== '') { 
        aut1Data['name'] = aut1Data['first_name'] + ' ' + aut1Data['last_name'] }
      else if ( aut1Data['first_name'] !== '') { aut1Data['name'] = aut1Data['first_name'] }
      else if ( aut1Data['last_name'] !== '') { aut1Data['name'] = aut1Data['last_name'] }
      string1 = aut1Data['order'] + ' - ' + aut1Data['name'];
      if (aut1Data['order'] > maxOrder) { maxOrder = aut1Data['order']; }
      if ( aut1Data['orcid'] !== '') { string1 += ' - ' + aut1Data['orcid']; }
//       if ( aut1Data['corresponding_author'] !== true) { string1 += " <Badge>corresponding</Badge>"; }
      element1 = (<div className={`div-merge ${keepClass1}`} onClick={() => dispatch(mergeToggleIndependent(fieldName, 1, i))} >{string1}
        { (aut1Data['first_author'] === true) && <> <Badge variant="secondary">first</Badge></> }
        { (aut1Data['corresponding_author'] === true) && <> <Badge variant="secondary">corresponding</Badge></> }
        </div>); 
      author1Elements[aut1Data['order'] - 1] = element1; }
    if (referenceMeta2['referenceJson'][fieldName] !== null &&
        referenceMeta2['referenceJson'][fieldName][i] !== null && referenceMeta2['referenceJson'][fieldName][i] !== undefined) {
      let aut2 = referenceMeta2['referenceJson'][fieldName][i];
      let aut2Data = {};
      autFields.forEach( (x) => { aut2Data[x] = (aut2[x] !== null && aut2[x] !== '') ? aut2[x] : ''; } );
      aut2Data['orcid'] = ('orcid' in aut2 && aut2['orcid'] !== null && 'curie' in aut2['orcid'] && aut2['orcid']['curie'] !== null) ?
        aut2['orcid']['curie'] : '';
      if ( aut2Data['toggle'] ) { swapColor2 = !swapColor2; }
      keepClass2 = (swapColor2) ? 'div-merge-keep' : 'div-merge-obsolete';
      // console.log('toggle2 swapColor2 ' + swapColor2 + ' on index ' + i)
      if ( aut2Data['first_name'] !== '' && aut2Data['last_name'] !== '') { 
        aut2Data['name'] = aut2Data['first_name'] + ' ' + aut2Data['last_name'] }
      else if ( aut2Data['first_name'] !== '') { aut2Data['name'] = aut2Data['first_name'] }
      else if ( aut2Data['last_name'] !== '') { aut2Data['name'] = aut2Data['last_name'] }
      string2 = aut2Data['order'] + ' - ' + aut2Data['name'];
      if (aut2Data['order'] > maxOrder) { maxOrder = aut2Data['order']; }
      if ( aut2Data['orcid'] !== '') { string2 += ' - ' + aut2Data['orcid']; }
      element2 = (<div className={`div-merge ${keepClass2}`} onClick={() => dispatch(mergeToggleIndependent(fieldName, 2, i))} >{string2}
        { (aut2Data['first_author'] === true) && <> <Badge variant="secondary">first</Badge></> }
        { (aut2Data['corresponding_author'] === true) && <> <Badge variant="secondary">corresponding</Badge></> }
        </div>); 
      author2Elements[aut2Data['order'] - 1] = element2; }
  }
  for (let i = 0; i < maxOrder; i++) {
    const element1 = (author1Elements[i] !== undefined) ? author1Elements[i] : '';
    const element2 = (author2Elements[i] !== undefined) ? author2Elements[i] : '';
    rowPairAuthorsElements.push(
      <Row key={`toggle aut ${i}`}>
        <Col sm="2" >{element0}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
  }
  return (<>{rowPairAuthorsElements}</>);
} // const RowDisplayPairAuthors 

const RowDisplayPairModReferenceTypes = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, hasPmid}) => {
  const dispatch = useDispatch();
  if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
       (referenceMeta2['referenceJson'][fieldName] === null ) ) { return null; }
  const rowPairModReferenceTypesElements = []
  let maxLength = 0;
  if (referenceMeta1['referenceJson'][fieldName] !== null && referenceMeta1['referenceJson'][fieldName].length > maxLength) {
    maxLength = referenceMeta1['referenceJson'][fieldName].length; }
  if (referenceMeta2['referenceJson'][fieldName] !== null && referenceMeta2['referenceJson'][fieldName].length > maxLength) {
    maxLength = referenceMeta2['referenceJson'][fieldName].length; }
  for (let i = 0; i < maxLength; i++) { 
    const isLocked = GenerateIsLocked(fieldName, hasPmid);
    const element0 = GenerateFieldLabel(fieldName, isLocked);
    let element1 = (<div></div>); let element2 = (<div></div>);
    let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete';
    let string1 = ''; let string2 = '';
    let swapColor1 = false; let swapColor2 = false;
    // if (keepReference === 2) { swapColor1 = !swapColor1; swapColor2 = !swapColor2; }
    if (referenceMeta1['referenceJson'][fieldName] !== null &&
        referenceMeta1['referenceJson'][fieldName][i] !== null && referenceMeta1['referenceJson'][fieldName][i] !== undefined) {
      let mrt1 = referenceMeta1['referenceJson'][fieldName][i];
      let src1 = ''; let rt1 = ''; let toggle1 = false;
      if (mrt1['source'] !== null && mrt1['source'] !== '') { src1 = mrt1['source']; }
      if (mrt1['reference_type'] !== null && mrt1['reference_type'] !== '') { rt1 = mrt1['reference_type']; }
      if (mrt1['toggle'] !== null && mrt1['toggle'] !== '') { toggle1 = mrt1['toggle']; }
      if ( toggle1 ) { swapColor1 = !swapColor1; }
      keepClass1 = (swapColor1) ? 'div-merge-obsolete' : 'div-merge-keep';
      // console.log('toggle1 swapColor1 ' + swapColor1 + ' on index ' + i)
      if (src1 && rt1) { string1 = src1 + ' - ' + rt1; }
      element1 = (<div className={`div-merge ${keepClass1}`} onClick={() => dispatch(mergeToggleIndependent(fieldName, 1, i))} >{string1}</div>); }
    if (referenceMeta2['referenceJson'][fieldName] !== null &&
        referenceMeta2['referenceJson'][fieldName][i] !== null && referenceMeta2['referenceJson'][fieldName][i] !== undefined) {
      let mrt2 = referenceMeta2['referenceJson'][fieldName][i];
      let src2 = ''; let rt2 = ''; let toggle2 = false;
      if (mrt2['source'] !== null && mrt2['source'] !== '') { src2 = mrt2['source']; }
      if (mrt2['reference_type'] !== null && mrt2['reference_type'] !== '') { rt2 = mrt2['reference_type']; }
      if (mrt2['toggle'] !== null && mrt2['toggle'] !== '') { toggle2 = mrt2['toggle']; }
      if ( toggle2 ) { swapColor2 = !swapColor2; }
      keepClass2 = (swapColor2) ? 'div-merge-keep' : 'div-merge-obsolete';
      // console.log('toggle2 swapColor2 ' + swapColor2 + ' on index ' + i)
      if (src2 && rt2) { string2 = src2 + ' - ' + rt2; }
      element2 = (<div className={`div-merge ${keepClass2}`} onClick={() => dispatch(mergeToggleIndependent(fieldName, 2, i))} >{string2}</div>); }
    rowPairModReferenceTypesElements.push(
      <Row key={`toggle mrt ${i}`}>
        <Col sm="2" >{element0}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
  }
  return (<>{rowPairModReferenceTypesElements}</>);
} // const RowDisplayPairModReferenceTypes

const RowDisplayPairModCorpusAssociations = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, hasPmid}) => {
  const dispatch = useDispatch();
  if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
       (referenceMeta2['referenceJson'][fieldName] === null ) ) { return null; }
  const rowPairModCorpusAssociationsElements = []

  const mcaMods = {}; const mca1 = {}; const mca2 = {};
  if (referenceMeta1['referenceJson'][fieldName] !== null ) {
    for (const [index, val1] of referenceMeta1['referenceJson'][fieldName].entries()) { 
      if ('mod_abbreviation' in val1 && val1['mod_abbreviation'] !== null && val1['mod_abbreviation'] !== '') {
        mcaMods[val1['mod_abbreviation']] = true;
        let corpus1 = 'needs_review';
        if ('corpus' in val1) {
          if (val1['corpus'] === null) { corpus1 = 'needs_review'; }
          else if (val1['corpus'] === true) { corpus1 = 'inside_corpus'; }
          else if (val1['corpus'] === false) { corpus1 = 'outside_corpus'; } }
        const toggle1 = ('toggle' in val1 && val1['toggle'] !== null && val1['toggle'] !== '') ? val1['toggle'] : null;
        mca1[val1['mod_abbreviation']] = { 'index': index, 'corpus': corpus1, 'toggle': toggle1 }; } } }
  if (referenceMeta2['referenceJson'][fieldName] !== null ) {
    for (const [index, val2] of referenceMeta2['referenceJson'][fieldName].entries()) { 
      if ('mod_abbreviation' in val2 && val2['mod_abbreviation'] !== null && val2['mod_abbreviation'] !== '') {
        mcaMods[val2['mod_abbreviation']] = true;
        let corpus2 = 'needs_review';
        if ('corpus' in val2) {
          if (val2['corpus'] === null) { corpus2 = 'needs_review'; }
          else if (val2['corpus'] === true) { corpus2 = 'inside_corpus'; }
          else if (val2['corpus'] === false) { corpus2 = 'outside_corpus'; } }
        const toggle2 = ('toggle' in val2 && val2['toggle'] !== null && val2['toggle'] !== '') ? val2['toggle'] : null;
        mca2[val2['mod_abbreviation']] = { 'index': index, 'corpus': corpus2, 'toggle': toggle2 }; } } }
  // console.log(mca1); console.log(mca2); console.log(mcaMods);
  const sortedKeys = Object.keys(mcaMods).sort();
  for (let i = 0; i < sortedKeys.length; i++) {
    const isLocked = GenerateIsLocked(fieldName, hasPmid);
    const element0 = GenerateFieldLabel(fieldName, isLocked);
    let element1 = (<div></div>); let element2 = (<div></div>);
    const mod = sortedKeys[i];
    let swapColor1 = false; let swapColor2 = false; let toggle1 = false; let toggle2 = false;
    // if (keepReference === 2) { swapColor1 = !swapColor1; swapColor2 = !swapColor2; }
    let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete';
    if (mod in mca1) {
      if (mca1[mod]['toggle'] !== null && mca1[mod]['toggle'] !== '') { toggle1 = mca1[mod]['toggle']; }
      if ( toggle1 ) { swapColor1 = !swapColor1; }
      keepClass1 = (swapColor1) ? 'div-merge-obsolete' : 'div-merge-keep';
      element1 = (<div className={`div-merge ${keepClass1}`} onClick={() => { 
                    dispatch(mergeToggleIndependent(fieldName, 1, mca1[mod]['index'])); 
                    if (mod in mca2) { dispatch(mergeToggleIndependent(fieldName, 2, mca2[mod]['index'])) } } }
//                   >{mca1[mod]['index']} - {mod} - {mca1[mod]['corpus']}</div>);
                  >{mod} - {mca1[mod]['corpus']}</div>); }
    if (mod in mca2) {
      if (mca2[mod]['toggle'] !== null && mca2[mod]['toggle'] !== '') { toggle2 = mca2[mod]['toggle']; }
      if ( toggle2 ) { swapColor2 = !swapColor2; }
      keepClass2 = (swapColor2) ? 'div-merge-keep' : 'div-merge-obsolete';
      element2 = (<div className={`div-merge ${keepClass2}`}  onClick={() => { 
                    if (mod in mca1) { dispatch(mergeToggleIndependent(fieldName, 1, mca1[mod]['index'])); }
                    dispatch(mergeToggleIndependent(fieldName, 2, mca2[mod]['index'])) } }
//                   >{mca2[mod]['index']} - {mod} - {mca2[mod]['corpus']}</div>);
                  >{mod} - {mca2[mod]['corpus']}</div>); }
    rowPairModCorpusAssociationsElements.push(
      <Row key={`toggle mca ${i}`}>
        <Col sm="2" >{element0}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
  }
  return (<>{rowPairModCorpusAssociationsElements}</>);
} // const RowDisplayPairModCorpusAssociations


const RowDisplayPairCrossReferencesValid = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, hasPmid}) => {
  const dispatch = useDispatch();
  if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
       (referenceMeta2['referenceJson'][fieldName] === null ) ) { return null; }
  const rowPairCrossReferencesElements = []

  const xrefPrefixes = {}; const xref1 = {}; const xref2 = {};
  if (referenceMeta1['referenceJson'][fieldName] !== null ) {
    for (const [index, val1] of referenceMeta1['referenceJson'][fieldName].entries()) { 
      if ('is_obsolete' in val1 && val1['is_obsolete'] !== null && val1['is_obsolete'] === true) { continue; }
      if ('curie' in val1 && val1['curie'] !== null && val1['curie'] !== '') {
        let xref1Prefix = splitCurie(val1['curie'], 'prefix');
        xrefPrefixes[xref1Prefix] = true;
        const toggle1 = ('toggle' in val1 && val1['toggle'] !== null && val1['toggle'] !== '') ? val1['toggle'] : null;
        xref1[xref1Prefix] = { 'index': index, 'curie': val1['curie'], 'toggle': toggle1 }; } } }
  if (referenceMeta2['referenceJson'][fieldName] !== null ) {
    for (const [index, val2] of referenceMeta2['referenceJson'][fieldName].entries()) { 
      if ('is_obsolete' in val2 && val2['is_obsolete'] !== null && val2['is_obsolete'] === true) { continue; }
      if ('curie' in val2 && val2['curie'] !== null && val2['curie'] !== '') {
        let xref2Prefix = splitCurie(val2['curie'], 'prefix');
        xrefPrefixes[xref2Prefix] = true;
        const toggle2 = ('toggle' in val2 && val2['toggle'] !== null && val2['toggle'] !== '') ? val2['toggle'] : null;
        xref2[xref2Prefix] = { 'index': index, 'curie': val2['curie'], 'toggle': toggle2 }; } } }
  // console.log(xref1); console.log(xref2); console.log(xrefPrefixes);
  const sortedKeys = Object.keys(xrefPrefixes).sort();
  const isLocked = GenerateIsLocked(fieldName, hasPmid);
  const fieldLabel = 'valid ' + fieldName;
  const element0 = GenerateFieldLabel(fieldLabel, isLocked);
  for (let i = 0; i < sortedKeys.length; i++) {
    let element1 = (<div></div>); let element2 = (<div></div>);
    const mod = sortedKeys[i];
    let swapColor1 = false; let swapColor2 = false; let toggle1 = false; let toggle2 = false;
    // if (keepReference === 2) { swapColor1 = !swapColor1; swapColor2 = !swapColor2; }
    let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete';
    if (mod in xref1) {
      if (xref1[mod]['toggle'] !== null && xref1[mod]['toggle'] !== '') { toggle1 = xref1[mod]['toggle']; }
      if ( toggle1 ) { swapColor1 = !swapColor1; }
      keepClass1 = (swapColor1) ? 'div-merge-obsolete' : 'div-merge-keep';
      element1 = (<div className={`div-merge ${keepClass1}`} onClick={() => {
                    dispatch(mergeToggleIndependent(fieldName, 1, xref1[mod]['index'])); 
                    if (mod === 'PMID') { dispatch(mergeSwapKeepPmid()) }
                    if (mod in xref2) { dispatch(mergeToggleIndependent(fieldName, 2, xref2[mod]['index'])) } } }
//                   >{xref1[mod]['index']} - {mod} - {xref1[mod]['curie']}</div>);
                  >{xref1[mod]['curie']}</div>); }
    if (mod in xref2) {
      if (xref2[mod]['toggle'] !== null && xref2[mod]['toggle'] !== '') { toggle2 = xref2[mod]['toggle']; }
      if ( toggle2 ) { swapColor2 = !swapColor2; }
      keepClass2 = (swapColor2) ? 'div-merge-keep' : 'div-merge-obsolete';
      element2 = (<div className={`div-merge ${keepClass2}`}  onClick={() => {
                    if (mod === 'PMID') { dispatch(mergeSwapKeepPmid()) }
                    if (mod in xref1) { dispatch(mergeToggleIndependent(fieldName, 1, xref1[mod]['index'])); }
                    dispatch(mergeToggleIndependent(fieldName, 2, xref2[mod]['index'])) } }
//                   >{xref2[mod]['index']} - {mod} - {xref2[mod]['curie']}</div>);
                  >{xref2[mod]['curie']}</div>); }
    rowPairCrossReferencesElements.push(
      <Row key={`toggle valid xref ${i}`}>
        <Col sm="2" >{element0}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
  }
  return (<>{rowPairCrossReferencesElements}</>);
} // const RowDisplayPairCrossReferencesValid

const RowDisplayPairCrossReferencesObsolete = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, hasPmid, validOrObsolete}) => {
  // const dispatch = useDispatch();
  if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
       (referenceMeta2['referenceJson'][fieldName] === null ) ) { return null; }
  const rowPairCrossReferencesElements = []

  const xrefPrefixes = {}; const xref1 = {}; const xref2 = {};
  if (referenceMeta1['referenceJson'][fieldName] !== null ) {
    for (const [index, val1] of referenceMeta1['referenceJson'][fieldName].entries()) { 
      if ('is_obsolete' in val1 && val1['is_obsolete'] !== null && val1['is_obsolete'] === false) { continue; }
      if ('curie' in val1 && val1['curie'] !== null && val1['curie'] !== '') {
        let xref1Prefix = splitCurie(val1['curie'], 'prefix');
        xrefPrefixes[xref1Prefix] = true;
        const toggle1 = ('toggle' in val1 && val1['toggle'] !== null && val1['toggle'] !== '') ? val1['toggle'] : null;
        xref1[xref1Prefix] = { 'index': index, 'curie': val1['curie'], 'toggle': toggle1 }; } } }
  if (referenceMeta2['referenceJson'][fieldName] !== null ) {
    for (const [index, val2] of referenceMeta2['referenceJson'][fieldName].entries()) { 
      if ('is_obsolete' in val2 && val2['is_obsolete'] !== null && val2['is_obsolete'] === false) { continue; }
      if ('curie' in val2 && val2['curie'] !== null && val2['curie'] !== '') {
        let xref2Prefix = splitCurie(val2['curie'], 'prefix');
        xrefPrefixes[xref2Prefix] = true;
        const toggle2 = ('toggle' in val2 && val2['toggle'] !== null && val2['toggle'] !== '') ? val2['toggle'] : null;
        xref2[xref2Prefix] = { 'index': index, 'curie': val2['curie'], 'toggle': toggle2 }; } } }
  const sortedKeys = Object.keys(xrefPrefixes).sort();
  const fieldLabel = 'obsolete ' + fieldName;
  const element0 = GenerateFieldLabel(fieldLabel, 'lock');
  for (let i = 0; i < sortedKeys.length; i++) {
    let element1 = (<div></div>); let element2 = (<div></div>);
    const mod = sortedKeys[i];
    let keepClass = 'div-merge-keep';
    if (mod in xref1) {
      element1 = (<div className={`div-merge ${keepClass}`} >{xref1[mod]['curie']}</div>); }
    if (mod in xref2) {
      element2 = (<div className={`div-merge ${keepClass}`} >{xref2[mod]['curie']}</div>); }
    rowPairCrossReferencesElements.push(
      <Row key={`toggle obsolete xref ${i}`}>
        <Col sm="2" >{element0}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
  }
  return (<>{rowPairCrossReferencesElements}</>);
} // const RowDisplayPairCrossReferencesObsolete
  
const RowDisplayPairCorrections = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, hasPmid, pmidKeepReference}) => {
  // const dispatch = useDispatch();
  if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
       (referenceMeta2['referenceJson'][fieldName] === null ) ) { return null; }
  const rowPairCorrectionsElements = []

  const maxLength = (referenceMeta1['referenceJson'][fieldName].length > referenceMeta2['referenceJson'][fieldName].length) ?  referenceMeta1['referenceJson'][fieldName].length : referenceMeta2['referenceJson'][fieldName].length;
  const corFields = ['type', 'curie', 'toggle'];
  for (let i = 0; i < maxLength; i++) { 
    const isLocked = GenerateIsLocked(fieldName, hasPmid);
    const element0 = GenerateFieldLabel(fieldName, isLocked);
    let element1 = (<div></div>); let element2 = (<div></div>);
    // let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete';
    // let swapColor1 = false; let swapColor2 = false;
    // if ( ( fieldsPubmedUnlocked.includes(fieldName) || fieldsPubmedLocked.includes(fieldName) || fieldsPubmedOnly.includes(fieldName) ) &&
    //      (pmidKeepReference === 2) ) { swapColor1 = !swapColor1; swapColor2 = !swapColor2; }
    let keepClass = 'div-merge-keep';
    if (referenceMeta1['referenceJson'][fieldName][i] !== null && referenceMeta1['referenceJson'][fieldName][i] !== undefined) {
      let cor1 = referenceMeta1['referenceJson'][fieldName][i];
      let cor1Data = {};
      corFields.forEach( (x) => { cor1Data[x] = (cor1[x] !== null && cor1[x] !== '') ? cor1[x] : ''; } );
      // if ( cor1Data['toggle'] ) { swapColor1 = !swapColor1; }
      // keepClass1 = (swapColor1) ? 'div-merge-obsolete' : 'div-merge-keep';
      // element1 = (<div className={`div-merge ${keepClass1}`} onClick={() => dispatch(mergeToggleIndependent(fieldName, 1, i))} >{cor1Data['type']} {cor1Data['curie']}
      element1 = (<div className={`div-merge ${keepClass}`} >{cor1Data['type']} {cor1Data['curie']}
        </div>); }
    if (referenceMeta2['referenceJson'][fieldName][i] !== null && referenceMeta2['referenceJson'][fieldName][i] !== undefined) {
      let cor2 = referenceMeta2['referenceJson'][fieldName][i];
      let cor2Data = {};
      corFields.forEach( (x) => { cor2Data[x] = (cor2[x] !== null && cor2[x] !== '') ? cor2[x] : ''; } );
      // if ( cor2Data['toggle'] ) { swapColor2 = !swapColor2; }
      // keepClass2 = (swapColor2) ? 'div-merge-keep' : 'div-merge-obsolete';
      // // console.log('toggle2 swapColor2 ' + swapColor2 + ' on index ' + i)
      // element2 = (<div className={`div-merge ${keepClass2}`} onClick={() => dispatch(mergeToggleIndependent(fieldName, 2, i))} >{cor2Data['type']} {cor2Data['curie']
      element2 = (<div className={`div-merge ${keepClass}`} >{cor2Data['type']} {cor2Data['curie']}
        </div>); }
    rowPairCorrectionsElements.push(
      <Row key={`toggle cor ${i}`}>
        <Col sm="2" >{element0}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
  }
  return (<>{rowPairCorrectionsElements}</>);
} // const RowDisplayPairCorrections


const Merge = () => {
  return (
    <div>
      <h4>Merge two References</h4>
      <MergeSelectionSection />
    </div>
  )
}

export default Merge
