import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from 'react-redux';
import {
  sortButtonModsQuery,
  removeReferenceFromSortLive,
  changeSortCorpusToggler,
  changeSortWorkflowToggler,
  updateButtonSort,
  closeSortUpdateAlert,
  setSortUpdating
} from '../actions/sortActions';
import { setReferenceCurie, setGetReferenceCurieFlag, getCuratorSourceId } from '../actions/biblioActions';
import { Spinner, Form, Container, Row, Col, Button, Alert } from 'react-bootstrap';
import "react-bootstrap-typeahead/css/Typeahead.css";
import { api } from "../api";
import Modal from 'react-bootstrap/Modal';
import { AsyncTypeahead } from "react-bootstrap-typeahead";
import ReferencesToSort from './ReferencesToSort';
import PropTypes from 'prop-types';

const RowDivider = () => { return (<Row><Col>&nbsp;</Col></Row>); }

const Sort = () => {
  // Selectors
  const referencesToSortLive = useSelector(state => state.sort.referencesToSortLive);
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const sortType = useSelector(state => state.sort.sortType);
  const sortUpdating = useSelector(state => state.sort.sortUpdating);
  const getPapersToSortFlag = useSelector(state => state.sort.getPapersToSortFlag);
  const isLoading = useSelector(state => state.sort.isLoading);
  const cognitoMod = useSelector(state => state.isLogged.cognitoMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);
  const userEmail = useSelector(state => state.isLogged.email);  // use email instead of uid
  const userId = useSelector(state => state.isLogged.userId);

  const dispatch = useDispatch();

  const [speciesSelectLoading, setSpeciesSelectLoading] = useState([]);
  const speciesTypeaheadRef = useRef(null);
  const [speciesSelect, setSpeciesSelect] = useState([]);
  const [typeaheadOptions, setTypeaheadOptions] = useState([]);
  const [topicEntitySourceId, setTopicEntitySourceId] = useState(undefined);

  const [viewMode, setViewMode] = useState('Sort'); // 'Sort', 'Prepublication', or 'Recently sorted'
  const [selectedCurator, setSelectedCurator] = useState(userEmail || '');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1');
  const [curatorOptions, setCuratorOptions] = useState([]);
  const [recentlySortedData, setRecentlySortedData] = useState([]);
  const [showInsidePapers, setShowInsidePapers] = useState(true);

  let accessLevel = testerMod !== 'No' ? testerMod : cognitoMod;
  let activeMod = accessLevel;

  // Fetch topic entity source id
  useEffect(() => {
    const fetchSourceId = async () => {
      if (accessToken !== null) {
        const sourceId = await getCuratorSourceId(accessLevel, accessToken);
        setTopicEntitySourceId(sourceId);
      }
    }
    fetchSourceId().catch(console.error);
  }, [accessLevel, accessToken]);

  let buttonUpdateDisabled = sortUpdating > 0;

  // Fetch "to sort" / prepublication list when viewMode changes
  useEffect(() => {
    let mappedSortType = null;
    if (viewMode === 'Sort') {
      mappedSortType = 'needs_review';
    } else if (viewMode === 'Prepublication') {
      mappedSortType = 'prepublication_pipeline';
    } else {
      return;
    }

    if (mappedSortType && sortUpdating === 0 && accessLevel) {
      console.log(`Dispatching sortButtonModsQuery with mod: ${accessLevel}, sortType: ${mappedSortType}`);
      dispatch(sortButtonModsQuery(accessLevel, mappedSortType));
    }
  }, [viewMode, sortUpdating, accessLevel, dispatch]);

  // Fetch recently sorted papers when viewMode is "Recently sorted"
  useEffect(() => {
    if (viewMode === 'Recently sorted' && accessToken && accessLevel) {
      fetchRecentlySortedPapers(accessLevel, selectedTimeframe, selectedCurator);
      setShowInsidePapers(true);
    }
  }, [viewMode, accessToken, accessLevel, selectedTimeframe, selectedCurator]);

  const fetchRecentlySortedPapers = (modAbbreviation, day, curatorEmail) => {
    const url = `/sort/recently_sorted?mod_abbreviation=${modAbbreviation}&day=${day}&curator=${curatorEmail}`;

    api.get(url)
      .then(response => response.data)
      .then(data => {
        const { curator_data, data: references } = data;

        // curator_data is now a mapping: name -> email
        let curators = Object.entries(curator_data).map(([name, email]) => ({ name, email }));

        const loggedInUserEmail = userEmail;
        const loggedInUserIncluded = curators.some(curator => curator.email === loggedInUserEmail);

        // Move logged-in user to the top if present
        if (loggedInUserIncluded) {
          const index = curators.findIndex(curator => curator.email === loggedInUserEmail);
          if (index > 0) {
            const [loggedInUser] = curators.splice(index, 1);
            curators.unshift(loggedInUser);
          }
        }

        setCuratorOptions(curators);
        setRecentlySortedData(references);

        // Ensure selectedCurator is valid (still in the list)
        if (!curators.some(curator => curator.email === selectedCurator)) {
          if (curators.length > 0) {
            setSelectedCurator(curators[0].email);
          } else {
            setSelectedCurator('');
          }
        }
      })
      .catch(error => {
        console.error('Error fetching recently sorted papers:', error);
      });
  };

  // Handler for 'Find sorted papers' button
  const handleFindSortedPapers = () => {
    let curator = selectedCurator;
    console.log(`Selected Curator Before Check: ${curator}`);
    if (curator === null || curator === undefined || curator === '') {
      curator = userEmail;
      console.log("Reset curator to logged in user email:", curator);
      setSelectedCurator(userEmail || '');
    }
    console.log(`Fetching papers with curator: ${curator}`);
    fetchRecentlySortedPapers(accessLevel, selectedTimeframe, curator);
  }

  // Function to update sorting
  function updateSorting() {
    const forApiArray = []
    for (const [index, reference] of referencesToSortLive.entries()) {
      if (reference['mod_corpus_association_corpus'] !== null) {
        let updateJson = { 'corpus': reference['mod_corpus_association_corpus'], 'mod_corpus_sort_source': 'manual_creation' }
        let subPath = `reference/mod_corpus_association/${reference['mod_corpus_association_id']}`;
        const field = null;
        const subField = null;
        let method = 'PATCH';
        let array = [accessToken, subPath, updateJson, method, index, field, subField]
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
            array = [accessToken, subPath, updateJson, method, index, field, subField]
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
                method = 'POST';
                array = [accessToken, subPath, updateJson, method, index, field, subField]
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
    if (speciesTypeaheadRef.current) {
      speciesTypeaheadRef.current.clear();
    }

    let dispatchCount = forApiArray.length;

    console.log('dispatchCount ' + dispatchCount)
    dispatch(setSortUpdating(dispatchCount))

    for (const arrayData of forApiArray) {
      dispatch(updateButtonSort(arrayData))
    }
  }

  return (
    <div>
      <h3>References for {accessLevel}</h3>
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

        {/* Conditionally render 'Prepublication' radio button if activeMod is 'WB' */}
        {activeMod === 'WB' && (
          <Form.Check
            inline
            type='radio'
            name='viewMode'
            id='viewModePrepublication'
          >
            <Form.Check.Input
              type='radio'
              name='viewMode'
              id='viewModePrepublication'
              checked={viewMode === 'Prepublication'}
              onChange={() => setViewMode('Prepublication')}
            />
            <Form.Check.Label style={{ fontSize: '1.1em' }}>Prepublication</Form.Check.Label>
          </Form.Check>
        )}

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
      <Container fluid>
        {viewMode === 'Sort' && isLoading && (
          <div className="text-center my-3">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        )}
        {(viewMode === 'Sort' || viewMode === 'Prepublication') &&
          <>
            <RowDivider />
            {referencesToSortLive && referencesToSortLive.length > 0 &&
              <Row>
                <Col lg={12} className="text-center">
                  <SortSubmitUpdateRouter />
                  <Button
                    as="input"
                    style={{ width: '200px' }} // Set width
                    type="button"
                    disabled={buttonUpdateDisabled}
                    value="Update Sorting"
                    onClick={() => updateSorting()}
                  />{' '}
                </Col>
              </Row>
            }
            {referencesToSortLive && referencesToSortLive.length === 0 && (
              <div>
                <br />
                <p>No Papers to sort</p>
              </div>
            )}
            {referencesToSortLive && referencesToSortLive.length > 0 && (
              <Container fluid>
                <RowDivider />
                {referencesToSortLive.map((reference, index) => (
                  <ReferencesToSort
                    key={`reference div ${index}`}
                    reference={reference}
                    index={index}
                    canSort={true}
                    speciesSelect={speciesSelect}
                    setSpeciesSelect={setSpeciesSelect}
                    speciesSelectLoading={speciesSelectLoading}
                    setSpeciesSelectLoading={setSpeciesSelectLoading}
                    typeaheadOptions={typeaheadOptions}
                    setTypeaheadOptions={setTypeaheadOptions}
                    speciesTypeaheadRef={speciesTypeaheadRef}
                    topicEntitySourceId={topicEntitySourceId}
                    accessToken={accessToken}
                    activeMod={activeMod}
                  />
                ))}
                <RowDivider />
                <Row><Col>
                  <SortSubmitUpdateRouter />
                  <Button
                    as="input"
                    style={{ width: '200px' }} // Set width
                    type="button"
                    disabled={buttonUpdateDisabled}
                    value="Update Sorting"
                    onClick={() => updateSorting()}
                  />{' '}
                </Col></Row>
              </Container>
            )}
          </>
        }

        {viewMode === 'Recently sorted' &&
          <>
            <Row className="justify-content-center">
              <Col lg="auto">
                <br />
                <Form>
                  <Form.Row className="align-items-end">
                    <Col md={5}>
                      <Form.Group controlId="formCuratorSelect">
                        <Form.Label style={{ fontWeight: 'bold' }}>Who:</Form.Label>
                        <Form.Control
                          as="select"
                          style={{ minWidth: '250px' }}
                          value={selectedCurator}
                          onChange={(e) => setSelectedCurator(e.target.value)}
                        >
                          {curatorOptions.map((curator, index) => (
                            <option key={index} value={curator.email}>
                              {curator.name}
                            </option>
                          ))}
                        </Form.Control>
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group controlId="formTimeframeSelect">
                        <Form.Label style={{ fontWeight: 'bold' }}>When:</Form.Label>
                        <Form.Control
                          as="select"
                          value={selectedTimeframe}
                          onChange={(e) => setSelectedTimeframe(e.target.value)}
                        >
                          <option value="1">Today</option>
                          <option value="7">Past week</option>
                        </Form.Control>
                      </Form.Group>
                    </Col>
                    <Col md={4} className="d-flex align-items-end">
                      <Form.Group>
                        <Form.Label>&nbsp;</Form.Label> {/* Empty label for alignment */}
                        <Button onClick={handleFindSortedPapers}>Find sorted papers</Button>
                      </Form.Group>
                    </Col>
                  </Form.Row>
                </Form>
              </Col>
            </Row>
            <Row>
              <Col lg={12}>
                <br />
                {recentlySortedData && recentlySortedData.length > 0 ? (
                  <div>
                    <SortSubmitUpdateRouter />
                    <Button
                      variant="outline-primary"
                      className="ml-1"
                      onClick={() => setShowInsidePapers(!showInsidePapers)}
                    >
                      {showInsidePapers ? 'Show Outside Papers' : 'Show Inside Papers'}
                    </Button>
                    <p />
                    <Container fluid>
                      {recentlySortedData
                        .filter(ref => ref['mod_corpus_association_corpus'] === showInsidePapers)
                        .map((reference, index) => (
                          <ReferencesToSort
                            key={`reference div ${index}`}
                            reference={reference}
                            index={index}
                            canSort={true}
                            speciesSelect={speciesSelect}
                            setSpeciesSelect={setSpeciesSelect}
                            speciesSelectLoading={speciesSelectLoading}
                            setSpeciesSelectLoading={setSpeciesSelectLoading}
                            typeaheadOptions={typeaheadOptions}
                            setTypeaheadOptions={setTypeaheadOptions}
                            speciesTypeaheadRef={speciesTypeaheadRef}
                            topicEntitySourceId={topicEntitySourceId}
                            accessToken={accessToken}
                            activeMod={activeMod}
                          />
                        ))}
                      {recentlySortedData.filter(ref => ref['mod_corpus_association_corpus'] === showInsidePapers).length === 0 && (
                        <p>No {showInsidePapers ? 'inside' : 'outside'} papers found.</p>
                      )}
                    </Container>
                  </div>
                ) : (
                  <p>No sorted papers found.</p>
                )}
              </Col>
            </Row>
          </>
        }
      </Container>
      <hr />
    </div>
  )
}

// SortSubmitUpdateRouter Component
const SortSubmitUpdateRouter = () => {
  const sortUpdating = useSelector(state => state.sort.sortUpdating);

  if (sortUpdating > 0) {
    return (<SortSubmitUpdating />);
  }
  else {
    return (<><AlertDismissibleSortUpdate /></>);
  }
}

// SortSubmitUpdating Component
const SortSubmitUpdating = () => {
  return (
    <div className="form-control biblio-updating" >Updating Sort data...</div>
  );
}

// AlertDismissibleSortUpdate Component
const AlertDismissibleSortUpdate = () => {
  const dispatch = useDispatch();
  const updateAlert = useSelector(state => state.sort.updateAlert);
  const updateFailure = useSelector(state => state.sort.updateFailure);
  const updateMessages = useSelector(state => state.sort.updateMessages);
  const accessToken = useSelector(state => state.isLogged.accessToken);

  const [sortModalText, setSortModalText] = useState("")
  const [showTetModal, setShowTetModal] = useState(false);
  const [tetErrorMessage, setTetErrorMessage] = useState("");
  const [modCorpusAssociationId, setModCorpusAssociationId] = useState(null);

  useEffect(() => {
    if (sortModalText.includes("Curated topic and entity tags")) {
      const idMatch = sortModalText.match(/mod_corpus_association_id\s*=\s*(\d+)/);
      if (idMatch) {
        setModCorpusAssociationId(idMatch[1]);
      }
      const displayMessage = sortModalText.replace(/mod_corpus_association_id\s*=\s*\d+/, "");
      setTetErrorMessage(displayMessage);
      setShowTetModal(true);
      setSortModalText('');
    }
  }, [sortModalText, dispatch]);

  useEffect(() => {
    if (updateAlert && updateFailure > 0) {
      const curatedTagsMessage = updateMessages.find(msg =>
        msg.includes("Curated topic and entity tags")
      );
      if (curatedTagsMessage) {
        const idMatch = curatedTagsMessage.match(/mod_corpus_association_id\s*=\s*(\d+)/);
        if (idMatch) {
          setModCorpusAssociationId(idMatch[1]);
        }
        setTetErrorMessage(
          "Curated topic and entity tags or automated tags generated from your MOD " +
          "are associated with this reference. Please check with the curator who added these tags."
        );
        setShowTetModal(true);
        dispatch(closeSortUpdateAlert());
      }
    }
  }, [updateAlert, updateMessages, dispatch]);

  const handleDeleteTetTagsAndPaper = async () => {
    if (!modCorpusAssociationId) {
      return;
    }
    const url = `/reference/mod_corpus_association/${modCorpusAssociationId}`;
    try {
      await api.patch(url, { 'corpus': false, 'force_out': true });
      setShowTetModal(false);
      setModCorpusAssociationId(null);
      window.location.reload();
    } catch (err) {
      console.error("Failed to delete workflow / TET tags and remove the paper from mod corpus:", err);
      const errorDetail = err.response?.data?.detail || err.response?.data?.message || "Deletion failed";
      setSortModalText(errorDetail);
    }
  };

  const handleCloseTetModal = () => {
    setShowTetModal(false);
    setModCorpusAssociationId(null);
    setTetErrorMessage("");
  };

  const variant = updateFailure === 0 ? 'success' : 'danger';
  const header = updateFailure === 0 ? 'Update Success' : 'Update Failure';

  return (
    <>
      {/* Curated Tags Modal */}
      <Modal show={showTetModal} onHide={handleCloseTetModal}>
        <Modal.Header closeButton>
          <Modal.Title>Curated Topic/Entity Tags Found</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{tetErrorMessage}</p>
          {modCorpusAssociationId && (
            <p className="text-muted small">Association ID: {modCorpusAssociationId}</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseTetModal}>
            Keep Tags and Paper
          </Button>
          <Button variant="danger" onClick={handleDeleteTetTagsAndPaper}>
            Delete Tags and Paper
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Regular Alert (for non-curated-tag messages) */}
      {updateAlert && !showTetModal ? (
        <Alert variant={variant} onClose={() => dispatch(closeSortUpdateAlert())} dismissible>
          <Alert.Heading>{header}</Alert.Heading>
          {updateMessages.map((message, index) => (
            <div key={`${message} ${index}`}>{message}</div>
          ))}
        </Alert>
      ) : null}

    </>
  );
}

export default Sort;
