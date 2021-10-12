// import { Link } from 'react-router-dom'
// import { useHistory } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';

import { changeFieldInput } from '../actions/mergeActions';
import { mergeQueryReferences } from '../actions/mergeActions';
import { mergeResetReferences } from '../actions/mergeActions';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExchangeAlt } from '@fortawesome/free-solid-svg-icons'
// import { faLongArrowAltLeft } from '@fortawesome/free-solid-svg-icons'


// const RowDivider = () => { return (<Row><Col>&nbsp;</Col></Row>); }

const MergeSelectionSection = () => {
  const referenceMeta1 = useSelector(state => state.merge.referenceMeta1);
  const referenceMeta2 = useSelector(state => state.merge.referenceMeta2);
  const queryDoubleSuccess = useSelector(state => state.merge.queryDoubleSuccess);
  // swap icon fa-exchange
  // left arrow icon fa-arrow-left 
  // <FontAwesomeIcon size='lg' icon={faLongArrowAltLeft} />
  
  const dispatch = useDispatch();
  return (
    <Container>
      <Row>
        <Col sm="5" ><span style={{fontSize: '1.2rem'}}>Keep</span> this reference<br/>
          <Form.Control as="input" id="referenceMeta1.input" value={referenceMeta1.input} disabled={referenceMeta1.disableInput} onChange={(e) => dispatch(changeFieldInput(e, 'referenceMeta1', 'input'))} />
          <span style={{color: referenceMeta1.messageColor}}>{referenceMeta1.message}</span>
        </Col>
        <Col sm="2" ><br/>
          <Button>Swap <FontAwesomeIcon icon={faExchangeAlt} /></Button>
        </Col>
        <Col sm="5" ><span style={{fontSize: '1.2rem'}}>Merge away</span> this reference<br/>
          <Form.Control as="input" id="referenceMeta2.input" value={referenceMeta2.input} disabled={referenceMeta2.disableInput} onChange={(e) => dispatch(changeFieldInput(e, 'referenceMeta2', 'input'))} />
          <span style={{color: referenceMeta2.messageColor}}>{referenceMeta2.message}</span>
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
    </Container>
  );
}

const Merge = () => {
  return (
    <div>
      <h4>Merge two References</h4>
      <MergeSelectionSection />
    </div>
  )
}

export default Merge
