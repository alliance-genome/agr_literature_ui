import {useEffect, useState} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {useHistory, useLocation} from 'react-router-dom';

import RowDivider from './biblio/RowDivider';

import BiblioDisplay from './biblio/BiblioDisplay';
import BiblioEditor from './biblio/BiblioEditor';
import BiblioEntity from './biblio/BiblioEntity';
import BiblioWorkflow from './biblio/BiblioWorkflow';
import BiblioFileManagement from './biblio/BiblioFileManagement';
import BiblioRawTetData from './biblio/BiblioRawTetData';
import NoAccessAlert from './biblio/NoAccessAlert';

import { RowDisplayString, RowDisplayCrossReferences } from './biblio/BiblioDisplay';
import { RowDisplayResourcesForCuration } from './BiblioRowDisplayUtils';
import { reffileCompareFn, BiblioCitationDisplay } from './biblio/BiblioFileManagement';

import { usePersonSettings } from './settings/usePersonSettings';

import {
  downloadReferencefile,
  setReferenceCurie,
  fetchReferenceFiles
} from '../actions/biblioActions';
import { setBiblioAction } from '../actions/biblioActions';
import { biblioQueryReferenceCurie } from '../actions/biblioActions';
// import { setUpdateCitationFlag } from '../actions/biblioActions';
import { changeBiblioSupplementExpandToggler } from '../actions/biblioActions';

import { changeBiblioActionToggler } from '../actions/biblioActions';

import Alert from 'react-bootstrap/Alert';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button'
import InputGroup from 'react-bootstrap/InputGroup';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

import loading_gif from '../images/loading_cat.gif';
import Spinner from "react-bootstrap/Spinner";
import { api } from "../api";


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
  let filemanagementChecked = '';
  let rawtopicentityChecked = '';
  let radioFormDisplayClassname = 'radio-form';
  let radioFormEditorClassname = 'radio-form';
  let radioFormEntityClassname = 'radio-form';
  let radioFormWorkflowClassname = 'radio-form';
  let radioFormFilemanagementClassname = 'radio-form';
  let radioFormRawtopicentityClassname = 'radio-form';
  if (biblioAction === 'editor') {
    radioFormEditorClassname += ' underlined';
    editorChecked = 'checked';
  }
    else if (biblioAction === 'entity') {
      radioFormEntityClassname += ' underlined';
      entityChecked = 'checked';
    }
    else if (biblioAction === 'workflow') {
      radioFormWorkflowClassname += ' underlined';
      workflowChecked = 'checked';
    }
    else if (biblioAction === 'filemanagement') {
      radioFormFilemanagementClassname += ' underlined';
      filemanagementChecked = 'checked';
    }
    else if (biblioAction === 'rawtopicentity') {
      radioFormRawtopicentityClassname += ' underlined';
      rawtopicentityChecked = 'checked';
    }
    else {
      radioFormDisplayClassname += ' underlined';
      displayChecked = 'checked'; }

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
      <div className='radio-span'>
        <Form.Check
          inline
          className={radioFormFilemanagementClassname}
          checked={filemanagementChecked}
          type='radio'
          label='file management'
          id='biblio-toggler-filemanagement'
          onChange={(e) => dispatch(changeBiblioActionToggler(e, 'filemanagement'))}
        />
      </div>
      <div className='radio-span'>
        <Form.Check
          inline
          className={radioFormRawtopicentityClassname}
          checked={rawtopicentityChecked}
          type='radio'
          label='raw entity and topic data'
          id='biblio-toggler-rawtopicentity'
          onChange={(e) => dispatch(changeBiblioActionToggler(e, 'rawtopicentity'))}
        />
      </div>
    </div>
    </Form>);
} // const BiblioActionToggler


const BiblioActionRouter = () => {
  const biblioAction = useSelector(state => state.biblio.biblioAction);
  const accessToken = useSelector(state => state.isLogged.accessToken);
  switch (biblioAction) {
    case 'display':
      return (<Container><BiblioActionToggler /><RowDivider /><BiblioDisplay /></Container>);
    case 'editor':
      return (<><Container><BiblioActionToggler /></Container>{ accessToken === null ? <NoAccessAlert /> : <BiblioEditor /> }</>);
    case 'entity':
      return (<><Container><BiblioActionToggler /></Container>{ accessToken === null ? <NoAccessAlert /> : <BiblioTagging /> }</>);
    case 'workflow':
      return (<><Container><BiblioActionToggler /></Container>{ accessToken === null ? <NoAccessAlert /> : <BiblioTagging /> }</>);
    case 'filemanagement':
      return (<><Container><BiblioActionToggler /></Container>{ accessToken === null ? <NoAccessAlert /> : <BiblioFileManagement /> }</>);
    case 'rawtopicentity':
      return (<><Container><BiblioActionToggler /></Container>{ accessToken === null ? <NoAccessAlert /> : <BiblioRawTetData /> }</>);
    default:
      return (<Container><BiblioActionToggler /><RowDivider /><BiblioDisplay /></Container>);
  }
}


