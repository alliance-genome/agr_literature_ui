import React, {useEffect, useState} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import axios from "axios";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faTimes} from '@fortawesome/free-solid-svg-icons'
import Dropdown from 'react-bootstrap/Dropdown';

const restUrl = process.env.REACT_APP_RESTAPI;

const searchMissingFiles = (mod_id) => {
  return dispatch => {
    axios.get(restUrl + '/reference/missing_files/'+mod_id)
        .then(res => {
          setMissingFileResults(res.data);
        })
        .catch();
    }
}

const addWorkflowTag = () => {
  return dispatch => {
    let mod_id=1;
    let params = {
      workflow_tag_id: 1,
      mod_abbreviation: 1,
      reference_curie: 1
    }
    axios.post(restUrl + '/workflow_tag/',params)
      .then( )
  }
}

const setMissingFileResults = (payload) => {
  return {
    type: 'SET_MISSING_FILE_RESULTS',
    payload: payload
  };
};

const WorkFlowDropdown = () => {
  return (
    <Dropdown>
      <Dropdown.Toggle variant="success" id="dropdown-basic">
        Workflow Tags
    </Dropdown.Toggle>

   <Dropdown.Menu>
     <Dropdown.Item href="#/action-1">Files Uploaded</Dropdown.Item>
     <Dropdown.Item href="#/action-2">No Files Available</Dropdown.Item>
   </Dropdown.Menu>
 </Dropdown>
)}

const Tracker = () => {
  const oktaGroups = useSelector(state => state.isLogged.oktaGroups);
  const missingFileResults = useSelector(state => state.tracker.missingFileResults);
  const dispatch = useDispatch();
  console.log(oktaGroups);


  //dispatch(searchMissingFiles(mod_id));
  //console.log(missingFileResults);

  useEffect(() => {
    axios.get(restUrl + '/reference/missing_files/'+setModGroup(oktaGroups))
      .then(res => {
        console.log(res);
        dispatch(setMissingFileResults(res.data));
      })
      .catch();
  }, []);

  return (
    <div>
      { missingFileResults ?
      //<Button variant="primary" className="download-tracker-button">Download All</Button>
      <Table bordered size="sm">
        <thead>
          <tr>
            <th>Curie</th><th>MOD Curie</th><th>PMID</th><th>Citation</th><th>File Workflow</th><th>Files Uploaded</th><th>Date Created</th>
          </tr>
        </thead>
        <tbody>
        { missingFileResults.map((reference, index) => (
          <tr>
            <td>{reference.curie}</td>
            <td>{reference.mod_curie}</td>
            <td>{reference.pmid}</td>
            <td className="sm-table">{reference.short_citation}</td>
            <td><WorkFlowDropdown/></td>
            <td className="sm-table no-pad">
              {reference.maincount > 0 ? <div><FontAwesomeIcon icon={faCheck}/> Main </div> :  <div> <FontAwesomeIcon icon={faTimes}/> Main </div>}
              {reference.supcount > 0 ? <div><FontAwesomeIcon icon={faCheck}/> Supplemental </div> :  <div> <FontAwesomeIcon icon={faTimes}/>  Supplemental </div> }
            </td>
            <td>{reference.date_created.split("T")[0]}</td>
          </tr>
        )) }
        </tbody>
      </Table>
      : null }

    </div>
  );
}

function setModGroup(oktaGroups) {
  let access = 'MGI';
  if (oktaGroups) {
    for (const oktaGroup of oktaGroups) {
        if (oktaGroup.startsWith('SGD')) { access = 'SGD'; }
        else if (oktaGroup.startsWith('RGD')) { access = 'RGD'; }
        else if (oktaGroup.startsWith('MGI')) { access = 'MGI'; }
        else if (oktaGroup.startsWith('ZFIN')) { access = 'ZFIN'; }
        else if (oktaGroup.startsWith('Xenbase')) { access = 'XB'; }
        else if (oktaGroup.startsWith('FlyBase')) { access = 'FB'; }
        else if (oktaGroup.startsWith('WormBase')) { access = 'WB'; } } }
  return access;
}

export default Tracker
