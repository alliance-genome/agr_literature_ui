import { Spinner } from 'react-bootstrap';
import {useSelector, useDispatch} from "react-redux";
import {useEffect, useState, useMemo, useCallback, useRef} from "react";
import {setCurieToNameTaxon,setAllSpecies, setAllEntities, setAllTopics, setAllEntityTypes} from "../../../actions/biblioActions";
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
  const filteredTags = useSelector(state => state.biblio.filteredTags);
  const referenceCurie = useSelector(state => state.biblio.referenceCurie);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [selectedCurie, setSelectedCurie] = useState(null);
  const [showCurieModal, setShowCurieModal] = useState(false);
  const [fullNote, setFullNote] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [fullSourceDesc, setFullSourceDesc] = useState('');
  const [showSourceDescModal, setShowSourceDescModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [firstFetch, setFirstFetch] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const gridRef = useRef();

  const handleDownload = (option) => {
    let dataToDownload = [];
    let headers = [];
    let fields = [];
  
    // get headers and fields from visible columns only
    colDefs
      .filter(col => option === 'allColumns' || !col.hide) // include hidden columns only for 'allColumns' option
      .forEach(col => {
        headers.push(col.headerName);
        fields.push(col.field);
      });

    // find the index of the Entity column so later we can add entity curie (in the "entity" field)
    const entityIndex = fields.indexOf("entity_name");

    // add entity CURIE field and header next to the Entity column
    // entity curie is in "entity" field, entity (name) is in "entity_name" field  
    if (entityIndex !== -1) {
      headers.splice(entityIndex + 1, 0, "Entity CURIE"); // insert "Entity CURIE" after "Entity"
      fields.splice(entityIndex + 1, 0, "entity");        // insert "entity" field after "entity_name"
    }

    if (option === "allColumns") {
      // download all columns, even hidden ones
      gridRef.current.api.forEachNode((node) => {
        dataToDownload.push(node.data);
      });
    } else if (option === "withoutFilters") {
      // download all data without applying filters
      const allData = topicEntityTags;
      dataToDownload = [...allData]; // copy all data from API
    } else {
      // default download with current filters and shown columns
      gridRef.current.api.forEachNodeAfterFilterAndSort((node) => {
        dataToDownload.push(node.data);
      });
    }

    // helper function to get nested values
    // if the field is "topic_name", it will return row.topic_name
    // if the field is "topic_entity_tag_source.secondary_data_provider_abbreviation",
    // it will return row.topic_entity_tag_source.secondary_data_provider_abbreviation
    const getNestedValue = (obj, field) => {
      return field.split('.').reduce((acc, key) => acc && acc[key] ? acc[key] : '', obj);
    };

    // convert headers and data to TSV format
    const tsvHeaders = headers.join('\t'); 
    const tsvRows = dataToDownload.map((row) =>
      fields.map((field) => `"${getNestedValue(row, field) || ''}"`).join('\t')
    );
    const tsvContent = `data:text/tab-separated-values;charset=utf-8,${tsvHeaders}\n${tsvRows.join('\n')}`;
    const encodedUri = encodeURI(tsvContent);

    // generate the file name with referenceCurie
    const fileName = `${referenceCurie}_tet_data_${option}.tsv`;

    // trigger file download
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
    
  useEffect(() => {
    const fetchData = async () => {
      const taxonData = await getCurieToNameTaxon(accessToken);
      dispatch(setCurieToNameTaxon(taxonData));
    };
    fetchData();
  }, [accessToken, dispatch]);

  const fetchTableData = async () => {
    let url = process.env.REACT_APP_RESTAPI + '/topic_entity_tag/by_reference/' + referenceCurie + "?page=" + 1 + "&page_size=" + 8000;
    setIsLoadingData(true);
    try {
        const resultTags = await axios.get(url);
        if (JSON.stringify(resultTags.data) !== JSON.stringify(topicEntityTags)) {
          resultTags.data.forEach(arrElement => {
            if ('validation_by_author' in arrElement) {
              if (arrElement['validation_by_author'] === 'validated_right_self') { arrElement['validation_by_author'] = ''; }
              else if (arrElement['validation_by_author'] === 'validated_right') { arrElement['validation_by_author'] = 'agree'; }
              else if (arrElement['validation_by_author'] === 'validated_wrong') { arrElement['validation_by_author'] = 'disagree'; }
              else if (arrElement['validation_by_author'] === 'not_validated')   { arrElement['validation_by_author'] = 'no data'; }
            }
            if ('validation_by_professional_biocurator' in arrElement) {
              if (arrElement['validation_by_professional_biocurator'] === 'validated_right_self') { arrElement['validation_by_professional_biocurator'] = ''; }
            }
          });
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
      if (firstFetch && topicEntityTags.length > 0) {
          setFirstFetch(false);
      } else {
          fetchTableData();
      }
  }, [topicEntityTags, biblioUpdatingEntityAdd]);


  const handleSourceDescClick = (fullSourceDesc) => {
    setFullSourceDesc(fullSourceDesc);
    setShowSourceDescModal(true);
  };

  const handleNoteClick = (fullNote) => {
    setFullNote(fullNote);
    setShowNoteModal(true);
  };

  const handleCurieClick = (curie) => {
    if(curie !== "null:null"){
      setSelectedCurie(curie);
      setShowCurieModal(true);
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
    { headerName: "Author Response", field: "validation_by_author", id: 15, checked: false },
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
    { headerName: "Source Date Created", field: "topic_entity_tag_source.date_created", id: 26, checked: false },
    { headerName: "Topic Entity Tag Id", field: "topic_entity_tag_id" , id: 27, checked: false },
    { headerName: "Topic Entity Tag Source Id", field: "topic_entity_tag_source.topic_entity_tag_source_id" , id: 28, checked: false }
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
    { headerName: "Author Response", field: "validation_by_author", id: 15, checked: false },
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
    { headerName: "Source Date Created", field: "topic_entity_tag_source.date_created", id: 26, checked: false },
    { headerName: "Topic Entity Tag Id", field: "topic_entity_tag_id" , id: 27, checked: false },
    { headerName: "Topic Entity Tag Source Id", field: "topic_entity_tag_source.topic_entity_tag_source_id" , id: 28, checked: false }
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
     if (item && item.checked === true){
        gridRef.current.api.applyColumnState({
                 state: [{ colId: item.field, hide: false },],
                });
     }
     else if (item && item.checked === false) {
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
    if (valueA === null && valueB === null) {
      return 0;
    }
    if (valueA === null) {
      return -1;
    }
    if (valueB === null) {
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
    { headerName: "Author Response", field: "validation_by_author" },
    { headerName: "Validation By Professional Biocurator", field: "validation_by_professional_biocurator", cellRenderer: ValidationByCurator},
    { headerName: "Display Tag", field: "display_tag_name", comparator: caseInsensitiveComparator },
    { headerName: "Source Secondary Data Provider", field: "topic_entity_tag_source.secondary_data_provider_abbreviation" },
    { headerName: "Source Data Provider", field: "topic_entity_tag_source.data_provider" },
    { headerName: "Source Evidence Assertion", field: "topic_entity_tag_source.source_evidence_assertion_name", comparator: caseInsensitiveComparator, onCellClicked: (params) => {handleCurieClick(params.value+":"+params.data.topic_entity_tag_source.source_evidence_assertion)}},
    { headerName: "Source Method", field: "topic_entity_tag_source.source_method" },
    { headerName: "Source Validation Type", field: "topic_entity_tag_source.validation_type" },
    { headerName: "Source Description", field: "topic_entity_tag_source.description", onCellClicked: (params) => {handleSourceDescClick(params.value)} },
    { headerName: "Source Created By", field: "topic_entity_tag_source.created_by" },
    { headerName: "Source Date Updated", field: "topic_entity_tag_source.date_updated" , valueFormatter: dateFormatter },
    { headerName: "Source Date Created", field: "topic_entity_tag_source.date_created" , valueFormatter: dateFormatter },
    { headerName: "Topic Entity Tag Id", field: "topic_entity_tag_id" },
    { headerName: "Topic Entity Tag Source Id", field: "topic_entity_tag_source.topic_entity_tag_source_id" }
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

    function isExternalFilterPresent() {
        return filteredTags;
    }

    function doesExternalFilterPass(node) {
        if (node.data  && filteredTags){
            return (filteredTags.validating_tags.includes(node.data.topic_entity_tag_id) || filteredTags.validated_tag === node.data.topic_entity_tag_id);
        } else {
            return false;
        }
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
          <GenericTetTableModal title="CURIE Information" body={selectedCurie} show={showCurieModal} onHide={() => setShowCurieModal(false)} />
      )}
      {/* Note Popup */}
      {showNoteModal && (
          <GenericTetTableModal title="Full Note" body={fullNote} show={showNoteModal} onHide={() => setShowNoteModal(false)} />
      )}
      {/* Source Description Popup */}
      {showSourceDescModal && (
          <GenericTetTableModal title="Full Source Description" body={fullSourceDesc} show={showSourceDescModal} onHide={() => setShowSourceDescModal(false)} />
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
             <div className="d-flex justify-content-between" style={{ paddingBottom: '10px' }}>
               {/* "Hide/Show Columns" Button */}
               <CheckboxDropdown items={items} />
            
               {/* Download Options Button */}
               <Dropdown className="ms-auto">
                 <Dropdown.Toggle variant="primary" id="dropdown-download-options">
                   Download Options
                 </Dropdown.Toggle>

                 <Dropdown.Menu>
                   <Dropdown.Item onClick={() => handleDownload('displayedData')}>
                     Download Displayed Data
                   </Dropdown.Item>
                   <Dropdown.Item onClick={() => handleDownload('allColumns')}>
                     Download All Columns
                   </Dropdown.Item>
                   <Dropdown.Item onClick={() => handleDownload('withoutFilters')}>
                     Download Without Filters
                   </Dropdown.Item>
                 </Dropdown.Menu>
               </Dropdown>
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
                  paginationPageSizeSelector={paginationPageSizeSelector}
                  isExternalFilterPresent= {isExternalFilterPresent}
                  doesExternalFilterPass= {doesExternalFilterPass} />
              </div>
           </Col>
        </Row>
      </Container>
    </div>);
} // const EntityTable

export default TopicEntityTable;
