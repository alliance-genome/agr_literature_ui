// import { useState, useEffect } from 'react';
import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';

import RowDivider from './biblio/RowDivider';

import BiblioDisplay from './biblio/BiblioDisplay';
import BiblioEditor from './biblio/BiblioEditor';
import BiblioEntity from './biblio/BiblioEntity';
import BiblioWorkflow from './biblio/BiblioWorkflow';

import { RowDisplayString } from './biblio/BiblioDisplay';
import { RowDisplaySimple } from './biblio/BiblioDisplay';

import { splitCurie } from './biblio/BiblioEditor';

import {
  downloadReferencefile,
  queryId,
  setReferenceCurie
} from '../actions/biblioActions';
import { setBiblioAction } from '../actions/biblioActions';
import { biblioQueryReferenceCurie } from '../actions/biblioActions';
import { setUpdateCitationFlag } from '../actions/biblioActions';
import { changeBiblioSupplementExpandToggler } from '../actions/biblioActions';

import { changeBiblioActionToggler } from '../actions/biblioActions';
import { updateButtonBiblio } from '../actions/biblioActions';

import { ateamLookupEntityList } from '../actions/biblioActions';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button'
import InputGroup from 'react-bootstrap/InputGroup';

import loading_gif from '../images/loading_cat.gif';
import Spinner from "react-bootstrap/Spinner";

// https://stage-literature.alliancegenome.org/Biblio/?action=topic&referenceCurie=AGRKB:101000000163587


// constants available in BiblioEditor
// import { 
//   fieldsSimple, fieldsArrayString, fieldsOrdered, fieldsPubmed, fieldsDisplayOnly, fieldsDatePublished,
//   fieldTypeDict, enumDict
// } from './biblio/BiblioEditor';

// if passing an object with <Redirect push to={{ pathname: "/Biblio", state: { pie: "the pie" } }} />, would access new state with
// const Biblio = ({ appState, someAction, location }) => {
// console.log(location.state);  }


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


const BiblioActionToggler = () => {
  const dispatch = useDispatch();
  const biblioAction = useSelector(state => state.biblio.biblioAction);
  let displayChecked = '';
  let editorChecked = '';
  let entityChecked = '';
  let workflowChecked = '';
  let radioFormDisplayClassname = 'radio-form';
  let radioFormEditorClassname = 'radio-form';
  let radioFormEntityClassname = 'radio-form';
  let radioFormWorkflowClassname = 'radio-form';
  let biblioActionTogglerSelected = 'display';
  if (biblioAction === 'editor') {
      radioFormEditorClassname += ' underlined';
      editorChecked = 'checked';
      biblioActionTogglerSelected = 'editor'; }
    else if (biblioAction === 'entity') {
      radioFormEntityClassname += ' underlined';
      entityChecked = 'checked';
      biblioActionTogglerSelected = 'entity'; }
    else if (biblioAction === 'workflow') {
      radioFormWorkflowClassname += ' underlined';
      workflowChecked = 'checked';
      biblioActionTogglerSelected = 'workflow'; }
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
          onChange={(e) => dispatch(changeBiblioActionToggler(e, 'display'))}
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
          onChange={(e) => dispatch(changeBiblioActionToggler(e, 'editor'))}
        />
      </div>
      <div className='radio-span'>
        <Form.Check
          inline
          className={radioFormEntityClassname}
          checked={entityChecked}
          type='radio'
          label='entity and topic editor'
          id='biblio-toggler-entity'
          onChange={(e) => dispatch(changeBiblioActionToggler(e, 'entity'))}
        />
      </div>
      <div className='radio-span'>
        <Form.Check
          inline
          className={radioFormWorkflowClassname}
          checked={workflowChecked}
          type='radio'
          label='workflow editor'
          id='biblio-toggler-workflow'
          onChange={(e) => dispatch(changeBiblioActionToggler(e, 'workflow'))}
        />
      </div>
    </div>
    </Form>);
} // const BiblioActionToggler


