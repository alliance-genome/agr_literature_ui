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

// Default per-cell filter flags for a topic with no tags (used when applying a
// recomputed validate cell that carries no filter_flags for the topic).
const EMPTY_FILTER_FLAGS = Object.freeze({
  has_any: false,
  has_y: false,
  has_n: false,
  has_note: false,
  my_validation_present: false,
});

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

function elapsedMs(start) {
  return `${Math.round(performance.now() - start)}ms`;
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

// Drop empty arrays/objects so we don't send "topics: []" etc. — the API treats
// an omitted/empty field as "no restriction", but keeping the payload lean also
// avoids re-fetches keyed on noise.
function compactFilters(filters) {
  if (!filters || typeof filters !== 'object') return undefined;
  const out = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      if (v.length > 0) out[k] = v;
    } else {
      out[k] = v;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Fetch TETs for many references in one round-trip via POST
 * /topic_entity_tag/by_references, which returns { tags: {curie: tets[]},
 * counts: {curie: {topic: {...}}}, entries: {curie: {topic: entries[]}},
 * discovery: {topics:[{curie,name}], sources:[{label,...}]} }.
 * `filters` carries the initial search's TET facet criteria so the API returns
 * ONLY the tags the search asked for (the main fix for the slow grid load).
 * Chunked so a very large page doesn't become one huge request. Falls back to
 * per-reference GETs if the batch endpoint is unavailable (e.g. older backend)
 * — the fallback can't filter/aggregate server-side, so the grid's own
 * client-side filters still apply on that path.
 *
 * `discovery` is batch-global (the distinct topic columns + source labels across
 * the whole post-filter batch), so it is merged across chunks and returned once,
 * NOT keyed per curie. It is null unless EVERY chunk contributed a discovery
 * aggregate -- if any chunk hit an older backend or fell back to per-reference
 * GETs, the merged result would be incomplete, so it is discarded and consumers
 * derive columns/sources from raw tags (which cover every loaded reference).
 *
 * Returns { tags, counts, entries, validation, filterFlags, discovery }.
 */
export async function fetchTetsBatch(curies, filters) {
  const totalStart = performance.now();
  const tags = {};
  const counts = {};
  const entries = {};
  const validation = {};
  const filterFlags = {};
  // Batch-global discovery merged across chunks. Keyed maps dedupe (topics by
  // uppercased curie, sources by label). `sawDiscovery` distinguishes an
  // empty-but-present aggregate from an older backend that never sent one.
  // `discoveryComplete` guards against a PARTIAL aggregate: discovery covers only
  // the chunks whose batch POST succeeded AND returned it, but the grid uses it
  // exclusively (no raw-tet scan). So if ANY chunk contributed no discovery -- an
  // older-backend chunk, or one that fell back to per-reference GETs -- the merged
  // result would silently omit topics/sources that live only in those references.
  // In that case we return null so consumers derive columns/sources from raw tets,
  // which always cover every loaded reference.
  const discoveryTopics = new Map();
  const discoverySources = new Map();
  let sawDiscovery = false;
  let discoveryComplete = true;
  const mergeDiscovery = (d) => {
    if (!d || typeof d !== 'object') {
      discoveryComplete = false;
      return;
    }
    sawDiscovery = true;
    for (const t of Array.isArray(d.topics) ? d.topics : []) {
      const key = t?.curie ? String(t.curie).toUpperCase() : null;
      if (key && !discoveryTopics.has(key)) {
        discoveryTopics.set(key, { curie: key, name: t.name || key });
      }
    }
    for (const s of Array.isArray(d.sources) ? d.sources : []) {
      if (s?.label && !discoverySources.has(s.label)) discoverySources.set(s.label, s);
    }
  };
  const buildDiscovery = () =>
    sawDiscovery && discoveryComplete
      ? {
          topics: Array.from(discoveryTopics.values()),
          sources: Array.from(discoverySources.values()),
        }
      : null;
  const unique = Array.from(new Set((curies || []).filter(Boolean)));
  if (unique.length === 0) {
    return { tags, counts, entries, validation, filterFlags, discovery: null };
  }
  const compactedFilters = compactFilters(filters);
  const groups = chunk(unique, TETS_BATCH_SIZE);
  debug.log(
    `[TetValidationGrid] TET batch fetch start: ${unique.length} references in ${groups.length} request(s)`
  );
  await Promise.all(
    groups.map(async (group, index) => {
      const groupStart = performance.now();
      try {
        // Fail fast (one short retry) before falling back to per-reference
        // GETs: a 4xx (older backend without this endpoint) isn't retried at
        // all, and on persistent 5xx/timeout we'd rather fall back quickly than
        // burn the full ~60s backoff. The fallback path keeps its own retries.
        const r = await withBackoff(
          () =>
            api.post('/topic_entity_tag/by_references', {
              curies_or_reference_ids: group,
              ...(compactedFilters ? { filters: compactedFilters } : {}),
            }),
          { delays: [500] }
        );
        // New shape: { tags, counts }. Tolerate an older backend that returns a
        // bare { curie: tets[] } map so a deploy-order mismatch degrades to
        // "tags only" rather than an error.
        const body = r.data && typeof r.data === 'object' ? r.data : {};
        const tagMap =
          body.tags && typeof body.tags === 'object' ? body.tags : body;
        const countMap =
          body.counts && typeof body.counts === 'object' ? body.counts : {};
        const hasEntryMap = body.entries && typeof body.entries === 'object';
        const entryMap = hasEntryMap ? body.entries : {};
        // validation + filter_flags are aggregated server-side (newer backend).
        // Null when absent so consumers fall back to deriving from raw tags.
        const hasValidationMap =
          body.validation && typeof body.validation === 'object';
        const validationMap = hasValidationMap ? body.validation : {};
        const hasFlagMap =
          body.filter_flags && typeof body.filter_flags === 'object';
        const flagMap = hasFlagMap ? body.filter_flags : {};
        mergeDiscovery(body.discovery);
        for (const c of group) {
          tags[c] = tagMap[c] || [];
          counts[c] = countMap[c] || {};
          entries[c] = hasEntryMap ? (entryMap[c] || {}) : null;
          validation[c] = hasValidationMap ? (validationMap[c] || {}) : null;
          filterFlags[c] = hasFlagMap ? (flagMap[c] || {}) : null;
        }
        const tetCount = group.reduce(
          (sum, c) => sum + (Array.isArray(tags[c]) ? tags[c].length : 0),
          0
        );
        debug.log(
          `[TetValidationGrid] TET batch request ${index + 1}/${groups.length}: ` +
          `${group.length} references, ${tetCount} tags, ${elapsedMs(groupStart)}`
        );
      } catch (e) {
        debug.warn(
          '[TetValidationGrid] batch fetchTets failed; falling back per-reference:',
          e?.response?.status,
          e?.response?.data?.detail || e?.message
        );
        // This chunk contributed no discovery, so any merged discovery is now
        // incomplete -- force the whole result back to raw-tet derivation.
        discoveryComplete = false;
        await Promise.all(
          group.map(async (c) => {
            tags[c] = await fetchTets(c);
            counts[c] = {};
            entries[c] = null;
            validation[c] = null;
            filterFlags[c] = null;
          })
        );
        const fallbackCount = group.reduce(
          (sum, c) => sum + (Array.isArray(tags[c]) ? tags[c].length : 0),
          0
        );
        debug.log(
          `[TetValidationGrid] TET fallback request ${index + 1}/${groups.length}: ` +
          `${group.length} references, ${fallbackCount} tags, ${elapsedMs(groupStart)}`
        );
      }
    })
  );
  const totalTags = Object.values(tags).reduce(
    (sum, t) => sum + (Array.isArray(t) ? t.length : 0),
    0
  );
  debug.log(
    `[TetValidationGrid] TET batch fetch done: ${unique.length} references, ` +
    `${totalTags} tags, ${elapsedMs(totalStart)}`
  );
  return { tags, counts, entries, validation, filterFlags, discovery: buildDiscovery() };
}

export function useReferenceTets(
  referenceIds,
  biblioByCurie,
  active = true,
  filters = null
) {
  const [rows, setRows] = useState([]);
  const [unresolved, setUnresolved] = useState([]);
  const [loading, setLoading] = useState(true);
  // Batch-global discovery aggregate ({topics, sources}) or null on an older
  // backend that didn't send it — lets the grid build its column set + source
  // filter without deriving them from raw tags.
  const [discovery, setDiscovery] = useState(null);
  const reqIdRef = useRef(0);
  // Key (ids + filters) of the last fetch that ran to completion. When the
  // grid is merely re-activated (List view → Topic grid) with unchanged
  // inputs, the rows already in state are still valid — skip the refetch
  // instead of reloading the whole batch on every view toggle. A cancelled
  // fetch never records its key, so re-activation after an aborted load
  // still refetches.
  const lastLoadedKeyRef = useRef(null);

  // Read the latest biblio map without making it an effect dependency: it is
  // derived from the same search that produced referenceIds, so it changes in
  // lockstep with them, and keying the effect on referenceIds alone avoids a
  // redundant reload when only the map's identity changes.
  const biblioMapRef = useRef(biblioByCurie);
  biblioMapRef.current = biblioByCurie;

  // Same idea for the search filters: read the latest value from a ref, but key
  // the effect on the filters' *value* (stringified) below so a real change to
  // the search criteria triggers a re-fetch while an identity-only change does
  // not.
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const filtersKey = JSON.stringify(filters || null);

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
    // Skip fetching while the grid is hidden (e.g. the user is in List view
    // but the grid stays mounted to preserve state). Otherwise every later
    // search would trigger a batch fetch for a grid nobody is looking at.
    if (!active) return undefined;
    const fetchKey = `${JSON.stringify(referenceIds || [])}|${filtersKey}`;
    if (lastLoadedKeyRef.current === fetchKey) return undefined;
    const reqId = ++reqIdRef.current;
    let cancelled = false;
    setLoading(true);
    setRows([]);
    setUnresolved([]);
    setDiscovery(null);

    (async () => {
      const loadStart = performance.now();
      const ids = Array.from(
        new Set((referenceIds || []).map((s) => s.trim()).filter(Boolean))
      );
      debug.log(
        `[TetValidationGrid] load start: ${ids.length} input references`
      );
      // Phase 1: resolve each input to its canonical curie + biblio (mostly
      // free when search biblio is supplied), bounded by FETCH_CONCURRENCY.
      const resolveStart = performance.now();
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
      debug.log(
        `[TetValidationGrid] resolve done: ${resolved.length} resolved, ` +
        `${newUnresolved.length} unresolved, ${elapsedMs(resolveStart)}`
      );

      // Phase 2: fetch all TETs in one batched request (was one HTTP call per
      // reference — the grid's main bottleneck), restricted to the tags the
      // search asked for.
      const fetchStart = performance.now();
      const {
        tags: tetsByCurie,
        counts: countsByCurie,
        entries: entriesByCurie,
        validation: validationByCurie,
        filterFlags: filterFlagsByCurie,
        discovery: discoveryResult,
      } = await fetchTetsBatch(
        resolved.map((r) => r.curie),
        filtersRef.current
      );
      if (cancelled || reqId !== reqIdRef.current) return;
      debug.log(`[TetValidationGrid] fetch done: ${elapsedMs(fetchStart)}`);

      const nextRows = resolved.map((r) => ({
        input: r.input,
        curie: r.curie,
        biblio: r.biblio,
        tets: tetsByCurie[r.curie] || [],
        counts: countsByCurie[r.curie] || {},
        entries: entriesByCurie[r.curie] === null
          ? null
          : (entriesByCurie[r.curie] || {}),
        // null => server didn't aggregate it (older backend / fallback);
        // consumers then derive validation/flags from raw tets.
        validation: validationByCurie?.[r.curie] == null
          ? null
          : validationByCurie[r.curie],
        filterFlags: filterFlagsByCurie?.[r.curie] == null
          ? null
          : filterFlagsByCurie[r.curie],
      }));
      setRows(nextRows);
      setUnresolved(newUnresolved);
      setDiscovery(discoveryResult);
      setLoading(false);
      lastLoadedKeyRef.current = fetchKey;
      const rowTagCount = nextRows.reduce(
        (sum, row) => sum + (Array.isArray(row.tets) ? row.tets.length : 0),
        0
      );
      debug.log(
        `[TetValidationGrid] load done: ${nextRows.length} rows, ` +
        `${rowTagCount} tags, ${elapsedMs(loadStart)}`
      );
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(referenceIds || []), resolveBiblio, active, filtersKey]);

  const refetchRow = useCallback(async (curie) => {
    // Per-reference refresh after an edit returns raw tags only, not the
    // server aggregates. Null them so the row re-derives validation/flags from
    // the fresh tets and stays consistent until the next batch load.
    const tets = await fetchTets(curie);
    setRows((prev) =>
      prev.map((r) =>
        r.curie === curie
          ? { ...r, tets, validation: null, filterFlags: null }
          : r
      )
    );
  }, []);

  // Apply the single recomputed cell returned by POST /topic_entity_tag/validate
  // ({ topic, validation, filter_flags }) to one row's per-topic aggregates,
  // so a validation updates that cell without re-fetching/re-aggregating the
  // whole batch. Only merges when the row is already on the server-aggregate
  // path (validation/filterFlags are objects); for the fallback path the caller
  // refetches instead (see handleValidated in TetValidationGrid).
  const applyValidatedCell = useCallback((curie, topic, cell) => {
    if (!cell) return;
    const tkey = String(cell.topic || topic || '').toUpperCase();
    setRows((prev) =>
      prev.map((r) => {
        if (r.curie !== curie) return r;
        const validation =
          r.validation && typeof r.validation === 'object'
            ? { ...r.validation, [tkey]: cell.validation ?? null }
            : r.validation;
        const filterFlags =
          r.filterFlags && typeof r.filterFlags === 'object'
            ? { ...r.filterFlags, [tkey]: cell.filter_flags || EMPTY_FILTER_FLAGS }
            : r.filterFlags;
        return { ...r, validation, filterFlags };
      })
    );
  }, []);

  return { rows, unresolved, loading, discovery, refetchRow, applyValidatedCell };
}
