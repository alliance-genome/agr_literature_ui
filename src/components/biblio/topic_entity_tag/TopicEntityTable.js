// src/components/biblio/topic_entity_tag/TopicEntityTable.js
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Spinner,
  Button,
  ButtonGroup,
  Dropdown,
  Form,
  Modal,
  Container,
  Row,
  Col
} from 'react-bootstrap';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';

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

import BiblioPreferenceControls from '../../settings/BiblioPreferenceControls';

/* --------------------------------------------------
   Download helpers (exported)
-------------------------------------------------- */
export const handleDownload = (option, gridRef, colDefs, rowData, fileNameFront) => {
  let dataToDownload = [];
  let headers = [];
  let fields = [];

  (colDefs || [])
    .filter((col) => option === 'allColumns' || !col.hide)
    .forEach((col) => {
      headers.push(col.headerName);
      fields.push(col.field);
    });

  const entityIndex = fields.indexOf('entity_name');
  if (entityIndex !== -1) {
    headers.splice(entityIndex + 1, 0, 'Entity CURIE');
    fields.splice(entityIndex + 1, 0, 'entity');
  }

  const api = gridRef.current?.api;
  if (!api) {
    console.error('Grid API not available for download');
    return;
  }

  if (option === 'allColumns' || option === 'multiHeader') {
    api.forEachNode((node) => dataToDownload.push(node.data));
  } else if (option === 'withoutFilters') {
    dataToDownload = [...(rowData || [])];
  } else {
    api.forEachNodeAfterFilterAndSort((node) => dataToDownload.push(node.data));
  }

  if (option === 'multiHeader') {
    headers = headers.flatMap((h) => (h === '' ? 'status' : [`${h}_num`, `${h}_perc`]));
    fields = fields.flatMap((f) => (f === 'status' ? [f] : [`${f}_num`, `${f}_perc`]));
  }

  const getNestedValue = (obj, field) =>
    field.split('.').reduce((acc, key) => (acc && acc[key] != null ? acc[key] : ''), obj);

  const tsvHeaders = headers.join('\t');
  const tsvRows = dataToDownload.map((row) =>
    fields.map((field) => `"${getNestedValue(row, field) || ''}"`).join('\t')
  );

  const tsvContent =
    `data:text/tab-separated-values;charset=utf-8,${tsvHeaders}\n` + tsvRows.join('\n');
  const encodedUri = encodeURI(tsvContent);

  const fileName = `${fileNameFront}_${option}.tsv`;
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const DownloadMultiHeaderButton = ({
  gridRef,
  colDefs,
  rowData,
  fileNameFront,
  buttonLabel
}) => (
  <Button
    variant="primary"
    size="sm"
    onClick={() => handleDownload('multiHeader', gridRef, colDefs, rowData, fileNameFront)}
  >
    {buttonLabel || 'Download (Multi-Header)'}
  </Button>
);

export const DownloadAllColumnsButton = ({
  gridRef,
  colDefs,
  rowData,
  fileNameFront,
  buttonLabel
}) => (
  <Button
    variant="primary"
    size="sm"
    onClick={() => handleDownload('allColumns', gridRef, colDefs, rowData, fileNameFront)}
  >
    {buttonLabel || 'Download All Columns'}
  </Button>
);

export const DownloadDropdownOptionsButton = ({ gridRef, colDefs, rowData, fileNameFront }) => (
  <Dropdown className="ms-auto">
    <Dropdown.Toggle variant="primary" id="dropdown-download-options">
      Download Options
    </Dropdown.Toggle>

    <Dropdown.Menu>
      <Dropdown.Item
        onClick={() => handleDownload('displayedData', gridRef, colDefs, rowData, fileNameFront)}
      >
        Download Displayed Data
      </Dropdown.Item>
      <Dropdown.Item
        onClick={() => handleDownload('allColumns', gridRef, colDefs, rowData, fileNameFront)}
      >
        Download All Columns
      </Dropdown.Item>
      <Dropdown.Item
        onClick={() => handleDownload('withoutFilters', gridRef, colDefs, rowData, fileNameFront)}
      >
        Download Without Filters
      </Dropdown.Item>
    </Dropdown.Menu>
  </Dropdown>
);

/* -------------------------------------------
   Small UI helpers
--------------------------------------------*/
const CheckboxMenu = React.forwardRef(
  (
    {
      children,
      style,
      className,
      'aria-labelledby': labeledBy,
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
        <div className="d-flex flex-column" style={{ maxHeight: 'calc(100vh)', overflow: 'none' }}>
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
          <ul className="list-unstyled flex-shrink mb-0" style={{ overflow: 'auto' }}>
            {children}
          </ul>
        </div>
      </div>
    );
  }
);

const CheckDropdownItem = React.forwardRef(({ children, id, checked, onChange }, ref) => (
  <Form.Group ref={ref} className="dropdown-item mb-0" controlId={id}>
    <Form.Check
      type="checkbox"
      label={children}
      checked={checked}
      onChange={onChange && onChange.bind(onChange, id)}
    />
  </Form.Group>
));

const GenericTetTableModal = ({ title, body, show, onHide }) => {
  const renderBody = () => {
    if (typeof body !== 'string') return body;
    const tokens = body.split(/(\n| \| )/);
    return tokens.map((token, i) => {
      if (token === '\n') return <br key={i} />;
      if (token === ' | ') return (<React.Fragment key={i}><hr /></React.Fragment>);
      return <React.Fragment key={i}>{token}</React.Fragment>;
    });
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{renderBody()}</Modal.Body>
    </Modal>
  );
};

const Notification = ({ show, message, variant, onClose }) => {
  if (!show) return null;

  const alertClass = {
    success: 'alert-success',
    error: 'alert-danger',
    warning: 'alert-warning',
    info: 'alert-info'
  }[variant] || 'alert-info';

  return (
    <div className={`alert ${alertClass} alert-dismissible fade show mb-3`} role="alert">
      <div className="d-flex justify-content-between align-items-start">
        <div>{message}</div>
        <button
          type="button"
          className="btn btn-link p-0 ms-3 text-decoration-underline"
          onClick={onClose}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------
   Main component
--------------------------------------------*/
const TopicEntityTable = () => {
  const dispatch = useDispatch();

  const accessToken = useSelector((state) => state.isLogged.accessToken);
  const cognitoMod = useSelector((state) => state.isLogged.cognitoMod);
  const testerMod = useSelector((state) => state.isLogged.testerMod);
  const email = useSelector((state) => state.isLogged.email);
  const accessLevel = testerMod !== 'No' ? testerMod : cognitoMod;

  const referenceCurie = useSelector((state) => state.biblio.referenceCurie);
  const filteredTags = useSelector((state) => state.biblio.filteredTags);
  const biblioUpdatingEntityAdd = useSelector((state) => state.biblio.biblioUpdatingEntityAdd);

  const [topicEntityTags, setTopicEntityTags] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [selectedCurie, setSelectedCurie] = useState(null);
  const [showCurieModal, setShowCurieModal] = useState(false);

  const [fullNote, setFullNote] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);

  const [fullSourceDesc, setFullSourceDesc] = useState('');
  const [showSourceDescModal, setShowSourceDescModal] = useState(false);

  const [items, setItems] = useState([]);
  const [colDefs, setColDefs] = useState([]);
  const [isGridReady, setIsGridReady] = useState(false);

  const gridRef = useRef(null);
  const apiRef = useRef(null);

  const [notification, setNotification] = useState({ show: false, message: '', variant: 'success' });

  const showNotification = (message, variant = 'success') =>
    setNotification({ show: true, message, variant });
  const hideNotification = () => setNotification({ show: false, message: '', variant: 'success' });

  useEffect(() => {
    if (!notification.show) return undefined;
    const timer = setTimeout(() => hideNotification(), 5000);
    return () => clearTimeout(timer);
  }, [notification.show]);

  useEffect(() => {
    const fetchTaxon = async () => {
      const taxonData = await getCurieToNameTaxon();
      dispatch(setCurieToNameTaxon(taxonData));
    };
    fetchTaxon();
  }, [dispatch]);

  const getGridApi = useCallback(() => apiRef.current || gridRef.current?.api || null, []);

  const fetchTableData = useCallback(async () => {
    const url =
      process.env.REACT_APP_RESTAPI +
      '/topic_entity_tag/by_reference/' +
      referenceCurie +
      '?page=1&page_size=8000';

    setIsLoadingData(true);
    try {
      const result = await axios.get(url);

      (result.data || []).forEach((row) => {
        if ('validation_by_author' in row) {
          if (row.validation_by_author === 'validated_right_self') row.validation_by_author = '';
          else if (row.validation_by_author === 'validated_right') row.validation_by_author = 'agree';
          else if (row.validation_by_author === 'validated_wrong') row.validation_by_author = 'disagree';
          else if (row.validation_by_author === 'not_validated') row.validation_by_author = 'no entry';
        }
        if ('validation_by_professional_biocurator' in row) {
          if (row.validation_by_professional_biocurator === 'validated_right_self') {
            row.validation_by_professional_biocurator = '';
          }
        }
      });

      setTopicEntityTags(result.data || []);

      const uniqueSpecies = [...new Set((result.data || []).map((o) => o.species))];
      const uniqueEntityTypes = [...new Set((result.data || []).map((o) => o.entity_type_name))];
      const uniqueTopics = [...new Set((result.data || []).map((o) => o.topic_name))];
      const uniqueEntities = [...new Set((result.data || []).map((o) => o.entity_name))];

      dispatch(setAllSpecies(uniqueSpecies));
      dispatch(setAllEntityTypes(uniqueEntityTypes));
      dispatch(setAllTopics(uniqueTopics));
      dispatch(setAllEntities(uniqueEntities));
    } catch (err) {
      console.error('Error fetching topic_entity_tag:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [dispatch, referenceCurie]);

  useEffect(() => {
    fetchTableData();
  }, [fetchTableData, biblioUpdatingEntityAdd]);

  const handleCurieClick = (curie) => {
    if (curie && curie !== 'null:null') {
      setSelectedCurie(curie);
      setShowCurieModal(true);
    }
  };

  const handleNoteClick = (note) => {
    setFullNote(note || '');
    setShowNoteModal(true);
  };

  const handleSourceDescClick = (desc) => {
    setFullSourceDesc(desc || '');
    setShowSourceDescModal(true);
  };

  // ---------------------------
  // Default items (Hide/Show list)
  // ---------------------------
  const itemsInit = useMemo(
    () => [
      { headerName: 'Topic', field: 'topic_name', id: 1, checked: true },
      { headerName: 'Entity Type', field: 'entity_type_name', id: 2, checked: true },
      { headerName: 'Species', field: 'species_name', id: 3, checked: true },
      { headerName: 'Entity', field: 'entity_name', id: 4, checked: true },
      { headerName: 'Entity Published As', field: 'entity_published_as', id: 5, checked: false },
      { headerName: 'No Data', field: 'negated', id: 6, checked: true },
      { headerName: 'Data Novelty', field: 'data_novelty', id: 7, checked: false },
      { headerName: 'Confidence Score', field: 'confidence_score', id: 8, checked: false },
      { headerName: 'Confidence Level', field: 'confidence_level', id: 9, checked: false },
      { headerName: 'Created By', field: 'created_by', id: 10, checked: true },
      { headerName: 'Note', field: 'note', id: 11, checked: true },
      { headerName: 'Entity ID Validation', field: 'entity_id_validation', id: 12, checked: false },
      { headerName: 'Date Created', field: 'date_created', id: 13, checked: true },
      { headerName: 'Updated By', field: 'updated_by', id: 14, checked: false },
      { headerName: 'Date Updated', field: 'date_updated', id: 15, checked: true },
      { headerName: 'Author Response', field: 'validation_by_author', id: 16, checked: false },
      { headerName: 'Validation By Professional Biocurator', field: 'validation_by_professional_biocurator', id: 17, checked: false },
      { headerName: 'Display Tag', field: 'display_tag_name', id: 18, checked: false },
      { headerName: 'Source Secondary Data Provider', field: 'topic_entity_tag_source.secondary_data_provider_abbreviation', id: 19, checked: true },
      { headerName: 'Source Data Provider', field: 'topic_entity_tag_source.data_provider', id: 20, checked: false },
      { headerName: 'Source Evidence Assertion', field: 'topic_entity_tag_source.source_evidence_assertion_name', id: 21, checked: false },
      { headerName: 'Source Method', field: 'topic_entity_tag_source.source_method', id: 22, checked: false },
      { headerName: 'Source Validation Type', field: 'topic_entity_tag_source.validation_type', id: 23, checked: false },
      { headerName: 'Source Description', field: 'topic_entity_tag_source.description', id: 24, checked: false },
      { headerName: 'Source Created By', field: 'topic_entity_tag_source.created_by', id: 25, checked: false },
      { headerName: 'Source Date Updated', field: 'topic_entity_tag_source.date_updated', id: 26, checked: false },
      { headerName: 'Source Date Created', field: 'topic_entity_tag_source.date_created', id: 27, checked: false },
      { headerName: 'Model ID', field: 'ml_model_id', id: 28, checked: false },
      { headerName: 'Model Version', field: 'ml_model_version', id: 29, checked: false },
      { headerName: 'Topic Entity Tag Id', field: 'topic_entity_tag_id', id: 30, checked: false },
      { headerName: 'Topic Entity Tag Source Id', field: 'topic_entity_tag_source.topic_entity_tag_source_id', id: 31, checked: false }
    ],
    []
  );

  const itemsInitSGD = useMemo(
    () => [
      { headerName: 'Topic', field: 'topic_name', id: 1, checked: true },
      { headerName: 'Entity Type', field: 'entity_type_name', id: 2, checked: true },
      { headerName: 'Species', field: 'species_name', id: 3, checked: true },
      { headerName: 'Entity', field: 'entity_name', id: 4, checked: true },
      { headerName: 'Entity Published As', field: 'entity_published_as', id: 5, checked: false },
      { headerName: 'No Data', field: 'negated', id: 6, checked: false },
      { headerName: 'Data Novelty', field: 'data_novelty', id: 7, checked: false },
      { headerName: 'Confidence Score', field: 'confidence_score', id: 8, checked: false },
      { headerName: 'Confidence Level', field: 'confidence_level', id: 9, checked: false },
      { headerName: 'Created By', field: 'created_by', id: 10, checked: true },
      { headerName: 'Note', field: 'note', id: 11, checked: true },
      { headerName: 'Entity ID Validation', field: 'entity_id_validation', id: 12, checked: false },
      { headerName: 'Date Created', field: 'date_created', id: 13, checked: true },
      { headerName: 'Updated By', field: 'updated_by', id: 14, checked: false },
      { headerName: 'Date Updated', field: 'date_updated', id: 15, checked: true },
      { headerName: 'Author Response', field: 'validation_by_author', id: 16, checked: false },
      { headerName: 'Validation By Professional Biocurator', field: 'validation_by_professional_biocurator', id: 17, checked: false },
      { headerName: 'Display Tag', field: 'display_tag_name', id: 18, checked: true },
      { headerName: 'Source Secondary Data Provider', field: 'topic_entity_tag_source.secondary_data_provider_abbreviation', id: 19, checked: false },
      { headerName: 'Source Data Provider', field: 'topic_entity_tag_source.data_provider', id: 20, checked: false },
      { headerName: 'Source Evidence Assertion', field: 'topic_entity_tag_source.source_evidence_assertion_name', id: 21, checked: false },
      { headerName: 'Source Method', field: 'topic_entity_tag_source.source_method', id: 22, checked: false },
      { headerName: 'Source Validation Type', field: 'topic_entity_tag_source.validation_type', id: 23, checked: false },
      { headerName: 'Source Description', field: 'topic_entity_tag_source.description', id: 24, checked: false },
      { headerName: 'Source Created By', field: 'topic_entity_tag_source.created_by', id: 25, checked: false },
      { headerName: 'Source Date Updated', field: 'topic_entity_tag_source.date_updated', id: 26, checked: false },
      { headerName: 'Source Date Created', field: 'topic_entity_tag_source.date_created', id: 27, checked: false },
      { headerName: 'Model ID', field: 'ml_model_id', id: 28, checked: false },
      { headerName: 'Model Version', field: 'ml_model_version', id: 29, checked: false },
      { headerName: 'Topic Entity Tag Id', field: 'topic_entity_tag_id', id: 30, checked: false },
      { headerName: 'Topic Entity Tag Source Id', field: 'topic_entity_tag_source.topic_entity_tag_source_id', id: 31, checked: false }
    ],
    []
  );

  const getInitialItems = useCallback(
    () => (accessLevel === 'SGD' ? [...itemsInitSGD] : [...itemsInit]),
    [accessLevel, itemsInit, itemsInitSGD]
  );

  // ---------------------------
  // Column definitions
  // ---------------------------
  const caseInsensitiveComparator = useCallback((valueA, valueB) => {
    if (valueA == null && valueB == null) return 0;
    if (valueA == null) return -1;
    if (valueB == null) return 1;
    return String(valueA).toLowerCase().localeCompare(String(valueB).toLowerCase());
  }, []);

  const dataNoveltyMap = useMemo(
    () => ({
      'ATP:0000321': 'new data',
      'ATP:0000228': 'new to database',
      'ATP:0000229': 'new to field',
      'ATP:0000335': ' ',
      'ATP:0000334': 'existing data'
    }),
    []
  );

  const cols = useMemo(
    () => [
      { field: 'Actions', lockPosition: 'left', sortable: false, filter: false, cellRenderer: TopicEntityTagActions },
      {
        headerName: 'Topic',
        field: 'topic_name',
        comparator: caseInsensitiveComparator,
        filter: TopicFilter,
        onCellClicked: (p) => handleCurieClick(`${p.value}:${p.data.topic}`)
      },
      {
        headerName: 'Entity Type',
        field: 'entity_type_name',
        comparator: caseInsensitiveComparator,
        filter: EntityTypeFilter,
        onCellClicked: (p) => handleCurieClick(`${p.value}:${p.data.entity_type}`)
      },
      {
        headerName: 'Species',
        field: 'species_name',
        comparator: caseInsensitiveComparator,
        filter: SpeciesFilter,
        onCellClicked: (p) => handleCurieClick(`${p.value}:${p.data.species}`)
      },
      {
        headerName: 'Entity',
        field: 'entity_name',
        comparator: caseInsensitiveComparator,
        filter: EntityFilter,
        onCellClicked: (p) => handleCurieClick(`${p.value}:${p.data.entity}`)
      },
      { headerName: 'Entity Published As', field: 'entity_published_as', comparator: caseInsensitiveComparator, filter: true },
      {
        headerName: 'No Data',
        field: 'negated',
        filter: true,
        cellDataType: 'text',
        valueGetter: (p) => (p.data.negated === true ? 'no data' : '')
      },
      { headerName: 'Data Novelty', field: 'data_novelty', filter: true, valueGetter: (p) => dataNoveltyMap[p.data.data_novelty] || p.data.data_novelty },
      { headerName: 'Confidence Score', field: 'confidence_score', filter: true },
      { headerName: 'Confidence Level', field: 'confidence_level', filter: true },
      { headerName: 'Created By', field: 'created_by', filter: true },
      {
        headerName: 'Note',
        field: 'note',
        filter: true,
        comparator: caseInsensitiveComparator,
        onCellClicked: (p) => handleNoteClick(p.value)
      },
      { headerName: 'Entity ID Validation', field: 'entity_id_validation', filter: true },
      { headerName: 'Date Created', field: 'date_created', filter: true, valueFormatter: timestampToDateFormatter },
      { headerName: 'Updated By', field: 'updated_by', filter: true },
      { headerName: 'Date Updated', field: 'date_updated', filter: true, valueFormatter: timestampToDateFormatter },
      { headerName: 'Author Response', field: 'validation_by_author', filter: true },
      { headerName: 'Validation By Professional Biocurator', field: 'validation_by_professional_biocurator', filter: true, cellRenderer: ValidationByCurator },
      { headerName: 'Display Tag', field: 'display_tag_name', filter: true, comparator: caseInsensitiveComparator },
      { headerName: 'Source Secondary Data Provider', field: 'topic_entity_tag_source.secondary_data_provider_abbreviation', filter: true },
      { headerName: 'Source Data Provider', field: 'topic_entity_tag_source.data_provider', filter: true },
      {
        headerName: 'Source Evidence Assertion',
        field: 'topic_entity_tag_source.source_evidence_assertion_name',
        filter: true,
        comparator: caseInsensitiveComparator,
        onCellClicked: (p) => handleCurieClick(`${p.value}:${p.data.topic_entity_tag_source.source_evidence_assertion}`)
      },
      { headerName: 'Source Method', field: 'topic_entity_tag_source.source_method', filter: true },
      { headerName: 'Source Validation Type', field: 'topic_entity_tag_source.validation_type', filter: true },
      { headerName: 'Source Description', field: 'topic_entity_tag_source.description', filter: true, onCellClicked: (p) => handleSourceDescClick(p.value) },
      { headerName: 'Source Created By', field: 'topic_entity_tag_source.created_by', filter: true },
      { headerName: 'Source Date Updated', field: 'topic_entity_tag_source.date_updated', filter: true, valueFormatter: timestampToDateFormatter },
      { headerName: 'Source Date Created', field: 'topic_entity_tag_source.date_created', filter: true, valueFormatter: timestampToDateFormatter },
      { headerName: 'Model ID', field: 'ml_model_id', filter: true },
      { headerName: 'Model Version', field: 'ml_model_version', filter: true },
      { headerName: 'Topic Entity Tag Id', field: 'topic_entity_tag_id', filter: true },
      { headerName: 'Topic Entity Tag Source Id', field: 'topic_entity_tag_source.topic_entity_tag_source_id', filter: true }
    ],
    [caseInsensitiveComparator, dataNoveltyMap]
  );

  const updateColDefsWithItems = useCallback(
    (currentItems) => {
      const itemsByField = new Map((currentItems || []).map((i) => [i.field, i]));
      return cols.map((col) => {
        const item = itemsByField.get(col.field);
        return item ? { ...col, hide: !item.checked } : col;
      });
    },
    [cols]
  );

  useEffect(() => {
    const initItems = getInitialItems();
    setItems(initItems);
    setColDefs(updateColDefsWithItems(initItems));
  }, [getInitialItems, updateColDefsWithItems]);

  // ---------------------------
  // Column Hide/Show dropdown
  // ---------------------------
  const handleChecked = useCallback(
    (key, event) => {
      const newItems = [...items];
      const item = newItems.find((i) => i.id === key);
      if (!item) return;

      item.checked = event.target.checked;

      const api = getGridApi();
      api?.applyColumnState?.({ state: [{ colId: item.field, hide: !item.checked }] });

      setItems(newItems);
      setTimeout(() => api?.refreshHeader?.(), 10);
    },
    [getGridApi, items]
  );

  const handleSelectAll = useCallback(() => {
    const api = getGridApi();
    const newItems = [...items].map((i) => ({ ...i, checked: true }));
    newItems.forEach((i) => api?.applyColumnState?.({ state: [{ colId: i.field, hide: false }] }));
    setItems(newItems);
    setTimeout(() => api?.refreshHeader?.(), 10);
  }, [getGridApi, items]);

  const handleSelectNone = useCallback(() => {
    const api = getGridApi();
    const newItems = [...items].map((i) => ({ ...i, checked: false }));
    newItems.forEach((i) => api?.applyColumnState?.({ state: [{ colId: i.field, hide: true }] }));
    setItems(newItems);
    setTimeout(() => api?.refreshHeader?.(), 10);
  }, [getGridApi, items]);

  const handleSelectDefault = useCallback(() => {
    const api = getGridApi();
    const defaultItems = getInitialItems();
    setItems(defaultItems);
    defaultItems.forEach((i) => api?.applyColumnState?.({ state: [{ colId: i.field, hide: !i.checked }] }));
    setTimeout(() => api?.refreshHeader?.(), 10);
  }, [getGridApi, getInitialItems]);

  const CheckboxDropdown = useCallback(
    () => (
      <Dropdown>
        <Dropdown.Toggle variant="primary" id="dropdown-basic">
          Hide/Show Columns
        </Dropdown.Toggle>
        <Dropdown.Menu
          as={CheckboxMenu}
          onSelectAll={handleSelectAll}
          onSelectNone={handleSelectNone}
          onDefault={handleSelectDefault}
          renderOnMount={false}
        >
          {items.map((i) => (
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
    ),
    [handleChecked, handleSelectAll, handleSelectDefault, handleSelectNone, items]
  );

  // ---------------------------
  // External filtering
  // ---------------------------
  const isExternalFilterPresent = useCallback(() => {
    return !!(
      filteredTags &&
      ((Array.isArray(filteredTags.validating_tags) && filteredTags.validating_tags.length > 0) ||
        filteredTags.validated_tag != null)
    );
  }, [filteredTags]);

  const doesExternalFilterPass = useCallback(
    (node) => {
      if (!node?.data) return false;

      const vt = Array.isArray(filteredTags?.validating_tags) ? filteredTags.validating_tags : [];
      const validated = filteredTags?.validated_tag;

      return vt.includes(node.data.topic_entity_tag_id) || validated === node.data.topic_entity_tag_id;
    },
    [filteredTags]
  );

  useEffect(() => {
    const api = getGridApi();
    api?.onFilterChanged?.();
    api?.refreshClientSideRowModel?.('filter');
  }, [filteredTags, getGridApi]);

  const onGridReady = useCallback((params) => {
    apiRef.current = params.api;
    setIsGridReady(true);
  }, []);

  const onColumnResized = useCallback(
    (params) => {
      const api = getGridApi();
      if (!api?.getColumnState || !api?.applyColumnState) return;

      if (params.source === 'autosizeColumns') {
        const state = api.getColumnState();
        state.forEach((s) => {
          if (s.colId === 'note' && s.width > 300) {
            api.applyColumnState({ state: [{ colId: 'note', width: 300 }] });
          }
        });
      }
    },
    [getGridApi]
  );

  const clearAllFilters = useCallback(() => {
    const api = getGridApi();
    api?.setFilterModel?.(null);
    api?.onFilterChanged?.();
    api?.refreshClientSideRowModel?.('filter');
    api?.refreshHeader?.();
    api?.redrawRows?.();
    api?.refreshCells?.({ force: true });
  }, [getGridApi]);

  const paginationPageSizeSelector = useMemo(() => [10, 25, 50, 100, 500], []);
  const gridOptions = useMemo(
    () => ({
      autoSizeStrategy: { type: 'fitCellContents', skipHeader: false }
    }),
    []
  );

  const getRowId = useMemo(() => (params) => String(params.data.topic_entity_tag_id), []);
  const fileNameFront = `${referenceCurie}_tet_data`;

  return (
    <div>
      {selectedCurie && (
        <GenericTetTableModal
          title="CURIE Information"
          body={selectedCurie}
          show={showCurieModal}
          onHide={() => setShowCurieModal(false)}
        />
      )}

      {showNoteModal && (
        <GenericTetTableModal
          title="Full Note"
          body={fullNote}
          show={showNoteModal}
          onHide={() => setShowNoteModal(false)}
        />
      )}

      {showSourceDescModal && (
        <GenericTetTableModal
          title="Full Source Description"
          body={fullSourceDesc}
          show={showSourceDescModal}
          onHide={() => setShowSourceDescModal(false)}
        />
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
              <div className="d-flex align-items-center" style={{ gap: '14px' }}>
                <CheckboxDropdown />

                <Button variant="outline-primary" size="sm" title="Clear all filters" onClick={clearAllFilters}>
                  Reset Filters
                </Button>

                <BiblioPreferenceControls
                  baseUrl={process.env.REACT_APP_RESTAPI}
                  accessToken={accessToken}
                  email={email}
                  accessLevel={accessLevel}
                  gridRef={gridRef}
                  getGridApi={getGridApi}
                  isGridReady={isGridReady}
                  getInitialItems={getInitialItems}
                  updateColDefsWithItems={updateColDefsWithItems}
                  setItems={setItems}
                  setColDefs={setColDefs}
                  showNotification={showNotification}
                  title="Manage Table Preferences"
                  componentName="tet_table"
                />
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
            <Notification
              show={notification.show}
              message={notification.message}
              variant={notification.variant}
              onClose={hideNotification}
            />
          </Col>
        </Row>

        <Row>
          <Col>
            <div className="ag-theme-quartz" style={{ height: 500 }}>
              <AgGridReact
                ref={gridRef}
                reactiveCustomComponents
                rowData={topicEntityTags}
                columnDefs={colDefs}
                gridOptions={gridOptions}
                pagination
                paginationPageSize={25}
                paginationPageSizeSelector={paginationPageSizeSelector}
                getRowId={getRowId}
                onGridReady={onGridReady}
                onColumnResized={onColumnResized}
                isExternalFilterPresent={isExternalFilterPresent}
                doesExternalFilterPass={doesExternalFilterPass}
              />
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default TopicEntityTable;