const BiblioActionRouter = () => {
  const biblioAction = useSelector(state => state.biblio.biblioAction);
  switch (biblioAction) {
    case 'display':
      return (<Container><BiblioActionToggler /><RowDivider /><BiblioDisplay /></Container>);
    case 'editor':
      return (<Container><BiblioActionToggler /><RowDivider /><BiblioEditor /></Container>);
    case 'entity':
      return (<><Container><BiblioActionToggler /></Container><BiblioTagging /></>);
    case 'workflow':
      return (<><Container><BiblioActionToggler /></Container><BiblioTagging /></>);
    default:
      return (<Container><BiblioActionToggler /><RowDivider /><BiblioDisplay /></Container>);
  }
}


const BiblioTagging = () => {
  const dispatch = useDispatch();
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const referenceJsonDb = useSelector(state => state.biblio.referenceJsonDb);

  const accessToken = useSelector(state => state.isLogged.accessToken);
  const biblioAction = useSelector(state => state.biblio.biblioAction);
  const entityEntitiesToMap = useSelector(state => state.biblio.entityEntitiesToMap);
  const entityEntityMappings = useSelector(state => state.biblio.entityEntityMappings);
  // example data structure
  // const entityEntityMappings = { 'ATP:0000005' : { 'NCBITaxon:559292' : { 'SGD:S000001855' : 'ACT1' } } };

  const allowedEntityTypes = new Set();
  allowedEntityTypes.add('ATP:0000005');
  const allowedTaxons = new Set();
  allowedTaxons.add('NCBITaxon:559292');
  allowedTaxons.add('NCBITaxon:6239');

  for (const [entityType, entityTypeValue] of Object.entries(entityEntitiesToMap)) {
    if (allowedEntityTypes.has(entityType)) {
      for (const [taxon, entitySet] of Object.entries(entityTypeValue)) {
        if (allowedTaxons.has(taxon)) {
          const entityCurieLookupList = [];
          entitySet.forEach((entityCurie) => {
            if (!(entityType in entityEntityMappings && taxon in entityEntityMappings[entityType] &&
                  entityCurie in entityEntityMappings[entityType][taxon])) {
              entityCurieLookupList.push(entityCurie); }
          });
          if (entityCurieLookupList.length > 0) {
            const entityCurieLookupString = entityCurieLookupList.join(" ");
            // console.log('look up ' + entityCurieLookupString);
            dispatch(ateamLookupEntityList(accessToken, entityType, taxon, entityCurieLookupString))
  } } } } }

  if (!('date_created' in referenceJsonLive)) {
    let message = 'No AGR Reference Curie found';
    if ('detail' in referenceJsonLive) { message = referenceJsonLive['detail']; }
    return(<>{message}</>); }

  const rowOrderedElements = []
  // rowOrderedElements.push(<BiblioEntityDisplayTypeToggler key="entityDisplayType" />);
  rowOrderedElements.push(<RowDisplayString key="title" fieldName="title" referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />);
  rowOrderedElements.push(<RowDisplayPmcidCrossReference key="RowDisplayPmcidCrossReference" fieldName="cross_references" referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />);
  rowOrderedElements.push(<RowDisplayReflinks key="referencefile" fieldName="referencefiles" referenceJsonLive={referenceJsonLive} displayOrEditor="display" />);
  rowOrderedElements.push(<RowDisplayString key="abstract" fieldName="abstract" referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />);
  // rowOrderedElements.push(<EntityCreate key="geneAutocomplete"/>);
  return (<><Container>{rowOrderedElements}</Container>
            { (biblioAction === 'workflow') ? <BiblioWorkflow /> : <BiblioEntity /> }</>);
} // const BiblioTagging

export function getOktaModAccess(oktaGroups) {
  let access = 'No';
  if (oktaGroups) {
    for (const oktaGroup of oktaGroups) {
      if (oktaGroup.endsWith('Developer')) { access = 'developer'; }
        else if (oktaGroup === 'SGDCurator') { access = 'SGD'; }
        else if (oktaGroup === 'RGDCurator') { access = 'RGD'; }
        else if (oktaGroup === 'MGICurator') { access = 'MGI'; }
        else if (oktaGroup === 'ZFINCurator') { access = 'ZFIN'; }
        else if (oktaGroup === 'XenbaseCurator') { access = 'XB'; }
        else if (oktaGroup === 'FlyBaseCurator') { access = 'FB'; }
        else if (oktaGroup === 'WormBaseCurator') { access = 'WB'; } } }
  return access;
}

