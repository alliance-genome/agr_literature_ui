import { api } from '../api';
import {
  deriveReportFiles,
  loadReportFiles,
  isNotDeployed,
  REPORT_FILES_TTL_MS,
  __clearReportFilesCache
} from './useReportFiles';

jest.mock('../api', () => ({ api: { get: jest.fn() } }));

const MANIFEST = [
  { path: 'pdf2md.log', name: 'pdf2md.log', directory: '', size: 10, modified: '2026-08-20T00:00:00Z' },
  {
    path: 'pubmed_update/update_pubmed_papers_FB_20260530.log',
    name: 'update_pubmed_papers_FB_20260530.log',
    directory: 'pubmed_update', size: 20, modified: '2026-05-30T00:00:00Z'
  }
];

describe('deriveReportFiles', () => {
  test('parses every manifest entry', () => {
    const rows = deriveReportFiles(MANIFEST);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.name === 'update_pubmed_papers_FB_20260530.log')).toMatchObject({
      mod: 'FB', date: '2026-05-30', reportFamily: 'update_pubmed_papers'
    });
  });

  test('leaves a MOD-less file classified as shared', () => {
    expect(deriveReportFiles(MANIFEST).find((r) => r.name === 'pdf2md.log').mod).toBeNull();
  });

  test('handles a null or non-array payload', () => {
    expect(deriveReportFiles(null)).toEqual([]);
    expect(deriveReportFiles(undefined)).toEqual([]);
    expect(deriveReportFiles({ nope: true })).toEqual([]);
  });
});

describe('loadReportFiles', () => {
  beforeEach(() => {
    __clearReportFilesCache();
    api.get.mockReset();
    api.get.mockResolvedValue({ data: MANIFEST });
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-24T12:00:00Z'));
  });

  afterEach(() => { jest.useRealTimers(); });

  test('fetches /report/files and caches the result', async () => {
    await loadReportFiles();
    await loadReportFiles();
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/report/files');
  });

  test('refetches once the cache has gone stale', async () => {
    await loadReportFiles();
    jest.setSystemTime(new Date(Date.now() + REPORT_FILES_TTL_MS + 1));
    await loadReportFiles();
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  test('serves from cache while it is still fresh', async () => {
    await loadReportFiles();
    jest.setSystemTime(new Date(Date.now() + REPORT_FILES_TTL_MS - 1000));
    await loadReportFiles();
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  test('force bypasses a fresh cache', async () => {
    await loadReportFiles();
    await loadReportFiles({ force: true });
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  test('a rejected fetch is not cached — the next call retries', async () => {
    api.get.mockReset();
    api.get.mockRejectedValueOnce(new Error('boom')).mockResolvedValue({ data: MANIFEST });
    await expect(loadReportFiles()).rejects.toThrow('boom');
    await expect(loadReportFiles()).resolves.toHaveLength(2);
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});

describe('isNotDeployed', () => {
  test('recognises a 404 as the endpoint being absent', () => {
    expect(isNotDeployed({ response: { status: 404 } })).toBe(true);
  });

  test('treats other failures as real errors', () => {
    expect(isNotDeployed({ response: { status: 500 } })).toBe(false);
    expect(isNotDeployed(new Error('network'))).toBe(false);
    expect(isNotDeployed(null)).toBe(false);
  });
});
