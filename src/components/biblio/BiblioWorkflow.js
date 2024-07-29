import { useSelector, useDispatch } from 'react-redux';

import { setBiblioWorkflowCuratability } from '../../actions/biblioActions';
import { updateSelectBiblioWorkflowCuratability } from '../../actions/biblioActions';
import { setWorkflowModalText } from '../../actions/biblioActions';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';

import RowDivider from './RowDivider';
import ModalGeneric from './ModalGeneric';


const BiblioWorkflow = () => {
  const dispatch = useDispatch();
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  // const referenceJsonDb = useSelector(state => state.biblio.referenceJsonDb);

  const oktaMod = useSelector(state => state.isLogged.oktaMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);
  const accessLevel = (testerMod !== 'No') ? testerMod : oktaMod;

  const accessToken = useSelector(state => state.isLogged.accessToken);
  // const entityEntitiesToMap = useSelector(state => state.biblio.entityEntitiesToMap);
  // const entityEntityMappings = useSelector(state => state.biblio.entityEntityMappings);
  const isUpdatingWorkflowCuratability = useSelector(state => state.biblio.isUpdatingWorkflowCuratability);
  const workflowModalText = useSelector(state => state.biblio.workflowModalText);

  const curieToNameAtp = { 'ATP:0000103': 'experimental', 'ATP:0000104': 'not experimental', 'ATP:0000106': 'meeting', '': '' };
  const curatabilityList = [ '', 'ATP:0000103', 'ATP:0000104', 'ATP:0000106' ];
  const curatabilityValue = 'workflow_tag_id' in referenceJsonLive['workflow_curatability'] ? 
                            referenceJsonLive['workflow_curatability']['workflow_tag_id'] : '';

  function parseGmtDateStringToReadable(dateString) {
    // eventually figure out where this function will be used and move it there.  use "fr-CA" to get YYYY-MM-DD format
    // console.log(dateString + "+00:00")
    let newDate = new Date(dateString + "+00:00");
    return (newDate.toLocaleDateString("fr-CA") + ' ' + newDate.toLocaleTimeString());
  }

  /*
  return (
    <Container fluid>
    <ModalGeneric showGenericModal={workflowModalText !== '' ? true : false} genericModalHeader="Workflow Error" 
                  genericModalBody={workflowModalText} onHideAction={setWorkflowModalText('')} />
    <RowDivider />
    <Row className="form-group row" >
      <Col className="form-label col-form-label" sm="3"><h3>Workflow Editor</h3></Col></Row>
    <Row className="form-group row" >
      <Col sm="1"></Col>
      <Col className="div-grey-border" sm="1">MOD</Col>
      <Col className="div-grey-border" sm="2">Reference Type (curatability)</Col>
      <Col className="div-grey-border" sm="2">Date Updated</Col>
      <Col className="div-grey-border" sm="2">Updater</Col>
      <Col className="div-grey-border" sm="2">Date Created</Col>
      <Col className="div-grey-border" sm="2">Creator</Col>
    </Row>
    <Row className="form-group row" >
      <Col sm="1"></Col>
      <Col sm="1">
        {'mod_abbreviation' in referenceJsonLive['workflow_curatability'] ? referenceJsonLive['workflow_curatability']['mod_abbreviation'] : ''}
      </Col>
      <Col sm="2">
        <Form.Control as="select" id="curatabilitySelect" type="curatabilitySelect" value={curatabilityValue} 
          disabled={isUpdatingWorkflowCuratability === true ? 'disabled' : ''}
          onChange={(e) => {
            // console.log(e.target.value);
            dispatch(setBiblioWorkflowCuratability(e.target.value));
            if ('reference_workflow_tag_id' in referenceJsonLive['workflow_curatability']) {
              if (e.target.value === '') {
                // console.log('exists ' + referenceJsonLive['workflow_curatability']['reference_workflow_tag_id'] + ' DELETE');
                dispatch(updateSelectBiblioWorkflowCuratability(accessToken, referenceJsonLive['workflow_curatability']['reference_workflow_tag_id'], null, 'DELETE')) }
              else {
                // console.log('exists ' + referenceJsonLive['workflow_curatability']['reference_workflow_tag_id'] + ' PATCH');
                dispatch(updateSelectBiblioWorkflowCuratability(accessToken, referenceJsonLive['workflow_curatability']['reference_workflow_tag_id'], {'workflow_tag_id': e.target.value}, 'PATCH')) } }
            else {
              // console.log('new');
              dispatch(updateSelectBiblioWorkflowCuratability(accessToken, null, {'workflow_tag_id': e.target.value, 'reference_curie': referenceJsonLive['curie'], 'mod_abbreviation': accessLevel }, 'POST')); }
          } } >
          { curatabilityList.map((optionValue, index) => (
            <option key={`curatabilitySelect ${optionValue}`} value={optionValue}>{curieToNameAtp[optionValue]}</option>
          ))}
        </Form.Control>
      </Col>
      <Col className="div-grey-border" sm="2">
        {'date_updated' in referenceJsonLive['workflow_curatability'] ?
          parseGmtDateStringToReadable(referenceJsonLive['workflow_curatability']['date_updated']) : ''}
      </Col>
      <Col className="div-grey-border" sm="2">
        {'updated_by' in referenceJsonLive['workflow_curatability'] ? referenceJsonLive['workflow_curatability']['updated_by'] : ''}
      </Col>
      <Col className="div-grey-border" sm="2">
        {'date_created' in referenceJsonLive['workflow_curatability'] ?
          parseGmtDateStringToReadable(referenceJsonLive['workflow_curatability']['date_created']) : ''}
      </Col>
      <Col className="div-grey-border" sm="2">
        {'created_by' in referenceJsonLive['workflow_curatability'] ? referenceJsonLive['workflow_curatability']['created_by'] : ''}
      </Col>
      <Col sm="1"></Col>
    </Row>
    </Container> );
  */

  return (
    <div className="section-content">
	   <p>This section is currently unavailable. Please check back later.</p>
    </div>
 );
    
} // const BiblioWorkflow

export default BiblioWorkflow;
