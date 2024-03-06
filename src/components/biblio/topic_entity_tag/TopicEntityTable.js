import {useSelector, useDispatch} from "react-redux";
import {useEffect, useState, useMemo, useCallback, useRef} from "react";
import {fetchDisplayTagData} from "../../../actions/biblioActions";
import { setCurieToNameTaxon,setAllSpecies } from "../../../actions/biblioActions";
import axios from "axios";
import {getCurieToNameTaxon} from "./TaxonUtils";
import Modal from 'react-bootstrap/Modal';
import TopicEntityTagActions from '../../AgGrid/TopicEntityTagActions.jsx';
import SpeciesFilter from '../../AgGrid/SpeciesFilter.jsx';

import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme

const TopicEntityTable = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const [topicEntityTags, setTopicEntityTags] = useState([]);
  const [entityEntityMappings, setEntityEntityMappings] = useState({});
  const biblioUpdatingEntityRemoveEntity = useSelector(state => state.biblio.biblioUpdatingEntityRemoveEntity);
  const biblioUpdatingEntityAdd = useSelector(state => state.biblio.biblioUpdatingEntityAdd);
  const referenceCurie = useSelector(state => state.biblio.referenceCurie);
  const curieToNameTaxon = useSelector(state => state.biblio.curieToNameTaxon);
  const allSpecies = useSelector(state => state.biblio.allSpecies);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingMappings, setIsLoadingMappings] = useState(false);
  const ecoToName = {
    'ECO:0000302': 'author statement used in manual assertion'
  };
  const [selectedCurie, setSelectedCurie] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [fullNote, setFullNote] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);

  const gridRef = useRef();
    
  useEffect(() => {
    const fetchData = async () => {
      const taxonData = await getCurieToNameTaxon(accessToken);
      dispatch(setCurieToNameTaxon(taxonData));
    };
    fetchData();
  }, [accessToken]);
	    
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
    fetchMappings().then( () => {
    });
  }, [referenceCurie, topicEntityTags]);

  useEffect(() => {
    const fetchAllSpecies = async () => {
      const resultTags = await axios.get(process.env.REACT_APP_RESTAPI + '/topic_entity_tag/by_reference/' + referenceCurie + "?column_only=species");
      if (JSON.stringify(resultTags.data) !== JSON.stringify(allSpecies)) {
        dispatch(setAllSpecies(resultTags.data));
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
        element.entityName=entityEntityMappings[element.entity];
        element.speciesName=curieToNameTaxon[element.species];
        element.entityTypeName=entityEntityMappings[element.entity_type];
      });
      if (gridRef.current.api){
        //refreshes the cells... there is probably a better way to do this.
        gridRef.current.api.refreshCells();
      }
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      if (biblioUpdatingEntityAdd === 0) {
        let url = process.env.REACT_APP_RESTAPI + '/topic_entity_tag/by_reference/' + referenceCurie + "?page=" + 1 + "&page_size=" + 8000
        /**
        if (sortBy !== null && sortBy !== undefined) {
          url += "&sort_by=" + sortBy
        }
        if (descSort) {
          url += "&desc_sort=true"
        }
        **/
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
  }, [referenceCurie, biblioUpdatingEntityAdd, biblioUpdatingEntityRemoveEntity, topicEntityTags]);

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

  const dateFormatter = (params) => {
    return new Date(params.value).toLocaleString();
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

  const [colDefs, setColDefs] = useState([
    { field: "Actions" , lockPosition: 'left' , sortable: false, cellRenderer: TopicEntityTagActions },
    { headerName: "Topic", field: "TopicName", onCellClicked: (params) => {handleCurieClick(params.value+":"+params.data.topic)}},
    { headerName: "Entity Type", field: "entityTypeName"},
    { headerName: "Species", field: "speciesName" , filter: SpeciesFilter, onCellClicked: (params) => {handleCurieClick(params.value+":"+params.data.species)}},
    { headerName: "Entity", field: "entityName", onCellClicked: (params) => {handleCurieClick(params.value+":"+params.data.entity)}},
    { headerName: "Entity Published As", field: "entity_published_as" },
    { headerName: "No Data", field: "negated", cellDataType: "text" },
    { headerName: "Novel Data", field: "novel_topic_data", cellDataType: "text"},
    { headerName: "Confidence Level", field:"confidence_level" },
    { headerName: "Created By", field: "created_by"},
    { headerName: "Note", field: "note", onCellClicked: (params) => {handleNoteClick(params.value)}},
    { headerName: "Entity Source", field: "entity_source" },
    { headerName: "Date Created", field: "date_created", valueFormatter: dateFormatter },
    { headerName: "Updated By", field: "updated_by" },
    { headerName: "Date Updated", field: "date_updated" , valueFormatter: dateFormatter },
    { headerName: "Validation By Author", field: "validation_by_author" },
    { headerName: "Validation By Curator", field: "validation_by_curator" },
    { headerName: "Validation By Data Curation", field: "validation_by_data_curation" },
    { headerName: "Display Tag", field: "display_tag" },
    { headerName: "Source Mod", field: "topic_entity_tag_source.mod" },
    { headerName: "Source Method", field: "topic_entity_tag_source.source_method" },
    { headerName: "Source Evidence", field: "topic_entity_tag_source.evidence" },
    { headerName: "Source Validation Type", field: "topic_entity_tag_source.validation_type" },
    { headerName: "Source Type", field: "topic_entity_tag_source.source_type" },
    { headerName: "Source Description", field: "topic_entity_tag_source.description" },
    { headerName: "Source Created By", field: "topic_entity_tag_source.created_by" },
    { headerName: "Source Date Updated", field: "topic_entity_tag_source.date_updated" , valueFormatter: dateFormatter },
    { headerName: "Source Date Created", field: "topic_entity_tag_source.date_created" , valueFormatter: dateFormatter }
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
    event.api.refreshCells();
  }, []);

  return (
    <div>
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
