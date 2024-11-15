// import { Link } from 'react-router-dom'
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory } from "react-router-dom";
import { useLocation } from 'react-router-dom';

import { setReferenceCurie } from '../actions/biblioActions';
import { setGetReferenceCurieFlag } from '../actions/biblioActions';
import { resetBiblioIsLoading } from '../actions/biblioActions';
import { setBiblioAction } from '../actions/biblioActions';

import { changeCreateActionToggler } from '../actions/createActions';
import { setCreateActionToggler } from '../actions/createActions';
import { updateButtonCreate } from '../actions/createActions';
import { resetCreateRedirect } from '../actions/createActions';
import { changeCreateField } from '../actions/createActions';
import { changeCreatePmidField } from '../actions/createActions';
import { createQueryPubmed } from '../actions/createActions';
import { setCreateModalText } from '../actions/createActions';

import ModalGeneric from './biblio/ModalGeneric';

import { enumDict } from './biblio/BiblioEditor';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button'
import Spinner from 'react-bootstrap/Spinner'


function useGetAccessLevel() {
  const oktaMod = useSelector(state => state.isLogged.oktaMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);
  const accessLevel = (testerMod !== 'No') ? testerMod : oktaMod;
  return accessLevel;
}


const CreatePubmed = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const pmid = useSelector(state => state.create.pmid);
  const pmidTitle = useSelector(state => state.create.pmidTitle);
  const searchPmidLoading = useSelector(state => state.create.searchPmidLoading);
  const createPmidLoading = useSelector(state => state.create.createPmidLoading);
  const modIdent = useSelector(state => state.create.modIdent);
  const modPrefix = useSelector(state => state.create.modPrefix);
  // const accessLevel = useGetAccessLevel();
  const generalClassName = 'Col-general';


  function createPubmedReference(pmid) {
    const modCurie = modPrefix + ':' + modIdent;
    const mcaMod = (modPrefix === 'Xenbase') ? 'XB' : modPrefix;
    pmid = pmid.replace( /[^\d.]/g, '' );
    let updateJson = { 'pubmed_id': pmid,
                       'mod_curie': modCurie,
                       'mod_mca': mcaMod }
    if (modPrefix === 'WB' || modPrefix === 'SGD') { delete updateJson['mod_curie']; }	// do not create an xref for WB and SGD, mca will trigger modID creation in xref
    // const subPath = 'reference/add/' + pmid + '/' + modCurie + '/' + mcaMod + '/';
    const subPath = 'reference/add/';
    let arrayData = [ accessToken, subPath, updateJson, 'POST', 0, null, null]
    dispatch(updateButtonCreate(arrayData, 'pmid', modCurie));
  }
  return (
    <Container>
    <Form.Group as={Row} key="Pmid" >
      <Form.Label column sm="2" className={`${generalClassName}`} >PMID</Form.Label>
      <Col sm="6" className={`${generalClassName}`}>
        <Form.Control as="input" name="pmid" id="pmid" type="input" value={pmid} className={`form-control`} placeholder="12345678" onChange={(e) => dispatch(changeCreatePmidField(e))} />
      </Col>
      <Col sm="4" className={`${generalClassName}`}>
        <Button id={`button query pubmed`} variant="outline-secondary" onClick={() => dispatch(createQueryPubmed(pmid))} >
        {searchPmidLoading ? <Spinner animation="border" size="sm"/> : <span>Query PubMed ID</span> }
        </Button>
      </Col>
    </Form.Group>
    <Form.Group as={Row} key="PmidTitle" >
      <Form.Label column sm="2" className={`${generalClassName}`} >PubMed Title</Form.Label>
      <Col sm="10" className={`${generalClassName}`}>
        <Form.Control as="input" name="pmidTitle" id="pmidTitle" type="input" value={pmidTitle} disabled="disabled" className={`form-control`} placeholder="no PubMed reference found for that id" />
      </Col>
    </Form.Group>
    { pmidTitle && (
      <>
        <ModCurieInput />
            <Button id={`button create pubmed`} variant="outline-secondary" disabled={ ( (modPrefix !== 'WB') && (modPrefix !== 'SGD') && (modIdent === '') ) ? "disabled" : "" } onClick={() => createPubmedReference(pmid)} >
          {createPmidLoading ? <Spinner animation="border" size="sm"/> : <span>Create a PubMed reference</span> }
        </Button>
      </>
    ) }
    </Container>);
} // const CreatePubmed

