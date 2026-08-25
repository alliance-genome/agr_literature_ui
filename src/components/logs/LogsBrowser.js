import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { Alert, Button, Spinner } from 'react-bootstrap';
import Container from 'react-bootstrap/Container';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import { handleGridCopy } from '../../utils/gridCopyHandler';
import { useReportFiles } from '../../hooks/useReportFiles';
import {
  deriveFamilies, filterRows, joinUrl, NO_MOD, ROOT_DIRECTORY_LABEL
} from '../../utils/reportFileNames';
import LogFilterBar from './LogFilterBar';
import LogViewerModal from './LogViewerModal';
import { filtersFromQuery, queryFromFilters } from './logsQuery';

const REPORTS_ROOT_URL = joinUrl(process.env.REACT_APP_ABC_FILE_BASE_URL, 'reports') + '/';

const DEFAULT_FILTERS = {
  scope: 'all',
  mode: 'latest',
  includeShared: true,
  hideStale: true,
  directory: '',
  quickFilter: '',
  dateRange: '',
  family: '',
  mod: null
};

const humanSize = (bytes) => {
  if (bytes === null || bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
};

// Rendered two ways: standalone at /logs, where the curator picks the MOD scope
// and the filters are mirrored into the URL; and embedded as a per-MOD tab on the
// Reports page, where `lockedMod` fixes the MOD ('All' for every MOD), the scope
// controls are hidden as redundant, and the URL is left alone so the tab does not
// fight the page it sits on.
const LogsBrowser = ({ lockedMod }) => {
  const cognitoMod = useSelector((state) => state.isLogged.cognitoMod);
  const testerMod = useSelector((state) => state.isLogged.testerMod);
  const accountMod = (testerMod !== NO_MOD) ? testerMod : cognitoMod;
  const ownMod = lockedMod
    ? (lockedMod === 'All' ? null : lockedMod)
    : ((accountMod && accountMod !== NO_MOD) ? accountMod : null);
  const isLocked = Boolean(lockedMod);

  const { rows, loading, error, notDeployed, refresh } = useReportFiles();

  const history = useHistory();
  const location = useLocation();

  const defaults = useMemo(() => ({
    ...DEFAULT_FILTERS,
    scope: ownMod ? 'mod' : 'all',
    mod: ownMod
  }), [ownMod]);

  // Seeded from the query string so the Reports page can deep-link straight to
  // one report's history.
  const [filters, setFilters] = useState(() =>
    (isLocked ? defaults : filtersFromQuery(location.search, defaults)));

  // The effective MOD arrives after the first render (mods and the tester override
  // are both async), so the scope is re-derived when it actually changes — but not
  // on mount, which would trample a scope that came in on the query string.
  const lastOwnMod = useRef(ownMod);
  useEffect(() => {
    if (lastOwnMod.current === ownMod) return;
    lastOwnMod.current = ownMod;
    setFilters((current) => ({ ...current, scope: ownMod ? 'mod' : 'all', mod: ownMod }));
  }, [ownMod]);

  // Mirror the filters back into the URL so the view is linkable and survives a
  // reload. replace, not push, so filtering does not fill up the back button.
  const search = queryFromFilters(filters, defaults);
  useEffect(() => {
    if (isLocked) return;
    if (search !== location.search) {
      history.replace({ pathname: location.pathname, search });
    }
  }, [isLocked, search, location.search, location.pathname, history]);

  // Taken from the data rather than state.app.mods, so HUMAN and SARS-CoV-2 —
  // which appear in interaction logs but are not MODs — are selectable too, and
  // no MOD is offered that has no files.
  const modsInData = useMemo(
    () => [...new Set(rows.map((r) => r.mod).filter(Boolean))].sort(),
    [rows]
  );

  const directories = useMemo(() => {
    const seen = new Set(rows.map((r) => r.directory || ROOT_DIRECTORY_LABEL));
    return [...seen].sort();
  }, [rows]);

  const { visible, families, unclassifiedCount } = useMemo(() => {
    const matched = filterRows(rows, { ...filters, mod: filters.mod || ownMod });
    const grouped = deriveFamilies(matched);
    const shown = filters.mode === 'latest'
      ? [...grouped.values()].map((family) => family.latest)
      : matched;
    return {
      visible: shown,
      families: grouped,
      unclassifiedCount: shown.filter((r) => r.unclassified).length
    };
  }, [rows, filters, ownMod]);

  const onDrillDown = (family) =>
    setFilters((current) => ({ ...current, family, mode: 'all' }));

  const [viewFile, setViewFile] = useState(null);

  const Actions = ({ data }) => (
    <>
      <Button variant="link" size="sm" style={{ padding: 0 }}
              onClick={() => setViewFile(data)}>view</Button>
      {' · '}
      {/* A plain anchor, not an api fetch: the file server sends text/plain
          inline, so the browser streams even the 40MB logs and Ctrl-F works.
          No CORS involved, and it is the fallback when the preview fails. */}
      <a href={data.url} target="_blank" rel="noopener noreferrer">open raw</a>
    </>
  );

  const columnDefs = useMemo(() => [
    { headerName: 'Report', field: 'reportFamily', pinned: 'left', minWidth: 260 },
    {
      headerName: 'MOD',
      valueGetter: (p) => p.data.modDetail || p.data.mod || 'Shared',
      width: 110
    },
    { headerName: 'Folder', valueGetter: (p) => p.data.directory || ROOT_DIRECTORY_LABEL, width: 160 },
    { headerName: 'Date', field: 'date', width: 130 },
    { headerName: 'Modified', field: 'modified', width: 190 },
    {
      headerName: 'Size',
      field: 'size',
      filter: 'agNumberColumnFilter',
      valueFormatter: (p) => humanSize(p.value),
      width: 110
    },
    {
      headerName: 'Versions',
      valueGetter: (p) => (families.get(p.data.seriesKey) || {}).versionCount || 1,
      width: 110,
      cellRenderer: (p) => (p.value > 1 ? (
        <Button variant="link" size="sm" style={{ padding: 0 }}
                onClick={() => onDrillDown(p.data.reportFamily)}>
          {`${p.value} versions`}
        </Button>
      ) : p.value)
    },
    { headerName: 'File', field: 'name', minWidth: 260 },
    {
      headerName: 'Actions',
      pinned: 'right',
      sortable: false,
      filter: false,
      width: 140,
      cellRenderer: Actions
    }
  ], [families]);

  const defaultColDef = useMemo(() => ({ filter: true, sortable: true, resizable: true }), []);

  if (loading) {
    return (
      <Container fluid>
        <div style={{ textAlign: 'center', padding: '3em' }}>
          <Spinner animation="border" role="status" />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid>
        {!isLocked && <h3 style={{ marginBottom: '1em' }}>Report Logs</h3>}
        {notDeployed ? (
          <Alert variant="warning">
            The report listing service is not available in this environment yet. You can
            still browse the{' '}
            <a href={REPORTS_ROOT_URL} target="_blank" rel="noopener noreferrer">
              raw report directory
            </a>.
          </Alert>
        ) : (
          <Alert variant="danger">
            Failed to load the report file listing.{' '}
            <Button variant="link" onClick={refresh}>Retry</Button>
          </Alert>
        )}
      </Container>
    );
  }

  return (
    <Container fluid>
      {!isLocked && <h3 style={{ marginBottom: '1em' }}>Report Logs</h3>}

      {!isLocked && !ownMod && (
        <div className="text-muted" style={{ textAlign: 'left', paddingBottom: '0.5em' }}>
          Your account has no MOD assigned, so all MODs are shown.
        </div>
      )}

      <LogFilterBar
        showScopeControls={!isLocked}
        ownMod={ownMod}
        modsInData={modsInData}
        directories={directories}
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(defaults)}
        onRefresh={refresh}
      />

      {filters.family && (
        <div style={{ textAlign: 'left', paddingBottom: '0.5em' }}>
          {`Showing only ${filters.family} `}
          <Button variant="link" size="sm" style={{ padding: 0 }}
                  onClick={() => setFilters({ ...filters, family: '' })}>
            (clear)
          </Button>
        </div>
      )}

      <div className="text-muted" style={{ textAlign: 'left', paddingBottom: '0.5em' }}>
        {`Showing ${visible.length} of ${rows.length} files`}
        {unclassifiedCount > 0 && ` · ${unclassifiedCount} could not be classified`}
      </div>

      {visible.length === 0 ? (
        <div className="text-muted" style={{ padding: '2em', textAlign: 'left' }}>
          No report files match these filters.
        </div>
      ) : (
        <div className="ag-theme-quartz" onCopy={handleGridCopy} style={{ width: '100%', height: '70vh' }}>
          <AgGridReact
            rowData={visible}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            quickFilterText={filters.quickFilter}
            getRowId={(params) => params.data.path}
            enableCellTextSelection={true}
            ensureDomOrder={true}
            pagination={true}
            paginationPageSize={25}
          />
        </div>
      )}

      <LogViewerModal
        show={Boolean(viewFile)}
        file={viewFile}
        onHide={() => setViewFile(null)}
      />
    </Container>
  );
};

export default LogsBrowser;
