// src/components/reports/ModelsTable.js
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

import { handleGridCopy } from '../../utils/gridCopyHandler';
import { fetchMLModelsIfNeeded } from '../../actions/mlModelsActions';
import {
  DownloadDropdownOptionsButton
} from '../biblio/topic_entity_tag/TopicEntityTable';
import BiblioPreferenceControls from '../settings/BiblioPreferenceControls';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

const CheckboxMenu = React.forwardRef(
  (
    { children, style, className, 'aria-labelledby': labeledBy, onSelectAll, onSelectNone, onDefault },
    ref
  ) => (
    <div ref={ref} style={style} className={`${className} CheckboxMenu`} aria-labelledby={labeledBy}>
      <div className="d-flex flex-column" style={{ maxHeight: 'calc(100vh)', overflow: 'none' }}>
        <div className="dropdown-item border-top pt-2 pb-0">
          <ButtonGroup size="sm">
            <Button variant="link" onClick={onSelectAll}>Show All</Button>
            <Button variant="link" onClick={onSelectNone}>Hide All</Button>
            <Button variant="link" onClick={onDefault}>Restore Default</Button>
          </ButtonGroup>
        </div>
        <ul className="list-unstyled flex-shrink mb-0" style={{ overflow: 'auto' }}>{children}</ul>
      </div>
    </div>
  )
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

const LongTextModal = ({ title, body, show, onHide }) => {
  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{body}</Modal.Body>
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
        <button type="button" className="btn btn-link p-0 ms-3 text-decoration-underline" onClick={onClose}>Dismiss</button>
      </div>
    </div>
  );
};

const hasTextSelection = () => {
  const selection = window.getSelection();
  return selection && selection.toString().length > 0;
};

const ITEMS_INIT = [
  { headerName: 'Task Type', field: 'task_type', id: 1, checked: true },
  { headerName: 'MOD', field: 'mod_abbreviation', id: 2, checked: true },
  { headerName: 'Topic', field: 'topic_name', id: 3, checked: true },
  { headerName: 'Version', field: 'version_num', id: 4, checked: true },
  { headerName: 'Model Type', field: 'model_type', id: 5, checked: true },
  { headerName: 'Precision', field: 'precision', id: 6, checked: true },
  { headerName: 'Recall', field: 'recall', id: 7, checked: true },
  { headerName: 'F1', field: 'f1_score', id: 8, checked: true },
  { headerName: 'In Production', field: 'production', id: 9, checked: true },
  { headerName: 'Negated', field: 'negated', id: 10, checked: true },
  { headerName: 'Data Novelty', field: 'data_novelty_name', id: 11, checked: true },
  { headerName: 'Dataset ID', field: 'dataset_id', id: 12, checked: true },
  { headerName: 'Species', field: 'species_name', id: 13, checked: true },
  { headerName: 'File Ext', field: 'file_extension', id: 14, checked: true },
  { headerName: 'File Classes', field: 'file_classes', id: 15, checked: true },
  { headerName: 'Description', field: 'description', id: 16, checked: true },
  { headerName: 'Parameters', field: 'parameters', id: 17, checked: true },
  { headerName: 'Embedding Profile', field: 'embedding_profile', id: 19, checked: true },
  { headerName: 'Embedding Version', field: 'embedding_version', id: 20, checked: true },
  { headerName: 'ID', field: 'ml_model_id', id: 18, checked: false }
];

