import React, {useEffect, useState} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Table from 'react-bootstrap/Table';
import axios from "axios";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faTimes} from '@fortawesome/free-solid-svg-icons'
import {searchXref} from '../actions/searchActions';
import Dropdown from 'react-bootstrap/Dropdown';


const restUrl = process.env.REACT_APP_RESTAPI;

const searchMissingFiles = (mod_abbreviation) => {
  return dispatch => {
    axios.get(restUrl + '/reference/missing_files/'+mod_abbreviation)
        .then(res => {
          dispatch(setMissingFileResults(res.data));
        })
        .catch();
    }
}

function getOktaModAccess(oktaGroups) {
  let access = 'No';
  if (oktaGroups) {
    for (const oktaGroup of oktaGroups) {
        if (oktaGroup.startsWith('SGD')) { access = 'SGD'; }
        else if (oktaGroup.startsWith('RGD')) { access = 'RGD'; }
        else if (oktaGroup.startsWith('MGI')) { access = 'MGI'; }
        else if (oktaGroup.startsWith('ZFIN')) { access = 'ZFIN'; }
        else if (oktaGroup.startsWith('Xen')) { access = 'XB'; }
        else if (oktaGroup.startsWith('Fly')) { access = 'FB'; }
        else if (oktaGroup.startsWith('Worm')) { access = 'WB'; } } }
  return access;
}

const addWorkflowTag = (tag_id,mod_abbreviation,curie,accessToken) => {
  return dispatch => {
    let headers = {
      'content-type': 'application/json',
      'mode': 'cors',
      'authorization': 'Bearer ' + accessToken
    }
    let params = {
      workflow_tag_id: tag_id,
      mod_abbreviation: mod_abbreviation,
      reference_curie: curie
    }
    axios.post(restUrl + '/workflow_tag/',params, {headers:headers})
      .then(res => {
        dispatch(searchMissingFiles(mod_abbreviation));
      })
  }
}

const setMissingFileResults = (payload) => {
  return {
    type: 'SET_MISSING_FILE_RESULTS',
    payload: payload
  };
};

const WorkFlowDropdown = (workflow) => {
  const dispatch = useDispatch();

  return (
    <Dropdown>
      <Dropdown.Toggle variant="success" id="dropdown-basic">
        Add Tags
    </Dropdown.Toggle>

   <Dropdown.Menu>
     <Dropdown.Item onClick= {() => dispatch(addWorkflowTag('ATP:0000134',workflow.access,workflow.curie,workflow.accessToken))}>Files Uploaded</Dropdown.Item>
     <Dropdown.Item onClick= {() => dispatch(addWorkflowTag('ATP:0000135',workflow.access,workflow.curie,workflow.accessToken))}>No Files Available</Dropdown.Item>
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

const Tracker = () => {
  const oktaGroups = useSelector(state => state.isLogged.oktaGroups);
  const missingFileResults = useSelector(state => state.tracker.missingFileResults);
  const dispatch = useDispatch();
  const access = getOktaModAccess(oktaGroups);
  const accessToken = useSelector(state => state.isLogged.accessToken);

  useEffect(() => {
    if (access === 'No'){
      //do nothing
    }
    else{
      dispatch(searchMissingFiles(access));
    }

  },[access,dispatch]);

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
            <td><a href={"http://localhost:3001/Biblio/?action=display&referenceCurie="+reference.curie}>{reference.curie}</a></td>
            <td><XrefElement xref={reference.mod_curie}/></td>
            <td><XrefElement xref={reference.pmid}/></td>
            <td className="sm-table">{reference.short_citation}</td>
            <td><WorkFlowDropdown access={access} curie={reference.curie} accessToken={accessToken}/></td>
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

export default Tracker
