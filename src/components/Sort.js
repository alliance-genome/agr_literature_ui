import { Link } from 'react-router-dom'
// import { useHistory } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';

import Form from 'react-bootstrap/Form';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert'
import Modal from 'react-bootstrap/Modal';
import InputGroup from 'react-bootstrap/InputGroup';
import "react-bootstrap-typeahead/css/Typeahead.css";

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
import React, {useState, useRef} from "react";
import axios from "axios";
import { AsyncTypeahead } from "react-bootstrap-typeahead";
import {AlertAteamApiDown} from "./ATeamAlert";

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
  const [speciesSelectLoading, setSpeciesSelectLoading] = useState([]);
  const speciesTypeaheadRef = useRef(null);
  const [speciesSelect, setSpeciesSelect] = useState([]);
  const [typeaheadOptions, setTypeaheadOptions] = useState([]);
  const oktaMod = useSelector(state => state.isLogged.oktaMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);
  const oktaDeveloper = useSelector(state => state.isLogged.oktaDeveloper);

  let accessLevel = oktaMod;
  if (testerMod !== 'No') { accessLevel = testerMod; }
  else if (oktaDeveloper) { accessLevel = 'developer'; }

  // const [typeaheadName2CurieMap, setTypeaheadName2CurieMap] = useState({});
  let buttonFindDisabled = 'disabled'
  if (modsField) { buttonFindDisabled = ''; }

  let buttonUpdateDisabled = ''
  if (sortUpdating > 0) { buttonUpdateDisabled = 'disabled'; }

  const mods = ['FB', 'MGI', 'RGD', 'SGD', 'WB', 'XB', 'ZFIN']
  // Hard coding as these are extremely unlikely to change,
  // plus we can choose the default taxid for those with more than 1. 
  // Plus mod_taxon table is empty!
  const mod_to_tax = {'FB': "NCBITaxon:7227",
                      'MGI': "NCBITaxon:10090", 
                      'RGD': "NCBITaxon:10116", 
                      'SGD': "NCBITaxon:559292", 
                      'WB': "NCBITaxon:6239", 
                      'XB': "NCBITaxon:8355", 
                      'ZFIN': "NCBITaxon:7955"};

  if (getPapersToSortFlag === true && sortUpdating === 0 && modsField) {
    console.log('sort DISPATCH sortButtonModsQuery ' + modsField);
    dispatch(sortButtonModsQuery(modsField))
  }

  //setup referencefile element
  const FileElement = ({referenceCurie}) => {

     const rowReferencefileElements = [];

     for (const[index, reference] of referencesToSortLive.entries()) {
      if (referenceCurie  !== reference['curie']) {continue; }
      const copyrightLicenseOpenAccess =  (reference['copyright_license_open_access'] !==null && reference['copyright_license_open_access'] === 'True') ? true : false;
      let is_ok = false;
      let allowed_mods = [];

      if ( 'referencefiles' in reference && reference['referencefiles'].length > 0) {
          for (const referencefile of reference['referencefiles'].values()) {
              let filename=null;
              let fileclass=null;
              let referencefile_id=null;
              if (referencefile.file_class === 'main') {
                  filename = referencefile.display_name + '.' + referencefile.file_extension;
                  fileclass = referencefile.file_class;
                  referencefile_id = referencefile.referencefile_id;
              } else {
                  continue;
              }
              if ('referencefile_mods' in referencefile && referencefile['referencefile_mods'].length > 0) {
                  //console.log('referencefile_mod for ' + referenceCurie);
                  for (const rfm of referencefile['referencefile_mods'].values()) {
                      if (rfm['mod_abbreviation'] !== null) {
                          allowed_mods.push(rfm['mod_abbreviation']);
                          console.log("referencefile_mod for " + referenceCurie + " " + rfm['mod_abbreviation']);
                      }
                      if (rfm['mod_abbreviation'] === null || rfm['mod_abbreviation'] === accessLevel) {
                          is_ok = true;
                      }
                  }
              }

              console.log("file_name:" + filename + 'index:' + index);
              let referencefileValue = (
                  <div><b>{reference['file_class']}:&nbsp;</b>{filename} &nbsp;({allowed_mods.join(", ")})</div>);
              if (copyrightLicenseOpenAccess || accessLevel === 'developer') {
                  is_ok = true;
              } else if (accessLevel === 'No') {
                  is_ok = false;
                  referencefileValue = (<div><b>{fileclass}:&nbsp;</b>{filename}</div>);
              }
              if (is_ok) {
                  referencefileValue = (<div><b>{fileclass}:&nbsp;</b>
                      <button className='button-to-link' onClick={() =>
                          dispatch(downloadReferencefile(referencefile_id, filename, accessToken))
                      }>{filename}</button>
                  </div>);
              }
              const referencefileRow = (
                  <div>
                      {referencefileValue}
                  </div>);
              rowReferencefileElements.push( referencefileRow );
          }
       }

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
              let array = [ subPath, updateJson, method, index, field, subField]
              forApiArray.push( array ); }
            else {
              updateJson = { 'workflow_tag_id': workflowTagId, 'mod_abbreviation': '', 'reference_curie': reference['curie'] }
              subPath = 'workflow_tag/'
              method = 'POST';
              let array = [ subPath, updateJson, method, index, field, subField]
              forApiArray.push( array ); }
          if (speciesSelect && speciesSelect[index]) {
            let sources = [{'source': "manual",
                            'mod_abbreviation': modsField
                          }];
            for ( const item of speciesSelect[index].values() ){
                const taxArray = item.split(" ");
                updateJson = {'reference_curie': reference['curie'],
                              'entity': taxArray.pop(),     // taxid last element
                              'topic': "ATP:0000142",       // entity
                              'entity_type': "ATP:0000123", // species
                              'entity_source': "manual",    // Not sure about this
                              'sources': sources,
                              'species': mod_to_tax[modsField] };    // taxonid of species
                subPath = 'topic_entity_tag/';
                const field = null;
                const subField = null;
                let method = 'POST';
                let array = [ subPath, updateJson, method, index, field, subField ]
                forApiArray.push( array );
            }
          }
    } } } }

    setSpeciesSelect([]);
    setTypeaheadOptions([]);
    setSpeciesSelectLoading([]);
    speciesTypeaheadRef.current.clear();

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
      <AlertAteamApiDown />
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
            <Col lg={8}></Col>
            <Col lg={1}>
              <Button variant="outline-primary" as="input" type="button" value="Review" onClick={() => dispatch(sortButtonSetRadiosAll('needs_review'))} />{' '}
            </Col>
            <Col lg={2}>
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
              <Col lg={3} className="Col-general Col-display" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center'}} >
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

              <Col lg={1} className="Col-general Col-display" style={{display: 'block', justifyContent: 'center'}}>
                  <br/><br/>
                  <Form.Check
                      inline
                      checked={ (reference['corpus'] === 'needs_review') ? 'checked' : '' }
                      type='radio'
                      label='needs review'
                      id={`needs_review_toggle ${index}`}
                      onChange={(e) => dispatch(changeSortCorpusToggler(e))}
                  />
              </Col>
              <Col lg={2} className="Col-general Col-display" style={{display: 'block'}}>
                  <br/><br/>
                  <Form.Check
                      inline
                      checked={ (reference['corpus'] === 'inside_corpus') ? 'checked' : '' }
                      type='radio'
                      label='inside corpus'
                      id={`inside_corpus_toggle ${index}`}
                      onChange={(e) => dispatch(changeSortCorpusToggler(e))}
                  /><br/><br/>
                  <Form.Check
                      inline
                      disabled={ (reference['corpus'] !== 'inside_corpus') ? 'disabled' : '' }
                      checked={ (reference['workflow'] === 'experimental') ? 'checked' : '' }
                      type='radio'
                      label='expt'
                      id={`experimental_toggle ${index}`}
                      onChange={(e) => dispatch(changeSortWorkflowToggler(e))}
                  /><br/>
                  <Form.Check
                      inline
                      disabled={ (reference['corpus'] !== 'inside_corpus') ? 'disabled' : '' }
                      checked={ (reference['workflow'] === 'not_experimental') ? 'checked' : '' }
                      type='radio'
                      label='not expt'
                      id={`not_experimental_toggle ${index}`}
                      onChange={(e) => dispatch(changeSortWorkflowToggler(e))}
                  /><br/>
                  <Form.Check
                      inline
                      disabled={ (reference['corpus'] !== 'inside_corpus') ? 'disabled' : '' }
                      checked={ (reference['workflow'] === 'meeting') ? 'checked' : '' }
                      type='radio'
                      label='meeting'
                      id={`meeting_toggle ${index}`}
                      onChange={(e) => dispatch(changeSortWorkflowToggler(e))}
                  /><br/>
                  <Form.Control as="select" id={`primary_select ${index}`} style={{display: 'none'}}>
                      <option>Experimental</option>
                      <option>Not Experimental</option>
                      <option>Meeting Abstract</option>
                  </Form.Control><br/>
                  <AsyncTypeahead
                      multiple
                      disabled={ (reference['corpus'] !== 'inside_corpus') ? 'disabled' : '' }
                      isLoading={speciesSelectLoading[index]}
                      placeholder="species name"
                      ref={speciesTypeaheadRef}
                      id={`species_select ${index}`}
                      labelKey={`species_select ${index}`}
                      useCache={false}
                      onSearch={(query) => {
                          let n = speciesSelectLoading.length
                          let a = new Array(n); for (let i=0; i<n; ++i) a[i] = false;
                          a[index] = true;
                          setSpeciesSelectLoading(a);

                          axios.post(process.env.REACT_APP_ATEAM_API_BASE_URL + 'api/ncbitaxonterm/search?limit=10&page=0',
                              {
                                  "searchFilters": {
                                      "nameFilter": {
                                          "name": {
                                              "queryString": query,
                                              "tokenOperator": "AND"
                                          }
                                      }
                                  },
                                  "sortOrders": [],
                                  "aggregations": [],
                                  "nonNullFieldsTable": []
                              },
                              { headers: {
                                      'content-type': 'application/json',
                                      'authorization': 'Bearer ' + accessToken
                                  }
                              })
                              .then(res => {
                                  let a = new Array(speciesSelectLoading.length); for (let i=0; i<n; ++i) a[i] = false;
                                  setSpeciesSelectLoading(a);
                                  if (res.data.results) {
                                      setTypeaheadOptions(res.data.results.map(item => item.name + ' ' + item.curie));
                                  }
                              });
                      }}
                      onChange={(selected) => {
                          let newArr = [...speciesSelect];
                          newArr[index] = selected;
                          setSpeciesSelect(newArr);
                      }}
                      options={typeaheadOptions}
                      selected={speciesSelect.length > 0 ? speciesSelect[index] : []}
                  />
                  { (accessLevel === 'WB') && <div><br/><NewTaxonModal/></div> }
              </Col>
              <Col lg={1} className="Col-general Col-display" style={{display: 'block'}}>
                  <br/><br/>
                  <Form.Check
                      inline
                      checked={ (reference['corpus'] === 'outside_corpus') ? 'checked' : '' }
                      type='radio'
                      label='outside corpus'
                      id={`outside_corpus_toggle ${index}`}
                      onChange={(e) => dispatch(changeSortCorpusToggler(e))}
                  />
              </Col>
            </Row>

            </div>
          )} )}
          <RowDivider />
          <Row><Col>
            <SortSubmitUpdateRouter />
            <Button as="input" type="button" disabled={buttonUpdateDisabled} value="Update Sorting" onClick={() => updateSorting()} />{' '}
          </Col></Row>
        </Container>
      }
      <hr/>
    </div>
  )
}

