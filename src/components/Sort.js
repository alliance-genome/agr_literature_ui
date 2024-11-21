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

import {
    downloadReferencefile,
    setReferenceCurie,
    setGetReferenceCurieFlag,
    getCuratorSourceId
} from '../actions/biblioActions';

import {
    sortButtonModsQuery,
    removeReferenceFromSortLive,
    changeSortCorpusToggler,
    changeSortWorkflowToggler,
    updateButtonSort,
    closeSortUpdateAlert,
    setSortUpdating
} from '../actions/sortActions';

import { Spinner } from "react-bootstrap";
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { AsyncTypeahead } from "react-bootstrap-typeahead";
import { AlertAteamApiDown } from "./ATeamAlert";

const RowDivider = () => { return (<Row><Col>&nbsp;</Col></Row>); }

const Sort = () => {
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
  // const oktaDeveloper = useSelector(state => state.isLogged.oktaDeveloper);
  const uid = useSelector(state => state.isLogged.uid);
  const userId = useSelector(state => state.isLogged.userId);
    
  const [topicEntitySourceId, setTopicEntitySourceId] = useState(undefined);

  const [viewMode, setViewMode] = useState('Sort'); // New state variable for view mode
  const [selectedCurator, setSelectedCurator] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('Today');
  const [curatorOptions, setCuratorOptions] = useState([]);

  let accessLevel = testerMod !== 'No' ? testerMod : oktaMod;
  let activeMod = accessLevel;
    
  useEffect(() => {
    const fetchSourceId = async () => {
      if (accessToken !== null) {
        setTopicEntitySourceId(await getCuratorSourceId(accessLevel, accessToken));
      }
    }
    fetchSourceId().catch(console.error);
  }, [accessLevel, accessToken]);

  let buttonUpdateDisabled = ''
  if (sortUpdating > 0) {
    buttonUpdateDisabled = 'disabled';
  }

  // Fetch references automatically when component loads
  useEffect(() => {
    if (viewMode === 'Sort' && sortUpdating === 0 && accessLevel) {
      console.log('sort DISPATCH sortButtonModsQuery ' + accessLevel + ' sortType ' + sortType);
      dispatch(sortButtonModsQuery(accessLevel, sortType))
    }
    // If viewMode is 'Recently sorted', we'll handle that separately
  }, [viewMode, sortUpdating, accessLevel, sortType, dispatch]);

  // Reference file component
  const FileElement = ({ referenceCurie }) => {

    const rowReferencefileElements = [];

    for (const [index, reference] of referencesToSortLive.entries()) {
      if (referenceCurie !== reference['curie']) { continue; }
      const copyrightLicenseOpenAccess = (reference['copyright_license_open_access'] !== null && reference['copyright_license_open_access'] === 'True') ? true : false;
      let is_ok = false;
      let allowed_mods = [];

      if ('referencefiles' in reference && reference['referencefiles'].length > 0) {
        for (const referencefile of reference['referencefiles'].values()) {
          let filename = null;
          let fileclass = null;
          let referencefile_id = null;
          if (referencefile.file_class === 'main') {
            filename = referencefile.display_name + '.' + referencefile.file_extension;
            fileclass = referencefile.file_class;
            referencefile_id = referencefile.referencefile_id;
          } else {
            continue;
          }
          if ('referencefile_mods' in referencefile && referencefile['referencefile_mods'].length > 0) {
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
          rowReferencefileElements.push(referencefileRow);
        }
      }
    }
    return (<>{rowReferencefileElements}</>);
  }

  // Handle "Inside & Open" and "Inside" actions
  const handleInsideOrOpen = (reference, index, shouldOpenEditor = false) => {

    const forApiArray = [];

    // Update mod_corpus_association to set 'corpus' to true
    let updateJson = { 'corpus': true, 'mod_corpus_sort_source': 'manual_creation' };
    let subPath = 'reference/mod_corpus_association/' + reference['mod_corpus_association_id'];
    let method = 'PATCH';
    let field = null;
    let subField = null;
    let array = [subPath, updateJson, method, index, field, subField];
    forApiArray.push(array);

    // If activeMod === 'WB', handle setting 'reference_type' via 'mod_reference_type'
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

      // Handle species selection
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

    // Dispatch the updates
    let dispatchCount = forApiArray.length;
    dispatch(setSortUpdating(dispatchCount));
    for (const arrayData of forApiArray.values()) {
      arrayData.unshift(accessToken);
      dispatch(updateButtonSort(arrayData));
    }

    // Remove the paper from the page
    dispatch(removeReferenceFromSortLive(index));

    // Update speciesSelect state
    setSpeciesSelect(prevSpeciesSelect => {
      const newSpeciesSelect = [...prevSpeciesSelect];
      newSpeciesSelect[index] = [];
      return newSpeciesSelect;
    });

    // Update speciesSelectLoading state
    setSpeciesSelectLoading(prevSpeciesSelectLoading => {
      const newSpeciesSelectLoading = [...prevSpeciesSelectLoading];
      newSpeciesSelectLoading[index] = false;
      return newSpeciesSelectLoading;
    });

    // Optionally open TET editor in a new tab/window if shouldOpenEditor is true
    if (shouldOpenEditor) {
      const tetEditorUrl = `/Biblio/?action=entity&referenceCurie=${reference['curie']}`;
      window.open(tetEditorUrl, '_blank');
    }
  };

  // Handle "Outside" action
  const handleOutside = (reference, index) => {

    const forApiArray = [];

    // Update mod_corpus_association to set 'corpus' to false
    let updateJson = { 'corpus': false, 'mod_corpus_sort_source': 'manual_creation' };
    let subPath = 'reference/mod_corpus_association/' + reference['mod_corpus_association_id'];
    let method = 'PATCH';
    let field = null;
    let subField = null;
    let array = [subPath, updateJson, method, index, field, subField];
    forApiArray.push(array);

    // Dispatch the updates
    let dispatchCount = forApiArray.length;
    dispatch(setSortUpdating(dispatchCount));
    for (const arrayData of forApiArray.values()) {
      arrayData.unshift(accessToken);
      dispatch(updateButtonSort(arrayData));
    }

    // Remove the paper from the page
    dispatch(removeReferenceFromSortLive(index));
  };

  function updateSorting() {
    const forApiArray = []
    for (const [index, reference] of referencesToSortLive.entries()) {
      if (reference['mod_corpus_association_corpus'] !== null) {
        let updateJson = { 'corpus': reference['mod_corpus_association_corpus'], 'mod_corpus_sort_source': 'manual_creation' }
        let subPath = 'reference/mod_corpus_association/' + reference['mod_corpus_association_id'];
        const field = null;
        const subField = null;
        let method = 'PATCH';
        let array = [subPath, updateJson, method, index, field, subField]
        forApiArray.push(array);
        if (reference['mod_corpus_association_corpus'] === true && activeMod === "WB") {
          let reference_type = null;
          if (reference['workflow'] === 'experimental') { reference_type = 'Experimental'; }
          else if (reference['workflow'] === 'not_experimental') { reference_type = 'Not_experimental'; }
          else if (reference['workflow'] === 'meeting') { reference_type = 'Meeting_abstract'; }
          if (reference_type !== null) {
            updateJson = { 'reference_type': reference_type, 'mod_abbreviation': activeMod, 'reference_curie': reference['curie'] }
            subPath = 'reference/mod_reference_type/';
            method = 'POST';
            let array = [subPath, updateJson, method, index, field, subField]
            forApiArray.push(array);
            if (speciesSelect && speciesSelect[index]) {
              for (const item of speciesSelect[index].values()) {
                const taxArray = item.split(" ");
                updateJson = {
                  'reference_curie': reference['curie'],
                  'entity': taxArray.pop(),
                  'topic': "ATP:0000123",
                  'entity_type': "ATP:0000123",
                  'entity_id_validation': "alliance",
                  'topic_entity_tag_source_id': topicEntitySourceId
                };
                subPath = 'topic_entity_tag/';
                const field = null;
                const subField = null;
                let method = 'POST';
                let array = [subPath, updateJson, method, index, field, subField]
                forApiArray.push(array);
              }
            }
          }
        }
      }
    }

    setSpeciesSelect([]);
    setTypeaheadOptions([]);
    setSpeciesSelectLoading([]);
    speciesTypeaheadRef.current && speciesTypeaheadRef.current.clear();

    let dispatchCount = forApiArray.length;

    console.log('dispatchCount ' + dispatchCount)
    dispatch(setSortUpdating(dispatchCount))

    for (const arrayData of forApiArray.values()) {
      arrayData.unshift(accessToken)
      dispatch(updateButtonSort(arrayData))
    }

  }

  // Handler for 'Find sorted papers' button
  const handleFindSortedPapers = () => {
    // Placeholder function to handle fetching sorted papers
    // For now, we'll just log the selected curator and timeframe
    console.log('Find sorted papers clicked');
    console.log('Selected curator:', selectedCurator);
    console.log('Selected timeframe:', selectedTimeframe);

    // TODO: Dispatch action to fetch sorted papers based on selected options
    // For now, we'll just simulate the behavior

    // Example:
    // dispatch(fetchSortedPapers(selectedCurator, selectedTimeframe));
  }

  return (
    <div>
      <h4>References for {accessLevel}</h4>
      <Form>
        <Form.Check
          inline
          type='radio'
          name='viewMode'
          id='viewModeSort'
        >
	  <Form.Check.Input
	    type='radio'
            name='viewMode'
            id='viewModeSort'
            checked={viewMode === 'Sort'}
            onChange={() => setViewMode('Sort')}
	  />
          <Form.Check.Label style={{ fontSize: '1.1em' }}>Sort</Form.Check.Label>
        </Form.Check>
        <Form.Check
          inline
          type='radio'
          name='viewMode'
          id='viewModeRecentlySorted'
        >
	  <Form.Check.Input
	    type='radio'
            name='viewMode'
            id='viewModeRecentlySorted'
            checked={viewMode === 'Recently sorted'}
            onChange={() => setViewMode('Recently sorted')}
	  />
          <Form.Check.Label style={{ fontSize: '1.1em' }}>Recently sorted</Form.Check.Label>
        </Form.Check>
      </Form>
      <Container>
        {viewMode === 'Sort' &&
          <>
            {/* Removed the "Find Papers to Sort" button */}
            <RowDivider />

            {referencesToSortLive && referencesToSortLive.length > 0 &&
              <Row>
                <Col lg={12} className="text-center">
                  <SortSubmitUpdateRouter />
                  <Button as="input" style={{ backgroundColor: '#6b9ef3', color: 'white', border: 'none' }} type="button" disabled={buttonUpdateDisabled} value="Update Sorting" onClick={() => updateSorting()} />{' '}
                </Col>
              </Row>
            }
          </>
        }

        {viewMode === 'Recently sorted' &&
          <>
            <Row className="justify-content-center">
              <Col lg="auto">
                <br />
                <Form>
                  <Form.Row className="align-items-end">
                    <Col>
                      <Form.Group controlId="formCuratorSelect">
                        <Form.Label style={{ fontWeight: 'bold' }}>Who:</Form.Label>
                        <Form.Control as="select" value={selectedCurator} onChange={(e) => setSelectedCurator(e.target.value)}>
                          <option value="">Select Curator</option>
                          {/* Placeholder options */}
                          <option value="Curator1">Curator1</option>
                          <option value="Curator2">Curator2</option>
                          {/* TODO: Populate with actual curator options */}
                        </Form.Control>
                      </Form.Group>
                    </Col>
                    <Col>
                      <Form.Group controlId="formTimeframeSelect">
                        <Form.Label style={{ fontWeight: 'bold' }}>When:</Form.Label>
                        <Form.Control as="select" value={selectedTimeframe} onChange={(e) => setSelectedTimeframe(e.target.value)}>
                          <option value="1">Today</option>
                          <option value="7">Past week</option>
                        </Form.Control>
                      </Form.Group>
                    </Col>
                    <Col xs="auto">
                      <Form.Group>
                        <Form.Label>&nbsp;</Form.Label> {/* Empty label for alignment */}
                        <Button onClick={handleFindSortedPapers}>Find sorted papers</Button>
                      </Form.Group>
                    </Col>
                  </Form.Row>
                </Form>		  
              </Col>
            </Row>
            {/* TODO: Display references after fetching sorted papers */}
            {/* For now, we can display a placeholder message */}
            <Row>
              <Col lg={12}>
                <br />
                <p>Recently sorted papers will be displayed here.</p>
              </Col>
            </Row>
          </>
        }
      </Container>
      <AlertAteamApiDown />
      {referencesToSortLive && referencesToSortLive.length === 0 && viewMode === 'Sort' ?
        <div>
          <br />
          <p>No Papers to sort</p>
        </div>
        : null
      }
      {referencesToSortLive && referencesToSortLive.length > 0 && viewMode === 'Sort' &&
        <Container fluid>
          <RowDivider />
          {referencesToSortLive.map((reference, index) => {
            const backgroundColor = (reference['prepublication_pipeline'] === true) ? '#f8d7da' : '';
            return (
              <div key={`reference div ${index}`} >
                <Row key={`reference ${index}`} >
                  <Col lg={2} className="Col-general Col-display" style={{ display: 'flex', flexDirection: 'column', backgroundColor: backgroundColor }} >
                    <div style={{ alignSelf: 'flex-start' }} ><b>Title: </b>
                      <span dangerouslySetInnerHTML={{ __html: reference['title'] }} /></div>
                    <Link to={{ pathname: "/Biblio", search: "?action=display&referenceCurie=" + reference['curie'] }}
                      style={{ alignSelf: 'flex-start' }} onClick={() => {
                        dispatch(setReferenceCurie(reference['curie']));
                        dispatch(setGetReferenceCurieFlag(true));
                      }} >{reference['curie']}</Link>
                    {reference['cross_references'].map((xref, index2) => (
                      <div key={`xref ${index} ${index2}`} style={{ alignSelf: 'flex-start' }} >
                        <a href={xref['url']} target='_blank' rel="noreferrer" >{xref['curie']}</a></div>
                    ))}
                    <div style={{ alignSelf: 'flex-start' }} ><b>Journal:</b> {
                      (reference['resource_title']) ? <span dangerouslySetInnerHTML={{ __html: reference['resource_title'] }} /> : 'N/A' }</div>
                    <div style={{ alignSelf: 'flex-start' }} ><FileElement referenceCurie={reference['curie']} /></div>
                  </Col>
                  <Col lg={5} className="Col-general Col-display" style={{ backgroundColor: backgroundColor }}><span dangerouslySetInnerHTML={{ __html: reference['abstract'] }} /></Col>

                  <Col lg={1} className="Col-general Col-display" style={{ display: 'block', backgroundColor: backgroundColor }}>
                    <br /><br />
                    <Form.Check
                      inline
                      checked={(reference['mod_corpus_association_corpus'] === null) ? 'checked' : ''}
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
                      checked={(reference['mod_corpus_association_corpus'] === true) ? 'checked' : ''}
                      type='radio'
                      label='inside corpus'
                      id={`inside_corpus_toggle ${index}`}
                      onChange={(e) => dispatch(changeSortCorpusToggler(e))}
                    />
                    <br />
                    {(activeMod === 'WB') &&
                      <>
                        <Form.Check
                          inline
                          disabled={(reference['mod_corpus_association_corpus'] !== true) ? 'disabled' : ''}
                          checked={(reference['workflow'] === 'experimental') ? 'checked' : ''}
                          type='radio'
                          label='expt'
                          id={`experimental_toggle ${index}`}
                          onChange={(e) => dispatch(changeSortWorkflowToggler(e))}
                        /><br />
                        <Form.Check
                          inline
                          disabled={(reference['mod_corpus_association_corpus'] !== true) ? 'disabled' : ''}
                          checked={(reference['workflow'] === 'not_experimental') ? 'checked' : ''}
                          type='radio'
                          label='not expt'
                          id={`not_experimental_toggle ${index}`}
                          onChange={(e) => dispatch(changeSortWorkflowToggler(e))}
                        /><br />
                        <Form.Check
                          inline
                          disabled={(reference['mod_corpus_association_corpus'] !== true) ? 'disabled' : ''}
                          checked={(reference['workflow'] === 'meeting') ? 'checked' : ''}
                          type='radio'
                          label='meeting'
                          id={`meeting_toggle ${index}`}
                          onChange={(e) => dispatch(changeSortWorkflowToggler(e))}
                        /><br />
                      </>
                    }
                    <Form.Control as="select" id={`primary_select ${index}`} style={{ display: 'none' }}>
                      <option>Experimental</option>
                      <option>Not Experimental</option>
                      <option>Meeting Abstract</option>
                    </Form.Control><br />
                    <AsyncTypeahead
                      multiple
                      disabled={(reference['mod_corpus_association_corpus'] !== true) ? 'disabled' : ''}
                      isLoading={speciesSelectLoading[index]}
                      placeholder="species name"
                      ref={speciesTypeaheadRef}
                      id={`species_select ${index}`}
                      labelKey={`species_select ${index}`}
                      useCache={false}
                      onSearch={(query) => {
                        let n = speciesSelectLoading.length
                        let a = new Array(n); for (let i = 0; i < n; ++i) a[i] = false;
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
                          {
                            headers: {
                              'content-type': 'application/json',
                              'authorization': 'Bearer ' + accessToken
                            }
                          })
                          .then(res => {
                            let a = new Array(speciesSelectLoading.length); for (let i = 0; i < n; ++i) a[i] = false;
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
                    {(activeMod === 'WB') && <div><br /><NewTaxonModal /></div>}
                    <br />
                    <Button variant="outline-primary" size="sm" onClick={() => handleInsideOrOpen(reference, index, true)}>
                      Inside & Open
                    </Button>{' '}
                    <Button variant="outline-primary" size="sm" onClick={() => handleInsideOrOpen(reference, index, false)}>
                      Inside
                    </Button>
                  </Col>

                  <Col lg={2} className="Col-general Col-display" style={{ display: 'block', backgroundColor: backgroundColor }}>
                    <br /><br />
                    <Form.Check
                      inline
                      checked={(reference['mod_corpus_association_corpus'] === false) ? 'checked' : ''}
                      type='radio'
                      label='outside corpus'
                      id={`outside_corpus_toggle ${index}`}
                      onChange={(e) => dispatch(changeSortCorpusToggler(e))}
                    />
                    <br /><br /><br /><br />
                    <div style={{ marginTop: '10px' }}>
                      <Button variant="outline-secondary" size="sm" onClick={() => handleOutside(reference, index)}>
                        Outside
                      </Button>
                    </div>
                  </Col>

                </Row>
              </div>
            )
          })}
          <RowDivider />
          <Row><Col>
            <SortSubmitUpdateRouter />
            <Button as="input" style={{ backgroundColor: '#6b9ef3', color: 'white', border: 'none' }} type="button" disabled={buttonUpdateDisabled} value="Update Sorting" onClick={() => updateSorting()} />{' '}
          </Col></Row>
        </Container>
      }
      <hr />
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
      {
        headers: {
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
          {ateamResponse !== '' && (
            ateamSuccess ? <span style={{ color: 'green' }}>{ateamResponse}</span>
              : <span style={{ color: 'red' }}>{ateamResponse}</span>
          )}
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
    return (<SortSubmitUpdating />);
  }
  else {
    return (<><AlertDismissibleSortUpdate /></>);
  }
}

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
    variant = 'success';
  }
  else {
    header = 'Update Failure';
    variant = 'danger';
  }

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

export default Sort;
