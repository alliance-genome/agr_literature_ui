// import { Link } from 'react-router-dom'
// import { useHistory } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';

import { changeFieldInput } from '../actions/mergeActions';
import { mergeQueryReferences } from '../actions/mergeActions';
import { mergeResetReferences } from '../actions/mergeActions';
import { mergeSwapKeep } from '../actions/mergeActions';
import { mergeSwapPairSimple } from '../actions/mergeActions';
import { mergeToggleIndependent } from '../actions/mergeActions';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExchangeAlt } from '@fortawesome/free-solid-svg-icons'
// import { faLongArrowAltLeft } from '@fortawesome/free-solid-svg-icons'


const RowDivider = () => { return (<Row><Col>&nbsp;</Col></Row>); }

const fieldsSimple = ['curie', 'reference_id', 'title', 'category', 'citation', 'volume', 'page_range', 'language', 'abstract', 'pubmed_abstract_languages', 'plain_language_abstract', 'publisher', 'issue_name', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified_in_pubmed', 'resource_curie', 'resource_title' ];
// const fieldsArrayString = ['keywords', 'pubmed_types' ];
const fieldsOrdered = [ 'title', 'mod_corpus_associations', 'cross_references', 'corrections', 'authors', 'DIVIDER', 'abstract', 'pubmed_abstract_languages', 'plain_language_abstract', 'DIVIDER', 'category', 'pubmed_types', 'mod_reference_types', 'DIVIDER', 'resource_curie', 'resource_title', 'volume', 'issue_name', 'page_range', 'DIVIDER', 'editors', 'publisher', 'language', 'DIVIDER', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified_in_pubmed', 'DIVIDER', 'tags', 'DIVIDER', 'keywords', 'mesh_terms' ];
// const fieldsOrdered = [ 'title', 'mod_corpus_associations', 'cross_references', 'corrections', 'authors', 'DIVIDER', 'abstract', 'pubmed_abstract_languages', 'plain_language_abstract', 'DIVIDER', 'category', 'pubmed_types', 'mod_reference_types', 'DIVIDER', 'resource_curie', 'resource_title', 'volume', 'issue_name', 'page_range', 'DIVIDER', 'editors', 'publisher', 'language', 'DIVIDER', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified_in_pubmed', 'DIVIDER', 'tags', 'DIVIDER', 'keywords', 'mesh_terms' ];
// const fieldsOrdered = [ 'title', 'mod_corpus_associations', 'cross_references', 'corrections', 'authors', 'DIVIDER', 'citation', 'abstract', 'pubmed_abstract_languages', 'plain_language_abstract', 'DIVIDER', 'category', 'pubmed_types', 'mod_reference_types', 'DIVIDER', 'resource_curie', 'resource_title', 'volume', 'issue_name', 'page_range', 'DIVIDER', 'editors', 'publisher', 'language', 'DIVIDER', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified_in_pubmed', 'DIVIDER', 'tags', 'DIVIDER', 'keywords', 'mesh_terms' ];

const MergeSelectionSection = () => {
  const keepReference = useSelector(state => state.merge.keepReference);
  const referenceMeta1 = useSelector(state => state.merge.referenceMeta1);
  const referenceMeta2 = useSelector(state => state.merge.referenceMeta2);
  const referenceSwap = useSelector(state => state.merge.referenceSwap);
  const queryDoubleSuccess = useSelector(state => state.merge.queryDoubleSuccess);
  // swap icon fa-exchange
  // left arrow icon fa-arrow-left 
  // <FontAwesomeIcon size='lg' icon={faLongArrowAltLeft} />

  let header1 = (<span className={`span-merge-header-success`} >Keep</span>)
  let header2 = (<span className={`span-merge-header-failure`} >Obsolete</span>)
  if (keepReference === 2) {
    header2 = (<span className={`span-merge-header-success`} >Keep</span>)
    header1 = (<span className={`span-merge-header-failure`} >Obsolete</span>) }

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
            return (<Button variant='primary' onClick={(e) => dispatch(mergeQueryReferences(referenceMeta1.input, referenceMeta2.input))} >Query for these references</Button>);
          })()}
        </Col>
      </Row>
      <RowDivider />
      <RowDivider />
    </Container>

    {(() => {
      if (queryDoubleSuccess) { return (
        <MergePairsSection referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} keepReference={keepReference} />
      ) }
    })()}
    </>
  );
}