const NewTaxonModal = () => {
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const [show, setShow] = useState(false);
  const [taxonId, setTaxonId] = useState('');
  const [ateamResponse, setAteamResponse] = useState('');
  const [ateamSuccess, setAteamSuccess] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  const defaultBodyText = "Import NCBI Taxon into A-team system for autocomplete here.\n\n";

  function importTaxon(taxonId) {
    axios.get(process.env.REACT_APP_ATEAM_API_BASE_URL + 'api/ncbitaxonterm/NCBITaxon:' + taxonId,
        { headers: {
            'content-type': 'application/json',
            'authorization': 'Bearer ' + accessToken
          }
        })
    .then(res => {
      let success = false;
      if (('entity' in res.data) && ('curie' in res.data.entity)) { success = true; }
      if (success) {
        setAteamResponse(res.data.entity.curie + ' created in A-team system');
        setAteamSuccess(true);
      } else {
        setAteamResponse('unknown failure to create in A-team system');
        setAteamSuccess(false);
      }
    });
  }

  return (
    <>
      <Button style={{width: "12em"}} onClick={handleShow}>Create New Taxon</Button>
      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>New Taxon</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {defaultBodyText}
          {(() => {
            if (ateamResponse !== '') {
              if (ateamSuccess) { return (<span style={{color:'green'}}>{ateamResponse}</span>) }
                else { return (<span style={{color:'red'}}>{ateamResponse}</span>) } }
          })(ateamResponse)}
          <InputGroup className="mb-2">
            <Form.Control placeholder="e.g., 2489" type="text"
                          id="taxonIdField" name="taxonIdField" value={taxonId}
                          onChange={(e) => setTaxonId(e.target.value)}
                          onKeyPress={(event) => {
                            if (event.charCode === 13) { importTaxon(taxonId); }
                          }}
            />
            <Button type="submit" size="sm" onClick={() => importTaxon(taxonId)}>Import NCBI Taxon</Button>
          </InputGroup>
        </Modal.Body>
      </Modal>
    </>
  );
}

const SortSubmitUpdateRouter = () => {
  const sortUpdating = useSelector(state => state.sort.sortUpdating);

  if (sortUpdating > 0) {
    return (<SortSubmitUpdating />); }
  else {
    return (<><AlertDismissibleSortUpdate /></>); }
} // const SortSubmitUpdateRouter

const SortSubmitUpdating = () => {
  return (
    <div className="form-control biblio-updating" >updating Sort data</div>
  );
}

const AlertDismissibleSortUpdate = () => {
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


