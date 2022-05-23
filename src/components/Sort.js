import { Link } from 'react-router-dom'
// import { useHistory } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';

import Form from 'react-bootstrap/Form';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert'

import { setReferenceCurie } from '../actions/biblioActions';
import { setGetReferenceCurieFlag } from '../actions/biblioActions';

import { changeFieldSortMods } from '../actions/sortActions';
import { sortButtonModsQuery } from '../actions/sortActions';

import { changeSortCorpusToggler } from '../actions/sortActions';
import { updateButtonSort } from '../actions/sortActions';
import { closeSortUpdateAlert } from '../actions/sortActions';
import { setSortUpdating } from '../actions/sortActions';
import { sortButtonSetRadiosAll } from '../actions/sortActions';
import {Spinner} from "react-bootstrap";


// DONE
// Find Papers to Sort will need to query data once there's an API
// radio buttons need something in the referencesToSort store to update for what type of value to set it to
// changeSortCorpusToggler should use a button to update the state of that radio
// Update Sorting will need to update something once there's an API
// Better styling for the reference display once we know what data we want to show
// TODO
// Toggle All buttons need to also access the store for those radio states


const RowDivider = () => { return (<Row><Col>&nbsp;</Col></Row>); }

const Sort = () => {
  const modsField = useSelector(state => state.sort.modsField);
  const referencesToSortLive = useSelector(state => state.sort.referencesToSortLive);
  const referencesToSortDb = useSelector(state => state.sort.referencesToSortDb);
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const sortUpdating = useSelector(state => state.sort.sortUpdating);
  const getPapersToSortFlag = useSelector(state => state.sort.getPapersToSortFlag);
  const isLoading = useSelector(state => state.sort.isLoading);
  const dispatch = useDispatch();

  let buttonFindDisabled = 'disabled'
  if (modsField) { buttonFindDisabled = ''; }

  let buttonUpdateDisabled = ''
  if (sortUpdating > 0) { buttonUpdateDisabled = 'disabled'; }

  const mods = ['FB', 'MGI', 'RGD', 'SGD', 'WB', 'ZFIN']

  if (getPapersToSortFlag === true && sortUpdating === 0 && modsField) {
    console.log('sort DISPATCH sortButtonModsQuery ' + modsField);
    dispatch(sortButtonModsQuery(modsField))
  }

  function updateSorting() {
    const forApiArray = []
    for (const[index, reference] of referencesToSortLive.entries()) {
      if (referencesToSortDb[index]['corpus'] !== reference['corpus']) {
        // console.log(reference['mod_corpus_association_id']);
        // console.log(reference['corpus']);
        // console.log(referencesToSortDb[index]['corpus']);
        let corpusBoolean = null;
        if      (reference['corpus'] === 'needs_review')   { corpusBoolean = null; }
        else if (reference['corpus'] === 'inside_corpus')  { corpusBoolean = true; }
        else if (reference['corpus'] === 'outside_corpus') { corpusBoolean = false; }
        let updateJson = { 'corpus': corpusBoolean }
        let subPath = 'reference/mod_corpus_association/' + reference['mod_corpus_association_id'];
        const field = null;
        const subField = null;
        const method = 'PATCH';
        let array = [ subPath, updateJson, method, index, field, subField ]
        forApiArray.push( array );
      }
    }
    let dispatchCount = forApiArray.length;

    console.log('dispatchCount ' + dispatchCount)
    dispatch(setSortUpdating(dispatchCount))

    for (const arrayData of forApiArray.values()) {
      arrayData.unshift(accessToken)
      dispatch(updateButtonSort(arrayData))
    }
  }

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
          </Col>
          <Col lg={5} ></Col>
        </Row>
        <Row>
          <Col lg={4} ></Col>
          <Col lg={4} >
            <br/>
            <Button style={{width: "12em"}} disabled={buttonFindDisabled} onClick={() => dispatch(sortButtonModsQuery(modsField))}>{isLoading ? <Spinner animation="border" size="sm"/> : "Find Papers to Sort"}</Button>
          </Col>
          <Col lg={4} ></Col>
        </Row>
      </Container>
      {
        referencesToSortLive && referencesToSortLive.length === 0 ?
            <div>
              <br/>
              <p>No Papers to sort</p>
            </div>
            : null
      }
      { referencesToSortLive && referencesToSortLive.length > 0 &&
        <Container fluid>
          <RowDivider />
          <RowDivider />
          <Row>
            <Col lg={9}></Col>
            <Col lg={1}>
              <Button variant="outline-primary" as="input" type="button" value="Review" onClick={() => dispatch(sortButtonSetRadiosAll('needs_review'))} />{' '}
            </Col>
            <Col lg={1}>
              <Button variant="outline-primary" as="input" type="button" value="Inside" onClick={() => dispatch(sortButtonSetRadiosAll('inside_corpus'))} />{' '}
            </Col>
            <Col lg={1}>
              <Button variant="outline-primary" as="input" type="button" value="Outside" onClick={() => dispatch(sortButtonSetRadiosAll('outside_corpus'))} />{' '}
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
                 <div style={{alignSelf: 'flex-start'}} ><b>Title: </b>
                   <span dangerouslySetInnerHTML={{__html: reference['title']}} /></div>
                 <Link to={{pathname: "/Biblio", search: "?action=display&referenceCurie=" + reference['curie']}}
                   style={{alignSelf: 'flex-start'}}  onClick={() => { dispatch(setReferenceCurie(reference['curie'])); 
                   dispatch(setGetReferenceCurieFlag(true)); }} >{reference['curie']}</Link>
                 {reference['cross_references'].map((xref, index2) => (
                   <div key={`xref ${index} ${index2}`} style={{alignSelf: 'flex-start'}} >
                     <a href={xref['url']} target='_blank' rel="noreferrer" >{xref['curie']}</a></div>
                 ))}
                 <div style={{alignSelf: 'flex-start'}} ><b>Journal:</b> { 
                   (reference['resource_title']) ? <span dangerouslySetInnerHTML={{__html: reference['resource_title']}} /> : 'N/A' }</div>
              </Col>
              <Col lg={5} className="Col-general Col-display" ><span dangerouslySetInnerHTML={{__html: reference['abstract']}} /></Col>
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
            <BiblioSubmitUpdateRouter />
            <Button as="input" type="button" disabled={buttonUpdateDisabled} value="Update Sorting" onClick={() => updateSorting()} />{' '}
          </Col></Row>
        </Container>
      }
      <hr/>
      <Link to='/'>Go Back</Link>
    </div>
  )
}