const ModelsTable = ({ modSection }) => {
  const dispatch = useDispatch();

  const accessToken = useSelector((state) => state.isLogged.accessToken);
  const cognitoMod = useSelector((state) => state.isLogged.cognitoMod);
  const testerMod = useSelector((state) => state.isLogged.testerMod);
  const email = useSelector((state) => state.isLogged.email);
  const accessLevel = testerMod !== 'No' ? testerMod : cognitoMod;

  const mlModelsData = useSelector((state) => state.mlModels.data);
  const isLoadingData = useSelector((state) => state.mlModels.loading);

  useEffect(() => {
    dispatch(fetchMLModelsIfNeeded());
  }, [dispatch]);

  const rows = useMemo(
    () => {
      const all = mlModelsData || [];
      return modSection === 'All' ? all : all.filter((r) => r.mod_abbreviation === modSection);
    },
    [mlModelsData, modSection]
  );

  const [fullDescription, setFullDescription] = useState('');
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);

  const [fullParameters, setFullParameters] = useState('');
  const [showParametersModal, setShowParametersModal] = useState(false);

  const [selectedCurie, setSelectedCurie] = useState(null);
  const [showCurieModal, setShowCurieModal] = useState(false);

  const [items, setItems] = useState(() => ITEMS_INIT.map((i) => ({ ...i })));
  const [isGridReady, setIsGridReady] = useState(false);

  const gridRef = useRef(null);
  const apiRef = useRef(null);

  const [notification, setNotification] = useState({ show: false, message: '', variant: 'success' });
  const showNotification = (message, variant = 'success') =>
    setNotification({ show: true, message, variant });
  const hideNotification = () => setNotification((s) => ({ ...s, show: false }));

  useEffect(() => {
    if (!notification.show) return undefined;
    const timer = setTimeout(() => setNotification((s) => ({ ...s, show: false })), 5000);
    return () => clearTimeout(timer);
  }, [notification.show]);

  const getGridApi = useCallback(() => apiRef.current || gridRef.current?.api || null, []);

  const handleCurieClick = (curie) => {
    if (hasTextSelection()) return;
    if (!curie || curie === 'null:null') return;
    setSelectedCurie(curie);
    setShowCurieModal(true);
  };

  const handleDescriptionClick = (value) => {
    if (hasTextSelection()) return;
    if (value == null || value === '') return;
    setFullDescription(value);
    setShowDescriptionModal(true);
  };

  const handleParametersClick = (value) => {
    if (hasTextSelection()) return;
    if (value == null || value === '') return;
    setFullParameters(value);
    setShowParametersModal(true);
  };

  const caseInsensitiveComparator = useCallback((valueA, valueB) => {
    if (valueA == null && valueB == null) return 0;
    if (valueA == null) return -1;
    if (valueB == null) return 1;
    return String(valueA).toLowerCase().localeCompare(String(valueB).toLowerCase());
  }, []);

  const numericFormatter = useCallback((p) => {
    const v = p.value;
    if (v == null || v === '') return '';
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(3) : v;
  }, []);

  const getInitialItems = useCallback(() => ITEMS_INIT.map((i) => ({ ...i })), []);

  const cols = useMemo(
    () => [
      { headerName: 'Task Type', field: 'task_type', filter: true, comparator: caseInsensitiveComparator },
      { headerName: 'MOD', field: 'mod_abbreviation', filter: true, comparator: caseInsensitiveComparator },
      {
        headerName: 'Topic',
        field: 'topic_name',
        filter: true,
        comparator: caseInsensitiveComparator,
        onCellClicked: (p) => handleCurieClick(`${p.value}:${p.data?.topic}`)
      },
      { headerName: 'Version', field: 'version_num', filter: 'agNumberColumnFilter' },
      { headerName: 'Model Type', field: 'model_type', filter: true, comparator: caseInsensitiveComparator },
      { headerName: 'Precision', field: 'precision', filter: 'agNumberColumnFilter', valueFormatter: numericFormatter },
      { headerName: 'Recall', field: 'recall', filter: 'agNumberColumnFilter', valueFormatter: numericFormatter },
      { headerName: 'F1', field: 'f1_score', filter: 'agNumberColumnFilter', valueFormatter: numericFormatter },
      { headerName: 'In Production', field: 'production', filter: true },
      { headerName: 'Negated', field: 'negated', filter: true },
      {
        headerName: 'Data Novelty',
        field: 'data_novelty_name',
        filter: true,
        comparator: caseInsensitiveComparator,
        onCellClicked: (p) => handleCurieClick(`${p.value}:${p.data?.data_novelty}`)
      },
      { headerName: 'Dataset ID', field: 'dataset_id', filter: 'agNumberColumnFilter' },
      {
        headerName: 'Species',
        field: 'species_name',
        filter: true,
        comparator: caseInsensitiveComparator,
        onCellClicked: (p) => handleCurieClick(`${p.value}:${p.data?.species}`)
      },
      { headerName: 'File Ext', field: 'file_extension', filter: true },
      {
        headerName: 'File Classes',
        field: 'file_classes',
        filter: true,
        valueGetter: (p) => Array.isArray(p.data?.file_classes) ? p.data.file_classes.join(', ') : (p.data?.file_classes || '')
      },
      {
        headerName: 'Description',
        field: 'description',
        filter: true,
        comparator: caseInsensitiveComparator,
        cellStyle: { whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' },
        tooltipField: 'description',
        onCellClicked: (p) => handleDescriptionClick(p.value)
      },
      {
        headerName: 'Parameters',
        field: 'parameters',
        filter: true,
        comparator: caseInsensitiveComparator,
        cellStyle: { whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' },
        tooltipField: 'parameters',
        onCellClicked: (p) => handleParametersClick(p.value)
      },
      { headerName: 'Embedding Profile', field: 'embedding_profile', filter: true, comparator: caseInsensitiveComparator, tooltipField: 'embedding_profile' },
      { headerName: 'Embedding Version', field: 'embedding_version', filter: 'agNumberColumnFilter' },
      { headerName: 'ID', field: 'ml_model_id', filter: 'agNumberColumnFilter' }
    ],
    [caseInsensitiveComparator, numericFormatter]
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

  const [colDefs, setColDefs] = useState(() => updateColDefsWithItems(ITEMS_INIT));

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
        <Dropdown.Toggle variant="primary" id="dropdown-models-columns">
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
          if ((s.colId === 'description' || s.colId === 'parameters') && s.width > 400) {
            api.applyColumnState({ state: [{ colId: s.colId, width: 400 }] });
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
    () => ({ autoSizeStrategy: { type: 'fitCellContents', skipHeader: false } }),
    []
  );

  const getRowId = useMemo(
    () => (params) => String(params.data.ml_model_id),
    []
  );
  const fileNameFront = `ml_models_${modSection}`;

  return (
    <div>
      {selectedCurie && (
        <LongTextModal
          title="CURIE Information"
          body={selectedCurie}
          show={showCurieModal}
          onHide={() => setShowCurieModal(false)}
        />
      )}

      {showDescriptionModal && (
        <LongTextModal
          title="Full Description"
          body={fullDescription}
          show={showDescriptionModal}
          onHide={() => setShowDescriptionModal(false)}
        />
      )}

      {showParametersModal && (
        <LongTextModal
          title="Full Parameters"
          body={fullParameters}
          show={showParametersModal}
          onHide={() => setShowParametersModal(false)}
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
            <h3 style={{ marginBottom: '30px' }}>Models</h3>
          </Col>
        </Row>

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
                  title="Manage Models Table Preferences"
                  componentName="models_table"
                />
              </div>

              <DownloadDropdownOptionsButton
                gridRef={gridRef}
                colDefs={colDefs}
                rowData={rows}
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
            <div className="ag-theme-quartz" onCopy={handleGridCopy} style={{ height: 600 }}>
              <AgGridReact
                ref={gridRef}
                reactiveCustomComponents
                rowData={rows}
                columnDefs={colDefs}
                enableCellTextSelection={true}
                ensureDomOrder={true}
                suppressColumnVirtualisation={true}
                gridOptions={gridOptions}
                pagination
                paginationPageSize={25}
                paginationPageSizeSelector={paginationPageSizeSelector}
                getRowId={getRowId}
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

export default ModelsTable;
