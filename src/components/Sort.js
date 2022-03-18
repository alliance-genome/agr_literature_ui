import { Link } from 'react-router-dom'
// import { useHistory } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';

import Form from 'react-bootstrap/Form';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';


import { changeFieldSortMods } from '../actions/sortActions';
import { sortButtonModsQuery } from '../actions/sortActions';

import { changeBiblioAuthorExpandToggler } from '../actions/biblioActions';	// TODO use sort action

// TODO
// Find Papers to Sort will need to query data once there's an API
// radio buttons need something in the referencesToSort store to update for what type of value to set it to
// changeBiblioAuthorExpandToggler should use a button to update the state of that radio
// Toggle All buttons need to also access the store for those radio states
// Update Sorting will need to update something once there's an API
// Better styling for the reference display once we know what data we want to show


const RowDivider = () => { return (<Row><Col>&nbsp;</Col></Row>); }

const Sort = () => {
  const modsField = useSelector(state => state.sort.modsField);
  const referencesToSort = useSelector(state => state.sort.referencesToSort);
  const dispatch = useDispatch();

  let buttonDisabled = 'disabled'
  if (modsField) { buttonDisabled = ''; }

  const mods = ['FB', 'MGI', 'RGD', 'SGD', 'WB', 'ZFIN']

  return (
    <div>
      <h4>Select a MOD to find papers to sort for inside / outside corpus</h4>
      <Container>
        <Row>
          <Col lg={5} ></Col>
          <Col lg={2} >
            <br/>
            <Form.Control as="select" name="mods" type="select" htmlSize={mods.length} onChange={(e) => dispatch(changeFieldSortMods(e))} >
              {mods.map((optionValue, index) => (
                <option key={`mod ${index} ${optionValue}`}>{optionValue}</option>
              ))}
            </Form.Control>
            <br/>
            <Button as="input" type="button" disabled={buttonDisabled} value="Find Papers to Sort" onClick={() => dispatch(sortButtonModsQuery(modsField))} />{' '}
          </Col>
          <Col lg={5} ></Col>
        </Row>
      </Container>
      { referencesToSort.length > 0 && 
        <Container>
          <RowDivider />
          <RowDivider />
          <Row>
            <Col lg={6}></Col>
            <Col lg={2}>
              <Button variant="outline-primary" as="input" type="button" value="All Needs Review" />{' '}
            </Col>
            <Col lg={2}>
              <Button variant="outline-primary" as="input" type="button" value="All Inside Corpus" />{' '}
            </Col>
            <Col lg={2}>
              <Button variant="outline-primary" as="input" type="button" value="All Outside Corpus" />{' '}
            </Col>
          </Row>
          <RowDivider />
          {/* <Row>
            <Col lg={6} >Reference</Col>
            <Col lg={2} >Review </Col>
            <Col lg={2} >Inside </Col>
            <Col lg={2} >Outside </Col>
          </Row>
          <RowDivider /> */}
          {referencesToSort.map((reference, index) => (
            <div key={`reference div ${index}`} >
            <Row key={`reference ${index}`} >
              <Col lg={6} className="Col-general Col-display Col-display-left" >{reference}</Col>
              <Col lg={2} className="Col-general Col-display" >
                <Form.Check
                  inline
                  checked='checked'
                  type='radio'
                  label='needs review'
                  id='biblio-author-expand-toggler-null'
                  onChange={(e) => dispatch(changeBiblioAuthorExpandToggler(e))}
                />
              </Col>
              <Col lg={2} className="Col-general Col-display" >
                <Form.Check
                  inline
                  type='radio'
                  label='inside corpus'
                  id='biblio-author-expand-toggler-true'
                  onChange={(e) => dispatch(changeBiblioAuthorExpandToggler(e))}
                />
              </Col>
              <Col lg={2} className="Col-general Col-display Col-display-right" >
                <Form.Check
                  inline
                  type='radio'
                  label='outside corpus'
                  id='biblio-author-expand-toggler-false'
                  onChange={(e) => dispatch(changeBiblioAuthorExpandToggler(e))}
                />
              </Col>
            </Row>
            </div>
          ))}
          <RowDivider />
          <Row><Col>
            <Button as="input" type="button" value="Update Sorting" />{' '}
          </Col></Row>
        </Container>
      }
      <hr/>
      <Link to='/'>Go Back</Link>
    </div>
  )
}

export default Sort


