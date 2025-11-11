import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Spinner, Button, ButtonGroup, Dropdown, Form, Modal, Container, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import { FaGear } from "react-icons/fa6";

import {
  setCurieToNameTaxon,
  setAllSpecies,
  setAllEntities,
  setAllTopics,
  setAllEntityTypes
} from '../../../actions/biblioActions';

import { getCurieToNameTaxon } from './TaxonUtils';
import TopicEntityTagActions from '../../AgGrid/TopicEntityTagActions.jsx';
import ValidationByCurator from '../../AgGrid/ValidationByCurator.jsx';
import SpeciesFilter from '../../AgGrid/SpeciesFilter.jsx';
import EntityTypeFilter from '../../AgGrid/EntityTypeFilter.jsx';
import TopicFilter from '../../AgGrid/TopicFilter.jsx';
import EntityFilter from '../../AgGrid/EntityFilter.jsx';
import { timestampToDateFormatter } from '../BiblioWorkflow';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

// ===== utils (keys + grid state) =====
import {
  extractGridState,
  applyGridState,
  applyGridStateFromPayload,
  itemsFromColumnState,
  columnStateFromColDefs
} from '../../../utils/gridState';

// ===== shared settings hook + UI =====
import { usePersonSettings } from '../../settings/usePersonSettings';
import SettingsDropdown from '../../settings/SettingsDropdown';
import SettingsGearModal from '../../settings/SettingsGearModal';

