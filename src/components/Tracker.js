import React, {useEffect, useState} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {Link} from 'react-router-dom';
import Dropdown from 'react-bootstrap/Dropdown';
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Table from 'react-bootstrap/Table';
import Pagination from 'react-bootstrap/Pagination';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faTimes, faSortNumericDown, faSortNumericUp } from '@fortawesome/free-solid-svg-icons'
import {searchXref} from '../actions/searchActions';
import {searchMissingFiles, addWorkflowTag, setOrder, setTrackerPage} from '../actions/trackerActions';
import LoadingOverlay from "./LoadingOverlay";

const WorkFlowDropdown = (workflow) => {
  const dispatch = useDispatch();

  return (
    <Dropdown>
      <Dropdown.Toggle variant="success" id="dropdown-basic">
        Add Tags
    </Dropdown.Toggle>

   <Dropdown.Menu>
     <Dropdown.Item onClick= {() => dispatch(addWorkflowTag('ATP:0000134', workflow.accessLevel, workflow.curie, workflow.accessToken))}>Files Uploaded</Dropdown.Item>
     <Dropdown.Item onClick= {() => dispatch(addWorkflowTag('ATP:0000135', workflow.accessLevel, workflow.curie, workflow.accessToken))}>No Files Available</Dropdown.Item>
   </Dropdown.Menu>
 </Dropdown>
)}

const XrefElement = (xref) => {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    searchXref(xref.xref, setUrl);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <a href={url} rel="noreferrer noopener" target="_blank">{xref.xref}</a>
  )
}

const TrackerPagination = (mod) => {
  const dispatch = useDispatch();
  const trackerPage = useSelector(state => state.tracker.trackerPage);
  const changePage = (action,page) => {
    switch (action){
      case 'Next':
        page=page+1;
        break;
      case 'Prev':
        page=Math.max(1,page-1);
        break;
      default:
        page=1;
        break;
    }
    dispatch(setTrackerPage(page));
    dispatch(searchMissingFiles(mod.mod))
  }
  return (
    <Pagination style={{justifyContent: 'center', alignItems: 'center'}}>
      {trackerPage === 1 ? <Pagination.Prev disabled/> : <Pagination.Prev   onClick={() => changePage('Prev',trackerPage)} /> }
      <Pagination.Item  disabled>{"Page " + (trackerPage)}</Pagination.Item>
      <Pagination.Next   onClick={() => changePage('Next',trackerPage)} />
    </Pagination>
  )
}

const Tracker = () => {
  const missingFileResults = useSelector(state => state.tracker.missingFileResults);
  const dispatch = useDispatch();
  // const accessLevel = getOktaModAccess(oktaGroups);	// old way before logging on put values in store
  // const accessLevel = useSelector(state => state.isLogged.oktaMod);
  const oktaMod = useSelector(state => state.isLogged.oktaMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);
  const accessLevel = (testerMod !== 'No') ? testerMod : oktaMod;
  // const accessLevel = 'ZFIN';				// to force a specific MOD
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const orderBy = useSelector(state => state.tracker.orderBy);
  const isLoading = useSelector(state => state.tracker.isLoading);

  useEffect(() => {
    if (accessLevel === 'No'){
      //do nothing
    }
    else{
      dispatch(searchMissingFiles(accessLevel));
    }

  },[accessLevel,orderBy,dispatch]);

  return (
    <div>
    <h4>Reference File Tracker</h4>
    <br/>
    <Container fluid>
        <Row>
          <Col>
            <TrackerPagination mod={accessLevel}/>
          </Col>
        </Row>
      </Container>
      <LoadingOverlay active={isLoading} />
      { missingFileResults ?
      <Table bordered size="sm">
        <thead>
          <tr>
            <th>Curie</th>
            <th>MOD Curie</th>
            <th>PMID</th>
            <th>Citation</th>
            <th>File Workflow</th>
            <th>Files Uploaded</th>
            <th>Date Created &nbsp;
              <FontAwesomeIcon icon={orderBy === 'desc' ? faSortNumericDown : faSortNumericUp}
              onClick={() => {
                if (orderBy === 'desc'){
                  dispatch(setOrder('asc'));
                }
                else{
                  dispatch(setOrder('desc'));
                }
                dispatch(setTrackerPage(1));
                dispatch(searchMissingFiles(accessLevel));
              }}/>
            </th>
          </tr>
        </thead>
        <tbody>
        { missingFileResults.map((reference, index) => (
          <tr key={`missingFile ${reference} ${index}`}>
            <td><Link to={{pathname: "/Biblio", search: "?action=display&referenceCurie=" + reference.curie}}>{reference.curie}</Link></td>
            <td><XrefElement xref={reference.mod_curie}/></td>
            <td><XrefElement xref={reference.pmid}/></td>
            <td className="sm-table">{reference.short_citation}</td>
            <td><WorkFlowDropdown accessLevel={accessLevel} curie={reference.curie} accessToken={accessToken}/></td>
            <td className="sm-table no-pad">
              {reference.maincount > 0 ? <div><FontAwesomeIcon icon={faCheck} style={{color: "#28a745"}}/> Main </div> :  <div> <FontAwesomeIcon icon={faTimes}  style={{color: "#dc3545"}}/> &nbsp;Main </div>}
              {reference.supcount > 0 ? <div><FontAwesomeIcon icon={faCheck} style={{color: "#28a745"}}/> Supplemental </div> :  <div> <FontAwesomeIcon icon={faTimes}  style={{color: "#dc3545"}}/> &nbsp;Supplemental </div> }
            </td>
            <td>{reference.date_created.split("T")[0]}</td>
          </tr>
        )) }
        </tbody>
      </Table>

      : null }
    <Container fluid>
        <Row>
          <Col>
            <TrackerPagination mod={accessLevel}/>
          </Col>
        </Row>
    </Container>

    </div>
  );
}

export default Tracker
