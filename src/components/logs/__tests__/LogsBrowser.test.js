import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';
import { api } from '../../../api';
import LogsBrowser from '../LogsBrowser';
import { parseReportFile } from '../../../utils/reportFileNames';

const mockState = {
  app: { mods: ['FB', 'MGI', 'RGD', 'SGD', 'WB', 'XB', 'ZFIN'] },
  isLogged: { cognitoMod: 'ZFIN', testerMod: 'No' }
};
jest.mock('react-redux', () => ({ useSelector: (fn) => fn(mockState) }));
jest.mock('../../../api', () => ({ api: { get: jest.fn() } }));
// The real widget needs canvas, which jsdom lacks. This stub keeps the wiring
// under test: it reports whether it was disabled and can emit a range.
jest.mock('../DateRangeQuickPicker', () => (props) => (
  <button
    data-testid="date-picker"
    disabled={props.disabled}
    onClick={() => props.onChange(['2026-06-01', '2026-06-30'])}
  >date</button>
));

const mockGrid = { rowData: [] };
jest.mock('ag-grid-react', () => ({
  AgGridReact: (props) => {
    mockGrid.rowData = props.rowData;
    return <div data-testid="grid">{props.rowData.length} rows</div>;
  }
}));

const mockHookResult = { rows: [], loading: false, error: null, notDeployed: false, refresh: jest.fn() };
jest.mock('../../../hooks/useReportFiles', () => ({ useReportFiles: () => mockHookResult }));

const row = (path) => parseReportFile({
  path,
  name: path.split('/').pop(),
  directory: path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '',
  size: 100,
  modified: '2026-08-20T00:00:00Z'
});

const ROWS = [
  row('gaf_zfin.log'),
  row('gaf_wb.log'),
  row('pdf2md.log'),
  row('QC/duplicate_orcid_report.log'),
  row('pubmed_update/update_pubmed_papers_ZFIN_20260615.log'),
  row('pubmed_update/update_pubmed_papers_ZFIN_20260815.log')
];

beforeEach(() => {
  api.get.mockImplementation(() => new Promise(() => {}));
  Object.assign(mockHookResult, {
    rows: ROWS, loading: false, error: null, notDeployed: false, refresh: jest.fn()
  });
});

let seenPath;
const setup = (props = {}) => render(
  <MemoryRouter initialEntries={['/reports']}>
    <LogsBrowser {...props} />
    <Route path="*" render={({ location }) => { seenPath = location.pathname + location.search; return null; }} />
  </MemoryRouter>
);

describe('LogsBrowser locked to one MOD', () => {
  test('hides the MOD scope controls, since the tab already picks the MOD', () => {
    setup({ lockedMod: 'ZFIN' });
    expect(screen.queryByRole('button', { name: /My MOD/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /All MODs/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Another MOD/i)).not.toBeInTheDocument();
  });

  test('shows that MOD files plus shared ones', () => {
    setup({ lockedMod: 'ZFIN' });
    const names = mockGrid.rowData.map((r) => r.name);
    expect(names).toContain('gaf_zfin.log');
    expect(names).toContain('pdf2md.log');
    expect(names).not.toContain('gaf_wb.log');
  });

  test('honours the locked MOD even when it is not the account MOD', () => {
    setup({ lockedMod: 'WB' });
    const names = mockGrid.rowData.map((r) => r.name);
    expect(names).toContain('gaf_wb.log');
    expect(names).not.toContain('gaf_zfin.log');
  });

  test('can drop the shared files', () => {
    setup({ lockedMod: 'ZFIN' });
    fireEvent.click(screen.getByLabelText(/Include shared/i));
    expect(mockGrid.rowData.every((r) => r.mod === 'ZFIN')).toBe(true);
  });

  test('All shows every MOD', () => {
    setup({ lockedMod: 'All' });
    const names = mockGrid.rowData.map((r) => r.name);
    expect(names).toContain('gaf_zfin.log');
    expect(names).toContain('gaf_wb.log');
  });

  test('never rewrites the url, so the Reports page keeps its own', () => {
    setup({ lockedMod: 'ZFIN' });
    fireEvent.click(screen.getByRole('button', { name: /All versions/ }));
    expect(seenPath).toBe('/reports');
  });
});

describe('LogsBrowser standalone', () => {
  test('still offers the MOD scope controls', () => {
    setup();
    expect(screen.getByRole('button', { name: /My MOD \(ZFIN\)/ })).toBeInTheDocument();
  });
});


describe('date range', () => {
  test('is usable in the default latest-only view', () => {
    setup({ lockedMod: 'ZFIN' });
    expect(screen.getByTestId('date-picker')).not.toBeDisabled();
  });

  test('narrows the listing to reports with a file in the window', () => {
    setup({ lockedMod: 'ZFIN' });
    fireEvent.click(screen.getByTestId('date-picker'));
    const names = mockGrid.rowData.map((r) => r.name);
    expect(names).toContain('update_pubmed_papers_ZFIN_20260615.log');
    expect(names).not.toContain('update_pubmed_papers_ZFIN_20260815.log');
    // Undated files fall back to mtime (2026-08-20), outside the June window.
    expect(names).not.toContain('gaf_zfin.log');
  });

  test('still filters in the all-versions view', () => {
    setup({ lockedMod: 'ZFIN' });
    fireEvent.click(screen.getByRole('button', { name: /All versions/ }));
    fireEvent.click(screen.getByTestId('date-picker'));
    expect(mockGrid.rowData.map((r) => r.name))
      .toEqual(['update_pubmed_papers_ZFIN_20260615.log']);
  });
});