export const RowDisplayReflinks = ({fieldName, referenceJsonLive, displayOrEditor}) => {
  const dispatch = useDispatch();
  const oktaGroups = useSelector(state => state.isLogged.oktaGroups);
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const supplementExpand = useSelector(state => state.biblio.supplementExpand);
  const loadingFileNames = useSelector(state => state.biblio.loadingFileNames);
  let cssDisplayLeft = 'Col-display Col-display-left';
  let cssDisplay = 'Col-display';
  let cssDisplayRight = 'Col-display Col-display-right';
  if (displayOrEditor === 'editor') {
    cssDisplay = 'Col-editor-disabled';
    cssDisplayLeft = ''; cssDisplayRight = 'Col-editor-disabled'; }
  const access = getOktaModAccess(oktaGroups);
  if ('referencefiles' in referenceJsonLive && referenceJsonLive['referencefiles'] !== null) {
    let tarballChecked = ''; let listChecked = '';
    if (supplementExpand === 'tarball') { tarballChecked = 'checked'; }
      else if (supplementExpand === 'list') { listChecked = 'checked'; }
    const rowReferencefileElements = []

    // for (const[index, referencefileDict] of referenceJsonLive['referencefiles'].filter(x => x['file_class'] === 'main').entries())
    const rowReferencefileSupplementElements = []
    let hasAccessToTarball = false;
    for (const[index, referencefileDict] of referenceJsonLive['referencefiles'].entries()) {
      let is_ok = false;
      let allowed_mods = [];
      for (const rfm of referencefileDict['referencefile_mods']) {
        if (rfm['mod_abbreviation'] !== null) { allowed_mods.push(rfm['mod_abbreviation']); }
        if (rfm['mod_abbreviation'] === null || rfm['mod_abbreviation'] === access) { is_ok = true; }
      }
      let filename = referencefileDict['display_name'] + '.' + referencefileDict['file_extension'];
      let referencefileValue = (<div>{filename} &nbsp;({allowed_mods.join(", ")})</div>);
      if (access === 'developer') { is_ok = true; }
        else if (access === 'No') { is_ok = false; referencefileValue = (<div>{filename}</div>); }
      if (is_ok) {
        hasAccessToTarball = true;
        referencefileValue = (<div><button className='button-to-link' onClick={ () =>
            dispatch(downloadReferencefile(referencefileDict['referencefile_id'], filename, accessToken))
        } >{filename}</button>&nbsp;{loadingFileNames.has(filename) ? <Spinner animation="border" size="sm"/> : null}</div>); }
//       rowReferencefileElements.push(<RowDisplaySimple key={`referencefile ${index}`} fieldName={fieldName} value={referencefileValue} updatedFlag='' />);
        const referencefileRow = (
            <Row key={`${fieldName} ${index}`} className="Row-general" xs={2} md={4} lg={6}>
              <Col className={`Col-general ${cssDisplayLeft} `} lg={{ span: 2 }}>{fieldName}</Col>
              <Col className={`Col-general ${cssDisplay} `} lg={{ span: 2 }}>{referencefileDict['file_class']}</Col>
              <Col className={`Col-general ${cssDisplayRight} `} lg={{ span: 8 }}>{referencefileValue}</Col>
            </Row>);
        if (referencefileDict['file_class'] === 'main') {
          rowReferencefileElements.push( referencefileRow ); }
        else {
          rowReferencefileSupplementElements.push( referencefileRow ); } }

    if (rowReferencefileSupplementElements.length > 0) {
      rowReferencefileElements.push(
        <Row key="supplementExpandTogglerRow" className="Row-general" xs={2} md={4} lg={6}>
          <Col className={`Col-general ${cssDisplayLeft} `}>referencefiles</Col>
          <Col className={`Col-general ${cssDisplay} `} lg={{ span: 2 }}>additional files</Col>
          <Col className={`Col-general ${tarballChecked ? cssDisplay : cssDisplayRight} `} lg={{ span: tarballChecked ? 4 : 8}}>
            <Form.Check inline type='radio' label='tarball' checked={tarballChecked}
              id='biblio-supplement-expand-toggler-tarball'
              onChange={(e) => dispatch(changeBiblioSupplementExpandToggler(e))} />
            <Form.Check inline type='radio' label={`list (${rowReferencefileSupplementElements.length})`} checked={listChecked}
              id='biblio-supplement-expand-toggler-list'
              onChange={(e) => dispatch(changeBiblioSupplementExpandToggler(e))} />
          </Col>
          {tarballChecked ?
              <Col className={`Col-general ${cssDisplayRight} `} lg={{ span: 4 }}>
                {hasAccessToTarball ?
                    <div><button className='button-to-link' onClick={ () =>
                      dispatch(downloadReferencefile(undefined,
                          referenceJsonLive.curie.replace(":", "_") + "_additional_files.tar.gz",
                          accessToken, referenceJsonLive["reference_id"]))}>
                      Download tarball
                    </button>&nbsp;
                      {loadingFileNames.has(referenceJsonLive.curie.replace(":", "_") + "_additional_files.tar.gz") ?
                          <Spinner animation="border" size="sm"/>
                          :
                          null }
                    </div>
                    :
                    <span>No Access to tarball</span>
                }
              </Col>
              :
              null
          }
        </Row>);
        if (supplementExpand === 'list') {
          rowReferencefileElements.push(...rowReferencefileSupplementElements); } }
    return (<>{rowReferencefileElements}</>); }
  else { return null; } }

