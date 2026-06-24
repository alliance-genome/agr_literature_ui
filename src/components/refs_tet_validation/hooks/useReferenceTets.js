import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../api';
import { debug } from '../helpers/debug';

// CURIEs go into URL path segments unencoded — matches the rest of the UI
// (e.g. biblioActions.js, TopicEntityTable.js). Percent-encoding ':' to '%3A'
// breaks routing in some intermediaries.
//
// AGRKB curies are *canonical reference curies* and must hit /reference/{curie}.
// Anything else is treated as a cross-reference and goes through
// /reference/by_cross_reference/{id}. We do NOT fall back from one to the other
// because they target disjoint identifier spaces — a fallback only generates
// noise 404s in the backend log.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Exponential-backoff delays (ms) between retries — 5 retries total.
const DEFAULT_BACKOFF_DELAYS = [500, 1500, 4500, 13500, 40500];
// Pull every TET for a reference in one request; references rarely exceed this.
const TETS_PAGE_SIZE = 8000;
// How many references to resolve/fetch in parallel.
const FETCH_CONCURRENCY = 10;
// How many references' TETs to request per batch call. A search page is usually
// tens of references, so this typically collapses to a single request.
const TETS_BATCH_SIZE = 50;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Retry an axios call on 5xx / network errors with exponential backoff.
 * 4xx errors fail fast (a 404 should never be retried). Default 5 retries
 * with delays 500 / 1500 / 4500 / 13500 / 40500 ms.
 */
async function withBackoff(fn, { delays = DEFAULT_BACKOFF_DELAYS } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const status = e?.response?.status;
      const retryable =
        status === undefined || (status >= 500 && status < 600);
      if (!retryable || attempt === delays.length) throw e;
      await sleep(delays[attempt]);
    }
  }
  throw lastErr;
}

export async function resolveOne(id) {
  const url = id.startsWith('AGRKB:')
    ? `/reference/${id}`
    : `/reference/by_cross_reference/${id}`;
  try {
    const r = await withBackoff(() => api.get(url));
    return r.data;
  } catch (e) {
    debug.warn(
      `[TetValidationGrid] Could not resolve ${id}:`,
      e?.response?.status,
      e?.response?.data?.detail || e?.message
    );
    return null;
  }
}

export async function fetchTets(curie) {
  try {
    const r = await withBackoff(() =>
      api.get(
        `/topic_entity_tag/by_reference/${curie}?page=1&page_size=${TETS_PAGE_SIZE}`
      )
    );
    // Existing TET table uses result.data directly as the array
    return Array.isArray(r.data) ? r.data : (r.data?.topic_entity_tags || []);
  } catch (e) {
    debug.warn(
      `[TetValidationGrid] fetchTets failed for ${curie}:`,
      e?.response?.status,
      e?.response?.data?.detail || e?.message
    );
    return [];
  }
}

/**
 * Fetch TETs for many references in one round-trip via POST
 * /topic_entity_tag/by_references, which returns a { curie: tets[] } map.
 * Chunked so a very large page doesn't become one huge request. Falls back to
 * per-reference GETs if the batch endpoint is unavailable (e.g. older backend),
 * so the grid keeps working either way.
 */
export async function fetchTetsBatch(curies) {
  const result = {};
  const unique = Array.from(new Set((curies || []).filter(Boolean)));
  if (unique.length === 0) return result;
  await Promise.all(
    chunk(unique, TETS_BATCH_SIZE).map(async (group) => {
      try {
        const r = await withBackoff(() =>
          api.post('/topic_entity_tag/by_references', group)
        );
        const data = r.data && typeof r.data === 'object' ? r.data : {};
        for (const c of group) result[c] = data[c] || [];
      } catch (e) {
        debug.warn(
          '[TetValidationGrid] batch fetchTets failed; falling back per-reference:',
          e?.response?.status,
          e?.response?.data?.detail || e?.message
        );
        await Promise.all(
          group.map(async (c) => {
            result[c] = await fetchTets(c);
          })
        );
      }
    })
  );
  return result;
}

export function useReferenceTets(referenceIds, biblioByCurie) {
  const [rows, setRows] = useState([]);
  const [unresolved, setUnresolved] = useState([]);
  const [loading, setLoading] = useState(true);
  const reqIdRef = useRef(0);

  // Read the latest biblio map without making it an effect dependency: it is
  // derived from the same search that produced referenceIds, so it changes in
  // lockstep with them, and keying the effect on referenceIds alone avoids a
  // redundant reload when only the map's identity changes.
  const biblioMapRef = useRef(biblioByCurie);
  biblioMapRef.current = biblioByCurie;

  // Resolve one input to its canonical curie + biblio. When the caller already
  // supplied biblio (search results), AGRKB inputs need NO network call — the
  // curie is canonical and the biblio is in hand. Only non-AGRKB inputs, or
  // AGRKB inputs without supplied biblio (standalone use), hit /reference.
  const resolveBiblio = useCallback(async (input) => {
    const supplied = biblioMapRef.current && biblioMapRef.current[input];
    if (input.startsWith('AGRKB:')) {
      if (supplied) return { input, curie: input, biblio: supplied };
      const ref = await resolveOne(input);
      if (!ref?.curie) return { input, curie: null, biblio: null };
      return { input, curie: ref.curie, biblio: ref };
    }
    const ref = await resolveOne(input);
    if (!ref?.curie) return { input, curie: null, biblio: null };
    return { input, curie: ref.curie, biblio: ref };
  }, []);

  useEffect(() => {
    const reqId = ++reqIdRef.current;
    let cancelled = false;
    setLoading(true);
    setRows([]);
    setUnresolved([]);

    (async () => {
      const ids = Array.from(
        new Set((referenceIds || []).map((s) => s.trim()).filter(Boolean))
      );
      // Phase 1: resolve each input to its canonical curie + biblio (mostly
      // free when search biblio is supplied), bounded by FETCH_CONCURRENCY.
      const resolved = [];
      const newUnresolved = [];
      let cursor = 0;
      async function worker() {
        while (cursor < ids.length) {
          const i = cursor++;
          const out = await resolveBiblio(ids[i]);
          if (cancelled || reqId !== reqIdRef.current) return;
          if (!out.curie || !out.biblio) newUnresolved.push(out.input);
          else resolved.push(out);
        }
      }
      await Promise.all(
        Array.from({ length: Math.min(FETCH_CONCURRENCY, ids.length) }, worker)
      );
      if (cancelled || reqId !== reqIdRef.current) return;

      // Phase 2: fetch all TETs in one batched request (was one HTTP call per
      // reference — the grid's main bottleneck).
      const tetsByCurie = await fetchTetsBatch(resolved.map((r) => r.curie));
      if (cancelled || reqId !== reqIdRef.current) return;

      setRows(
        resolved.map((r) => ({
          input: r.input,
          curie: r.curie,
          biblio: r.biblio,
          tets: tetsByCurie[r.curie] || [],
        }))
      );
      setUnresolved(newUnresolved);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(referenceIds || []), resolveBiblio]);

  const refetchRow = useCallback(async (curie) => {
    const tets = await fetchTets(curie);
    setRows((prev) =>
      prev.map((r) => (r.curie === curie ? { ...r, tets } : r))
    );
  }, []);

  return { rows, unresolved, loading, refetchRow };
}
