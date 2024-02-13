import {useSelector, useDispatch} from "react-redux";
import {useEffect, useState} from "react";
import {fetchDisplayTagData} from "../../../actions/biblioActions";
import { setTetPageSize as setPageSizeAction } from "../../../actions/biblioActions";
import axios from "axios";
import LoadingOverlay from "../../LoadingOverlay";
import Table from "react-bootstrap/Table";
import {FilterPopup} from "../FilterPopup";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faFilter, faSortAlphaDown, faSortAlphaUp} from "@fortawesome/free-solid-svg-icons";
import Pagination from "react-bootstrap/Pagination";
import {getCurieToNameTaxon} from "./TaxonUtils";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from 'react-bootstrap/Modal';

const TopicEntityTable = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const oktaMod = useSelector(state => state.isLogged.oktaMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);
  const accessLevel = (testerMod !== 'No') ? testerMod : oktaMod;  
  const [topicEntityTags, setTopicEntityTags] = useState([]);
  const [entityEntityMappings, setEntityEntityMappings] = useState({});
  const biblioUpdatingEntityRemoveEntity = useSelector(state => state.biblio.biblioUpdatingEntityRemoveEntity);
  const biblioUpdatingEntityAdd = useSelector(state => state.biblio.biblioUpdatingEntityAdd);  
  const referenceCurie = useSelector(state => state.biblio.referenceCurie);
  const pageSize = useSelector(state => state.biblio.tetPageSize);
  const [totalTagsCount, setTotalTagsCount] = useState(undefined);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState(null);
  const [descSort, setDescSort] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingMappings, setIsLoadingMappings] = useState(false);
  const [showSpeciesFilter, setShowSpeciesFilter] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState([]);
  const [speciesFilterPosition, setSpeciesFilterPosition] = useState({ top: 0, left: 0 });
  const [allSpecies, setAllSpecies] = useState([]);
  const ecoToName = {
    'ECO:0000302': 'author statement used in manual assertion'
  };
  const [selectedCurie, setSelectedCurie] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [fullNote, setFullNote] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);

  const [curieToNameTaxon, setCurieToNameTaxon] = useState({});
    
  useEffect(() => {
    const fetchData = async () => {
      const taxonData = await getCurieToNameTaxon(accessToken);
      setCurieToNameTaxon(taxonData);
    };
    fetchData();
  }, [accessToken]); 
    
  const handleSpeciesFilterClick = (e) => {
    const headerCell = e.target.closest('th');
    if (headerCell) {
      const rect = headerCell.getBoundingClientRect();
      setSpeciesFilterPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
    setShowSpeciesFilter(!showSpeciesFilter);
  };

  const handleCheckboxChange = (curie) => {
    setSelectedSpecies((prevSelected) =>
      prevSelected.includes(curie) ? prevSelected.filter((item) => item !== curie) : [...prevSelected, curie]
    );
    // keep the filter section open when checkboxes are checked
    setShowSpeciesFilter(true);
  };

  const handleClearButtonClick = () => {
    setSelectedSpecies([]);
    setShowSpeciesFilter(true);
  };

  const handleDeleteClick = async (tetDictToDelete) => {
    if (tetDictToDelete.topic_entity_tag_source.mod != accessLevel) {
      console.error("Permission denied. Cannot delete this row.");
      return;
    }
    try {
      const url = process.env.REACT_APP_RESTAPI + "/topic_entity_tag/" + tetDictToDelete.topic_entity_tag_id;	  
      const response = await axios.delete(url, {
        headers: {
            "Authorization": "Bearer " + accessToken,
	    "Content-Type": "application/json"
        }
      });

      // status_code=status.HTTP_204_NO_CONTENT
      if (response.status === 204) {
        // remove the deleted item from the state so that the UI updates
        setTopicEntityTags(prevTags => prevTags.filter(tag => tag !== tetDictToDelete));
	// fetch the updated total tag count
        fetchTotalTagsCount();
      } else {
        console.error("Failed to delete the item:", response.data);
      }
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };
  
  const handleMouseLeave = () => {
    // Hide the species filter when the mouse leaves the filter area
    setShowSpeciesFilter(false);
  };

  const speciesInResultSet = new Set(allSpecies);
	    
  useEffect(() => {
    fetchDisplayTagData(accessToken);
  }, [accessToken]);

  useEffect(() => {
    const fetchMappings = async () => {
      if (topicEntityTags.length > 0) {
        let config = {
          headers: {
            'content-type': 'application/json',
            // 'authorization': 'Bearer ' + accessToken
          }
        };
        setIsLoadingMappings(true);
        try {
          const resultMappings = await axios.get(process.env.REACT_APP_RESTAPI + "/topic_entity_tag/map_entity_curie_to_name/?curie_or_reference_id=" + referenceCurie,
              config);
          setEntityEntityMappings(resultMappings.data);
        } finally {
          setIsLoadingMappings(false)
        }
      }
    }
    fetchMappings().then();
  }, [referenceCurie, topicEntityTags]);

  useEffect(() => {
    const fetchAllSpecies = async () => {
      const resultTags = await axios.get(process.env.REACT_APP_RESTAPI + '/topic_entity_tag/by_reference/' + referenceCurie + "?column_only=species");
      if (JSON.stringify(resultTags.data) !== JSON.stringify(allSpecies)) {
        setAllSpecies(resultTags.data);
      }
    }
    fetchAllSpecies().then();
  }, [referenceCurie, topicEntityTags, allSpecies])

  // function to fetch total tag count
  const fetchTotalTagsCount = async () => {
    let url = process.env.REACT_APP_RESTAPI + '/topic_entity_tag/by_reference/' + referenceCurie + "?count_only=true";
    if (selectedSpecies && selectedSpecies.length !== 0) {
      url += "&column_filter=species&column_values=" + selectedSpecies.join(',');
    }
    const resultTags = await axios.get(url);
    setTotalTagsCount(resultTags.data);
  };

  // function to fetch table data
  const fetchTableData = async () => {
    let url = process.env.REACT_APP_RESTAPI + '/topic_entity_tag/by_reference/' + referenceCurie + "?page=" + page + "&page_size=" + pageSize;
    if (selectedSpecies && selectedSpecies.length !== 0) {
      url += "&column_filter=species&column_values=" + selectedSpecies.join(',');
    }
    if (sortBy !== null && sortBy !== undefined) {
      url += "&sort_by=" + sortBy;
    }
    if (descSort) {
      url += "&desc_sort=true";
    }
    setIsLoadingData(true);
    try {
      const resultTags = await axios.get(url);
      if (JSON.stringify(resultTags.data) !== JSON.stringify(topicEntityTags)) {
        setTopicEntityTags(resultTags.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // useEffect for fetching total tag count and refreshing the table data
  useEffect(() => {
    const fetchDataAndCount = async () => {
      await fetchTotalTagsCount();
      await fetchTableData();
    };
    fetchDataAndCount();
  }, [biblioUpdatingEntityAdd, biblioUpdatingEntityRemoveEntity, referenceCurie, selectedSpecies]);

  // useEffect for fetching table data without updating total tag count
  useEffect(() => {
    fetchTableData();
  }, [topicEntityTags, sortBy, descSort, page, pageSize]);

  useEffect(() => {
    // add event listener for noteUpdated event
    const noteUpdatedHandler = () => {
      // refresh the table data here
      fetchTableData();
    };

    window.addEventListener("noteUpdated", noteUpdatedHandler);

    // cleanup function to remove event listener
    return () => window.removeEventListener("noteUpdated", noteUpdatedHandler);
  }, [accessToken, referenceCurie, selectedSpecies, page, pageSize, sortBy, descSort]);

  const handlePageSizeChange = (event) => {
    const newSize = Number(event.target.value);
    dispatch(setPageSizeAction(newSize)); // update Redux store with new pageSize
  };

  const handleNoteClick = (fullNote) => {
    // console.log("fullNote in 'handleNoteClick'=", fullNote);
    setFullNote(fullNote);
    setShowNoteModal(true);
  };

  const handleCurieClick = (curie) => {
    // console.log("curie in 'handleCurieClick'=", curie);
    setSelectedCurie(curie);
    setShowModal(true);
  };

  const GenericTetTableModal = ({ title, body, show, onHide }) => {
    return (
      <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{body}</Modal.Body>
      </Modal>
    );
  };
    
  const changePage = (action) => {
    let maxPage = Math.max(0, Math.ceil(totalTagsCount/pageSize));
    switch (action){
      case 'Next':
        setPage(Math.min(maxPage, page + 1));
        break;
      case 'Prev':
        setPage(Math.max(1, page - 1));
        break;
      case 'First':
        setPage(1);
        break;
      case 'Last':
        setPage(maxPage);
        break;
      default:
        setPage(1);
        break;
    }
  }

  let headers = [
    'topic', 'entity_type', 'species', 'entity', 'entity_published_as', 'negated',
    'novel_topic_data',
    'confidence_level', 'created_by', 'note', 'entity_source', 'date_created',
    'updated_by', 'date_updated', 'validation_by_author',
    'validation_by_curator', 'validation_by_data_curation',
    'display_tag'
  ];   
  let source_headers = [
    'mod', 'source_method', 'evidence', 'validation_type', 'source_type',
    'description', 'created_by', 'date_updated', 'date_created'
  ];
  const headersWithSortability = new Set([
    'topic', 'entity_type', 'species', 'entity', 
    'entity_published_as', 'negated', 'novel_topic_data', 'confidence_level',
    'created_by', 'note', 'entity_source', 'date_created', 
    'updated_by', 'date_updated', 'display_tag', 
    'mod', 'source_method', 'description', 'evidence',
    'validation_type', 'source_type'
  ]);
  const dateColumnSet = new Set(['date_created', 'date_updated']);
  const headersToEntityMap = new Set(['topic', 'entity_type', 'entity', 'display_tag']);
  const headerToLabelMap = { 'negated': 'no data', 'novel_topic_data': 'novel data' };

  return (
    <div>
       <LoadingOverlay active={isLoadingData || isLoadingMappings} />
       {/* container for total rows, popup, and page size selection */}
       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
         
          {/* total Rows */}
          {typeof totalTagsCount !== 'undefined' && (
            <h4 style={{ textAlign: 'left', paddingLeft: '15px' }}>
              Total {totalTagsCount} rows
            </h4>
          )}

          {/* Curie Popup */}
          {selectedCurie && (
            <GenericTetTableModal title="CURIE Information" body={selectedCurie} show={showModal} onHide={() => setShowModal(false)} />
          )}

          {/* Note Popup */}
          {showNoteModal && (
            <GenericTetTableModal title="Full Note" body={fullNote} show={showNoteModal} onHide={() => setShowNoteModal(false)} />
          )}
	  
          {/* Page Size Selection */}
          <Form.Group controlId="pageSizeSelect" style={{ marginRight: '15px' }}>
            <Form.Label style={{ marginRight: '10px' }}>Rows per page:</Form.Label>
            <Form.Control as="select" value={pageSize} onChange={handlePageSizeChange} style={{ display: 'inline-block', width: 'auto' }}>
              {[10, 25, 50, 100, 500].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </Form.Control>
          </Form.Group>
        </div>
	  
        <Table
          bordered
          size="sm"
          responsive
	>
	  <thead>
            <tr>
	      <th>Actions</th>
              {headers.map((header, index) => {
                const thMinWidth = (header === 'note') ? '16em' : '';
                return (
                <th key={`tetTableHeader th ${index}`} style={{ whiteSpace: 'nowrap', minWidth: thMinWidth }}>
                  {header === 'species' ? (
                    <>
                      <FontAwesomeIcon
                        icon={faFilter}
                        style={{ marginLeft: '5px', cursor: 'pointer', color: showSpeciesFilter ? '#0069d9' : 'black' }}
                        onClick={handleSpeciesFilterClick}
                      />
                      <span style={{ marginLeft: '10px' }}>{header}</span>
                      {headersWithSortability.has(header) ? (
                        <FontAwesomeIcon
                          icon={sortBy !== header || !descSort ? faSortAlphaDown : faSortAlphaUp}
                          style={{ marginLeft: '5px', color: sortBy === header ? '#0069d9' : 'black' }}
                          onClick={() => {
                            if (sortBy === header && descSort) {
                              setSortBy(null);
                              setDescSort(true);
                            } else {
                              setSortBy(header);
                              setDescSort(!descSort);
                            }
                          }}
                        />
                      ) : null}
		      <FilterPopup
                        show={showSpeciesFilter}
                        options={speciesInResultSet}
                        selectedOptions={selectedSpecies}
                        optionToName={curieToNameTaxon}
                        onOptionChange={handleCheckboxChange}
                        onClearClick={handleClearButtonClick}
                        onHideFilter={handleMouseLeave}
                        position={speciesFilterPosition}
                      />
                    </>
                  ) : (
                    <>
                      {(headerToLabelMap[header] !== undefined) ? (headerToLabelMap[header]) : (header) }
                      {headersWithSortability.has(header) ? (
                        <FontAwesomeIcon
                          icon={sortBy !== header || !descSort ? faSortAlphaDown : faSortAlphaUp}
                          style={{ color: sortBy === header ? '#0069d9' : 'black' }}
                          onClick={() => {
                            if (sortBy === header && descSort) {
                              setSortBy(null);
                              setDescSort(true);
                            } else {
                              setSortBy(header);
                              setDescSort(!descSort);
                            }
                          }}
                        />
                      ) : null}
                    </>
                  )}
                </th>
              )} )}
              {source_headers.map((header, index) => (
                <th key={`tetTableHeaderSource th ${index}`}>
                  {header.startsWith('source_') ? header : 'source_' + header}
                  {headersWithSortability.has(header) ? (
                    <FontAwesomeIcon
                      icon={sortBy !== header || !descSort ? faSortAlphaDown : faSortAlphaUp}
                      style={{ color: sortBy === header ? '#0069d9' : 'black' }}
                      onClick={() => {
                        if (sortBy === header && descSort) {
                          setSortBy(null);
                          setDescSort(true);
                        } else {
                          setSortBy(header);
                          setDescSort(!descSort);
                        }
                      }}
                    />
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
          { topicEntityTags
	    .filter((tetDict) => {
              if (selectedSpecies.length > 0) {
                return selectedSpecies.includes(tetDict.species);
              }
              return true;
            })
	    .map( (tetDict, index_1) => {
              return (
                <tr key={`tetTableRow ${index_1}`}>     
		  <td>
                    {tetDict.topic_entity_tag_source.mod === accessLevel ? (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleDeleteClick(tetDict)}
                      >
                        Delete
		      </Button>	    
                    ) : null}
		  </td>
                  { headers.map( (header, index_2) => {
                    let td_value = tetDict[header];
                    if (td_value === true) { td_value = 'True'; }
                    else if (td_value === false) { td_value = 'False'; }
                    else if (td_value === null && header === "negated") {td_value = "N/A"}
                    else if (dateColumnSet.has(header)) {
                      td_value = new Date(td_value).toLocaleString(); }
                    else if (["topic", "entity_type", "species", "entity"].includes(header)) {
			let displayValue = '';
			if (header === "species") {
                            displayValue = tetDict.species in curieToNameTaxon ? curieToNameTaxon[tetDict.species] : tetDict.species;
			} else if (header === 'entity') {
			    displayValue = entityEntityMappings[tetDict[header]] || tetDict[header];
                        } else {
			    displayValue = tetDict[header] in entityEntityMappings ? entityEntityMappings[tetDict[header]] : tetDict[header]; 
		        }
                        const curieToShow = displayValue + ": " + tetDict[header]; 
                        td_value = (
                          <span onClick={() => handleCurieClick(curieToShow)} style={{ cursor: 'pointer' }}>
                             {displayValue}
                          </span>
                        );
                    }
		    else if (headersToEntityMap.has(header)) {
                        td_value = tetDict[header] in entityEntityMappings ? entityEntityMappings[tetDict[header]]
 : tetDict[header]; }
		    else if (header === 'note') {
                        let truncatedNote = tetDict[header] || '';
                        let maxNoteCharLength = 100;
                        if (truncatedNote.length >= maxNoteCharLength) {
                          truncatedNote = truncatedNote.substr(0, truncatedNote.lastIndexOf(' ', maxNoteCharLength)) + ' ...';
                          td_value = (<><span onClick={() => handleNoteClick(tetDict[header])} style={{ cursor: 'pointer' }}>{truncatedNote}</span></>); }
                    }
                    return (<td key={`tetTable ${index_1} td ${index_2}`} >{td_value}</td>)
                  } ) }
                  { source_headers.map( (header, index_2) => {
                    let td_value = tetDict['topic_entity_tag_source'][header];
		    if (header === 'evidence') {
		      const ecoID = td_value;	  
		      const displayValue = ecoToName[td_value] || td_value;
		      td_value = (
			<span onClick={() => handleCurieClick(displayValue + ': ' + ecoID)} style={{ cursor: 'pointer' }}>
			  {displayValue}
			</span>
	              );
		    } 
                    else if (td_value === true) { td_value = 'True'; }
                    else if (td_value === false) { td_value = 'False'; }
                    if (dateColumnSet.has(header)) {
                       td_value = new Date(td_value).toLocaleString();
		    }   
                    return (<td key={`tetTable ${index_1} td ${index_2}`} >{td_value}</td>)
                  } ) }
                </tr>);
          } ) }
          </tbody></Table>
          {totalTagsCount > 0 ?
            <Pagination style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '10vh'}}>
              <Pagination.First  onClick={() => changePage('First')} />
              <Pagination.Prev   onClick={() => changePage('Prev')} />
              <Pagination.Item  disabled>{"Page " + page + " of " + Math.ceil(totalTagsCount/pageSize)}</Pagination.Item>
              <Pagination.Next   onClick={() => changePage('Next')} />
              <Pagination.Last   onClick={() => changePage('Last')} />
            </Pagination>
           : null}
      </div>);
} // const EntityTable

export default TopicEntityTable;
