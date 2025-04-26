import React from 'react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setReferenceCurie, setGetReferenceCurieFlag } from '../actions/biblioActions';
import { 
  changeSortCorpusToggler, 
  changeSortWorkflowToggler, 
  updateButtonSort, 
  removeReferenceFromSortLive, 
  setSortUpdating 
} from '../actions/sortActions';
import { Button, Form, Col, Row } from 'react-bootstrap';
import { AsyncTypeahead } from "react-bootstrap-typeahead";
import { NewTaxonModal, FileElement } from './SortHelper'; // Updated import
import PropTypes from 'prop-types';
import axios from 'axios'; // Added import
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faCheck, faCheckCircle, faTimes } from '@fortawesome/free-solid-svg-icons';

const RowDivider = () => <Row><Col>&nbsp;</Col></Row>;

const ReferencesToSort = ({
  reference,
  index,
  canSort,
  speciesSelect,
  setSpeciesSelect,
  speciesSelectLoading,
  setSpeciesSelectLoading,
  typeaheadOptions,
  setTypeaheadOptions,
  speciesTypeaheadRef,
  topicEntitySourceId,
  accessToken,
  activeMod
}) => {
  const dispatch = useDispatch();

  const backgroundColor = reference['prepublication_pipeline'] ? '#f8d7da' : '';

  // Handler for "Inside & Open", "Inside & Done", and "Inside" buttons
  const handleInsideOrOpen = (shouldOpenEditor, index_wft_id) => {
    if (activeMod !== "SGD") index_wft_id = null;	
    const forApiArray = [];

    // Update mod_corpus_association to set 'corpus' to true
    let updateJson = {
      'corpus': true,
      'mod_corpus_sort_source': 'manual_creation',
      'index_wft_id': index_wft_id
    };
    let subPath = `reference/mod_corpus_association/${reference['mod_corpus_association_id']}`;
    let method = 'PATCH';
    let array = [subPath, updateJson, method, index, null, null];
    forApiArray.push(array);

    // If activeMod === 'WB', handle setting 'reference_type' via 'mod_reference_type'
    if (activeMod === "WB") {
      let reference_type = null;
      switch(reference['workflow']) {
        case 'experimental':
          reference_type = 'Experimental';
          break;
        case 'not_experimental':
          reference_type = 'Not_experimental';
          break;
        case 'meeting':
          reference_type = 'Meeting_abstract';
          break;
        default:
          break;
      }
      if (reference_type) {
        updateJson = { 
          'reference_type': reference_type, 
          'mod_abbreviation': activeMod, 
          'reference_curie': reference['curie'] 
        };
        subPath = 'reference/mod_reference_type/';
        method = 'POST';
        array = [subPath, updateJson, method, index, null, null];
        forApiArray.push(array);
      }

      // Handle species selection
      if (speciesSelect[index]) {
        speciesSelect[index].forEach(item => {
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
          array = [subPath, updateJson, method, index, null, null];
          forApiArray.push(array);
        });
      }
    }

    // Dispatch the updates
    const dispatchCount = forApiArray.length;
    dispatch(setSortUpdating(dispatchCount));
    forApiArray.forEach(arrayData => {
      arrayData.unshift(accessToken);
      dispatch(updateButtonSort(arrayData));
    });

    // Remove the paper from the page
    dispatch(removeReferenceFromSortLive(index));

    // Update speciesSelect and speciesSelectLoading states
    setSpeciesSelect(prev => {
      const newSelect = [...prev];
      newSelect[index] = [];
      return newSelect;
    });

    setSpeciesSelectLoading(prev => {
      const newLoading = [...prev];
      newLoading[index] = false;
      return newLoading;
    });

    // Optionally open TET editor in a new tab/window if shouldOpenEditor is true
    if (shouldOpenEditor) {
      const tetEditorUrl = `/Biblio/?action=entity&referenceCurie=${reference['curie']}`;
      window.open(tetEditorUrl, '_blank');  
    }
  };

  // Handler for "Outside" action
  const handleOutside = () => {
    const forApiArray = [];

    // Update mod_corpus_association to set 'corpus' to false
    const updateJson = { 
      'corpus': false, 
      'mod_corpus_sort_source': 'manual_creation' 
    };
    const subPath = `reference/mod_corpus_association/${reference['mod_corpus_association_id']}`;
    const method = 'PATCH';
    const array = [subPath, updateJson, method, index, null, null];
    forApiArray.push(array);

    // Dispatch the updates
    const dispatchCount = forApiArray.length;
    dispatch(setSortUpdating(dispatchCount));
    forApiArray.forEach(arrayData => {
      arrayData.unshift(accessToken);
      dispatch(updateButtonSort(arrayData));
    });

    // Remove the paper from the page
    dispatch(removeReferenceFromSortLive(index));
  };

  // Function to determine button variant based on activeMod and button type
  const getButtonVariant = (buttonType) => {
    if (activeMod === 'SGD') {
      if (buttonType === 'insideDone') return 'outline-success';
      if (buttonType === 'inside') return 'outline-secondary';
    }
    return 'outline-primary';
  };

  const orderedAuthorsLive = [];
  for (const value of reference['authors'].values()) {
    let index = value['order'] - 1;
    if (index < 0) { index = 0 }      // temporary fix for fake authors have an 'order' field value of 0
    orderedAuthorsLive[index] = value; }
  const [showAllAuthors, setShowAllAuthors] = useState(false);
  const fullAuthorNames = orderedAuthorsLive.map(dict => dict['name']).join('; ');
  const isTruncated = fullAuthorNames.length > 70;
  let displayedAuthors = fullAuthorNames;
  if (!showAllAuthors && isTruncated) {
    const namesArray = fullAuthorNames.split('; ');
    let result = '';
    for (let i = 0; i < namesArray.length; i++) {
      const next = result ? result + '; ' + namesArray[i] : namesArray[i];
      if (next.length > 70) break;
      result = next;
    }
    displayedAuthors = result + '…';
  }

  return (
    <div key={`reference-div-${index}`}>
      <Row key={`reference-row-${index}`}>
        {/* Reference Details */}
        <Col lg={7} className="Col-general Col-display" style={{ display: 'flex', flexDirection: 'column', backgroundColor, padding: '.5rem' }}>
          <div style={{ alignSelf: 'flex-start', marginBottom: '.5rem' }}>
            <span style={{ fontWeight: 'bold' }} dangerouslySetInnerHTML={{ __html: reference['title'] }} />
            <br />
            <span style={{ fontStyle: 'italic', paddingBottom: '.5rem' }} dangerouslySetInnerHTML={{ __html: displayedAuthors }} />
            {isTruncated && (
              <button
                onClick={() => setShowAllAuthors(prev => !prev)}
                style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}
              >
               {showAllAuthors ? 'Show Less' : 'Show All'}
              </button>
            )}
          </div>
          <span style={{ paddingBottom: '.5rem' }} dangerouslySetInnerHTML={{ __html: reference['abstract'] }} />
          <div style={{ alignSelf: 'flex-start', marginBottom: '.5rem' }}>
            <strong>Journal:</strong> {reference['resource_title'] ? <span style={{ marginRight: '1.5rem' }} dangerouslySetInnerHTML={{ __html: reference['resource_title'] }} /> : 'N/A'}
            <Link 
              to={{ pathname: "/Biblio", search: `?action=display&referenceCurie=${reference['curie']}` }}
              style={{ alignSelf: 'flex-start', marginBottom: '.5rem' }}
              onClick={() => {
                dispatch(setReferenceCurie(reference['curie']));
                dispatch(setGetReferenceCurieFlag(true));
              }}
            >
              {reference['curie']}
            </Link>
            {reference['cross_references']?.length > 0 && <span style={{ margin: '0 .25rem' }}> | </span>}
            <span>
              {reference['cross_references']
                .map((xref, idx) => {
                  const content = xref['url'].endsWith('/') ? (
                    <span key={`xref-${idx}`}>{xref['curie']}</span>
                  ) : (
                    <a key={`xref-${idx}`} href={xref['url']} target='_blank' rel='noreferrer'>
                      {xref['curie']}
                    </a>
                  );
                  return content;
                })
                .reduce((acc, curr, idx) => (idx === 0 ? [curr] : [...acc, ' | ', curr]), [])}
            </span>
          </div>
          <div style={{ alignSelf: 'flex-start', marginBottom: '.5rem' }}>
            <span style={{ marginRight: '1.5rem' }} dangerouslySetInnerHTML={{ __html: reference['category'].replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()), }} />
            <span dangerouslySetInnerHTML={{ __html: reference['pubmed_publication_status'] }} />
          </div>
          {/*
          <div style={{alignSelf: 'flex-start'}} ><FileElement  referenceCurie={reference['curie']}/></div>
          */}
        </Col>

        {/* Needs Review */}
        <Col lg={1} className="Col-general Col-display" style={{ display: 'block', backgroundColor, padding: '.9rem' }}>
          <Form.Check
            inline
            checked={reference['mod_corpus_association_corpus'] === null}
            type='radio'
            label='Needs Review'
            id={`needs_review_toggle-${index}`}
            onChange={(e) => dispatch(changeSortCorpusToggler(e))}
          />
        </Col>

        {/* Inside Corpus */}
        <Col lg={2} className="Col-general Col-display" style={{ display: 'block', backgroundColor, padding: '.9rem' }}>
          <Form>
            <Form.Check
              inline
              checked={reference['mod_corpus_association_corpus'] === true}
              type='radio'
              label='Inside Corpus'
              id={`inside_corpus_toggle-${index}`}
              onChange={(e) => dispatch(changeSortCorpusToggler(e))}
            />
            <br />
            {activeMod === 'WB' && (
              <>
                <Form.Check
                  inline
                  disabled={reference['mod_corpus_association_corpus'] !== true}
                  checked={reference['workflow'] === 'experimental'}
                  type='radio'
                  label='Experimental'
                  id={`experimental_toggle-${index}`}
                  onChange={(e) => dispatch(changeSortWorkflowToggler(e))}
                /><br />
                <Form.Check
                  inline
                  disabled={reference['mod_corpus_association_corpus'] !== true}
                  checked={reference['workflow'] === 'not_experimental'}
                  type='radio'
                  label='Not Experimental'
                  id={`not_experimental_toggle-${index}`}
                  onChange={(e) => dispatch(changeSortWorkflowToggler(e))}
                /><br />
                <Form.Check
                  inline
                  disabled={reference['mod_corpus_association_corpus'] !== true}
                  checked={reference['workflow'] === 'meeting'}
                  type='radio'
                  label='Meeting Abstract'
                  id={`meeting_toggle-${index}`}
                  onChange={(e) => dispatch(changeSortWorkflowToggler(e))}
                /><br />
              </>
            )}
            <Form.Control as="select" id={`primary_select-${index}`} style={{ display: 'none' }}>
              <option>Experimental</option>
              <option>Not Experimental</option>
              <option>Meeting Abstract</option>
            </Form.Control>
	    <br />
	    {activeMod !== 'FB' && (
              <>   
                <AsyncTypeahead
                  multiple
                  disabled={reference['mod_corpus_association_corpus'] !== true}
                  isLoading={speciesSelectLoading[index]}
                  placeholder="Species Name"
                  ref={speciesTypeaheadRef}
                  id={`species_select-${index}`}
                  labelKey={`species_select-${index}`}
                  useCache={false}
                  onSearch={(query) => {
                    const loadingState = new Array(speciesSelectLoading.length).fill(false);
                    loadingState[index] = true;
                    setSpeciesSelectLoading(loadingState);

                    axios.post(`${process.env.REACT_APP_ATEAM_API_BASE_URL}api/ncbitaxonterm/search?limit=10&page=0`,
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
                          'authorization': `Bearer ${accessToken}`
                        }
                      })
                      .then(res => {
                        const updatedLoading = new Array(speciesSelectLoading.length).fill(false);
                        setSpeciesSelectLoading(updatedLoading);
                        if (res.data.results) {
                          setTypeaheadOptions(res.data.results.map(item => `${item.name} ${item.curie}`));
                        }
                      })
                      .catch(error => {
                        console.error('Error searching species:', error);
                        setSpeciesSelectLoading(new Array(speciesSelectLoading.length).fill(false));
                      });
                  }}
                  onChange={(selected) => {
                    const newSpeciesSelect = [...speciesSelect];
                    newSpeciesSelect[index] = selected;
                    setSpeciesSelect(newSpeciesSelect);
                  }}
                  options={typeaheadOptions}
                  selected={speciesSelect[index] || []}
                />
                {activeMod === 'WB' && (
                  <div className="mt-3">
                    <NewTaxonModal />
                  </div>
                )}
	        <br />
	      </>
            )}
            {/* Button Group with Fixed Width and No Wrapping */}
            <div className="d-flex flex-column gap-3">
              {activeMod !== 'FB' && (
		<>
                  <Button 
                    variant="outline-primary" 
                    size="sm" 
	            onClick={() => handleInsideOrOpen(true, 'ATP:0000276')} 
                    style={{
                      width: '150px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <FontAwesomeIcon icon={faEdit} style={{ marginRight: '8px' }} /> Inside & Open
                  </Button>
                  <div style={{ height: '7px' }} /> {/* This adds vertical space */}
                  <Button 
                    variant={getButtonVariant('insideDone')} 
                    size="sm" 
                    onClick={() => handleInsideOrOpen(false, 'ATP:0000275')} 
                    style={{
                      width: '150px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}		
                  >
                    <FontAwesomeIcon icon={faCheck} style={{ marginRight: '8px' }} /> Inside & Done
                  </Button>
                  <div style={{ height: '7px' }} /> {/* This adds vertical space */}
		</>
	      )}
              <Button 
                variant={getButtonVariant('inside')} 
                size="sm" 
                onClick={() => handleInsideOrOpen(false, 'ATP:0000274')}
                style={{
                  width: '150px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '8px' }} /> Inside
              </Button>
            </div>
          </Form>
        </Col>

        {/* Outside Corpus */}
        <Col lg={2} className="Col-general Col-display" style={{ display: 'block', backgroundColor, padding: '.9rem' }}>
          <Form>
            <Form.Check
              inline
              checked={reference['mod_corpus_association_corpus'] === false}
              type='radio'
              label='Outside Corpus'
              id={`outside_corpus_toggle-${index}`}
              onChange={(e) => dispatch(changeSortCorpusToggler(e))}
            />
	    {activeMod !== 'FB' ? (
              <div style={{ height: '85px' }} />
	    ) : (
	      <div style={{ height: '24px' }} />
	    )}	
            {/* Outside Button with Fixed Width and No Wrapping */}
            <div className="d-flex flex-column gap-2">
              <Button 
                variant="outline-primary" 
                size="sm" 
                onClick={handleOutside} 
                style={{
                  width: '150px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FontAwesomeIcon icon={faTimes}  style={{ marginRight: '8px' }}/> Outside
              </Button>
            </div>
          </Form>
        </Col>
      </Row>
      <RowDivider />
    </div>
  );
};

ReferencesToSort.propTypes = {
  reference: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  canSort: PropTypes.bool.isRequired,
  speciesSelect: PropTypes.array.isRequired,
  setSpeciesSelect: PropTypes.func.isRequired,
  speciesSelectLoading: PropTypes.array.isRequired,
  setSpeciesSelectLoading: PropTypes.func.isRequired,
  typeaheadOptions: PropTypes.array.isRequired,
  setTypeaheadOptions: PropTypes.func.isRequired,
  speciesTypeaheadRef: PropTypes.object.isRequired,
  topicEntitySourceId: PropTypes.string,
  accessToken: PropTypes.string.isRequired,
  activeMod: PropTypes.string.isRequired,
};

export default ReferencesToSort;
