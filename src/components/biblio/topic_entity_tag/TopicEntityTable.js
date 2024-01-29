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

import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import "ag-grid-community/styles/ag-grid.css"; // Core CSS

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

  useEffect(() => {
    const fetchTotalTagsCount = async () => {
      let url = process.env.REACT_APP_RESTAPI + '/topic_entity_tag/by_reference/' + referenceCurie + "?count_only=true";
      if (selectedSpecies && selectedSpecies.length !== 0) {
        url = url + "&column_filter=species&column_values=" + selectedSpecies.join(',')
      }
      const resultTags = await axios.get(url);
      setTotalTagsCount(resultTags.data);
    }
    fetchTotalTagsCount().then();
  }, [biblioUpdatingEntityAdd, biblioUpdatingEntityRemoveEntity, referenceCurie, selectedSpecies])

  useEffect(() => {
    const fetchData = async () => {
      if (biblioUpdatingEntityAdd === 0) {
        let url = process.env.REACT_APP_RESTAPI + '/topic_entity_tag/by_reference/' + referenceCurie + "?page=" + page + "&page_size=" + pageSize
	if (selectedSpecies && selectedSpecies.length !== 0) {
	  url = url + "&column_filter=species&column_values=" + selectedSpecies.join(',')
	}
        if (sortBy !== null && sortBy !== undefined) {
          url += "&sort_by=" + sortBy
        }
        if (descSort) {
          url += "&desc_sort=true"
        }
        setIsLoadingData(true);
	try {  
          const resultTags = await axios.get(url);
          if (JSON.stringify(resultTags.data) !== JSON.stringify(topicEntityTags)) {
            setTopicEntityTags(resultTags.data);
          }
	} catch (error) {
	  console.error("Error fetching data:" + error);
        } finally { 
          setIsLoadingData(false);
	}
      }
    }
    fetchData().then();
  }, [sortBy, descSort, referenceCurie, biblioUpdatingEntityAdd, biblioUpdatingEntityRemoveEntity, page, pageSize, topicEntityTags, selectedSpecies]);
    
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
  const [colDefs, setColDefs] = useState([
    { field: "make" },
    { field: "model" },
    { field: "price" },
    { field: "electric" }
  ]);
  const [rowData, setRowData] = useState([
    { make: "Tesla", model: "Model Y", price: 64950, electric: true },
    { make: "Ford", model: "F-Series", price: 33850, electric: false },
    { make: "Toyota", model: "Corolla", price: 29600, electric: false },
  ]);

  return (
    <div>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px'}}>
        <AgGridReact rowData={rowData} columnDefs={colDefs} rowHeight={200}/>
      </div>

    </div>);
} // const EntityTable

export default TopicEntityTable;