const BiblioTagging = () => {
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const referenceJsonDb = useSelector(state => state.biblio.referenceJsonDb);
  const biblioAction = useSelector(state => state.biblio.biblioAction);

  const [showMore, setShowMore] = useState(false);	// showMore true means the Show More text is showing in the citation view.  The default is the other view.
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const accessToken = useSelector(state => state.isLogged.accessToken);
  const email = useSelector(state => state.isLogged.email);
  const componentName = "biblio_summary";

  const {
    settings, selectedSettingId, setSelectedSettingId, busy, maxCount,
    load, seed, create, rename, remove, makeDefault, savePayloadTo
  } = usePersonSettings({
    token: accessToken,
    email,
    componentName,
    maxCount: 10
  });

  useEffect(() => {
    if (accessToken && email) {
      load().finally(() => setSettingsLoaded(true));
    }
  }, [accessToken, email, load]);

  useEffect(() => {
    if (!settingsLoaded) return;    // only proceed once settings are actually loaded, or it will create another setting in db

    // If settings exist, select default or first one
    if (settings.length > 0) {
      const activeSetting = settings.find(s => s.is_default) || settings[0];
      setSelectedSettingId(activeSetting.person_setting_id);
      setShowMore(Boolean(activeSetting.json_settings.showMore));
      return;
    }

    // If no settings exist after loading, create one with default value
    (async () => {
      try {
        const created = await create("Bibliography Summary", { showMore: false });
        setSelectedSettingId(created.person_setting_id);
      } catch (err) {
        console.error("Failed to create default setting:", err);
      }
    })();
  }, [settingsLoaded, settings]);

  const toggle = async () => {
    const newValue = !showMore;
    setShowMore(newValue);
    let targetId = selectedSettingId;
    if (!targetId) {
      try {
        const created = await create("Bibliography Summary", { showMore: newValue });	// If no saved setting exists yet, create one
        setSelectedSettingId(created.person_setting_id);
        return;
      } catch (err) {
        console.error("Failed to create initial setting:", err);
        return;
      }
    }
    try {
      await savePayloadTo(targetId, { showMore: newValue });	// Save showMore value to this user's setting
    } catch (err) {
      console.error("Failed to save showMore:", err);
    }
  };

  const toggleLink = (<span style={{ marginLeft: '10px', cursor: 'pointer', color: '#007bff' }} onClick={toggle} >
    {showMore ? 'Show More' : 'Show Less'}</span>);

  if (!('date_created' in referenceJsonLive)) {
    let message = 'No AGR Reference Curie found';
    if ('detail' in referenceJsonLive) { message = referenceJsonLive['detail']; }
    return(<>{message}</>); }

  const rowOrderedElements = []
  if (showMore) {
    rowOrderedElements.push(<BiblioCitationDisplay key="biblioSummaryCitationDisplay" extraLabelContent={toggleLink} />); }
  else {
    // rowOrderedElements.push(<BiblioEntityDisplayTypeToggler key="entityDisplayType" />);
    rowOrderedElements.push(<RowDisplayString key="title" fieldName="title" referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} extraLabelContent={toggleLink} />);
    // rowOrderedElements.push(<RowDisplayPmcidCrossReference key="RowDisplayPmcidCrossReference" fieldName="cross_references" referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />);	// curators no longer want this link
    rowOrderedElements.push(<RowDisplayReferencefiles key="referencefile" fieldName="referencefiles" referenceJsonLive={referenceJsonLive} displayOrEditor="display" />);
    rowOrderedElements.push(<RowDisplayCrossReferences key="RowDisplayCrossReferences" fieldName="cross_references" referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />);
    rowOrderedElements.push(<RowDisplayResourcesForCuration key="RowDisplayResourcesForCuration" referenceJsonLive={referenceJsonLive} />);
    rowOrderedElements.push(<RowDisplayString key="abstract" fieldName="abstract" referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />);
    // rowOrderedElements.push(<EntityCreate key="geneAutocomplete"/>);
  }
  return (<><Container>{rowOrderedElements}</Container>
            { (biblioAction === 'workflow') ? <BiblioWorkflow /> : <BiblioEntity /> }</>);
} // const BiblioTagging

