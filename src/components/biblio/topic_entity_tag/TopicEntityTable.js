import {useSelector, useDispatch} from "react-redux";
import {useEffect, useState, useMemo, useCallback, useRef} from "react";
import {fetchDisplayTagData} from "../../../actions/biblioActions";
import { setTetPageSize as setPageSizeAction,setCurieToNameTaxon } from "../../../actions/biblioActions";
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
import TopicEntityTagActions from '../../AgGrid/TopicEntityTagActions.jsx';
import SpeciesFilter from '../../AgGrid/SpeciesFilter.jsx';

import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme

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
  const curieToNameTaxon = useSelector(state => state.biblio.curieToNameTaxon);
  const [totalTagsCount, setTotalTagsCount] = useState(undefined);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState(null);
  const [rowData, setRowData] = useState();
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

  //const [curieToNameTaxon, setCurieToNameTaxon] = useState({});

  const gridRef = useRef();
    
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
          console.log(topicEntityTags);
        }
      }
    }
    fetchMappings().then( () => {
          //This isnt working!
          gridRef.current.api.refreshCells();
    });
  }, [referenceCurie, topicEntityTags]);

  useEffect(() => {
    const fetchAllSpecies = async () => {
      const resultTags = await axios.get(process.env.REACT_APP_RESTAPI + '/topic_entity_tag/by_reference/' + referenceCurie + "?column_only=species");
      if (JSON.stringify(resultTags.data) !== JSON.stringify(allSpecies)) {
        setAllSpecies(resultTags.data);
        console.log(resultTags.data,"species");
      }
    }
    fetchAllSpecies().then();
  }, [referenceCurie, topicEntityTags, allSpecies])

  //This code can go away once we have this data returned from the API
  useEffect(() => {
    if((!isLoadingData) && (!isLoadingMappings)){
      topicEntityTags.forEach((element) => {
        //this probably needs some checking for empty sets
        element.TopicName = entityEntityMappings[element.topic];
        //gridRef.current.api.applyTransaction({ update: [ {id :gridRef.current.api.getRowNode(element.topic_entity_tag_id), TopicName : entityEntityMappings[element.topic] }] });
        element.entityName=entityEntityMappings[element.entity];
        element.speciesName=curieToNameTaxon[element.species];
        element.entityTypeName=entityEntityMappings[element.entity_type];
      });
      if (gridRef.current.api){
        //refreshes the cells... there is probably a better way to do this.
        gridRef.current.api.refreshCells();
        console.log(curieToNameTaxon,"taxon stuffs");
      }



    }
  });

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
        let url = process.env.REACT_APP_RESTAPI + '/topic_entity_tag/by_reference/' + referenceCurie + "?page=" + page + "&page_size=" + 8000
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
    { field: "Actions" , lockPosition: 'left' , sortable: false, cellRenderer: TopicEntityTagActions },
    { headerName: "Topic", field: "TopicName", onCellClicked: (params) => {console.log(params);handleCurieClick(params.value+":"+params.data.topic)}},
    { headerName: "Entity Type", field: "entityTypeName"},
    { headerName: "Species", field: "speciesName" , filter: SpeciesFilter, onCellClicked: (params) => {console.log(params);handleCurieClick(params.value+":"+params.data.species)}},
    { headerName: "Entity", field: "entityName", onCellClicked: (params) => {console.log(params);handleCurieClick(params.value+":"+params.data.entity)}},
    { field: "Entity Published As" },
    { field: "No Data" },
    { field: "Novel Data" },
    { field: "Confidence Level" },
    { field: "Created By" },
    { field: "note", editable:true, onCellClicked: (params) => {console.log(params);handleNoteClick(params.value)}},
    { field: "entity_source" },
    { field: "date_created" },
    { field: "updated_by" },
    { field: "date_updated" },
    { field: "validation_by_author" },
    { field: "validation_by_curator" },
    { field: "validation_by_data_curation" },
    { field: "display_tag" },
    { field: "topic_entity_tag_source.mod" },
    { field: "topic_entity_tag_source.source_method" },
    { field: "topic_entity_tag_source.evidence" },
    { field: "topic_entity_tag_source.validation_type" },
    { field: "topic_entity_tag_source.source_type" },
    { field: "topic_entity_tag_source.description" },
    { field: "topic_entity_tag_source.created_by" },
    { field: "topic_entity_tag_source.date_updated" },
    { field: "topic_entity_tag_source.date_created" }
  ]);


  const paginationPageSizeSelector = useMemo(() => {
    return [25, 500, 1000];
  }, []);

  const columnMoved = () => {
    let columnState=gridRef.current.api.getColumnState();
    let columnOrder = [];
    columnState.forEach((element) => {
      columnOrder.push(element.colId);
    });
    document.cookie=`columnOrder=${columnOrder}`;
  }

  const onGridReady = useCallback(() => {
    //We could use a package here... but its not much code to do this way.
    //We also need to split twice to get the data, or we hit errors on empty sets.
    let allCookies = document.cookie;
    if(allCookies){
      let thaCookie = document.cookie.split("; ")
          .find((row) => row.startsWith("columnOrder="))
          .split("=")[1];
      let tableState = thaCookie.split(',').map((element) => {
          return { "colId": element};
      })
      gridRef.current.api.applyColumnState({
        state: tableState,
        applyOrder: true
      });
    }
  },[]);

  const getRowId = useMemo(() => {
    return (params) => params.data.topic_entity_tag_id;
  }, []);

  const onRowDataUpdated = useCallback((event) => {
    console.log(event);
    event.api.refreshCells();
  }, []);

  const refreshCells = () => {
    gridRef.current.api.refreshCells();
  }



  return (
    <div>
      <button onClick={refreshCells}> Klick Mich</button>
      {/* Curie Popup */}
      {selectedCurie && (
          <GenericTetTableModal title="CURIE Information" body={selectedCurie} show={showModal} onHide={() => setShowModal(false)} />
      )}
      {/* Note Popup */}
      {showNoteModal && (
          <GenericTetTableModal title="Full Note" body={fullNote} show={showNoteModal} onHide={() => setShowNoteModal(false)} />
      )}
      <div className="ag-theme-quartz" style={{height: 500}}>
        <AgGridReact
            ref={gridRef}
            reactiveCustomComponents
            rowData={topicEntityTags}
            onGridReady={onGridReady}
            getRowId={getRowId}
            columnDefs={colDefs}
            onColumnMoved={columnMoved}
            onRowDataUpdated={onRowDataUpdated}
            pagination={true}
            paginationPageSize={25}
            paginationPageSizeSelector={paginationPageSizeSelector}/>
      </div>
    </div>);
} // const EntityTable

export default TopicEntityTable;
