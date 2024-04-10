import { Spinner } from 'react-bootstrap';
import {useSelector, useDispatch} from "react-redux";
import {useEffect, useState, useMemo, useCallback, useRef} from "react";
import { setCurieToNameTaxon,setAllSpecies } from "../../../actions/biblioActions";
import axios from "axios";
import {getCurieToNameTaxon} from "./TaxonUtils";
import Modal from 'react-bootstrap/Modal';
import TopicEntityTagActions from '../../AgGrid/TopicEntityTagActions.jsx';
import ValidationByCurator from '../../AgGrid/ValidationByCurator.jsx';
import SpeciesFilter from '../../AgGrid/SpeciesFilter.jsx';

import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme

const TopicEntityTable = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const [topicEntityTags, setTopicEntityTags] = useState([]);
  const biblioUpdatingEntityAdd = useSelector(state => state.biblio.biblioUpdatingEntityAdd);
  const referenceCurie = useSelector(state => state.biblio.referenceCurie);
  const [isLoadingData, setIsLoadingData] = useState(false);
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

  const fetchTableData = async () => {
    let url = process.env.REACT_APP_RESTAPI + '/topic_entity_tag/by_reference/' + referenceCurie + "?page=" + 1 + "&page_size=" + 8000;
    setIsLoadingData(true);
    try {
        const resultTags = await axios.get(url);
        if (JSON.stringify(resultTags.data) !== JSON.stringify(topicEntityTags)) {
          setTopicEntityTags(resultTags.data);
          const uniqueSpecies = [...new Set( resultTags.data.map(obj => obj.species)) ];
          dispatch(setAllSpecies(uniqueSpecies));
          Object.entries(resultTags.data)
        }
    } catch (error) {
    console.error("Error fetching data:" + error);
    } finally {
      setIsLoadingData(false);
    }
  }

  useEffect(() => {
    fetchTableData();
  }, [topicEntityTags,biblioUpdatingEntityAdd]);


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

  const nameFormatter = (params) => {
    return ecoToName[params.value];
  }

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

  // const gridOptions = {
  //  sortingCaseInsensitive: true
  // }
  // { headerName: "Entity Type",
  //   field: "entity_type_name",
  //   sortingOrder: ['asc', 'desc', 'null'],
  //   sortingCaseInsensitive: true
  // }
  // these do not work
  // so use our own caseInsensitiveComparator
  const caseInsensitiveComparator = (valueA, valueB) => {
    if (valueA == null && valueB == null) {
      return 0;
    }
    if (valueA == null) {
      return -1;
    }
    if (valueB == null) {
      return 1;
    }
    return valueA.toLowerCase().localeCompare(valueB.toLowerCase());
  };

  const [colDefs, setColDefs] = useState([
    { field: "Actions" , lockPosition: 'left' , sortable: false, cellRenderer: TopicEntityTagActions },
    { headerName: "Topic", field: "topic_name", comparator: caseInsensitiveComparator, onCellClicked: (params) => {handleCurieClick(params.value+":"+params.data.topic)}},
    { headerName: "Entity Type", field: "entity_type_name", comparator: caseInsensitiveComparator },
    { headerName: "Species", field: "species_name", comparator: caseInsensitiveComparator, filter: SpeciesFilter, onCellClicked: (params) => {handleCurieClick(params.value+":"+params.data.species)}},
    { headerName: "Entity", field: "entity_name", comparator: caseInsensitiveComparator, onCellClicked: (params) => {handleCurieClick(params.value+":"+params.data.entity)}},
    { headerName: "Entity Published As", field: "entity_published_as", comparator: caseInsensitiveComparator },
    { headerName: "No Data", field: "negated", cellDataType: "text" },
    { headerName: "Novel Data", field: "novel_topic_data", cellDataType: "text"},
    { headerName: "Confidence Level", field:"confidence_level" },
    { headerName: "Created By", field: "created_by"},
    { headerName: "Note", field: "note", comparator: caseInsensitiveComparator, onCellClicked: (params) => {handleNoteClick(params.value)}},
    { headerName: "Entity ID Validation", field: "entity_id_validation" },
    { headerName: "Date Created", field: "date_created", valueFormatter: dateFormatter },
    { headerName: "Updated By", field: "updated_by" },
    { headerName: "Date Updated", field: "date_updated" , valueFormatter: dateFormatter },
    { headerName: "Validation By Author", field: "validation_by_author" },
    { headerName: "Validation By Professional Biocurator", cellRenderer: ValidationByCurator },
    { headerName: "Display Tag", field: "display_tag_name", comparator: caseInsensitiveComparator },
    { headerName: "Source Secondary Data Provider", field: "topic_entity_tag_source.secondary_data_provider_abbreviation" },
    { headerName: "Source Data Provider", field: "topic_entity_tag_source.data_provider" },
    { headerName: "Source Evidence Assertion", field: "topic_entity_tag_source.source_evidence_assertion" ,valueFormatter: nameFormatter },
    { headerName: "Source Method", field: "topic_entity_tag_source.source_method" },
    { headerName: "Source Validation Type", field: "topic_entity_tag_source.validation_type" },
    { headerName: "Source Description", field: "topic_entity_tag_source.description" },
    { headerName: "Source Created By", field: "topic_entity_tag_source.created_by" },
    { headerName: "Source Date Updated", field: "topic_entity_tag_source.date_updated" , valueFormatter: dateFormatter },
    { headerName: "Source Date Created", field: "topic_entity_tag_source.date_created" , valueFormatter: dateFormatter }
  ]);

  const paginationPageSizeSelector = useMemo(() => {
    return [10, 25, 50, 100, 500];
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
      let thaCookie = document.cookie.split("; ");
      if (thaCookie) {
        let columnOrderCookie = thaCookie.find((row) => row.startsWith("columnOrder="));
        if (columnOrderCookie) {
          let splitCookie = columnOrderCookie.split("=")[1];
          let tableState = splitCookie.split(',').map((element) => {
            return {"colId": element};
          });
          gridRef.current.api.applyColumnState({
            state: tableState,
            applyOrder: true
          });
        }
      }
    }
  },[]);

  const getRowId = useMemo(() => {
    return (params) => params.data.topic_entity_tag_id;
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
      {isLoadingData && (
        <div className="text-center">
          <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
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
            pagination={true}
            paginationPageSize={25}
            paginationPageSizeSelector={paginationPageSizeSelector}/>
      </div>
    </div>);
} // const EntityTable

export default TopicEntityTable;
