import React from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setReferenceCurie, setGetReferenceCurieFlag } from '../actions/biblioActions';
import { changeSortCorpusToggler, changeSortWorkflowToggler, updateButtonSort, removeReferenceFromSortLive, setSortUpdating } from '../actions/sortActions';
import { Button, Form, Col, Row } from 'react-bootstrap';
import { AsyncTypeahead } from "react-bootstrap-typeahead";
import { NewTaxonModal, FileElement } from './SortHelper'; // Updated import
import PropTypes from 'prop-types';
import axios from 'axios'; // Added import

const RowDivider = () => { return (<Row><Col>&nbsp;</Col></Row>); }

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

  const backgroundColor = (reference['prepublication_pipeline'] === true) ? '#f8d7da' : '';

  // Handler for "Inside & Open" and "Inside" buttons
  const handleInsideOrOpen = (shouldOpenEditor = false) => {
    const forApiArray = [];

    // Update mod_corpus_association to set 'corpus' to true
    let updateJson = { 'corpus': true, 'mod_corpus_sort_source': 'manual_creation' };
    let subPath = `reference/mod_corpus_association/${reference['mod_corpus_association_id']}`;
    let method = 'PATCH';
    let array = [subPath, updateJson, method, index, null, null];
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
        array = [subPath, updateJson, method, index, null, null];
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
          array = [subPath, updateJson, method, index, null, null];
          forApiArray.push(array);
        }
      }
    }

    // Dispatch the updates
    let dispatchCount = forApiArray.length;
    dispatch(setSortUpdating(dispatchCount));
    for (const arrayData of forApiArray) {
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

  // Handler for "Outside" action
  const handleOutside = () => {
    const forApiArray = [];

    // Update mod_corpus_association to set 'corpus' to false
    let updateJson = { 'corpus': false, 'mod_corpus_sort_source': 'manual_creation' };
    let subPath = `reference/mod_corpus_association/${reference['mod_corpus_association_id']}`;
    let method = 'PATCH';
    let array = [subPath, updateJson, method, index, null, null];
    forApiArray.push(array);

    // Dispatch the updates
    let dispatchCount = forApiArray.length;
    dispatch(setSortUpdating(dispatchCount));
    for (const arrayData of forApiArray) {
      arrayData.unshift(accessToken);
      dispatch(updateButtonSort(arrayData));
    }

    // Remove the paper from the page
    dispatch(removeReferenceFromSortLive(index));
  };

  return (
    <div key={`reference div ${index}`} >
      <Row key={`reference ${index}`} >
        <Col lg={2} className="Col-general Col-display" style={{ display: 'flex', flexDirection: 'column', backgroundColor: backgroundColor }} >
          <div style={{ alignSelf: 'flex-start' }} ><b>Title: </b>
            <span dangerouslySetInnerHTML={{ __html: reference['title'] }} /></div>
          <Link to={{ pathname: "/Biblio", search: `?action=display&referenceCurie=${reference['curie']}` }}
            style={{ alignSelf: 'flex-start' }} onClick={() => {
              dispatch(setReferenceCurie(reference['curie']));
              dispatch(setGetReferenceCurieFlag(true));
            }} >{reference['curie']}</Link>
          {reference['cross_references'].map((xref, idx) => (
            <div key={`xref ${index} ${idx}`} style={{ alignSelf: 'flex-start' }} >
              <a href={xref['url']} target='_blank' rel="noreferrer" >{xref['curie']}</a></div>
          ))}
          <div style={{ alignSelf: 'flex-start' }} ><b>Journal:</b> {
            (reference['resource_title']) ? <span dangerouslySetInnerHTML={{ __html: reference['resource_title'] }} /> : 'N/A' }</div>
          {canSort && <FileElement referenceCurie={reference['curie']} />} {/* FileElement Component */}
        </Col>
        <Col lg={5} className="Col-general Col-display" style={{ backgroundColor: backgroundColor }}>
          <span dangerouslySetInnerHTML={{ __html: reference['abstract'] }} />
        </Col>

        {canSort && (
          <>
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
                  let n = speciesSelectLoading.length;
                  let a = new Array(n).fill(false);
                  a[index] = true;
                  setSpeciesSelectLoading(a);

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
                      let a = new Array(speciesSelectLoading.length).fill(false);
                      setSpeciesSelectLoading(a);
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
                  let newArr = [...speciesSelect];
                  newArr[index] = selected;
                  setSpeciesSelect(newArr);
                }}
                options={typeaheadOptions}
                selected={speciesSelect.length > 0 ? speciesSelect[index] : []}
              />
              {(activeMod === 'WB') && <div><br /><NewTaxonModal /></div>} {/* NewTaxonModal Component */}
              <br />
              <Button variant="outline-primary" size="sm" onClick={() => handleInsideOrOpen(true)}>
                Inside & Open
              </Button>{' '}
              <Button variant="outline-primary" size="sm" onClick={() => handleInsideOrOpen(false)}>
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
                <Button variant="outline-secondary" size="sm" onClick={() => handleOutside()}>
                  Outside
                </Button>
              </div>
            </Col>
          </>
        )}
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
