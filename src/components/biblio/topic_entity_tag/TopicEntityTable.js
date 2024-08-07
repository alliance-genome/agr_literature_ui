import { Spinner } from 'react-bootstrap';
import {useSelector, useDispatch} from "react-redux";
import {useEffect, useState, useMemo, useCallback, useRef} from "react";
import { setCurieToNameTaxon,setAllSpecies, setAllEntities, setAllTopics, setAllEntityTypes} from "../../../actions/biblioActions";
import axios from "axios";
import {getCurieToNameTaxon} from "./TaxonUtils";
import Modal from 'react-bootstrap/Modal';
import TopicEntityTagActions from '../../AgGrid/TopicEntityTagActions.jsx';
import ValidationByCurator from '../../AgGrid/ValidationByCurator.jsx';
import SpeciesFilter from '../../AgGrid/SpeciesFilter.jsx';
import EntityTypeFilter from '../../AgGrid/EntityTypeFilter.jsx';
import TopicFilter from '../../AgGrid/TopicFilter.jsx';
import EntityFilter from '../../AgGrid/EntityFilter.jsx';

import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme
import { Button, ButtonGroup, Dropdown, Form } from "react-bootstrap";
import React from "react";
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const TopicEntityTable = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const oktaMod = useSelector(state => state.isLogged.oktaMod);
  const testerMod = useSelector((state) => state.isLogged.testerMod);
  const accessLevel = testerMod !== "No" ? testerMod : oktaMod;
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
  const [showDropdown, setShowDropdown] = useState(false);

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
          const uniqueEntityTypes = [...new Set( resultTags.data.map(obj => obj.entity_type_name))];
	  const uniqueTopics = [...new Set( resultTags.data.map(obj => obj.topic_name))];
	  const uniqueEntities = [...new Set( resultTags.data.map(obj => obj.entity_name))];  
          dispatch(setAllSpecies(uniqueSpecies));
          dispatch(setAllEntityTypes(uniqueEntityTypes));
	  dispatch(setAllTopics(uniqueTopics));
	  dispatch(setAllEntities(uniqueEntities));  
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
    setFullNote(fullNote);
    setShowNoteModal(true);
  };

  const handleCurieClick = (curie) => {
    if(curie !== "null:null"){
      setSelectedCurie(curie);
      setShowModal(true);
    }
  }


    //code for the dropdown menu to handle hide/show topic entity tag columns
  //const state = useLocalStore(() => ({
  //  items: [{ headerName: "Topic", field: "topic_name", id: 1, checked: true},
  //  { headerName: "Entity Type", field: "entity_type_name", id: 2, checked: true}
  //  ]
  // }));
    //initial items if no cookies found for items
    let itemsInit=[
    { headerName: "Topic", field: "topic_name", id: 1, checked: true },
    { headerName: "Entity Type", field: "entity_type_name", id: 2, checked: true },
    { headerName: "Species", field: "species_name", id: 3, checked: true},
    { headerName: "Entity", field: "entity_name", id: 4, checked: true},
    { headerName: "Entity Published As", field: "entity_published_as", id: 5, checked: false },
    { headerName: "No Data", field: "negated", id: 6, checked: true },
    { headerName: "Novel Data", field: "novel_topic_data", id: 7, checked: true},
    { headerName: "Confidence Level", field:"confidence_level", id: 8, checked: false },
    { headerName: "Created By", field: "created_by", id: 9, checked: true},
    { headerName: "Note", field: "note", id: 10, checked: true},
    { headerName: "Entity ID Validation", field: "entity_id_validation", id: 11 , checked: false},
    { headerName: "Date Created", field: "date_created", id: 12, checked: true},
    { headerName: "Updated By", field: "updated_by", id: 13, checked: false },
    { headerName: "Date Updated", field: "date_updated", id: 14, checked: true},
    { headerName: "Validation By Author", field: "validation_by_author", id: 15, checked: false },
    { headerName: "Validation By Professional Biocurator", field: "validation_by_professional_biocurator", id: 16, checked: false },
    { headerName: "Display Tag", field: "display_tag_name", id: 17, checked: false},
    { headerName: "Source Secondary Data Provider", field: "topic_entity_tag_source.secondary_data_provider_abbreviation", id: 18, checked: true },
    { headerName: "Source Data Provider", field: "topic_entity_tag_source.data_provider", id: 19, checked: false },
    { headerName: "Source Evidence Assertion", field: "topic_entity_tag_source.source_evidence_assertion_name" , id: 20, checked: false},
    { headerName: "Source Method", field: "topic_entity_tag_source.source_method", id: 21, checked: false },
    { headerName: "Source Validation Type", field: "topic_entity_tag_source.validation_type", id: 22, checked: false },
    { headerName: "Source Description", field: "topic_entity_tag_source.description" , id: 23, checked: false},
    { headerName: "Source Created By", field: "topic_entity_tag_source.created_by", id: 24, checked: false },
    { headerName: "Source Date Updated", field: "topic_entity_tag_source.date_updated" , id: 25, checked: false },
    { headerName: "Source Date Created", field: "topic_entity_tag_source.date_created", id: 26, checked: false }
    ];

  let itemsInitSGD=[
    { headerName: "Topic", field: "topic_name", id: 1, checked: true },
    { headerName: "Entity Type", field: "entity_type_name", id: 2, checked: true },
    { headerName: "Species", field: "species_name", id: 3, checked: true},
    { headerName: "Entity", field: "entity_name", id: 4, checked: true},
    { headerName: "Entity Published As", field: "entity_published_as", id: 5, checked: false },
    { headerName: "No Data", field: "negated", id: 6, checked: false },
    { headerName: "Novel Data", field: "novel_topic_data", id: 7, checked: false},
    { headerName: "Confidence Level", field:"confidence_level", id: 8, checked: false },
    { headerName: "Created By", field: "created_by", id: 9, checked: true},
    { headerName: "Note", field: "note", id: 10, checked: true},
    { headerName: "Entity ID Validation", field: "entity_id_validation", id: 11 , checked: false},
    { headerName: "Date Created", field: "date_created", id: 12, checked: true},
    { headerName: "Updated By", field: "updated_by", id: 13, checked: false },
    { headerName: "Date Updated", field: "date_updated", id: 14, checked: true},
    { headerName: "Validation By Author", field: "validation_by_author", id: 15, checked: false },
    { headerName: "Validation By Professional Biocurator", field: "validation_by_professional_biocurator", id: 16, checked: false },
    { headerName: "Display Tag", field: "display_tag_name", id: 17, checked: true},
    { headerName: "Source Secondary Data Provider", field: "topic_entity_tag_source.secondary_data_provider_abbreviation", id: 18, checked: false },
    { headerName: "Source Data Provider", field: "topic_entity_tag_source.data_provider", id: 19, checked: false },
    { headerName: "Source Evidence Assertion", field: "topic_entity_tag_source.source_evidence_assertion_name" , id: 20, checked: false},
    { headerName: "Source Method", field: "topic_entity_tag_source.source_method", id: 21, checked: false },
    { headerName: "Source Validation Type", field: "topic_entity_tag_source.validation_type", id: 22, checked: false },
    { headerName: "Source Description", field: "topic_entity_tag_source.description" , id: 23, checked: false},
    { headerName: "Source Created By", field: "topic_entity_tag_source.created_by", id: 24, checked: false },
    { headerName: "Source Date Updated", field: "topic_entity_tag_source.date_updated" , id: 25, checked: false },
    { headerName: "Source Date Created", field: "topic_entity_tag_source.date_created", id: 26, checked: false }
    ];

    // Function to get a cookie value by name
  const getCookie = (name) => {
   const cookies = document.cookie
   .split("; ")
   .find((row) => row.startsWith(`${name}=`));
   return cookies ? cookies.split("=")[1] : null;
  };

  //keep this untouched for default
  let itemsInitOrg = [...itemsInit];
  if ( accessLevel ==="SGD"){
     itemsInit = [...itemsInitSGD];
     itemsInitOrg = [...itemsInitSGD];
  }
  let itemsCookieStr = getCookie("items");
  //use itemsInit if no cookie for 'items' found
  if (!itemsCookieStr || !itemsInit.every(itemInit => JSON.parse(itemsCookieStr).some(itemCookie => itemInit.headerName === itemCookie.headerName && itemInit.field === itemCookie.field && itemInit.id === itemCookie.id))){
      let itemsStr= JSON.stringify(itemsInit);
     document.cookie = `items=${itemsStr}; expires=Thu, 18 Dec 2050 12:00:00 UTC; SameSite=None; Secure;`;
   }
  else {
      let itemsCookie= JSON.parse(itemsCookieStr);
      itemsInit = [...itemsCookie];
  }
  const [items, setItems] = useState (itemsInit);
  const CheckboxMenu = React.forwardRef(
  (
    {
      children,
      style,
      className,
      "aria-labelledby": labeledBy,
      onSelectAll,
      onSelectNone,
      onDefault
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        style={style}
        className={`${className} CheckboxMenu`}
        aria-labelledby={labeledBy}
      >
        <div
          className="d-flex flex-column"
          style={{ maxHeight: "calc(100vh)", overflow: "none" }}
        >
          <div className="dropdown-item border-top pt-2 pb-0">
            <ButtonGroup size="sm">
              <Button variant="link" onClick={onSelectAll}>
                Show All
              </Button>
              <Button variant="link" onClick={onSelectNone}>
                Hide All
              </Button>
              <Button variant="link" onClick={onDefault}>
                Restore Default
              </Button>
            </ButtonGroup>
          </div>
          <ul
            className="list-unstyled flex-shrink mb-0"
            style={{ overflow: "auto" }}
          >
            {children}
          </ul>

        </div>
      </div>
    );
  }
);