const CreateAlliance = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const createAllianceLoading = useSelector(state => state.create.createAllianceLoading);
  const modIdent = useSelector(state => state.create.modIdent);
  const modPrefix = useSelector(state => state.create.modPrefix);
  const mcaMod = (modPrefix === 'Xenbase') ? 'XB' : modPrefix;

  function createAllianceReference(modPrefix, modIdent) {
    const subPath = 'reference/';
    const modCurie = modPrefix + ':' + modIdent;
    let updateJson = { 'title': 'placeholder title',
                       'category': 'other',
                       'mod_corpus_associations': [ { 'mod_abbreviation': mcaMod, 'mod_corpus_sort_source': 'manual_creation', 'corpus': true } ],
                       'cross_references': [ { 'curie': modCurie, 'pages': [ 'reference' ], 'is_obsolete': false } ] }
    if (modPrefix === 'WB' || modPrefix === 'SGD') { delete updateJson['cross_references']; }	// do not create an xref for WB and SGD, mca will trigger modID creation in xref
    let arrayData = [ accessToken, subPath, updateJson, 'POST', 0, null, null]
    dispatch(updateButtonCreate(arrayData, 'alliance', modCurie))
  }
  return (
    <Container>
      <ModCurieInput />
      <Button id={`button create alliance`} variant="outline-secondary" disabled={ ( (modPrefix !== 'WB') && (modPrefix !== 'SGD') && (modIdent === '') ) ? "disabled" : "" } onClick={() => createAllianceReference(modPrefix, modIdent)} >
        {createAllianceLoading ? <Spinner animation="border" size="sm"/> : <span>Create an Alliance reference</span> }
      </Button>
    </Container>);
} // const CreateAlliance

const ModCurieInput = () => {
  const dispatch = useDispatch();
  const modIdent = useSelector(state => state.create.modIdent);
  const modPrefix = useSelector(state => state.create.modPrefix);
  const generalClassName = 'Col-general';
  return (
      <Form.Group as={Row} key="modXref" >
        <Form.Label column sm="2" className={`${generalClassName}`} >MOD ID</Form.Label>
        <Col sm="2" className={`${generalClassName}`}>{modPrefix}</Col>
        <Col sm="6" className={`${generalClassName}`}>
          {modPrefix === 'WB' ? (
            <div>This will generate a WB:WBPaper ID</div>
          ) : modPrefix === 'SGD' ? (
            <div>This will generate a new SGDID</div>
          ) : (
            <Form.Control
              as="input"
              name="modIdent"
              id="modIdent"
              type="input"
              value={modIdent}
              className={`form-control`}
              placeholder="12345"
              onChange={(e) => dispatch(changeCreateField(e))}
            />
          )}
       </Col>
      </Form.Group>);
} // const ModCurieInput