/* -------------------------------------------
   Download helpers (unchanged)
--------------------------------------------*/
export const handleDownload = (option, gridRef, colDefs, topicEntityTags, fileNameFront) => {
  let dataToDownload = [];
  let headers = [];
  let fields = [];

  colDefs
    .filter(col => option === 'allColumns' || !col.hide)
    .forEach(col => {
      headers.push(col.headerName);
      fields.push(col.field);
    });

  const entityIndex = fields.indexOf("entity_name");
  if (entityIndex !== -1) {
    headers.splice(entityIndex + 1, 0, "Entity CURIE");
    fields.splice(entityIndex + 1, 0, "entity");
  }

  if ((option === "allColumns") || (option === "multiHeader")) {
    gridRef.current.api.forEachNode((node) => {
      dataToDownload.push(node.data);
    });
  } else if (option === "withoutFilters") {
    const allData = topicEntityTags;
    dataToDownload = [...allData];
  } else {
    gridRef.current.api.forEachNodeAfterFilterAndSort((node) => {
      dataToDownload.push(node.data);
    });
  }

  if (option === "multiHeader") {
    headers = headers.flatMap(header =>
      header === "" ? "status" : [`${header}_num`, `${header}_perc`]
    );
    fields = fields.flatMap(field =>
      field === "status" ? [field] : [`${field}_num`, `${field}_perc`]
    );
  }

  const getNestedValue = (obj, field) => {
    return field.split('.').reduce((acc, key) => acc && acc[key] ? acc[key] : '', obj);
  };

  const tsvHeaders = headers.join('\t');
  const tsvRows = dataToDownload.map((row) =>
    fields.map((field) => `"${getNestedValue(row, field) || ''}"`).join('\t')
  );
  const tsvContent = `data:text/tab-separated-values;charset=utf-8,${tsvHeaders}\n${tsvRows.join('\n')}`;
  const encodedUri = encodeURI(tsvContent);

  const fileName = `${fileNameFront}_${option}.tsv`;

  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const DownloadMultiHeaderButton = ({option, gridRef, colDefs, rowData, fileNameFront, buttonLabel}) => {
  return(
    <Button
      variant="primary"
      size="sm"
      onClick={() => handleDownload('multiHeader', gridRef, colDefs, rowData, fileNameFront)}
    >{buttonLabel}</Button>
  );
};

export const DownloadAllColumnsButton = ({option, gridRef, colDefs, rowData, fileNameFront, buttonLabel}) => {
  return(
    <Button
      variant="primary"
      size="sm"
      onClick={() => handleDownload('allColumns', gridRef, colDefs, rowData, fileNameFront)}
    >{buttonLabel}</Button>
  );
};

export const DownloadDropdownOptionsButton = ({option, gridRef, colDefs, rowData, fileNameFront}) => {
  return(
    <Dropdown className="ms-auto">
      <Dropdown.Toggle variant="primary" id="dropdown-download-options">
        Download Options
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Item onClick={() => handleDownload('displayedData', gridRef, colDefs, rowData, fileNameFront)}>
          Download Displayed Data
        </Dropdown.Item>
        <Dropdown.Item onClick={() => handleDownload('allColumns', gridRef, colDefs, rowData, fileNameFront)}>
          Download All Columns
        </Dropdown.Item>
        <Dropdown.Item onClick={() => handleDownload('withoutFilters', gridRef, colDefs, rowData, fileNameFront)}>
          Download Without Filters
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

/* -------------------------------------------
   Small UI helpers
--------------------------------------------*/
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

/* -------------------------------------------
   Main component
--------------------------------------------*/
const TopicEntityTable = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const oktaMod = useSelector(state => state.isLogged.oktaMod);
  const testerMod = useSelector((state) => state.isLogged.testerMod);
  const uid = useSelector(state => state.isLogged.uid);  
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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [nameEdits, setNameEdits] = useState({});
  const [isGridReady, setIsGridReady] = React.useState(false);
  const gridRef = useRef();
  
  // Define component name for settings - specific to this component
  const componentName = "tet_table";
    
  // Settings via shared hook
  const {
    settings, selectedSettingId, setSelectedSettingId, busy, maxCount,
    load, seed, create, rename, remove, makeDefault, savePayloadTo
  } = usePersonSettings({
    baseUrl: process.env.REACT_APP_RESTAPI,
    token: accessToken,
    oktaId: uid,
    componentName,
    maxCount: 10
  });

  // Load settings when component mounts
  useEffect(() => {
    if (accessToken && uid) {
      load();
    }
  }, [accessToken, uid, load]);

  useEffect(() => {
    const fetchData = async () => {
      const taxonData = await getCurieToNameTaxon();
      dispatch(setCurieToNameTaxon(taxonData));
    };
    fetchData();
  }, [accessToken, dispatch]);

  const fetchTableData = useCallback(async () => {
    let url = process.env.REACT_APP_RESTAPI + '/topic_entity_tag/by_reference/' + referenceCurie + "?page=" + 1 + "&page_size=" + 8000;
    setIsLoadingData(true);
    try {
      const resultTags = await axios.get(url);
      resultTags.data.forEach(arrElement => {
        if ('validation_by_author' in arrElement) {
          if (arrElement['validation_by_author'] === 'validated_right_self') { arrElement['validation_by_author'] = ''; }
          else if (arrElement['validation_by_author'] === 'validated_right') { arrElement['validation_by_author'] = 'agree'; }
          else if (arrElement['validation_by_author'] === 'validated_wrong') { arrElement['validation_by_author'] = 'disagree'; }
          else if (arrElement['validation_by_author'] === 'not_validated')   { arrElement['validation_by_author'] = 'no entry'; }
        }
        if ('validation_by_professional_biocurator' in arrElement) {
          if (arrElement['validation_by_professional_biocurator'] === 'validated_right_self') {
            arrElement['validation_by_professional_biocurator'] = '';
          }
        }
      });
      setTopicEntityTags(resultTags.data);
      const uniqueSpecies = [...new Set(resultTags.data.map(obj => obj.species))];
      const uniqueEntityTypes = [...new Set(resultTags.data.map(obj => obj.entity_type_name))];
      const uniqueTopics = [...new Set(resultTags.data.map(obj => obj.topic_name))];
      const uniqueEntities = [...new Set(resultTags.data.map(obj => obj.entity_name))];

      dispatch(setAllSpecies(uniqueSpecies));
      dispatch(setAllEntityTypes(uniqueEntityTypes));
      dispatch(setAllTopics(uniqueTopics));
      dispatch(setAllEntities(uniqueEntities));
    } catch (error) {
      console.error("Error fetching data:" + error);
    } finally {
      setIsLoadingData(false);
    }
  }, [accessToken, referenceCurie, dispatch]);

  useEffect(() => {
    fetchTableData();
  }, [biblioUpdatingEntityAdd, fetchTableData]);

  const handleSourceDescClick = (fullSourceDesc) => {
    setFullSourceDesc(fullSourceDesc);
    setShowSourceDescModal(true);
  };

  const handleNoteClick = (fullNote) => {
    setFullNote(fullNote);
    setShowNoteModal(true);
  };

  const handleCurieClick = (curie) => {
    if (curie !== "null:null") {
      setSelectedCurie(curie);
      setShowCurieModal(true);
    }
  };

  // initial items (SGD vs others)
  let itemsInit = [
    { headerName: "Topic", field: "topic_name", id: 1, checked: true },
    { headerName: "Entity Type", field: "entity_type_name", id: 2, checked: true },
    { headerName: "Species", field: "species_name", id: 3, checked: true},
    { headerName: "Entity", field: "entity_name", id: 4, checked: true},
    { headerName: "Entity Published As", field: "entity_published_as", id: 5, checked: false },
    { headerName: "No Data", field: "negated", id: 6, checked: true },
    { headerName: "Data Novelty", field: "data_novelty", id: 7, checked: false },
    { headerName: "Confidence Score", field:"confidence_score", id: 8, checked: false },	
    { headerName: "Confidence Level", field:"confidence_level", id: 9, checked: false },
    { headerName: "Created By", field: "created_by", id: 10, checked: true},
    { headerName: "Note", field: "note", id: 11, checked: true},
    { headerName: "Entity ID Validation", field: "entity_id_validation", id: 12 , checked: false},
    { headerName: "Date Created", field: "date_created", id: 13, checked: true},
    { headerName: "Updated By", field: "updated_by", id: 14, checked: false },
    { headerName: "Date Updated", field: "date_updated", id: 15, checked: true},
    { headerName: "Author Response", field: "validation_by_author", id: 16, checked: false },
    { headerName: "Validation By Professional Biocurator", field: "validation_by_professional_biocurator", id: 17, checked: false },
    { headerName: "Display Tag", field: "display_tag_name", id: 18, checked: false},
    { headerName: "Source Secondary Data Provider", field: "topic_entity_tag_source.secondary_data_provider_abbreviation", id: 19, checked: true },
    { headerName: "Source Data Provider", field: "topic_entity_tag_source.data_provider", id: 20, checked: false },
    { headerName: "Source Evidence Assertion", field: "topic_entity_tag_source.source_evidence_assertion_name" , id: 21, checked: false},
    { headerName: "Source Method", field: "topic_entity_tag_source.source_method", id: 22, checked: false },
    { headerName: "Source Validation Type", field: "topic_entity_tag_source.validation_type", id: 23, checked: false },
    { headerName: "Source Description", field: "topic_entity_tag_source.description" , id: 24, checked: false},
    { headerName: "Source Created By", field: "topic_entity_tag_source.created_by", id: 25, checked: false },
    { headerName: "Source Date Updated", field: "topic_entity_tag_source.date_updated" , id: 26, checked: false },
    { headerName: "Source Date Created", field: "topic_entity_tag_source.date_created", id: 27, checked: false },
    { headerName: "Model ID", field: "ml_model_id", id: 28, checked: false },
    { headerName: "Model Version", field: "ml_model_version", id: 29, checked: false },
    { headerName: "Topic Entity Tag Id", field: "topic_entity_tag_id" , id: 30, checked: false },
    { headerName: "Topic Entity Tag Source Id", field: "topic_entity_tag_source.topic_entity_tag_source_id" , id: 31, checked: false }
  ];

  let itemsInitSGD = [
    { headerName: "Topic", field: "topic_name", id: 1, checked: true },
    { headerName: "Entity Type", field: "entity_type_name", id: 2, checked: true },
    { headerName: "Species", field: "species_name", id: 3, checked: true},
    { headerName: "Entity", field: "entity_name", id: 4, checked: true},
    { headerName: "Entity Published As", field: "entity_published_as", id: 5, checked: false },
    { headerName: "No Data", field: "negated", id: 6, checked: false },
    { headerName: "Data Novelty", field: "data_novelty", id: 7, checked: false },
    { headerName: "Confidence Score", field:"confidence_score", id: 8, checked: false },
    { headerName: "Confidence Level", field:"confidence_level", id: 9, checked: false },
    { headerName: "Created By", field: "created_by", id: 10, checked: true},
    { headerName: "Note", field: "note", id: 11, checked: true},
    { headerName: "Entity ID Validation", field: "entity_id_validation", id: 12 , checked: false},
    { headerName: "Date Created", field: "date_created", id: 13, checked: true},
    { headerName: "Updated By", field: "updated_by", id: 14, checked: false },
    { headerName: "Date Updated", field: "date_updated", id: 15, checked: true},
    { headerName: "Author Response", field: "validation_by_author", id: 16, checked: false },
    { headerName: "Validation By Professional Biocurator", field: "validation_by_professional_biocurator", id: 17, checked: false },
    { headerName: "Display Tag", field: "display_tag_name", id: 18, checked: true},
    { headerName: "Source Secondary Data Provider", field: "topic_entity_tag_source.secondary_data_provider_abbreviation", id: 19, checked: false },
    { headerName: "Source Data Provider", field: "topic_entity_tag_source.data_provider", id: 20, checked: false },
    { headerName: "Source Evidence Assertion", field: "topic_entity_tag_source.source_evidence_assertion_name" , id: 21, checked: false},
    { headerName: "Source Method", field: "topic_entity_tag_source.source_method", id: 22, checked: false },
    { headerName: "Source Validation Type", field: "topic_entity_tag_source.validation_type", id: 23, checked: false },
    { headerName: "Source Description", field: "topic_entity_tag_source.description" , id: 24, checked: false},
    { headerName: "Source Created By", field: "topic_entity_tag_source.created_by", id: 25, checked: false },
    { headerName: "Source Date Updated", field: "topic_entity_tag_source.date_updated" , id: 26, checked: false },
    { headerName: "Source Date Created", field: "topic_entity_tag_source.date_created", id: 27, checked: false },
    { headerName: "Model ID", field: "ml_model_id", id: 28, checked: false },
    { headerName: "Model Version", field: "ml_model_version", id: 29, checked: false },
    { headerName: "Topic Entity Tag Id", field: "topic_entity_tag_id" , id: 30, checked: false },
    { headerName: "Topic Entity Tag Source Id", field: "topic_entity_tag_source.topic_entity_tag_source_id" , id: 31, checked: false }
  ];

  let itemsInitOrg = [...itemsInit];
  if (accessLevel === "SGD") {
    itemsInit = [...itemsInitSGD];
    itemsInitOrg = [...itemsInitSGD];
  }
  const [items, setItems] = useState(itemsInit);

  const CheckboxDropdown =  ({ items }) => {
    const handleChecked = (key, event) => {
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
             setItems(newItems);
     };

     const handleSelectNone = () => {
        const newItems = [...items];
            newItems.forEach(i => {
                i.checked = false;
                gridRef.current.api.applyColumnState({
                    state: [{colId: i.field, hide: true},],
                });
            });
            setItems(newItems);
     };

     const handleSelectDefault = () => {
         setItems(itemsInitOrg);
         itemsInitOrg.forEach(i => {
          gridRef.current.api.applyColumnState({
             state: [{colId: i.field, hide: !i.checked},],
          });
         });
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

  const dataNoveltyMap = {
    "ATP:0000321": "new data",
    "ATP:0000228": "new to database",
    "ATP:0000229": "new to field",
    "ATP:0000335": " ",
    "ATP:0000334": "existing data"
  };

  let cols=[
    { field: "Actions" , lockPosition: 'left' , sortable: false, cellRenderer: TopicEntityTagActions},
    { headerName: "Topic", field: "topic_name", comparator: caseInsensitiveComparator, filter: TopicFilter, onCellClicked: (params) => {handleCurieClick(params.value+":"+params.data.topic)}},
    { headerName: "Entity Type", field: "entity_type_name", comparator: caseInsensitiveComparator, filter: EntityTypeFilter, onCellClicked: (params) => {handleCurieClick(params.value+":"+params.data.entity_type)} },
    { headerName: "Species", field: "species_name", comparator: caseInsensitiveComparator, filter: SpeciesFilter, onCellClicked: (params) => {handleCurieClick(params.value+":"+params.data.species)}},
    { headerName: "Entity", field: "entity_name", comparator: caseInsensitiveComparator, filter: EntityFilter, onCellClicked: (params) => {handleCurieClick(params.value+":"+params.data.entity)}},
    { headerName: "Entity Published As", field: "entity_published_as", comparator: caseInsensitiveComparator },
    { headerName: "No Data", field: "negated", cellDataType: "text", valueGetter: (params) =>   params.data.negated === true ? 'no data': '' },
    { headerName: "Data Novelty", field: "data_novelty", valueGetter: (params) => dataNoveltyMap[params.data.data_novelty] || params.data.data_novelty },
    { headerName: "Confidence Score", field:"confidence_score" },
    { headerName: "Confidence Level", field:"confidence_level" },
    { headerName: "Created By", field: "created_by"},
    { headerName: "Note", field: "note", comparator: caseInsensitiveComparator, onCellClicked: (params) => {handleNoteClick(params.value)}},
    { headerName: "Entity ID Validation", field: "entity_id_validation" },
    { headerName: "Date Created", field: "date_created", valueFormatter: timestampToDateFormatter },
    { headerName: "Updated By", field: "updated_by" },
    { headerName: "Date Updated", field: "date_updated" , valueFormatter: timestampToDateFormatter },
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
    { headerName: "Source Date Updated", field: "topic_entity_tag_source.date_updated" , valueFormatter: timestampToDateFormatter },
    { headerName: "Source Date Created", field: "topic_entity_tag_source.date_created" , valueFormatter: timestampToDateFormatter },
    { headerName: "Model ID", field: "ml_model_id" },
    { headerName: "Model Version", field: "ml_model_version" },
    { headerName: "Topic Entity Tag Id", field: "topic_entity_tag_id" },
    { headerName: "Topic Entity Tag Source Id", field: "topic_entity_tag_source.topic_entity_tag_source_id" }
  ];

  const gridOptions = {
    autoSizeStrategy: {
      type: 'fitCellContents',
      skipHeader: false
    }
  };

  if (items && Array.isArray(items)) {
    items.forEach(i => {
      let col = cols.find(j => j.field === i.field);
      if (col) col.hide = !i.checked;
    });
  }
  const [colDefs, setColDefs] = useState(cols);

  const paginationPageSizeSelector = useMemo(() => {
    return [10, 25, 50, 100, 500];
  }, []);

  const rowUpdateEvent = () => {
    gridRef.current.api.refreshCells({force : true});
  };

  function isExternalFilterPresent() {
    return filteredTags;
  }

  function doesExternalFilterPass(node) {
    if (node.data && filteredTags){
      return (filteredTags.validating_tags.includes(node.data.topic_entity_tag_id) || filteredTags.validated_tag === node.data.topic_entity_tag_id);
    } else {
      return false;
    }
  }

  const buildSeedPresetName = useCallback(() => {
    return accessLevel === "SGD" ? "SGD Default" : "Default";
  }, [accessLevel]);

  const onGridReady = useCallback(async (params) => {
    try {
      setIsGridReady(true);
      const { existing, picked } = await load();
      
      if (!existing || existing.length === 0) {
        // Create initial default settings
        const seedState = extractGridState(gridRef) || {
          columnState: columnStateFromColDefs(colDefs),
          filterModel: {},
          sortModel: []
        };
        
        const created = await seed({
          name: buildSeedPresetName(),
          payload: { ...seedState, meta: { accessLevel } },
          isDefault: true
        });
        
        if (created) {
          applyGridState(gridRef, created.json_settings || {});
	  setItems(itemsFromColumnState(itemsInitOrg, (created.json_settings?.columnState) || []));
        }
      } else if (picked) {
        // Apply the picked setting
        applyGridState(gridRef, picked.json_settings || {});
        setItems(itemsFromColumnState(itemsInitOrg, (picked.json_settings?.columnState) || []));
      }
    } catch (e) {
      console.error("Failed to load person settings:", e);
      // Fallback: apply default column visibility
      applyGridState(gridRef, {
        columnState: columnStateFromColDefs(colDefs),
        filterModel: {},
        sortModel: []
      });
    }
  }, [load, seed, accessLevel, colDefs, itemsInitOrg, buildSeedPresetName]);

  const onColumnResize = useCallback((params)=>{
    let colState = gridRef.current.api.getColumnState();
    if(params.source === 'autosizeColumns') {
      colState.forEach((element) => {
        if (element.colId === 'note' && element.width > 300){
          gridRef.current.api.applyColumnState({
            state: [{ colId: 'note', width: 300 },],
          });
        }
      })
    }
  },[])

  const getRowId = useMemo(() => {
    return (params) => String(params.data.topic_entity_tag_id);
  }, []);

  const fileNameFront = `${referenceCurie}_tet_data`;

  // Preset handlers
  const handleLoadDefault = useCallback(async () => {
    if (!settings || settings.length === 0) return;

    const defaultSetting = settings.find(s => !!s.default_setting);
    if (!defaultSetting) {
      alert("No default setting found.");
      return;
    }

    // Support both new (json_settings) and any old rows that used `payload`
    const raw = defaultSetting.json_settings || defaultSetting.payload || {};

    // If the stored JSON is empty/meta-only, use a strong fallback so something happens.
    const hasState =
      (raw && (raw.columnState?.length || Object.keys(raw.filterModel||{}).length || (raw.sortModel?.length))) || false;
    const fallback = {
      columnState: columnStateFromColDefs(colDefs),
      filterModel: {},
      sortModel: []
    };
    const payload = hasState ? raw : fallback;
    applyGridStateFromPayload(gridRef, payload);
    setSelectedSettingId(defaultSetting.person_setting_id);
    setItems(itemsFromColumnState(itemsInitOrg, payload.columnState || []));
  }, [settings, gridRef, setSelectedSettingId, itemsInitOrg]);
  
  const handlePickSetting = async (person_setting_id) => {
    setSelectedSettingId(person_setting_id);
    const s = settings.find(x => x.person_setting_id === person_setting_id);
    if (!s) return;
    applyGridState(gridRef, s?.json_settings || {});
    setItems(itemsFromColumnState(itemsInitOrg, (s?.json_settings?.columnState) || []));
  };

  const saveIntoCurrentPreset = async () => {
    if (!selectedSettingId) {
      alert("Please select a setting to save to first.");
      return;
    }

    // Force AG Grid to flush any pending visibility/order updates
    gridRef.current?.api?.onFilterChanged();
    gridRef.current?.api?.refreshClientSideRowModel("filter");
    gridRef.current?.api?.refreshCells({ force: true });

    // Small delay gives AG Grid time to commit recent UI changes
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Now safely extract the *latest* grid state
    const live = extractGridState(gridRef);
    const fallback = {
      columnState: columnStateFromColDefs(colDefs),
      filterModel: {},
      sortModel: []
    };
    const state = live ?? fallback;

    console.log("Saving grid state to preset:", state); // optional debug
    await savePayloadTo(selectedSettingId, { ...state, meta: { accessLevel } });
  };
  
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
            <div className="d-flex justify-content-between align-items-center" style={{ paddingBottom: '10px' }}>
              <div className="d-flex gap-2">
                {/* Hide/Show Columns */}
                <CheckboxDropdown items={items} />
              </div>

              {/* Centered group */}
              <div className="d-flex justify-content-center align-items-center gap-2">
                <Button
                  variant="outline-primary"
                  size="sm"
		  title="Manage table preferences"
                  onClick={() => setShowSettingsModal(true)}
                >
		  <FaGear size={14} style={{ marginRight: '6px' }} />
                  Preferences
                </Button>
                <SettingsDropdown
                  settings={settings}
                  selectedId={selectedSettingId}
                  onPick={handlePickSetting}
                />
                <Button      
                  variant="outline-primary"
                  size="sm"
                  onClick={saveIntoCurrentPreset}
                  disabled={!selectedSettingId || busy}
                >
                  Save to selected
                </Button>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={handleLoadDefault}
                  disabled={settings.length === 0 || !isGridReady}
                >
                  Load default
                </Button>
              </div>
              <DownloadDropdownOptionsButton
                gridRef={gridRef}
                colDefs={colDefs}
                rowData={topicEntityTags}
                fileNameFront={fileNameFront}
              />
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
                onColumnResized={onColumnResize}
                getRowId={getRowId}
                columnDefs={colDefs}
                onColumnMoved={() => {}}
                onRowDataUpdated={() => gridRef.current.api.refreshCells({force : true})}
                pagination={true}
                paginationPageSize={25}
                gridOptions={gridOptions}
                paginationPageSizeSelector={paginationPageSizeSelector}
                isExternalFilterPresent={isExternalFilterPresent}
                doesExternalFilterPass={doesExternalFilterPass}
              />
            </div>
          </Col>
        </Row>
      </Container>

      {/* Settings modal */}
      <SettingsGearModal
        show={showSettingsModal}
        onHide={() => {
          setShowSettingsModal(false);
          setNameEdits({});
        }}
        settings={settings}
        nameEdits={nameEdits}
        setNameEdits={setNameEdits}
        onCreate={async (name) => {
          // Try live grid state; if not available, build from current colDefs
          const live = extractGridState(gridRef);
          const fallback = {
            columnState: columnStateFromColDefs(colDefs),
            filterModel: {},
            sortModel: []
          };
          const state = live ?? fallback;
          return await create(name, { ...state, meta: { accessLevel } });
        }}
        onRename={rename}
        onDelete={remove}
        onMakeDefault={makeDefault}
        canCreateMore={settings.length < maxCount}
        busy={busy}
      />
    </div>
  );
}; // const TopicEntityTable

export default TopicEntityTable;