const CheckDropdownItem = React.forwardRef(
  ({ children, id, checked, onChange }, ref) => {
    return (
      <Form.Group ref={ref} className="dropdown-item mb-0" controlId={id}>
        <Form.Check
          type="checkbox"
          label={children}
          checked={checked}
          onChange={onChange && onChange.bind(onChange, id)}
        />
      </Form.Group>
    );
  }
);

  const CheckboxDropdown =  ({ items }) => {
   const handleChecked = (key, event) => {
    //console.log('touch item here:' + key + " status: " + event.target.checked);
     const newItems = [...items];
     let item=newItems.find(i => i.id === key);
     item.checked = event.target.checked;
     if (item && item.checked == true){
        gridRef.current.api.applyColumnState({
                 state: [{ colId: item.field, hide: false },],
                });
     }
     else if (item && item.checked == false) {
         gridRef.current.api.applyColumnState({
                  state: [{ colId: item.field, hide: true },],
                 });
     }
     //items.find(i => i.id === key).checked = event.target.checked;
     let newItemsStr=JSON.stringify(newItems);
     document.cookie = `items=${newItemsStr}; expires=Thu, 18 Dec 2050 12:00:00 UTC; SameSite=None; Secure`;
     setItems(newItems);
     setShowDropdown(true);
   };

   const handleSelectAll = () => {
       const newItems = [...items];
           newItems.forEach(i => {
               i.checked = true;
               gridRef.current.api.applyColumnState({
                   state: [{colId: i.field, hide: false},],
               });
           });
           let newItemsStr=JSON.stringify(newItems);
           document.cookie = `items=${newItemsStr}; expires=Thu, 18 Dec 2050 12:00:00 UTC; SameSite=None; Secure`;
           setItems(newItems);
   };

   const handleSelectNone = () => {
   // items.forEach(i => (i.checked = false));
      const newItems = [...items];
          newItems.forEach(i => {
              i.checked = false;
              gridRef.current.api.applyColumnState({
                  state: [{colId: i.field, hide: true},],
              });
          });
          let newItemsStr=JSON.stringify(newItems);
          document.cookie = `items=${newItemsStr}; expires=Thu, 18 Dec 2050 12:00:00 UTC; SameSite=None; Secure`;
          setItems(newItems);
   };

   const handleSelectDefault = () => {
       setItems(itemsInitOrg);
       itemsInitOrg.forEach(i => {
        gridRef.current.api.applyColumnState({
           state: [{colId: i.field, hide: !i.checked},],
        });
       });
       let newItemsStr=JSON.stringify(itemsInitOrg);
       document.cookie = `items=${newItemsStr}; expires=Thu, 18 Dec 2050 12:00:00 UTC; SameSite=None; Secure`;
   };

   return (
    <Dropdown>
      <Dropdown.Toggle variant="primary" id="dropdown-basic">
        Hide/Show Columns
      </Dropdown.Toggle>
      <Dropdown.Menu
        as={CheckboxMenu}
        onSelectAll={handleSelectAll}
        onSelectNone={handleSelectNone}
        onDefault={handleSelectDefault}
        show={showDropdown}
        renderOnMount={false}
      >
        {items.map(i => (
          <Dropdown.Item
            key={i.field}
            as={CheckDropdownItem}
            id={i.id}
            checked={i.checked}
            onChange={handleChecked}
          >
            {i.headerName}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
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

  let cols=[
    { field: "Actions" , lockPosition: 'left' , sortable: false, cellRenderer: TopicEntityTagActions},
      { headerName: "Topic", field: "topic_name", comparator: caseInsensitiveComparator, filter: TopicFilter, onCellClicked: (params) => {handleCurieClick(params.value+":"+params.data.topic)}},
    { headerName: "Entity Type", field: "entity_type_name", comparator: caseInsensitiveComparator, filter: EntityTypeFilter, onCellClicked: (params) => {handleCurieClick(params.value+":"+params.data.entity_type)} },
    { headerName: "Species", field: "species_name", comparator: caseInsensitiveComparator, filter: SpeciesFilter, onCellClicked: (params) => {handleCurieClick(params.value+":"+params.data.species)}},
      { headerName: "Entity", field: "entity_name", comparator: caseInsensitiveComparator, filter: EntityFilter, onCellClicked: (params) => {handleCurieClick(params.value+":"+params.data.entity)}},
    { headerName: "Entity Published As", field: "entity_published_as", comparator: caseInsensitiveComparator },
    { headerName: "No Data", field: "negated", cellDataType: "text", valueGetter: (params) =>   params.data.negated === true ? 'no data': '' },
    { headerName: "Novel Data", field: "novel_topic_data", cellDataType: "text", valueGetter: (params) =>   params.data.novel_topic_data === true ? 'new data': ''},
    { headerName: "Confidence Level", field:"confidence_level" },
    { headerName: "Created By", field: "created_by"},
    { headerName: "Note", field: "note", comparator: caseInsensitiveComparator, onCellClicked: (params) => {handleNoteClick(params.value)}},
    { headerName: "Entity ID Validation", field: "entity_id_validation" },
    { headerName: "Date Created", field: "date_created", valueFormatter: dateFormatter },
    { headerName: "Updated By", field: "updated_by" },
    { headerName: "Date Updated", field: "date_updated" , valueFormatter: dateFormatter },
    { headerName: "Validation By Author", field: "validation_by_author" },
    { headerName: "Validation By Professional Biocurator", field: "validation_by_professional_biocurator", cellRenderer: ValidationByCurator},
    { headerName: "Display Tag", field: "display_tag_name", comparator: caseInsensitiveComparator },
    { headerName: "Source Secondary Data Provider", field: "topic_entity_tag_source.secondary_data_provider_abbreviation" },
    { headerName: "Source Data Provider", field: "topic_entity_tag_source.data_provider" },
    { headerName: "Source Evidence Assertion", field: "topic_entity_tag_source.source_evidence_assertion_name", comparator: caseInsensitiveComparator, onCellClicked: (params) => {handleCurieClick(params.value+":"+params.data.topic_entity_tag_source.source_evidence_assertion)}},
    { headerName: "Source Method", field: "topic_entity_tag_source.source_method" },
    { headerName: "Source Validation Type", field: "topic_entity_tag_source.validation_type" },
    { headerName: "Source Description", field: "topic_entity_tag_source.description" },
    { headerName: "Source Created By", field: "topic_entity_tag_source.created_by" },
    { headerName: "Source Date Updated", field: "topic_entity_tag_source.date_updated" , valueFormatter: dateFormatter },
    { headerName: "Source Date Created", field: "topic_entity_tag_source.date_created" , valueFormatter: dateFormatter }
  ];

  const gridOptions = {
    autoSizeStrategy: {
        type: 'fitCellContents',
        skipHeader: false
    }
    // other grid options ...


  }

  //here to set the table column display/hide values
  if (items && Array.isArray(items)) {
      items.forEach(i => {
          let col = cols.find(j => j.field === i.field);
          col.hide = !i.checked;
      });
  }
  const [colDefs, setColDefs] = useState(cols);

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

  const rowUpdateEvent = () => {
      //If this is causing slowdowns we can likely target specific cells.
      gridRef.current.api.refreshCells({force : true});
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
      <Container fluid>
          <Row>
            <Col>
             <div style={{float: "left", padding: "0  0  10px  0"}}>
                 <CheckboxDropdown items={items} />
             </div>
            </Col>
         </Row>
         <Row>
            <Col>
              <div className="ag-theme-quartz" style={{height: 500}}>
        <AgGridReact
            ref={gridRef}
            reactiveCustomComponents
            rowData={topicEntityTags}
            onGridReady={onGridReady}
            getRowId={getRowId}
            columnDefs={colDefs}
            onColumnMoved={columnMoved}
            onRowDataUpdated={rowUpdateEvent}
            pagination={true}
            paginationPageSize={25}
            gridOptions={gridOptions}
            paginationPageSizeSelector={paginationPageSizeSelector}/>
               </div>
            </Col>
        </Row>
      </Container>
    </div>);
} // const EntityTable

export default TopicEntityTable;