export const RowDisplayReferencefiles = ({displayOrEditor}) => {
  const dispatch = useDispatch();
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const supplementExpand = useSelector(state => state.biblio.supplementExpand);
  const loadingFileNames = useSelector(state => state.biblio.loadingFileNames);
  const referenceCurie = useSelector(state => state.biblio.referenceCurie);
  const referenceId = useSelector(state => state.biblio.referenceJsonLive.reference_id);
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const referenceFiles = useSelector(state => state.biblio.referenceFiles);
  const referenceFilesLoading = useSelector(state => state.biblio.referenceFilesLoading);
  const devOrStageOrProd = process.env.REACT_APP_DEV_OR_STAGE_OR_PROD;

  useEffect(() => {
    dispatch(fetchReferenceFiles(referenceCurie));
  }, [referenceCurie]);

  let cssDisplayLeft = 'Col-display Col-display-left';
  let cssDisplay = 'Col-display';
  let cssDisplayRight = 'Col-display Col-display-right';
  if (displayOrEditor === 'editor') {
    cssDisplay = 'Col-editor-disabled';
    cssDisplayLeft = ''; cssDisplayRight = 'Col-editor-disabled'; }
  const cognitoMod = useSelector(state => state.isLogged.cognitoMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);
  const cognitoDeveloper = useSelector(state => state.isLogged.cognitoDeveloper);
  let accessLevel = cognitoMod;
  if (testerMod !== 'No') { accessLevel = testerMod; }
    else if (cognitoDeveloper) { accessLevel = 'developer'; }
  // accessLevel = 'WB';	// for development to force accessLevel to a specific mod
  let tarballChecked = ''; let listChecked = '';
  if (supplementExpand === 'tarball') { tarballChecked = 'checked'; }
    else if (supplementExpand === 'list') { listChecked = 'checked'; }
  const rowReferencefileElements = []

  // for (const[index, referencefileDict] of referenceJsonLive['referencefiles'].filter(x => x['file_class'] === 'main').entries())
  const rowReferencefileSupplementElements = []
  let hasAddedFigure = false;  // Track if the first figure has been added
  let hasAccessToTarball = false;
  referenceFiles.sort(reffileCompareFn);
  for (const[index, referencefileDict] of referenceFiles.entries()) {
    let is_ok = false;
    let allowed_mods = [];
    for (const rfm of referencefileDict['referencefile_mods']) {
      if (rfm['mod_abbreviation'] !== null) { allowed_mods.push(rfm['mod_abbreviation']); }
      if (rfm['mod_abbreviation'] === null || rfm['mod_abbreviation'] === accessLevel) { is_ok = true; }
    }
    let filename = referencefileDict['display_name'] + '.' + referencefileDict['file_extension'];
    let referencefileValue = (
      <OverlayTrigger
        placement="right"
        delay={{ show: 250, hide: 400 }}
        overlay={<Tooltip id="button-tooltip-2">You don't have permissions to access this PDF</Tooltip>}
      >
        <div>{filename} &nbsp;({allowed_mods.join(", ")})</div>
      </OverlayTrigger>);
    if (accessLevel === 'No') {
      is_ok = false;
      let hover_message = 'You must be logged in and have permissions to access this PDF.';
      if ( (accessLevel !== null) && (devOrStageOrProd === 'prod') ) { hover_message = "You don't have permissions to access this PDF"; }
      referencefileValue = (
      <OverlayTrigger
        placement="right"
        delay={{ show: 250, hide: 400 }}
        overlay={<Tooltip id="button-tooltip-2">{hover_message}</Tooltip>}
      >
        <div>{filename}</div>
      </OverlayTrigger>);
    } else if (referenceJsonLive["copyright_license_open_access"] === true || accessLevel === 'developer') {
      is_ok = true;
    }
    if (is_ok) {
      hasAccessToTarball = true;
      referencefileValue = (
        <div>
          <button className='button-to-link' onClick={ () => dispatch(downloadReferencefile(referencefileDict['referencefile_id'], filename, accessToken)) } >
            <div>{filename}</div>
          </button>&nbsp;{loadingFileNames.has(filename) ? <Spinner animation="border" size="sm"/> : null}
        </div>); }
//       rowReferencefileElements.push(<RowDisplaySimple key={`referencefile ${index}`} fieldName={fieldName} value={referencefileValue} updatedFlag='' />);

    const isFigure = referencefileDict['file_class'] === 'figure';
    const isFirstFigure = isFigure && !hasAddedFigure;
    if (isFigure && !hasAddedFigure) { hasAddedFigure = true; }
    const referencefileRow = (
        <Row key={`referencefiles ${index}`} className="Row-general" xs={2} md={4} lg={6}>
          <Col className={`Col-general ${cssDisplayLeft} `} lg={{ span: 2 }}>{isFigure ? 'figures' : 'curation files'}</Col>
          <Col className={`Col-general ${cssDisplay} `} lg={{ span: 2 }}>{referencefileDict['file_class']}</Col>
          <Col className={`Col-general ${cssDisplayRight} `} lg={{ span: 8 }}>{referencefileValue}</Col>
        </Row>);
    if (referencefileDict['file_class'] === 'main') {
      rowReferencefileElements.push( referencefileRow ); }
    else {
      if (isFirstFigure) { rowReferencefileSupplementElements.push(<RowDivider key="figureDivider" />); }
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
                            referenceCurie.replace(":", "_") + "_additional_files.tar.gz",
                            accessToken, referenceId))}>
                      Download tarball
                    </button>&nbsp;
                      {loadingFileNames.has(referenceCurie.replace(":", "_") + "_additional_files.tar.gz") ?
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
  return (
      <>
        {referenceFilesLoading ?
            <Row key="supplementExpandTogglerRow" className="Row-general">
              <Col className={`Col-general ${cssDisplayLeft} `} lg={2}>referencefiles</Col>
              <Col className={`Col-general ${cssDisplayRight} `} lg={10}><Spinner animation={"border"}/></Col>
            </Row>
            :
            rowReferencefileElements}
      </>);
}

// curators no longer want this link
// const RowDisplayPmcidCrossReference = ({fieldName, referenceJsonLive, referenceJsonDb}) => {
//   if ('cross_references' in referenceJsonLive && referenceJsonLive['cross_references'] !== null) {
//     const rowCrossReferenceElements = []
//     for (const[index, crossRefDict] of referenceJsonLive['cross_references'].entries()) {
//       let url = crossRefDict['url'];
//       let valueLiveCurie = crossRefDict['curie']; let valueDbCurie = ''; let updatedFlagCurie = '';
//       let valueLiveCuriePrefix = splitCurie(valueLiveCurie, 'prefix');
//       if (valueLiveCuriePrefix !== 'PMCID') { continue; }
//       let valueLiveIsObsolete = crossRefDict['is_obsolete']; let valueDbIsObsolete = ''; let updatedFlagIsObsolete = '';
//       if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
//            (typeof referenceJsonDb[fieldName][index]['curie'] !== 'undefined') ) {
//              valueDbCurie = referenceJsonDb[fieldName][index]['curie'] }
//       if ( (typeof referenceJsonDb[fieldName][index] !== 'undefined') &&
//            (typeof referenceJsonDb[fieldName][index]['is_obsolete'] !== 'undefined') ) {
//              valueDbIsObsolete = referenceJsonDb[fieldName][index]['is_obsolete'] }
//       if (valueLiveCurie !== valueDbCurie) { updatedFlagCurie = 'updated'; }
//       if (valueLiveIsObsolete !== valueDbIsObsolete) { updatedFlagIsObsolete = 'updated'; }
//       let isObsolete = '';
//       if ( (typeof referenceJsonLive[fieldName][index] !== 'undefined') &&
//            (typeof referenceJsonLive[fieldName][index]['is_obsolete'] !== 'undefined') ) {
//              if (referenceJsonLive[fieldName][index]['is_obsolete'] === true) { isObsolete = 'obsolete'; }
//              else { isObsolete = ''; } }
//       let updatedFlag = '';
//       if ( (updatedFlagCurie === 'updated') || (updatedFlagIsObsolete === 'updated') ) { updatedFlag = 'updated' }
//       if ('pages' in crossRefDict && crossRefDict['pages'] !== null) { url = crossRefDict['pages'][0]['url']; }
//       const xrefValue = (<div><span style={{color: 'red'}}>{isObsolete}</span> <a href={url}  rel="noreferrer noopener" target="_blank">{valueLiveCurie}</a></div>);
//       rowCrossReferenceElements.push(<RowDisplaySimple key={`xref_pmc ${index}`} fieldName={fieldName} value={xrefValue} updatedFlag={updatedFlag} />); }
//     return (<>{rowCrossReferenceElements}</>); }
//   else { return null; } }


const BiblioIdQuery = () => {
  const biblioAction = useSelector(state => state.biblio.biblioAction);
  const history = useHistory();
  const [idQuery, setIdQuery] = useState('');
  const [error, setError] = useState(''); // state to store the error message
  const [showAlert, setShowAlert] = useState(false);
    
  const loadReference = (refCurie) => {
    let biblioActionTogglerSelected = 'display';
    if (biblioAction === 'editor') {
      biblioActionTogglerSelected = 'editor'; }
    else if (biblioAction === 'entity') {
      biblioActionTogglerSelected = 'entity'; }
    else if (biblioAction === 'workflow') {
      biblioActionTogglerSelected = 'workflow'; }
    else if (biblioAction === 'filemanagement') {
      biblioActionTogglerSelected = 'filemanagement'; }
    else if (biblioAction === 'rawtopicentity') {
      biblioActionTogglerSelected = 'rawtopicentity'; }
    let newUrl = "/Biblio/?action=" + biblioActionTogglerSelected + "&referenceCurie=" + refCurie
    setIdQuery('');
    history.push(newUrl);
  }

  const queryIdAndLoadReference = (refId) => {
    let url = '';
    if (refId.startsWith('AGR:') || refId.startsWith('AGRKB:')) {
      url = '/reference/' + refId;
    } else {
      url = '/cross_reference/' + refId;
    }
    api.get(url)
      .then(res => {
        loadReference(res.data.reference_curie !== undefined ? res.data.reference_curie : res.data.curie);
      })
      .catch(error => {
        // check if the error has a response and data detail
        if (error.response && error.response.data && error.response.data.detail) {
            setError(error.response.data.detail);
	    setShowAlert(true);
        } else {
            setError("An unexpected error occurred.");
	    setShowAlert(true);
        }
      });
  }

  const handleCloseAlert = () => {
    setShowAlert(false);
  }
    
  return (
    <div>
      <div style={{width: "28em", margin: "auto"}}>
	{showAlert && (
          <Alert variant="danger" onClose={handleCloseAlert} dismissible>
            {error}
          </Alert>
        )}
        <InputGroup className="mb-2">
          <Form.Control 
            placeholder="e.g., PMID:24895670 or AGRKB:101000000878586" 
            type="text"
            id="xrefcurieField" 
            name="xrefcurieField" 
            value={idQuery}
            onChange={(e) => setIdQuery(e.target.value)}
            onKeyPress={(event) => {
              if (event.charCode === 13) { // Enter key pressed
                queryIdAndLoadReference(idQuery);
              }
            }}
          />
          <Button type="submit" size="sm" onClick={() => queryIdAndLoadReference(idQuery)}>Query exact ID</Button>
        </InputGroup>
      </div>
    </div>
  ) 
}

const Biblio = () => {
  const dispatch = useDispatch();
  const location = useLocation();

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

  const referenceCurie = useSelector(state => state.biblio.referenceCurie);
  const getReferenceCurieFlag = useSelector(state => state.biblio.getReferenceCurieFlag);
//   const loadingQuery = useSelector(state => state.biblio.loadingQuery);
  const isLoading = useSelector(state => state.biblio.isLoading);
//   const queryFailure = useSelector(state => state.biblio.queryFailure);	// do something when user puts in invalid curie
//   const updateCitationFlag = useSelector(state => state.biblio.updateCitationFlag);	// citation now updates from database triggers

  const useQuery = () => { return new URLSearchParams(useLocation().search); }
  let query = useQuery();

  useEffect(() => {
    // console.log(query);
    let paramAction = query.get('action');
    let paramReferenceCurie = query.get('referenceCurie');
    // console.log("biblio urlParam paramAction", paramAction);
    // console.log("biblio urlParam paramReferenceCurie", paramReferenceCurie);
    if (paramReferenceCurie !== null) { dispatch(setReferenceCurie(paramReferenceCurie)); }
    if (paramAction !== null) { dispatch(setBiblioAction(paramAction)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, location.pathname]);

  // citation needs to be updated after processing separate biblio api calls. update citation and make flag false
  // 2023 04 11 citation now updates from database triggers
//   if (referenceCurie !== '' && (updateCitationFlag === true)) {
//     console.log('biblio DISPATCH update citation for ' + referenceCurie);
//     dispatch(updateButtonBiblio( [accessToken, 'reference/citationupdate/' + referenceCurie, null, 'POST', 0, null, null] ));
//     dispatch(setUpdateCitationFlag(false))
//   }

  // if there's a curie, biblio has stopped updating therefore get curie, and citation has been updated, requery the reference data
//   if (referenceCurie !== '' && (getReferenceCurieFlag === true) && (updateCitationFlag === false)) {	// citation now updates from database triggers
  if (referenceCurie !== '' && (getReferenceCurieFlag === true)) {
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
            </div> : null
        }
      </div>
  )
} // const Biblio


export default Biblio
