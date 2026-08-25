import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { api } from '../../../api';
import Logs from '../../Logs';
import { parseReportFile } from '../../../utils/reportFileNames';

const mockState = {
  app: { mods: ['FB', 'MGI', 'RGD', 'SGD', 'WB', 'XB', 'ZFIN'] },
  isLogged: { cognitoMod: 'ZFIN', testerMod: 'No' }
};

jest.mock('react-redux', () => ({ useSelector: (fn) => fn(mockState) }));
// The date widget needs canvas, which jsdom lacks, and it is not the unit here —
// its logic lives in utils/dateRange.js, which is tested directly.
jest.mock('../DateRangeQuickPicker', () => () => null);

// The viewer fetches on open; keep the page test off the network.
jest.mock('../../../api', () => ({ api: { get: jest.fn() } }));

// AG Grid is heavy in jsdom and row survival is covered by the pure filterRows
// tests, so the grid is stubbed and the assertions target the toolbar, the count
// line, and the rows actually handed to the grid.
const mockGrid = { rowData: [] };
jest.mock('ag-grid-react', () => ({
  AgGridReact: (props) => {
    mockGrid.rowData = props.rowData;
    mockGrid.columnDefs = props.columnDefs;
    // Render the cell renderers so the interactive cells (version drill-down,
    // open-raw link) are exercised; the rest of the grid is not the unit here.
    return (
      <div data-testid="grid">
        {props.rowData.map((data) => (
          <div key={data.path}>
            {props.columnDefs.filter((col) => col.cellRenderer).map((col) => {
              const { cellRenderer: Cell } = col;
              const value = col.valueGetter ? col.valueGetter({ data }) : data[col.field];
              return <Cell key={col.headerName} data={data} value={value} />;
            })}
          </div>
        ))}
      </div>
    );
  }
}));

const mockHookResult = { rows: [], loading: false, error: null, notDeployed: false, refresh: jest.fn() };
jest.mock('../../../hooks/useReportFiles', () => ({
  useReportFiles: () => mockHookResult
}));

const row = (path, extra = {}) => parseReportFile({
  path,
  name: path.split('/').pop(),
  directory: path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '',
  size: 100,
  modified: '2026-08-20T00:00:00Z',
  ...extra
});

const ROWS = [
  row('gaf_zfin.log'),
  row('gaf_wb.log'),
  row('pdf2md.log'),
  row('QC/duplicate_orcid_report.log'),
  row('QC/duplicate_orcid_report_20260818.log'),
  row('QC/duplicate_orcid_report_20260718.log'),
  row('QC_old/duplicate_orcid_report_20250818.log')
];

// CRA enables resetMocks, so implementations have to be re-applied per test.
beforeEach(() => {
  api.get.mockImplementation(() => new Promise(() => {}));
});

const setup = (state = {}, hook = {}, route = '/logs') => {
  Object.assign(mockState.isLogged, { cognitoMod: 'ZFIN', testerMod: 'No' }, state);
  Object.assign(mockHookResult, {
    rows: ROWS, loading: false, error: null, notDeployed: false, refresh: jest.fn()
  }, hook);
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Logs />
    </MemoryRouter>
  );
};

describe('Logs page - MOD scoping', () => {
  test('lands scoped to the curator own MOD', () => {
    setup();
    expect(screen.getByRole('button', { name: /My MOD \(ZFIN\)/ })).toHaveClass('active');
    expect(mockGrid.rowData.some((r) => r.name === 'gaf_zfin.log')).toBe(true);
    expect(mockGrid.rowData.some((r) => r.name === 'gaf_wb.log')).toBe(false);
  });

  test('lets a tester MOD override the cognito MOD', () => {
    setup({ testerMod: 'WB' });
    expect(screen.getByRole('button', { name: /My MOD \(WB\)/ })).toBeInTheDocument();
    expect(mockGrid.rowData.some((r) => r.name === 'gaf_wb.log')).toBe(true);
  });

  test('falls back to all MODs when the account has none', () => {
    setup({ cognitoMod: 'No' });
    expect(screen.queryByRole('button', { name: /My MOD/ })).not.toBeInTheDocument();
    expect(screen.getByText(/no MOD assigned/i)).toBeInTheDocument();
    expect(mockGrid.rowData.length).toBeGreaterThan(0);
    expect(mockGrid.rowData.some((r) => r.name === 'gaf_wb.log')).toBe(true);
  });

  test('switching to All MODs widens the listing', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /All MODs/ }));
    expect(mockGrid.rowData.some((r) => r.name === 'gaf_wb.log')).toBe(true);
  });

  test('jumping to another MOD scopes to it without changing the account MOD', () => {
    setup();
    fireEvent.change(screen.getByLabelText(/Another MOD/i), { target: { value: 'WB' } });
    expect(mockGrid.rowData.some((r) => r.name === 'gaf_wb.log')).toBe(true);
    expect(mockGrid.rowData.some((r) => r.name === 'gaf_zfin.log')).toBe(false);
    expect(screen.getByRole('button', { name: /My MOD \(ZFIN\)/ })).toBeInTheDocument();
  });

  test('offers only MODs that actually have files', () => {
    setup();
    const options = [...screen.getByLabelText(/Another MOD/i).options].map((o) => o.value);
    expect(options).toEqual(['', 'WB', 'ZFIN']);
  });

  test('dropping shared files leaves only the MOD own reports', () => {
    setup();
    fireEvent.click(screen.getByLabelText(/Include shared/i));
    expect(mockGrid.rowData.every((r) => r.mod === 'ZFIN')).toBe(true);
  });
});

