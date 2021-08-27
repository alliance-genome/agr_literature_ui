// import { Link } from 'react-router-dom'
import { useHistory } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';

import { setReferenceCurie } from '../actions/biblioActions';
import { setGetReferenceCurieFlag } from '../actions/biblioActions';

import { changeCreateActionToggler } from '../actions/createActions';
import { updateButtonCreate } from '../actions/createActions';
import { resetCreateRedirect } from '../actions/createActions';
import { changeCreateField } from '../actions/createActions';
import { createQueryPubmed } from '../actions/createActions';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button'


const CreatePubmed = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const pmid = useSelector(state => state.create.pmid);
  const pmidTitle = useSelector(state => state.create.pmidTitle);
  const generalClassName = 'Col-general';

  function createPubmedReference(pmid) {
    alert('In Progress.  Waiting for API to make python calls');
//     const subPath = 'reference/'
//     let updateJson = { 'title': 'placeholder title', 'category': 'other' }
//     let arrayData = [ accessToken, subPath, updateJson, 'POST', 0, null, null]
//     dispatch(updateButtonCreate(arrayData))
  }
  return (
    <Container>
    <Form.Group as={Row} key="Pmid" >
      <Form.Label column sm="2" className={`${generalClassName}`} >PMID</Form.Label>
      <Col sm="6" className={`${generalClassName}`}>
        <Form.Control as="input" name="pmid" id="pmid" type="input" value={pmid} className={`form-control`} placeholder="12345678" onChange={(e) => dispatch(changeCreateField(e))} />
      </Col>
      <Col sm="4" className={`${generalClassName}`}>
        <Button id={`button query pubmed`} variant="outline-secondary" onClick={() => dispatch(createQueryPubmed(pmid))} >Query PubMed ID</Button>
      </Col>
    </Form.Group>
    <Form.Group as={Row} key="PmidTitle" >
      <Form.Label column sm="2" className={`${generalClassName}`} >PubMed Title</Form.Label>
      <Col sm="10" className={`${generalClassName}`}>
        <Form.Control as="input" name="pmidTitle" id="pmidTitle" type="input" value={pmidTitle} disabled="disabled" className={`form-control`} placeholder="no PubMed reference found for that id" />
      </Col>
    </Form.Group>
    {pmidTitle && (<Button id={`button create pubmed`} variant="outline-secondary" onClick={() => createPubmedReference(pmid)} >Create a PubMed reference</Button>)}
    </Container>);
} // const CreatePubmed
//     {pmidTitle && (<Button id={`button create pubmed`} variant="outline-secondary" onClick={() => dispatch(createPubmedReference(pmid))} >Create a PubMed reference</Button>)}

const CreateAlliance = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector(state => state.isLogged.accessToken);
  function createAllianceReference() {
    const subPath = 'reference/'
    let updateJson = { 'title': 'placeholder title', 'category': 'other' }
    let arrayData = [ accessToken, subPath, updateJson, 'POST', 0, null, null]
    dispatch(updateButtonCreate(arrayData))
  }
//   let revertElement = (<Button id={`button create alliance`} variant="outline-secondary" onClick={(e) => dispatch(biblioRevertField(e))} ></Button>);
//   return (<Container><Button id={`button create alliance`} variant="outline-secondary" onClick={(e) => dispatch(changeCreateActionToggler(e))} >Create an Alliance reference</Button></Container>);
  return (<Container><Button id={`button create alliance`} variant="outline-secondary" onClick={() => createAllianceReference()} >Create an Alliance reference</Button></Container>);
} // const CreateAlliance

const CreateActionToggler = () => {
  const dispatch = useDispatch();
  const createAction = useSelector(state => state.create.createAction);
  let pubmedChecked = '';
  let allianceChecked = '';
// to default pubmed
//   let createActionTogglerSelected = 'pubmed';
//   if (createAction === 'alliance') { allianceChecked = 'checked'; createActionTogglerSelected = 'alliance'; }
//     else { pubmedChecked = 'checked'; }
  let createActionTogglerSelected = 'alliance';
  if (createAction === 'pubmed') { pubmedChecked = 'checked'; createActionTogglerSelected = 'pubmed'; }
    else { allianceChecked = 'checked'; }
  let newUrl = "/Create/?action=" + createActionTogglerSelected
  window.history.replaceState({}, null, newUrl)

  return (
    <Form>
    <div key={`default-radio`} className="mb-3">
      <Form.Check
        inline
        checked={pubmedChecked}
        type='radio'
        label='PubMed'
        id='create-toggler-pubmed'
        onChange={(e) => dispatch(changeCreateActionToggler(e))}
      />
      <Form.Check
        inline
        checked={allianceChecked}
        type='radio'
        label='Alliance'
        id='create-toggler-alliance'
        onChange={(e) => dispatch(changeCreateActionToggler(e))}
      />
    </div>
    </Form>);
} // const CreateActionToggler

const CreateActionRouter = () => {
  const createAction = useSelector(state => state.create.createAction);
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
  const dispatch = useDispatch();
  const history = useHistory();

  function pushHistory(referenceCurie) {
    console.log('history push');
    dispatch(resetCreateRedirect());
    // dispatching these 2 actions and their reducers to alter the state from a different component creates a warning, but it's needed for Biblio to set the correct referenceCurie and query the db for its data.
    // Warning: Cannot update during an existing state transition (such as within `render`). Render methods should be a pure function of props and state.
    dispatch(setGetReferenceCurieFlag(true));
    dispatch(setReferenceCurie(referenceCurie));
    history.push("/Biblio/?action=editor&referenceCurie=" + referenceCurie);
  }
  return (
    <div>
      <h4>Create a new Reference</h4>
      <p>Create a new reference from PubMed PMID or manually</p>
      {createRedirectToBiblio && pushHistory(createRedirectCurie)}
      <CreateActionRouter />
    </div>
  )
}
//       <Link to='/'>Go Back</Link>

export default Create