// <RowDisplayString key={fieldName} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />

//       <RowDisplayPairSimple key="title" fieldName="title" referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} keepReference={keepReference} />
//       <RowDisplayPairSimple key="category" fieldName="category" referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} keepReference={keepReference} />

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

const MergePairsSection = ({referenceMeta1, referenceMeta2, referenceSwap, keepReference}) => {
  const rowOrderedElements = []
  for (const [fieldIndex, fieldName] of fieldsOrdered.entries()) {
    if (fieldName === 'DIVIDER') {
      rowOrderedElements.push(<RowDivider key={fieldIndex} />); }
    else if (fieldsSimple.includes(fieldName)) {
      rowOrderedElements.push(
        <RowDisplayPairSimple key={fieldName} fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} keepReference={keepReference} /> ); }
    else if (fieldName === 'authors') {
      rowOrderedElements.push(
        <RowDisplayPairAuthors key="RowDisplayPairAuthors" fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} keepReference={keepReference} /> ); }
    else if (fieldName === 'mod_reference_types') {
      rowOrderedElements.push(
        <RowDisplayPairModReferenceTypes key="RowDisplayPairModReferenceTypes" fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} keepReference={keepReference} /> ); }
    else if (fieldName === 'keywords') {
      rowOrderedElements.push(
        <RowDisplayPairKeywords key="RowDisplayPairKeywords" fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} keepReference={keepReference} /> ); }
  }
  return (<Container fluid>{rowOrderedElements}</Container>);
} // const MergePairsSection

const RowDisplayPairSimple = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, keepReference}) => {
  const dispatch = useDispatch();
  if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
       (referenceMeta2['referenceJson'][fieldName] === null ) ) { return null; }
  let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete'; let swapColor = false;
  if (keepReference === 2) { swapColor = !swapColor; }
  if ( (fieldName in referenceSwap) && (referenceSwap[fieldName] === true) ) { swapColor = !swapColor; }
  if (swapColor) { keepClass2 = [keepClass1, keepClass1 = keepClass2][0]; }
  let element1 = (<div></div>); let element2 = (<div></div>);
  if (referenceMeta1['referenceJson'][fieldName] !== null && referenceMeta1['referenceJson'][fieldName] !== '') { 
    element1 = (<div className={`div-merge ${keepClass1}`} onClick={() => dispatch(mergeSwapPairSimple(fieldName))} >{referenceMeta1['referenceJson'][fieldName]}</div>); }
  if (referenceMeta2['referenceJson'][fieldName] !== null && referenceMeta2['referenceJson'][fieldName] !== '') { 
    element2 = (<div className={`div-merge ${keepClass2}`} onClick={() => dispatch(mergeSwapPairSimple(fieldName))} >{referenceMeta2['referenceJson'][fieldName]}</div>); }
  return (
    <Row>
      <Col sm="2" ><div className={`div-merge div-merge-grey`}>{fieldName}</div></Col>
      <Col sm="5" >{element1}</Col>
      <Col sm="5" >{element2}</Col>
    </Row>
  )
}
//       <Col sm="2" ><div className={`div-merge div-merge-grey`}>{fieldName}</div></Col>
//       <Col sm="2" className={`div-merge div-merge-grey`}>{fieldName}</Col>
//       <Col sm="5" className={`div-merge div-merge-keep`}>{referenceMeta1['referenceJson'][fieldName]}</Col>
//       <Col sm="5" className={`div-merge div-merge-obsolete`}>{referenceMeta2['referenceJson'][fieldName]}</Col>

