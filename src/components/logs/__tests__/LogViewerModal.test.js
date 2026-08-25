import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { api } from '../../../api';
import LogViewerModal from '../LogViewerModal';

jest.mock('../../../api', () => ({ api: { get: jest.fn() } }));

const file = (extra = {}) => ({
  path: 'QC/duplicate_orcid_report.log',
  name: 'duplicate_orcid_report.log',
  size: 1024,
  url: 'https://dev.alliancegenome.org/reports/QC/duplicate_orcid_report.log',
  ...extra
});

// file last: spreading props after it would replace the composed file with the
// bare overrides.
const show = (props = {}) =>
  render(<LogViewerModal show onHide={jest.fn()} {...props} file={file(props.file)} />);

beforeEach(() => {
  api.get.mockReset();
  api.get.mockResolvedValue({
    data: { path: 'QC/duplicate_orcid_report.log', name: 'duplicate_orcid_report.log',
            size: 1024, truncated: false, content: 'ZFIN\tAGRKB:1\t0000-1\n' }
  });
});

describe('LogViewerModal', () => {
  test('fetches and shows the contents of a small file', async () => {
    show();
    expect(await screen.findByText(/AGRKB:1/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/report/file',
      { params: { path: 'QC/duplicate_orcid_report.log' } });
  });

  test('always offers the raw file as an escape hatch', async () => {
    show();
    await screen.findByText(/AGRKB:1/);
    const link = screen.getByRole('link', { name: /open raw/i });
    expect(link).toHaveAttribute('href', file().url);
    expect(link).toHaveAttribute('target', '_blank');
  });

  test('does not fetch a large file until asked', async () => {
    show({ file: { size: 42 * 1024 * 1024 } });
    expect(api.get).not.toHaveBeenCalled();
    expect(screen.getByText(/42\.0 MB/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /open raw/i }).length).toBeGreaterThan(0);
  });

  test('tails a large file on request', async () => {
    api.get.mockResolvedValue({
      data: { truncated: true, size: 42 * 1024 * 1024, content: 'tail bytes' }
    });
    show({ file: { size: 42 * 1024 * 1024 } });
    fireEvent.click(screen.getByRole('button', { name: /last 200 KB/i }));
    expect(await screen.findByText(/tail bytes/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/report/file', {
      params: { path: 'QC/duplicate_orcid_report.log', tail: 200 * 1024 }
    });
  });

  test('says so when a tail is only part of the file', async () => {
    api.get.mockResolvedValue({
      data: { truncated: true, size: 42 * 1024 * 1024, content: 'tail bytes' }
    });
    show({ file: { size: 42 * 1024 * 1024 } });
    fireEvent.click(screen.getByRole('button', { name: /last 200 KB/i }));
    expect(await screen.findByText(/showing the last/i)).toBeInTheDocument();
  });

  test('a failed preview never renders as an empty log', async () => {
    api.get.mockRejectedValue(new Error('network'));
    show();
    expect(await screen.findByText(/Preview unavailable/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /open raw/i }).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('log-content')).not.toBeInTheDocument();
  });

  test('renders nothing without a file', () => {
    const { container } = render(<LogViewerModal show={false} file={null} onHide={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
    expect(api.get).not.toHaveBeenCalled();
  });
});
