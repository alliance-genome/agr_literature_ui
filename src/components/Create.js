// import { Link } from 'react-router-dom'
import { useHistory } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';

import { changeCreateActionToggler } from '../actions/createActions';
import { updateButtonCreate } from '../actions/createActions';
import { resetCreateRedirect } from '../actions/createActions';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button'



const CreatePubmed = () => {
  const dispatch = useDispatch();
  return (<Container>In Progress<Button id={`button create pubmed`} variant="outline-secondary" onClick={(e) => dispatch(changeCreateActionToggler(e))} >Create a PubMed reference</Button></Container>);
} // const CreatePubmed

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
