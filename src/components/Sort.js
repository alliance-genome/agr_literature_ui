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

import { changeBiblioAuthorExpandToggler } from '../actions/biblioActions';	// TODO get rid of this
import { changeSortCorpusToggler } from '../actions/sortActions';

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
  const referencesToSortLive = useSelector(state => state.sort.referencesToSortLive);
  const dispatch = useDispatch();

  let buttonDisabled = 'disabled'
  if (modsField) { buttonDisabled = ''; }

  const mods = ['FB', 'MGI', 'RGD', 'SGD', 'WB', 'ZFIN']

//                  <div>{reference['title']}</div><br/>
//                  {reference['cross_references'].map((xref, index2) => (
//                    <div key={`xref ${index} ${index2}`}> {xref['curie']}<br/></div>
//                  ))}

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
      { referencesToSortLive.length > 0 && 
        <Container fluid>
          <RowDivider />
          <RowDivider />
          <Row>
            <Col lg={9}></Col>
            <Col lg={1}>
              <Button variant="outline-primary" as="input" type="button" value="Review" />{' '}
            </Col>
            <Col lg={1}>
              <Button variant="outline-primary" as="input" type="button" value="Inside" />{' '}
            </Col>
            <Col lg={1}>
              <Button variant="outline-primary" as="input" type="button" value="Outside" />{' '}
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
          {referencesToSortLive.map((reference, index) => (
            <div key={`reference div ${index}`} >
            <Row key={`reference ${index}`} >
              <Col lg={4} className="Col-general Col-display" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center'}} >
                 {reference['title']} 
                 {reference['mod_corpus_association_id']} 
                 {reference['corpus']}
                 <Link to={{pathname: "/Biblio", search: "?action=display&referenceCurie=" + reference['curie']}}
                   style={{alignSelf: 'flex-start'}} >{reference['curie']}</Link>
                 {reference['cross_references'].map((xref, index2) => (
                   <div key={`xref ${index} ${index2}`} style={{alignSelf: 'flex-start'}} >
                     <a href={xref['url']} target='_blank' rel="noreferrer" >{xref['curie']}</a></div>
                 ))}
              </Col>
              <Col lg={5} className="Col-general Col-display" >{reference['abstract']}</Col>
              <Col lg={1} className="Col-general Col-display" >
                <Form.Check
                  inline
                  checked={ (reference['corpus'] === 'needs_review') ? 'checked' : '' }
                  type='radio'
                  label='review'
                  id={`needs_review_toggle ${index}`}
                  onChange={(e) => dispatch(changeSortCorpusToggler(e))}
                />
              </Col>
              <Col lg={1} className="Col-general Col-display" >
                <Form.Check
                  inline
                  checked={ (reference['corpus'] === 'inside_corpus') ? 'checked' : '' }
                  type='radio'
                  label='inside'
                  id={`inside_corpus_toggle ${index}`}
                  onChange={(e) => dispatch(changeSortCorpusToggler(e))}
                />
              </Col>
              <Col lg={1} className="Col-general Col-display" >
                <Form.Check
                  inline
                  checked={ (reference['corpus'] === 'outside_corpus') ? 'checked' : '' }
                  type='radio'
                  label='outside'
                  id={`outside_corpus_toggle ${index}`}
                  onChange={(e) => dispatch(changeSortCorpusToggler(e))}
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