const RowDisplayPmcidCrossReference = ({fieldName, referenceJsonLive, referenceJsonDb}) => {
  if ('cross_references' in referenceJsonLive && referenceJsonLive['cross_references'] !== null) {
    const rowCrossReferenceElements = []
    for (const[index, crossRefDict] of referenceJsonLive['cross_references'].entries()) {
      let url = crossRefDict['url'];
      let valueLiveCurie = crossRefDict['curie']; let valueDbCurie = ''; let updatedFlagCurie = '';
      let valueLiveCuriePrefix = splitCurie(valueLiveCurie, 'prefix');
      if (valueLiveCuriePrefix !== 'PMCID') { continue; }
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
      rowCrossReferenceElements.push(<RowDisplaySimple key={`xref_pmc ${index}`} fieldName={fieldName} value={xrefValue} updatedFlag={updatedFlag} />); }
    return (<>{rowCrossReferenceElements}</>); }
  else { return null; } }


const BiblioIdQuery = () => {
  const dispatch = useDispatch();
  const [idQuery, setIdQuery] = useState('');
  return (
      <div>
        <div style={{width: "28em", margin: "auto"}}>
          <InputGroup className="mb-2">
            <Form.Control placeholder="e.g., PMID:24895670 or AGRKB:101000000878586" type="text"
                          id="xrefcurieField" name="xrefcurieField" value={idQuery}
                          onChange={(e) => setIdQuery(e.target.value)}
                          onKeyPress={(event) => {
                            if (event.charCode === 13) {
                              dispatch(queryId(idQuery));
                            }
                          }}
            />
            <Button type="submit" size="sm" onClick={() => dispatch(queryId(idQuery))}>Query exact ID</Button>
          </InputGroup>
        </div>
      </div>
  )
}

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
    // console.log(query);
    let paramAction = query.get('action');
    let paramReferenceCurie = query.get('referenceCurie');
    // console.log("biblio urlParam paramAction", paramAction);
    // console.log("biblio urlParam paramReferenceCurie", paramReferenceCurie);
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
  return (
      <div>
        <BiblioIdQuery/>
        <br/>
        {referenceCurie !== '' ?
            <div>
              <h4>Biblio about this Reference</h4>
              <div align="center" className="task">{referenceCurie}</div>
              {isLoading ? <LoadingElement/> : <BiblioActionRouter/>}
              <Link to='/'>Go Back</Link>
            </div> : null
        }
      </div>
  )
} // const Biblio


export default Biblio
