import { Link } from 'react-router-dom'
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
import { setGetReferenceCurieFlag, getCuratorSourceId } from '../actions/biblioActions';

import { changeFieldSortMods } from '../actions/sortActions';
import { sortButtonModsQuery } from '../actions/sortActions';
import { removeReferenceFromSortLive } from '../actions/sortActions';

import { changeSortCorpusToggler } from '../actions/sortActions';
import { changeSortWorkflowToggler } from '../actions/sortActions';
import { updateButtonSort } from '../actions/sortActions';
import { closeSortUpdateAlert } from '../actions/sortActions';
import { setSortUpdating } from '../actions/sortActions';
import {Spinner} from "react-bootstrap";
import React, {useEffect, useRef, useState} from "react";
import axios from "axios";
import { AsyncTypeahead } from "react-bootstrap-typeahead";
import {AlertAteamApiDown} from "./ATeamAlert";

const RowDivider = () => { return (<Row><Col>&nbsp;</Col></Row>); }

const Sort = () => {
  const modsField = useSelector(state => state.sort.modsField);
  const referencesToSortLive = useSelector(state => state.sort.referencesToSortLive);
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const sortType = useSelector(state => state.sort.sortType);
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

  const [topicEntitySourceId, setTopicEntitySourceId] = useState(undefined);
    
  let accessLevel = oktaMod;
  let activeMod = oktaMod;
  if (testerMod !== 'No') {
      activeMod = testerMod;
      accessLevel = testerMod;
  } else if (oktaDeveloper) {
      accessLevel = 'developer';
  }

  const tetAccessLevel = (testerMod !== 'No') ? testerMod : oktaMod;
    
  useEffect(() => {
    const fetchSourceId = async () => {
      if (accessToken !== null) {
        setTopicEntitySourceId(await getCuratorSourceId(tetAccessLevel, accessToken));
      }
    }
    fetchSourceId().catch(console.error);
  }, [tetAccessLevel, accessToken]);

  let buttonFindDisabled = 'disabled'
  if (modsField) {
      buttonFindDisabled = '';
  }

  let buttonUpdateDisabled = ''
  if (sortUpdating > 0) {
      buttonUpdateDisabled = 'disabled';
  }

  const mods = ['FB', 'MGI', 'RGD', 'SGD', 'WB', 'XB', 'ZFIN']

  if (getPapersToSortFlag === true && sortUpdating === 0 && modsField) {
    console.log('sort DISPATCH sortButtonModsQuery ' + modsField + ' sortType ' + sortType);
    dispatch(sortButtonModsQuery(modsField, sortType))
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
                 <div key={filename}>
                     {referencefileValue}
                 </div>);
             rowReferencefileElements.push( referencefileRow );
          }
       }
    }
    return (<>{rowReferencefileElements}</>);
  }

  // function to handle "Inside & Open" and "Inside" buttons click 
  const handleInsideOrOpen = (reference, index, shouldOpenEditor = false) => {

    const forApiArray = [];

    // update mod_corpus_association to set 'corpus' to true
    let updateJson = { 'corpus': true, 'mod_corpus_sort_source': 'manual_creation' };
    let subPath = 'reference/mod_corpus_association/' + reference['mod_corpus_association_id'];
    let method = 'PATCH';
    let field = null;
    let subField = null;
    let array = [subPath, updateJson, method, index, field, subField];
    forApiArray.push(array);

    // if activeMod === 'WB', handle setting 'reference_type' via 'mod_reference_type'
    if (activeMod === "WB") {
      let reference_type = null;
      if (reference['workflow'] === 'experimental') {
        reference_type = 'Experimental';
      } else if (reference['workflow'] === 'not_experimental') {
        reference_type = 'Not_experimental';
      } else if (reference['workflow'] === 'meeting') {
        reference_type = 'Meeting_abstract';
      }
      if (reference_type !== null) {
        updateJson = { 'reference_type': reference_type, 'mod_abbreviation': activeMod, 'reference_curie': reference['curie'] };
        subPath = 'reference/mod_reference_type/';
        method = 'POST';
        array = [subPath, updateJson, method, index, field, subField];
        forApiArray.push(array);
      }

      // handle species selection
      if (speciesSelect && speciesSelect[index]) {
        for (const item of speciesSelect[index].values()) {
          const taxArray = item.split(" ");
          updateJson = {
            'reference_curie': reference['curie'],
            'entity': taxArray.pop(), // taxid last element
            'topic': "ATP:0000123",   // species
            'entity_type': "ATP:0000123", // species
            'entity_id_validation': "alliance",
            'topic_entity_tag_source_id': topicEntitySourceId
          };
          subPath = 'topic_entity_tag/';
          method = 'POST';
          array = [subPath, updateJson, method, index, field, subField];
          forApiArray.push(array);
        }
      }
    }

    // dispatch the updates
    let dispatchCount = forApiArray.length;
    dispatch(setSortUpdating(dispatchCount));
    for (const arrayData of forApiArray.values()) {
      arrayData.unshift(accessToken);
      dispatch(updateButtonSort(arrayData));
    }

    // remove the paper from the page
    dispatch(removeReferenceFromSortLive(index));

    // update speciesSelect state
    setSpeciesSelect(prevSpeciesSelect => {
      const newSpeciesSelect = [...prevSpeciesSelect];
      // remove all species associated with the reference at the given index
      newSpeciesSelect[index] = []; // clear all species for the reference
      return newSpeciesSelect;
    });

    // update speciesSelectLoading state
    setSpeciesSelectLoading(prevSpeciesSelectLoading => {
      const newSpeciesSelectLoading = [...prevSpeciesSelectLoading];
      // clear the loading state for the reference at the given index	
      newSpeciesSelectLoading[index] = false; // set to false or remove the entry
      return newSpeciesSelectLoading;
    });

    // optionally open TET editor in a new tab/window if shouldOpenEditor is true
    if (shouldOpenEditor) {
      const tetEditorUrl = `/Biblio/?action=entity&referenceCurie=${reference['curie']}`;
      window.open(tetEditorUrl, '_blank');
    }
  };
  
  // function to handle "Outside" button click
  const handleOutside = (reference, index) => {

    const forApiArray = [];

    // update mod_corpus_association to set 'corpus' to false
    let updateJson = { 'corpus': false, 'mod_corpus_sort_source': 'manual_creation' };
    let subPath = 'reference/mod_corpus_association/' + reference['mod_corpus_association_id'];
    let method = 'PATCH';
    let field = null;
    let subField = null;
    let array = [subPath, updateJson, method, index, field, subField];
    forApiArray.push(array);

    // dispatch the updates
    let dispatchCount = forApiArray.length;
    dispatch(setSortUpdating(dispatchCount));
    for (const arrayData of forApiArray.values()) {
      arrayData.unshift(accessToken);
      dispatch(updateButtonSort(arrayData));
    }

    // remove the paper from the page
    dispatch(removeReferenceFromSortLive(index));
  };
    
    
  function updateSorting() {
    const forApiArray = []
    for (const[index, reference] of referencesToSortLive.entries()) {
      if (reference['mod_corpus_association_corpus'] !== null) {
        // console.log(reference['mod_corpus_association_id']);
        // console.log(reference['corpus']);
        let updateJson = { 'corpus': reference['mod_corpus_association_corpus'], 'mod_corpus_sort_source': 'manual_creation' }
        let subPath = 'reference/mod_corpus_association/' + reference['mod_corpus_association_id'];
        const field = null;
        const subField = null;
        let method = 'PATCH';
        let array = [ subPath, updateJson, method, index, field, subField ]
        forApiArray.push( array );
        if (reference['mod_corpus_association_corpus'] === true && activeMod === "WB") {
          let reference_type = null;
          if      (reference['workflow'] === 'experimental')     { reference_type = 'Experimental'; }
          else if (reference['workflow'] === 'not_experimental') { reference_type = 'Not_experimental'; }
          else if (reference['workflow'] === 'meeting')          { reference_type = 'Meeting_abstract'; }
          if (reference_type !== null) {
              updateJson = { 'reference_type': reference_type, 'mod_abbreviation': activeMod, 'reference_curie': reference['curie'] }
              subPath = 'reference/mod_reference_type/';
              method = 'POST';
              let array = [ subPath, updateJson, method, index, field, subField]
              forApiArray.push( array ); 
          if (speciesSelect && speciesSelect[index]) {
            for ( const item of speciesSelect[index].values() ){
                const taxArray = item.split(" ");
                updateJson = {'reference_curie': reference['curie'],
                              'entity': taxArray.pop(),     // taxid last element
                              'topic': "ATP:0000123",       // species
                              'entity_type': "ATP:0000123", // species
                              'entity_id_validation': "alliance",  // Kimberly said this instead of 'manual'
                              'topic_entity_tag_source_id': topicEntitySourceId};    
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
        { (activeMod === 'WB') ?
          <Row>
            <Col lg={2} ></Col>
            <Col lg={8} >
              <br/>
              <Button style={{width: "12em"}} disabled={buttonFindDisabled} onClick={() => dispatch(sortButtonModsQuery(modsField, 'needs_review'))}>{isLoading ? <Spinner animation="border" size="sm"/> : "Find Papers to Sort"}</Button>{' '}
              <Button style={{width: "12em"}} disabled={buttonFindDisabled} onClick={() => dispatch(sortButtonModsQuery(modsField, 'prepublication'))}>{isLoading ? <Spinner animation="border" size="sm"/> : "Prepublication"}</Button>
            </Col>
            <Col lg={2} ></Col>
          </Row>
          :
          <Row>
            <Col lg={4} ></Col>
            <Col lg={4} >
              <br/>
              <Button style={{width: "12em"}} disabled={buttonFindDisabled} onClick={() => dispatch(sortButtonModsQuery(modsField, 'needs_review'))}>{isLoading ? <Spinner animation="border" size="sm"/> : "Find Papers to Sort"}</Button>
            </Col>
            <Col lg={4} ></Col>
          </Row>
        }

        {/* Added space between "Find Papers to Sort" button and "Update Sorting" button */}
        <RowDivider />

        { referencesToSortLive && referencesToSortLive.length > 0 &&
          <Row>
            <Col lg={12} className="text-center">
              <SortSubmitUpdateRouter />
              <Button as="input" style={{ backgroundColor: '#6b9ef3', color: 'white', border: 'none' }} type="button" disabled={buttonUpdateDisabled} value="Update Sorting" onClick={() => updateSorting()} />{' '}
            </Col>
          </Row>
        } 
	  
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
	  {/* Display references with individual radio buttons */}  
	  {referencesToSortLive.map((reference, index) => {
            const backgroundColor = (reference['prepublication_pipeline'] === true) ? '#f8d7da' : '';
            return (
            <div key={`reference div ${index}`} >
              <Row key={`reference ${index}`} >	    
              <Col lg={2} className="Col-general Col-display" style={{display: 'flex', flexDirection: 'column', backgroundColor: backgroundColor}} >
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
              <Col lg={5} className="Col-general Col-display" style={{backgroundColor: backgroundColor}}><span dangerouslySetInnerHTML={{__html: reference['abstract']}} /></Col>


	      {/* Needs Review Column */}  	  
	      <Col lg={1} className="Col-general Col-display" style={{ display: 'block', backgroundColor: backgroundColor }}>
		  <br /><br />    
                  <Form.Check
                      inline
                      checked={ (reference['mod_corpus_association_corpus'] === null) ? 'checked' : '' }
                      type='radio'
                      label='needs review'
                      id={`needs_review_toggle ${index}`}
                      onChange={(e) => dispatch(changeSortCorpusToggler(e))}
                  />
              </Col>

	      <Col lg={2} className="Col-general Col-display" style={{ display: 'block', backgroundColor: backgroundColor }}>
		  <br /><br />
                  <Form.Check
                      inline
                      checked={ (reference['mod_corpus_association_corpus'] === true) ? 'checked' : '' }
                      type='radio'
                      label='inside corpus'
                      id={`inside_corpus_toggle ${index}`}
                      onChange={(e) => dispatch(changeSortCorpusToggler(e))}
                  />
		  <br /> 
                  { (activeMod === 'WB') &&
                    <>
                      <Form.Check
                          inline
                          disabled={ (reference['mod_corpus_association_corpus'] !== true) ? 'disabled' : '' }
                          checked={ (reference['workflow'] === 'experimental') ? 'checked' : '' }
                          type='radio'
                          label='expt'
                          id={`experimental_toggle ${index}`}
                          onChange={(e) => dispatch(changeSortWorkflowToggler(e))}
                      /><br/>
                      <Form.Check
                          inline
                          disabled={ (reference['mod_corpus_association_corpus'] !== true) ? 'disabled' : '' }
                          checked={ (reference['workflow'] === 'not_experimental') ? 'checked' : '' }
                          type='radio'
                          label='not expt'
                          id={`not_experimental_toggle ${index}`}
                          onChange={(e) => dispatch(changeSortWorkflowToggler(e))}
                      /><br/>
                      <Form.Check
                          inline
                          disabled={ (reference['mod_corpus_association_corpus'] !== true) ? 'disabled' : '' }
                          checked={ (reference['workflow'] === 'meeting') ? 'checked' : '' }
                          type='radio'
                          label='meeting'
                          id={`meeting_toggle ${index}`}
                          onChange={(e) => dispatch(changeSortWorkflowToggler(e))}
                      /><br/>
                    </>
                  }
                  <Form.Control as="select" id={`primary_select ${index}`} style={{display: 'none'}}>
                      <option>Experimental</option>
                      <option>Not Experimental</option>
                      <option>Meeting Abstract</option>
                  </Form.Control><br/>
                  <AsyncTypeahead
                      multiple
                      disabled={ (reference['mod_corpus_association_corpus'] !== true) ? 'disabled' : '' }
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
                  { (activeMod === 'WB') && <div><br/><NewTaxonModal/></div> }
	          <br />
                  <Button variant="outline-primary" size="sm" onClick={() => handleInsideOrOpen(reference, index, true)}>
                      Inside & Open
                  </Button>{' '}
                  <Button variant="outline-primary" size="sm" onClick={() => handleInsideOrOpen(reference, index, false)}>
                      Inside
                  </Button>
                </Col>

                {/* Outside Corpus Column */}
                <Col lg={2} className="Col-general Col-display" style={{ display: 'block', backgroundColor: backgroundColor }}>
                    <br /><br />
                    <Form.Check
                      inline
                      checked={ (reference['mod_corpus_association_corpus'] === false) ? 'checked' : '' }
                      type='radio'
                      label='outside corpus'
                      id={`outside_corpus_toggle ${index}`}
                      onChange={(e) => dispatch(changeSortCorpusToggler(e))}
                    />
		    <br /><br /><br /><br />
                    {/* New Outside Button */}
		    <div style={{ marginTop: '10px' }}>
		      {/* <Button variant="danger" size="sm" onClick={() => handleOutside(reference, index)}> */}
		      {/* <Button className="outside-button" size="sm" onClick={() => handleOutside(reference, index)}> */}
		      <Button variant="outline-secondary" size="sm" onClick={() => handleOutside(reference, index)}>			    
                        Outside
                      </Button>
	            </div>
                </Col>

		  
		  
            </Row>

            </div>
          )} )}
          <RowDivider />
          <Row><Col>
            <SortSubmitUpdateRouter />
            <Button as="input" style={{ backgroundColor: '#6b9ef3', color: 'white', border: 'none' }} type="button" disabled={buttonUpdateDisabled} value="Update Sorting" onClick={() => updateSorting()} />{' '}
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
  const defaultBodyText = "Import NCBI Taxon into A-team system for autocomplete here.\nOnly put in the digits part of the NCBI Taxon ID.\n\n";

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
      <Button variant="outline-primary" size="sm" onClick={handleShow}>Create New Taxon</Button>
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

  useEffect(() => {
    if (updateAlert && updateFailure === 0) {
      const timer = setTimeout(() => {
        dispatch(closeSortUpdateAlert());
      }, 2000); // dismiss after 2 seconds
      return () => clearTimeout(timer);
    }
  }, [updateAlert, updateFailure, dispatch]);

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


