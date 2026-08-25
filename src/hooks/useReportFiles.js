import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { parseReportFile } from '../utils/reportFileNames';

// Manifest of every report/log file the pipelines have written, from
// GET /report/files. The whole tree is a few hundred entries, so it is fetched
// once and filtered client-side; that keeps every facet change on /logs instant.

// Short enough that a tab left open all day does not show a stale listing, long
// enough that moving between filters never refetches. The Refresh button forces it.
export const REPORT_FILES_TTL_MS = 5 * 60 * 1000;

let cache = null; // { fetchedAt, promise: Promise<row[]> }

export const __clearReportFilesCache = () => { cache = null; };

// Pure: manifest entries -> parsed rows. Split out so the transform is testable
// without mocking axios.
export function deriveReportFiles(manifest) {
  if (!Array.isArray(manifest)) return [];
  return manifest.map((entry) => parseReportFile(entry));
}

export function loadReportFiles({ force = false } = {}) {
  const isFresh = cache && !force && (Date.now() - cache.fetchedAt) < REPORT_FILES_TTL_MS;
  if (!isFresh) {
    const entry = { fetchedAt: Date.now() };
    entry.promise = api.get('/report/files').then((response) => deriveReportFiles(response.data));
    // Don't cache a rejection — drop it so a transient failure retries on the next
    // mount instead of leaving the page permanently empty for the session.
    entry.promise.catch(() => { if (cache === entry) cache = null; });
    cache = entry;
  }
  return cache.promise;
}

// A 404 means the listing endpoint is not deployed in this environment, which is
// expected while the UI is ahead of the API. The page shows that as a warning
// rather than an error, so it does not read as a bug.
export function isNotDeployed(error) {
  return Boolean(error && error.response && error.response.status === 404);
}

export function useReportFiles() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let live = true;
    setError(null);
    loadReportFiles({ force: reloadCount > 0 })
      .then((loaded) => live && setRows(loaded))
      .catch((caught) => live && setError(caught));
    return () => { live = false; };
  }, [reloadCount]);

  const refresh = useCallback(() => {
    __clearReportFilesCache();
    setRows(null);
    setReloadCount((count) => count + 1);
  }, []);

  return {
    rows: rows || [],
    loading: rows === null && !error,
    error,
    notDeployed: isNotDeployed(error),
    refresh
  };
}