const CreateActionToggler = () => {
  const dispatch = useDispatch();
  const createAction = useSelector(state => state.create.createAction);
  let pubmedChecked = '';
  let allianceChecked = '';
  let radioFormPubmedClassname = 'radio-form';
  let radioFormAllianceClassname = 'radio-form';
// to default pubmed
//   let createActionTogglerSelected = 'pubmed';
//   if (createAction === 'alliance') { allianceChecked = 'checked'; createActionTogglerSelected = 'alliance'; }
//     else { pubmedChecked = 'checked'; }
  let createActionTogglerSelected = 'alliance';
  if (createAction === 'pubmed') {
      radioFormPubmedClassname += ' underlined';
      pubmedChecked = 'checked';
      createActionTogglerSelected = 'pubmed'; }
    else {
      radioFormAllianceClassname += ' underlined';
      allianceChecked = 'checked'; }
  let newUrl = "/Create/?action=" + createActionTogglerSelected
  window.history.replaceState({}, null, newUrl)

  return (
    <Form>
    <div key={`default-radio`} className="mb-3">
      <div className='radio-span'>
        <Form.Check
          inline
          className={radioFormPubmedClassname}
          checked={pubmedChecked}
          type='radio'
          label='PubMed'
          id='create-toggler-pubmed'
          onChange={(e) => dispatch(changeCreateActionToggler(e))}
        />
      </div>
      <div className='radio-span'>
        <Form.Check
          inline
          className={radioFormAllianceClassname}
          checked={allianceChecked}
          type='radio'
          label='Alliance'
          id='create-toggler-alliance'
          onChange={(e) => dispatch(changeCreateActionToggler(e))}
        />
      </div>
    </div>
    </Form>);
} // const CreateActionToggler

const CreateActionRouter = () => {
  const dispatch = useDispatch();
  const createAction = useSelector(state => state.create.createAction);
  const accessLevel = useGetAccessLevel();
  const useQuery = () => { return new URLSearchParams(useLocation().search); }
  let query = useQuery();
  if (createAction === '') {
    let paramAction = query.get('action');
    dispatch(setCreateActionToggler(paramAction));
  }

  useEffect( () => {
    if (enumDict['mods'].includes(accessLevel)) {
      const modPrefix = (accessLevel === 'XB') ? 'Xenbase' : accessLevel;
      dispatch(changeCreateField({target: {id: 'modPrefix', value: modPrefix }})); }
  }, [accessLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  switch (createAction) {
    case 'alliance':
      return (<Container><CreateActionToggler /><RowDivider /><CreateAlliance /></Container>);
    case 'pubmed':
      return (<Container><CreateActionToggler /><RowDivider /><CreatePubmed /></Container>);
    default:
      return (<Container><CreateActionToggler /><RowDivider /><CreateAlliance /></Container>);
  }
}

const RowDivider = () => { return (<Row><Col>&nbsp;</Col></Row>); }

const Create = () => {
  const createRedirectToBiblio = useSelector(state => state.create.redirectToBiblio);
  const createRedirectCurie = useSelector(state => state.create.redirectCurie);
  const updateMessages = useSelector(state => state.create.updateMessages);
  const updateFailure = useSelector(state => state.create.updateFailure);
  const createModalText = useSelector(state => state.create.createModalText);
  const dispatch = useDispatch();
  const history = useHistory();

  function pushHistory(referenceCurie) {
    console.log('history push');
    dispatch(setBiblioAction('editor'));
    dispatch(resetCreateRedirect());
    dispatch(resetBiblioIsLoading());
    // dispatching these 2 actions and their reducers to alter the state from a different component creates a warning, but it's needed for Biblio to set the correct referenceCurie and query the db for its data.
    // Warning: Cannot update during an existing state transition (such as within `render`). Render methods should be a pure function of props and state.
    dispatch(setGetReferenceCurieFlag(true));
    dispatch(setReferenceCurie(referenceCurie));
    history.push("/Biblio/?action=editor&referenceCurie=" + referenceCurie);
  }

  useEffect(() => {
    if (createRedirectToBiblio) {
      pushHistory(createRedirectCurie);
    }
  }, [createRedirectToBiblio, createRedirectCurie, dispatch, history]); // Dependencies ensure this effect runs when these values change

  return (
    <div>
      <ModalGeneric showGenericModal={createModalText !== '' ? true : false} genericModalHeader="Create reference Error"
                    genericModalBody={createModalText} onHideAction={setCreateModalText('')} />
      <h4>Create a new Reference</h4>
      <p>Create a new reference from PubMed PMID or manually</p>
      { updateFailure > 0 && 
        updateMessages.map((message, index) => (
          <div key={`message ${index}`}><span style={{color:'red'}}>{message}</span></div> ))
      }
      <CreateActionRouter />
    </div>
  )
}

export default Create
