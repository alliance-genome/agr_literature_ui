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
import { AgGridReact } from 'ag-grid-react';
import { handleGridCopy } from '../../../utils/gridCopyHandler';

import {
  setAllSpecies,
  setAllEntities,
  setAllTopics,
  setAllEntityTypes,
  fetchTaxonData,
  fetchTopicEntityTags
} from '../../../actions/biblioActions';
import TopicEntityTagActions from '../../AgGrid/TopicEntityTagActions.jsx';
import ValidationByCurator from '../../AgGrid/ValidationByCurator.jsx';
import SpeciesFilter from '../../AgGrid/SpeciesFilter.jsx';
import MultiFilter from '../../AgGrid/MultiFilter.jsx';
import EntityTypeFilter from '../../AgGrid/EntityTypeFilter.jsx';
import TopicFilter from '../../AgGrid/TopicFilter.jsx';
import EntityFilter from '../../AgGrid/EntityFilter.jsx';
import { timestampToDateFormatter } from '../BiblioWorkflow';
import useTetInfiniteData from './useTetInfiniteData';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import BiblioPreferenceControls from '../../settings/BiblioPreferenceControls';

/* --------------------------------------------------
   Download helpers (exported)
-------------------------------------------------- */
// `fetchRows` (optional): async ({filtered}) => rows. Supplied by tables on
// the infinite row model (SCRUM-6618), where the grid only holds the loaded
// blocks — the export pages the full (optionally filtered) set from the
// server instead, with no row cap. Without it, rows come from the grid's
// client-side model as before.
export const handleDownload = async (option, gridRef, colDefs, rowData, fileNameFront, fetchRows) => {
  const api = gridRef.current?.api;
  if (!api) {
    console.error('Grid API not available for download');
    return;
  }

  let dataToDownload = [];
  let headers = [];
  let fields = [];

  const columnState = api.getColumnState();
  const hiddenColumns = new Set(columnState.filter((cs) => cs.hide).map((cs) => cs.colId));

  (colDefs || [])
    .filter((col) => col.field !== 'Actions')
    .filter((col) => option === 'allColumns' || !hiddenColumns.has(col.field))
    .forEach((col) => {
      headers.push(col.headerName);
      fields.push(col.field);
    });

  const entityIndex = fields.indexOf('entity_name');
  if (entityIndex !== -1) {
    headers.splice(entityIndex + 1, 0, 'Entity CURIE');
    fields.splice(entityIndex + 1, 0, 'entity');
  }

  if (fetchRows) {
    try {
      dataToDownload = await fetchRows({ filtered: option !== 'withoutFilters' });
    } catch (error) {
      console.error('Failed to fetch rows for download:', error);
      return;
    }
  } else if (option === 'allColumns' || option === 'multiHeader') {
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

  const colDefByField = new Map((colDefs || []).map((col) => [col.field, col]));

  const tsvHeaders = headers.join('\t');
  const tsvRows = dataToDownload.map((row) =>
    fields.map((field) => {
      const colDef = colDefByField.get(field);
      const rawValue = getNestedValue(row, field);
      let value = rawValue;
      if (colDef?.valueGetter) {
        value = colDef.valueGetter({ data: row });
      } else if (colDef?.valueFormatter) {
        value = colDef.valueFormatter({ value: rawValue });
      }
      return `"${value ?? ''}"`;
    }).join('\t')
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

export const DownloadDropdownOptionsButton = ({ gridRef, colDefs, rowData, fileNameFront, fetchRows }) => (
  <Dropdown className="ms-auto">
    <Dropdown.Toggle variant="primary" id="dropdown-download-options">
      Download Options
    </Dropdown.Toggle>

    <Dropdown.Menu>
      <Dropdown.Item
        onClick={() => handleDownload('displayedData', gridRef, colDefs, rowData, fileNameFront, fetchRows)}
      >
        Download Displayed Data
      </Dropdown.Item>
      <Dropdown.Item
        onClick={() => handleDownload('allColumns', gridRef, colDefs, rowData, fileNameFront, fetchRows)}
      >
        Download All Columns
      </Dropdown.Item>
      <Dropdown.Item
        onClick={() => handleDownload('withoutFilters', gridRef, colDefs, rowData, fileNameFront, fetchRows)}
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

const hasTextSelection = () => {
  const selection = window.getSelection();
  return selection && selection.toString().length > 0;
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

  // Topic entity tags are loaded into the redux store (shared with the entity
  // counts summary and any other reference-based page). Consume them here
  // rather than fetching a second copy.
  const rawTopicEntityTags = useSelector((state) => state.biblio.topicEntityTags);
  const isLoadingData = useSelector((state) => state.biblio.topicEntityTagsLoading);

  // Apply the table's display transforms without mutating the redux state.
  const topicEntityTags = useMemo(
    () =>
      (rawTopicEntityTags || []).map((orig) => {
        const row = { ...orig };
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
        row.no_data = row.negated === true ? 'no data' : '';
        row.has_data = row.negated === true ? 'N' : 'Y';
        return row;
      }),
    [rawTopicEntityTags]
  );

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
    dispatch(fetchTaxonData());
  }, [dispatch]);

  // Never hand out a destroyed grid api: stale refs after an unmount/remount
  // otherwise produce "grid has been destroyed" warnings on every call.
  const getGridApi = useCallback(() => {
    const api = apiRef.current || gridRef.current?.api || null;
    return api && !api.isDestroyed?.() ? api : null;
  }, []);

  // Server-side (infinite) row model data layer (SCRUM-6618): the table no
  // longer loads the full tag set — each scrolled/paged block is fetched with
  // the current sort + filters applied server-side, so large-scale papers
  // (50k+ tags) are fully navigable without a 50k-row payload.
  const {
    makeDatasource,
    fetchAllRows,
    fetchDistinctValues,
    fetchCurieToName,
    totalCount,
    refresh: refreshTetData,
    refreshVersion,
  } = useTetInfiniteData(referenceCurie);

  // Ensure the store has the tags for this reference — the table itself reads
  // blocks from the datasource; this list now feeds only the setAll* filter
  // lists, QuickTopicAddition, and the older-backend fallbacks in the Actions
  // cell and EntityCountsByMod (SCRUM-6620). Removing it once those are
  // migrated is SCRUM-6620's last step. After an add/edit completes
  // (biblioUpdatingEntityAdd back to 0), also purge the grid's block cache.
  const prevUpdatingRef = useRef(biblioUpdatingEntityAdd);
  useEffect(() => {
    if (referenceCurie && biblioUpdatingEntityAdd === 0) {
      const justFinishedUpdate = prevUpdatingRef.current > 0;
      dispatch(fetchTopicEntityTags(referenceCurie, justFinishedUpdate));
      if (justFinishedUpdate) refreshTetData();
    }
    prevUpdatingRef.current = biblioUpdatingEntityAdd;
  }, [dispatch, referenceCurie, biblioUpdatingEntityAdd, refreshTetData]);

  // Keep the shared unique-value lists in sync with the loaded tags: other
  // pages (QuickTopicAddition, the Topic grid) read these redux keys, so
  // their shape stays name-based and untouched by the table's own filters.
  useEffect(() => {
    const tags = rawTopicEntityTags || [];
    dispatch(setAllSpecies([...new Set(tags.map((o) => o.species))]));
    dispatch(setAllEntityTypes([...new Set(tags.map((o) => o.entity_type_name))]));
    dispatch(setAllTopics([...new Set(tags.map((o) => o.topic_name))]));
    dispatch(setAllEntities([...new Set(tags.map((o) => o.entity_name))]));
  }, [dispatch, rawTopicEntityTags]);

  // Dropdown options for the four curie-column filters: distinct raw values
  // via column_only + one curie->name map for labels. Curie-valued options are
  // what the server-side column_filters need (names are not in the DB).
  const [filterOptions, setFilterOptions] = useState({});
  useEffect(() => {
    if (!referenceCurie) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const [curieToName, ...columnValues] = await Promise.all([
          fetchCurieToName(),
          ...['topic', 'entity_type', 'species', 'entity'].map(fetchDistinctValues),
        ]);
        if (cancelled) return;
        const toOptions = (values) =>
          values
            .map((value) => ({ value, label: curieToName[value] || value }))
            .sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));
        setFilterOptions({
          topic: toOptions(columnValues[0]),
          entity_type: toOptions(columnValues[1]),
          species: toOptions(columnValues[2]),
          entity: toOptions(columnValues[3]),
        });
      } catch (error) {
        console.error('Failed to load TET filter options:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [referenceCurie, refreshVersion, fetchCurieToName, fetchDistinctValues]);

  const handleCurieClick = (curie) => {
    if (hasTextSelection()) return;
    if (curie && curie !== 'null:null') {
      setSelectedCurie(curie);
      setShowCurieModal(true);
    }
  };

  const handleNoteClick = (note) => {
    if (hasTextSelection()) return;
    setFullNote(note || '');
    setShowNoteModal(true);
  };

  const handleSourceDescClick = (desc) => {
    if (hasTextSelection()) return;
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
      { headerName: 'No Data', field: 'no_data', id: 6, checked: true },
      { headerName: 'Data', field: 'has_data', id: 32, checked: true },
      { headerName: 'Data Novelty', field: 'data_novelty', id: 7, checked: false },
      { headerName: 'Data Context', field: 'data_context_name', id: 33, checked: false },
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
      { headerName: 'Source Secondary Data Provider', field: 'tag_source.secondary_data_provider_abbreviation', id: 19, checked: true },
      { headerName: 'Source Data Provider', field: 'tag_source.data_provider', id: 20, checked: false },
      { headerName: 'Source Evidence Assertion', field: 'tag_source.source_evidence_assertion_name', id: 21, checked: false },
      { headerName: 'Source Method', field: 'tag_source.source_method', id: 22, checked: false },
      { headerName: 'Source Validation Type', field: 'tag_source.validation_type', id: 23, checked: false },
      { headerName: 'Source Description', field: 'tag_source.description', id: 24, checked: false },
      { headerName: 'Source Created By', field: 'tag_source.created_by', id: 25, checked: false },
      { headerName: 'Source Date Updated', field: 'tag_source.date_updated', id: 26, checked: false },
      { headerName: 'Source Date Created', field: 'tag_source.date_created', id: 27, checked: false },
      { headerName: 'Model ID', field: 'ml_model_id', id: 28, checked: false },
      { headerName: 'Model Version', field: 'ml_model_version', id: 29, checked: false },
      { headerName: 'Topic Entity Tag Id', field: 'topic_entity_tag_id', id: 30, checked: false },
      { headerName: 'Topic Entity Tag Source Id', field: 'tag_source.tag_source_id', id: 31, checked: false }
    ],
    []
  );

  const itemsInitSGD = useMemo(
    () => [
      { headerName: 'Topic', field: 'topic_name', id: 1, checked: true },
      { headerName: 'Entity Type', field: 'entity_type_name', id: 2, checked: true },
      { headerName: 'Species', field: 'species_name', id: 3, checked: true },
      { headerName: 'Entity', field: 'entity_name', id: 4, checked: true },
      { headerName: 'No Data', field: 'no_data', id: 6, checked: false },
      { headerName: 'Data', field: 'has_data', id: 32, checked: false },
      { headerName: 'Data Novelty', field: 'data_novelty', id: 7, checked: false },
      { headerName: 'Data Context', field: 'data_context_name', id: 33, checked: false },
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
      { headerName: 'Source Secondary Data Provider', field: 'tag_source.secondary_data_provider_abbreviation', id: 19, checked: false },
      { headerName: 'Source Data Provider', field: 'tag_source.data_provider', id: 20, checked: false },
      { headerName: 'Source Evidence Assertion', field: 'tag_source.source_evidence_assertion_name', id: 21, checked: false },
      { headerName: 'Source Method', field: 'tag_source.source_method', id: 22, checked: false },
      { headerName: 'Source Validation Type', field: 'tag_source.validation_type', id: 23, checked: false },
      { headerName: 'Source Description', field: 'tag_source.description', id: 24, checked: false },
      { headerName: 'Source Created By', field: 'tag_source.created_by', id: 25, checked: false },
      { headerName: 'Source Date Updated', field: 'tag_source.date_updated', id: 26, checked: false },
      { headerName: 'Source Date Created', field: 'tag_source.date_created', id: 27, checked: false },
      { headerName: 'Model ID', field: 'ml_model_id', id: 28, checked: false },
      { headerName: 'Model Version', field: 'ml_model_version', id: 29, checked: false },
      { headerName: 'Topic Entity Tag Id', field: 'topic_entity_tag_id', id: 30, checked: false },
      { headerName: 'Topic Entity Tag Source Id', field: 'tag_source.tag_source_id', id: 31, checked: false }
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
        filterParams: { items: filterOptions.topic || [], serverMode: true },
        onCellClicked: (p) => p.data && handleCurieClick(`${p.value}:${p.data.topic}`)
      },
      {
        headerName: 'Entity Type',
        field: 'entity_type_name',
        comparator: caseInsensitiveComparator,
        filter: EntityTypeFilter,
        filterParams: { items: filterOptions.entity_type || [], serverMode: true },
        onCellClicked: (p) => p.data && handleCurieClick(`${p.value}:${p.data.entity_type}`)
      },
      {
        headerName: 'Species',
        field: 'species_name',
        comparator: caseInsensitiveComparator,
        filter: SpeciesFilter,
        filterParams: { items: filterOptions.species || [], serverMode: true },
        onCellClicked: (p) => p.data && handleCurieClick(`${p.value}:${p.data.species}`)
      },
      {
        headerName: 'Entity',
        field: 'entity_name',
        comparator: caseInsensitiveComparator,
        filter: EntityFilter,
        filterParams: { items: filterOptions.entity || [], serverMode: true },
        onCellClicked: (p) => p.data && handleCurieClick(`${p.value}:${p.data.entity}`)
      },
      // no_data / has_data are computed in toTableRow, not DB columns: a
      // server-side sort or filter on them would 404/422 and blank the grid
      // (review finding). negated is the underlying DB field if filtering is
      // ever wanted here.
      {
        headerName: 'No Data',
        field: 'no_data',
        sortable: false,
        filter: false,
        cellDataType: 'text'
      },
      {
        headerName: 'Data',
        field: 'has_data',
        sortable: false,
        filter: false,
        cellDataType: 'text'
      },
      // Data novelty displays mapped names but the DB holds ATP curies, so a
      // text filter typed against the display would match nothing: use the
      // set filter with the known curie->name options instead.
      {
        headerName: 'Data Novelty',
        field: 'data_novelty',
        filter: MultiFilter,
        filterParams: {
          items: Object.entries(dataNoveltyMap).map(([value, label]) => ({ value, label })),
          label: 'data_novelty',
          valueField: 'data_novelty',
          serverMode: true,
        },
        valueGetter: (p) => (p.data ? (dataNoveltyMap[p.data.data_novelty] || p.data.data_novelty) : ''),
        onCellClicked: (p) => p.data && handleCurieClick(`${p.value}:${p.data.data_novelty}`)
      },
      { headerName: 'Data Context', field: 'data_context_name', filter: true, comparator: caseInsensitiveComparator, onCellClicked: (p) => p.data && handleCurieClick(`${p.value}:${p.data.data_context}`) },
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
      // The cell shows agree/disagree/no entry but the DB holds
      // validated_right/... — a text filter on the display terms would match
      // nothing server-side (review finding).
      { headerName: 'Author Response', field: 'validation_by_author', filter: false },
      { headerName: 'Validation By Professional Biocurator', field: 'validation_by_professional_biocurator', filter: true, cellRenderer: ValidationByCurator },
      { headerName: 'Display Tag', field: 'display_tag_name', filter: true, comparator: caseInsensitiveComparator },
      { headerName: 'Source Secondary Data Provider', field: 'tag_source.secondary_data_provider_abbreviation', filter: true },
      { headerName: 'Source Data Provider', field: 'tag_source.data_provider', filter: true },
      {
        headerName: 'Source Evidence Assertion',
        field: 'tag_source.source_evidence_assertion_name',
        filter: true,
        comparator: caseInsensitiveComparator,
        onCellClicked: (p) => p.data && handleCurieClick(`${p.value}:${p.data.tag_source.source_evidence_assertion}`)
      },
      { headerName: 'Source Method', field: 'tag_source.source_method', filter: true },
      { headerName: 'Source Validation Type', field: 'tag_source.validation_type', filter: true },
      { headerName: 'Source Description', field: 'tag_source.description', filter: true, onCellClicked: (p) => handleSourceDescClick(p.value) },
      { headerName: 'Source Created By', field: 'tag_source.created_by', filter: true },
      { headerName: 'Source Date Updated', field: 'tag_source.date_updated', filter: true, valueFormatter: timestampToDateFormatter },
      { headerName: 'Source Date Created', field: 'tag_source.date_created', filter: true, valueFormatter: timestampToDateFormatter },
      { headerName: 'Model ID', field: 'ml_model_id', filter: true },
      // ml_model_version comes off the ml_model relationship, not a TET/source
      // column — server-side sort/filter on it would fail (review finding).
      { headerName: 'Model Version', field: 'ml_model_version', sortable: false, filter: false },
      { headerName: 'Topic Entity Tag Id', field: 'topic_entity_tag_id', filter: true },
      { headerName: 'Topic Entity Tag Source Id', field: 'tag_source.tag_source_id', filter: true }
    ],
    [caseInsensitiveComparator, dataNoveltyMap, filterOptions]
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
  // External filtering (EntityCountsByMod's "show these tags" selection).
  // Client-side external filters don't run under the infinite row model, so
  // the tag-id selection becomes a server-side column filter instead.
  // ---------------------------
  const externalColumnFilters = useMemo(() => {
    const vt = Array.isArray(filteredTags?.validating_tags) ? filteredTags.validating_tags : [];
    const ids = filteredTags?.validated_tag != null ? [...vt, filteredTags.validated_tag] : vt;
    return ids.length > 0 ? { topic_entity_tag_id: { values: ids } } : null;
  }, [filteredTags]);

  // (Re)install the datasource whenever anything that changes the server-side
  // view does: the reference, a post-edit refresh, or the external selection.
  // Setting a new datasource purges the block cache and refetches from row 0.
  useEffect(() => {
    if (!isGridReady || !referenceCurie) return;
    const api = getGridApi();
    api?.setGridOption?.('datasource', makeDatasource(externalColumnFilters || undefined));
  }, [isGridReady, referenceCurie, refreshVersion, externalColumnFilters, makeDatasource, getGridApi]);

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

  const fileNameFront = `${referenceCurie}_tet_data`;

  // TSV export under the infinite row model: the grid only holds loaded
  // blocks, so exports page the full set from the server — honoring the
  // grid's current sort + filters when `filtered`, and nothing otherwise.
  const fetchExportRows = useCallback(async ({ filtered }) => {
    const api = getGridApi();
    const sortModel = (api?.getColumnState?.() || [])
      .filter((s) => s.sort)
      .map((s) => ({ colId: s.colId, sort: s.sort }));
    return fetchAllRows({
      sortModel: filtered ? sortModel : undefined,
      filterModel: filtered ? api?.getFilterModel?.() : undefined,
      extraColumnFilters: filtered ? (externalColumnFilters || undefined) : undefined,
      applyFilters: filtered,
    });
  }, [getGridApi, fetchAllRows, externalColumnFilters]);

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
                fetchRows={fetchExportRows}
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

        {/* The 8,000-row truncation banner is gone: the infinite row model pages
            through the full tag set server-side, so every tag is reachable. */}
        {totalCount != null && (
          <Row>
            <Col>
              <div className="text-muted" style={{ paddingBottom: '4px' }}>
                {totalCount.toLocaleString()} matching topic and entity tags
              </div>
            </Col>
          </Row>
        )}

        <Row>
          <Col>
            <div className="ag-theme-quartz" onCopy={handleGridCopy} style={{ height: 500 }}>
              <AgGridReact
                ref={gridRef}
                reactiveCustomComponents
                rowModelType="infinite"
                cacheBlockSize={500}
                maxBlocksInCache={10}
                columnDefs={colDefs}
                enableCellTextSelection={true}
                ensureDomOrder={true}
                suppressColumnVirtualisation={true}
                gridOptions={gridOptions}
                pagination
                paginationPageSize={25}
                paginationPageSizeSelector={paginationPageSizeSelector}
                onGridReady={onGridReady}
                onColumnResized={onColumnResized}
              />
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default TopicEntityTable;