const BiblioSubmitUpdateRouter = () => {
  const sortUpdating = useSelector(state => state.sort.sortUpdating);

  if (sortUpdating > 0) {
    return (<BiblioSubmitUpdating />); }
  else {
    return (<><AlertDismissibleBiblioUpdate /></>); }
} // const BiblioSubmitUpdateRouter

const BiblioSubmitUpdating = () => {
  return (
    <div className="form-control biblio-updating" >updating Sort data</div>
  );
}

const AlertDismissibleBiblioUpdate = () => {
  const dispatch = useDispatch();
  const updateAlert = useSelector(state => state.sort.updateAlert);
  const updateFailure = useSelector(state => state.sort.updateFailure);
  const updateMessages = useSelector(state => state.sort.updateMessages);
  let variant = 'danger';
  let header = 'Update Failure';
  if (updateFailure === 0) {
    header = 'Update Success';
    variant = 'success'; }
  else {
    header = 'Update Failure';
    variant = 'danger'; }
  if (updateAlert) {
    return (
      <Alert variant={variant} onClose={() => dispatch(closeSortUpdateAlert())} dismissible>
        <Alert.Heading>{header}</Alert.Heading>
        {updateMessages.map((message, index) => (
          <div key={`${message} ${index}`}>{message}</div>
        ))}
      </Alert>
    );
  } else { return null; }
}


export default Sort