describe('Logs page - versions', () => {
  test('shows one row per report family by default', () => {
    setup();
    const orcid = mockGrid.rowData.filter((r) => r.reportFamily === 'duplicate_orcid_report');
    expect(orcid).toHaveLength(1);
    expect(orcid[0].name).toBe('duplicate_orcid_report.log');
  });

  test('All versions reveals the dated history', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /All versions/ }));
    expect(mockGrid.rowData.filter((r) => r.reportFamily === 'duplicate_orcid_report').length)
      .toBeGreaterThan(1);
  });

  test('hides stale _old files by default and reveals them on request', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /All versions/ }));
    expect(mockGrid.rowData.some((r) => r.isStale)).toBe(false);
    fireEvent.click(screen.getByLabelText(/Hide stale/i));
    expect(mockGrid.rowData.some((r) => r.isStale)).toBe(true);
  });
});

describe('Logs page - deep links and drill-down', () => {
  test('lands pre-filtered on a deep link from the Reports page', () => {
    setup({}, {}, '/logs?dir=QC&family=duplicate_orcid_report&mode=history');
    expect(mockGrid.rowData.every((r) => r.directory === 'QC')).toBe(true);
    expect(mockGrid.rowData.every((r) => r.reportFamily === 'duplicate_orcid_report')).toBe(true);
    // mode=history means every version, not just the current one.
    expect(mockGrid.rowData.length).toBeGreaterThan(1);
  });

  test('a deep-linked scope survives the effective MOD arriving late', () => {
    setup({}, {}, '/logs?scope=all');
    expect(mockGrid.rowData.some((r) => r.name === 'gaf_wb.log')).toBe(true);
  });

  test('clicking the version count drills into that report history', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /3 versions/ }));
    expect(screen.getByText(/Showing only duplicate_orcid_report/)).toBeInTheDocument();
    expect(mockGrid.rowData.every((r) => r.reportFamily === 'duplicate_orcid_report')).toBe(true);
  });

  test('clearing the drill-down restores the wider listing', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /3 versions/ }));
    fireEvent.click(screen.getByRole('button', { name: /\(clear\)/ }));
    expect(screen.queryByText(/Showing only/)).not.toBeInTheDocument();
    expect(mockGrid.rowData.some((r) => r.reportFamily === 'gaf')).toBe(true);
  });
});

describe('Logs page - opening a file', () => {
  test('links straight at the raw file, in a new tab, with a single-slash url', () => {
    setup({}, {}, '/logs?family=gaf&scope=all&mode=history');
    const link = screen.getAllByRole('link', { name: /open raw/i })[0];
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link.getAttribute('href')).toMatch(/\/reports\/gaf_(zfin|wb)\.log$/);
    expect(link.getAttribute('href')).not.toMatch(/[^:]\/\//);
  });
});

describe('Logs page - viewer', () => {
  test('opens the in-app viewer for a row', async () => {
    setup({}, {}, '/logs?family=gaf&scope=all&mode=history');
    fireEvent.click(screen.getAllByRole('button', { name: /^view$/ })[0]);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});

describe('Logs page - states', () => {
  test('shows a spinner while loading', () => {
    setup({}, { loading: true, rows: [] });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByTestId('grid')).not.toBeInTheDocument();
  });

  test('shows a danger alert with a retry on a real failure', () => {
    setup({}, { error: { response: { status: 500 } }, rows: [] });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('alert-danger');
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(mockHookResult.refresh).toHaveBeenCalled();
  });

  test('shows a warning, not an error, when the endpoint is not deployed', () => {
    setup({}, { error: { response: { status: 404 } }, notDeployed: true, rows: [] });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('alert-warning');
    expect(screen.getByRole('link', { name: /report directory/i })).toBeInTheDocument();
  });

  test('distinguishes filtered-to-nothing from an outright failure', () => {
    setup();
    // QC_old holds only stale files, which are hidden by default.
    fireEvent.change(screen.getByLabelText('Folder'), { target: { value: 'QC_old' } });
    expect(screen.getByText(/No report files match/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('counts what is shown against what was loaded', () => {
    setup();
    expect(screen.getByText(/Showing \d+ of 7 files/)).toBeInTheDocument();
  });
});