const RowDisplayPairKeywords = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, keepReference}) => {
  const dispatch = useDispatch();
  console.log(' e1 ' + referenceMeta1['referenceJson'][fieldName]);
  console.log(' e2 ' + referenceMeta2['referenceJson'][fieldName]);
  if ( (referenceMeta1['referenceJson'][fieldName] === null || referenceMeta1['referenceJson'][fieldName].length === 0) &&
       (referenceMeta2['referenceJson'][fieldName] === null || referenceMeta2['referenceJson'][fieldName].length === 0) ) { return null; }
  let element1 = (<div></div>); let element2 = (<div></div>);
  if (referenceMeta1['referenceJson'][fieldName] !== null && referenceMeta1['referenceJson'][fieldName] !== undefined) {
    const string1 = referenceMeta1['referenceJson'][fieldName].join(', ');
    element1 = (<div className={`div-merge div-merge-grey`} >{string1}</div>); }
  if (referenceMeta2['referenceJson'][fieldName] !== null && referenceMeta2['referenceJson'][fieldName] !== undefined) {
    const string2 = referenceMeta2['referenceJson'][fieldName].join(', ');
    element2 = (<div className={`div-merge div-merge-grey`} >{string2}</div>); }
  return (
      <Row key={`nontoggle keywords`}>
        <Col sm="2" ><div className={`div-merge div-merge-grey`}>{fieldName}</div></Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
} // const RowDisplayPairKeywords

const RowDisplayPairAuthors = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, keepReference}) => {
  const dispatch = useDispatch();
  if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
       (referenceMeta2['referenceJson'][fieldName] === null ) ) { return null; }
  let element1 = (<div></div>); let element2 = (<div></div>);
  const rowPairAuthorsElements = []
  const maxLength = (referenceMeta1['referenceJson'][fieldName].length > referenceMeta2['referenceJson'][fieldName].length) ?  referenceMeta1['referenceJson'][fieldName].length : referenceMeta2['referenceJson'][fieldName].length;
  const autFields = ['first_name', 'last_name', 'name', 'order', 'toggle'];
  for (let i = 0; i < maxLength; i++) { 
    element1 = (<div></div>); element2 = (<div></div>);
    let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete';
    let string1 = ''; let string2 = '';
    let swapColor1 = false; let swapColor2 = false;
    if (keepReference === 2) { swapColor1 = !swapColor1; swapColor2 = !swapColor2; }
    if (referenceMeta1['referenceJson'][fieldName][i] !== null && referenceMeta1['referenceJson'][fieldName][i] !== undefined) {
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
      if ( aut1Data['orcid'] !== '') { string1 += ' - ' + aut1Data['orcid']; }
      element1 = (<div className={`div-merge ${keepClass1}`} onClick={() => dispatch(mergeToggleIndependent(fieldName, 1, i))} >{string1}</div>); }
    if (referenceMeta2['referenceJson'][fieldName][i] !== null && referenceMeta2['referenceJson'][fieldName][i] !== undefined) {
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
      if ( aut2Data['orcid'] !== '') { string2 += ' - ' + aut2Data['orcid']; }
      element2 = (<div className={`div-merge ${keepClass2}`} onClick={() => dispatch(mergeToggleIndependent(fieldName, 2, i))} >{string2}</div>); }
    rowPairAuthorsElements.push(
      <Row key={`toggle aut ${i}`}>
        <Col sm="2" ><div className={`div-merge div-merge-grey`}>{fieldName}</div></Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
  }
  return (<>{rowPairAuthorsElements}</>);
} // const RowDisplayPairModReferenceTypes

const RowDisplayPairModReferenceTypes = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, keepReference}) => {
  const dispatch = useDispatch();
  if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
       (referenceMeta2['referenceJson'][fieldName] === null ) ) { return null; }
  let element1 = (<div></div>); let element2 = (<div></div>);
  const rowPairModReferenceTypesElements = []
  const maxLength = (referenceMeta1['referenceJson'][fieldName].length > referenceMeta2['referenceJson'][fieldName].length) ?  referenceMeta1['referenceJson'][fieldName].length : referenceMeta2['referenceJson'][fieldName].length;
  for (let i = 0; i < maxLength; i++) { 
    element1 = (<div></div>); element2 = (<div></div>);
    let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete';
    let string1 = ''; let string2 = '';
    let swapColor1 = false; let swapColor2 = false;
    if (keepReference === 2) { swapColor1 = !swapColor1; swapColor2 = !swapColor2; }
    if (referenceMeta1['referenceJson'][fieldName][i] !== null && referenceMeta1['referenceJson'][fieldName][i] !== undefined) {
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
    if (referenceMeta2['referenceJson'][fieldName][i] !== null && referenceMeta2['referenceJson'][fieldName][i] !== undefined) {
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
        <Col sm="2" ><div className={`div-merge div-merge-grey`}>{fieldName}</div></Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
  }
  return (<>{rowPairModReferenceTypesElements}</>);
} // const RowDisplayPairModReferenceTypes

const Merge = () => {
  return (
    <div>
      <h4>Merge two References</h4>
      <MergeSelectionSection />
    </div>
  )
}

export default Merge
