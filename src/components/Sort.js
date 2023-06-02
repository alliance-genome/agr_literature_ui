import { Link } from 'react-router-dom'
// import { useHistory } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';

import Form from 'react-bootstrap/Form';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert'

import {downloadReferencefile, setReferenceCurie} from '../actions/biblioActions';
import { setGetReferenceCurieFlag } from '../actions/biblioActions';

import { changeFieldSortMods } from '../actions/sortActions';
import { sortButtonModsQuery } from '../actions/sortActions';

import { changeSortCorpusToggler } from '../actions/sortActions';
import { changeSortWorkflowToggler } from '../actions/sortActions';
import { updateButtonSort } from '../actions/sortActions';
import { closeSortUpdateAlert } from '../actions/sortActions';
import { setSortUpdating } from '../actions/sortActions';
import { sortButtonSetRadiosAll } from '../actions/sortActions';
import {Spinner} from "react-bootstrap";
import React, {useEffect, useState} from "react";
import {searchXref} from "../actions/searchActions";
import axios from "axios";

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

  const mods = ['FB', 'MGI', 'RGD', 'SGD', 'WB', 'XB', 'ZFIN']

  if (getPapersToSortFlag === true && sortUpdating === 0 && modsField) {
    console.log('sort DISPATCH sortButtonModsQuery ' + modsField);
    dispatch(sortButtonModsQuery(modsField))
  }

  //setup referencefile element
  const FileElement = ({referenceCurie}) => {
     const oktaMod = useSelector(state => state.isLogged.oktaMod);
     const testerMod = useSelector(state => state.isLogged.testerMod);
     const oktaDeveloper = useSelector(state => state.isLogged.oktaDeveloper);
     const rowReferencefileElements = []
     for (const[index, reference] of referencesToSortLive.entries()) {
      if (referenceCurie  !== reference['curie']) {continue; }
      let accessLevel = oktaMod;
      if (testerMod !== 'No') { accessLevel = testerMod; }
      else if (oktaDeveloper) { accessLevel = 'developer'; }
      const copyrightLicenseOpenAccess =  (reference['copyright_license_open_access'] !==null && reference['copyright_license_open_access'] === 'True') ? true : false;
      let is_ok = false;
      let allowed_mods = [];
      if ('referencefile_mods' in reference && reference['referencefile_mods'].length > 0) {
        for (const rfm of reference['referencefile_mods'].values()) {
          if (rfm['mod_abbreviation'] !== null) {
            allowed_mods.push(rfm['mod_abbreviation']);
          }
          if (rfm['mod_abbreviation'] === null || rfm['mod_abbreviation'] === accessLevel) {
            is_ok = true;
          }
        }
      }
      let filename = reference["main_filename"];
      if (filename == null) {continue;}
      console.log("file_name:" + filename);
       let referencefileValue = (<div><b>{reference['file_class']}:&nbsp;</b>{filename} &nbsp;({allowed_mods.join(", ")})</div>);
       if (copyrightLicenseOpenAccess   || accessLevel === 'developer') {
         is_ok = true;
       } else if (accessLevel === 'No') {
         is_ok = false;
         referencefileValue = (<div><b>{reference['file_class']}:&nbsp;</b>{filename}</div>);
       }
       if (is_ok) {
        referencefileValue = (<div><b>{reference['file_class']}:&nbsp;</b><button className='button-to-link' onClick={ () =>
          dispatch(downloadReferencefile(reference['referencefile_id'], filename, accessToken))
        } >{filename}</button></div>); }
        const referencefileRow = (
         <div>
           {referencefileValue}
        </div>);

       rowReferencefileElements.push( referencefileRow );
     }
      return (
        <>
         {rowReferencefileElements}
        </>);
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
        let method = 'PATCH';
        let array = [ subPath, updateJson, method, index, field, subField ]
        forApiArray.push( array );
        if (reference['corpus'] === 'inside_corpus') {
          let workflowTagId = null;
          if      (reference['workflow'] === 'experimental')     { workflowTagId = 'ATP:0000103'; }
          else if (reference['workflow'] === 'not_experimental') { workflowTagId = 'ATP:0000104'; }
          else if (reference['workflow'] === 'meeting')          { workflowTagId = 'ATP:0000106'; }
          if (workflowTagId !== null) {
            if (reference['existing_reference_workflow_tag_id_expt_meeting']) {
              updateJson = { 'workflow_tag_id': workflowTagId }
              subPath = 'workflow_tag/' + reference['existing_reference_workflow_tag_id_expt_meeting'];
              method = 'PATCH';
              let array = [ subPath, updateJson, method, index, field, subField ]
              forApiArray.push( array ); }
            else {
              updateJson = { 'workflow_tag_id': workflowTagId, 'mod_abbreviation': '', 'reference_curie': reference['curie'] }
              subPath = 'workflow_tag/'
              method = 'POST';
              let array = [ subPath, updateJson, method, index, field, subField ]
              forApiArray.push( array ); }
    } } } }
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
            <Form.Control as="select" name="mods" type="select" htmlSize={mods.length} onChange={(e) => dispatch(changeFieldSortMods(e))} value={modsField !== '' ? modsField : undefined} >
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
          {referencesToSortLive.map((reference, index) => {
            // console.log(reference);	// check previous workflow here
            return (
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
                <div style={{alignSelf: 'flex-start'}} ><FileElement  referenceCurie={reference['curie']}/></div>
              </Col>
              <Col lg={5} className="Col-general Col-display" ><span dangerouslySetInnerHTML={{__html: reference['abstract']}} /></Col>

              <Col lg={1} className="Col-general Col-display" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                <Container style={{height: '100%', padding: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                  <Row style={{height: '4em', padding: 0}}>
                    <Col style={{display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                      <Form.Check
                        inline
                        checked={ (reference['corpus'] === 'needs_review') ? 'checked' : '' }
                        type='radio'
                        label='review'
                        id={`needs_review_toggle ${index}`}
                        onChange={(e) => dispatch(changeSortCorpusToggler(e))}
                      />
                  </Col></Row>
                  <Row style={{height: '8em'}}><Col></Col></Row>
                </Container>
              </Col>
              <Col lg={1} className="Col-general Col-display" >
                <Container style={{height: '100%', padding: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                  <Row style={{height: '4em', padding: 0}}>
                  <Col style={{display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                    <Form.Check
                      inline
                      checked={ (reference['corpus'] === 'inside_corpus') ? 'checked' : '' }
                      type='radio'
                      label='inside'
                      id={`inside_corpus_toggle ${index}`}
                      onChange={(e) => dispatch(changeSortCorpusToggler(e))}
                    />
                  </Col></Row>
                  <Row style={{height: '8em'}}><Col style={{display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                    <Form.Check
                      inline
                      disabled={ (reference['corpus'] !== 'inside_corpus') ? 'disabled' : '' }
                      checked={ (reference['workflow'] === 'experimental') ? 'checked' : '' }
                      type='radio'
                      label='expt'
                      id={`experimental_toggle ${index}`}
                      onChange={(e) => dispatch(changeSortWorkflowToggler(e))}
                    />
                    <Form.Check
                      inline
                      disabled={ (reference['corpus'] !== 'inside_corpus') ? 'disabled' : '' }
                      checked={ (reference['workflow'] === 'not_experimental') ? 'checked' : '' }
                      type='radio'
                      label='not expt'
                      id={`not_experimental_toggle ${index}`}
                      onChange={(e) => dispatch(changeSortWorkflowToggler(e))}
                    />
                    <Form.Check
                      inline
                      disabled={ (reference['corpus'] !== 'inside_corpus') ? 'disabled' : '' }
                      checked={ (reference['workflow'] === 'meeting') ? 'checked' : '' }
                      type='radio'
                      label='meeting'
                      id={`meeting_toggle ${index}`}
                      onChange={(e) => dispatch(changeSortWorkflowToggler(e))}
                    />
                    <Form.Control as="select" id={`primary_select ${index}`} style={{display: 'none'}}>
                      <option>Experimental</option>
                      <option>Not Experimental</option>
                      <option>Meeting Abstract</option>
                    </Form.Control>
                  </Col></Row>
                </Container>
              </Col>
              <Col lg={1} className="Col-general Col-display" >
                <Container style={{height: '100%', padding: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                  <Row style={{height: '4em', padding: 0}}>
                    <Col style={{display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                      <Form.Check
                        inline
                        checked={ (reference['corpus'] === 'outside_corpus') ? 'checked' : '' }
                        type='radio'
                        label='outside'
                        id={`outside_corpus_toggle ${index}`}
                        onChange={(e) => dispatch(changeSortCorpusToggler(e))}
                      />
                   </Col></Row>
                   <Row style={{height: '8em'}}><Col></Col></Row>
                </Container>
              </Col>
            </Row>

            </div>
          )} )}
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


