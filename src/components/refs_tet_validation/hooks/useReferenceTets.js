import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../api';

// CURIEs go into URL path segments unencoded — matches the rest of the UI
// (e.g. biblioActions.js, TopicEntityTable.js). Percent-encoding ':' to '%3A'
// breaks routing in some intermediaries.
//
// AGRKB curies are *canonical reference curies* and must hit /reference/{curie}.
// Anything else is treated as a cross-reference and goes through
// /reference/by_cross_reference/{id}. We do NOT fall back from one to the other
// because they target disjoint identifier spaces — a fallback only generates
// noise 404s in the backend log.
export async function resolveOne(id) {
  const url = id.startsWith('AGRKB:')
    ? `/reference/${id}`
    : `/reference/by_cross_reference/${id}`;
  try {
    const r = await api.get(url);
    return r.data;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      `[TetValidationGrid] Could not resolve ${id}:`,
      e?.response?.status,
      e?.response?.data?.detail || e?.message
    );
    return null;
  }
}

export async function fetchTets(curie) {
  try {
    const r = await api.get(
      `/topic_entity_tag/by_reference/${curie}?page=1&page_size=8000`
    );
    // Existing TET table uses result.data directly as the array
    return Array.isArray(r.data) ? r.data : (r.data?.topic_entity_tags || []);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      `[TetValidationGrid] fetchTets failed for ${curie}:`,
      e?.response?.status,
      e?.response?.data?.detail || e?.message
    );
    return [];
  }
}

export function useReferenceTets(referenceIds) {
  const [rows, setRows] = useState([]);
  const [unresolved, setUnresolved] = useState([]);
  const [loading, setLoading] = useState(true);
  const reqIdRef = useRef(0);

  const loadRow = useCallback(async (input) => {
    const ref = await resolveOne(input);
    if (!ref?.curie) return { input, ref: null };
    const tets = await fetchTets(ref.curie);
    return { input, ref, tets };
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
      const newRows = [];
      const newUnresolved = [];
      const concurrency = 8;
      let cursor = 0;
      async function worker() {
        while (cursor < ids.length) {
          const i = cursor++;
          const out = await loadRow(ids[i]);
          if (cancelled || reqId !== reqIdRef.current) return;
          if (!out.ref) {
            newUnresolved.push(out.input);
          } else {
            newRows.push({
              input: out.input,
              curie: out.ref.curie,
              biblio: out.ref,
              tets: out.tets,
            });
          }
        }
      }
      await Promise.all(
        Array.from({ length: Math.min(concurrency, ids.length) }, worker)
      );
      if (cancelled || reqId !== reqIdRef.current) return;
      setRows(newRows);
      setUnresolved(newUnresolved);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(referenceIds || [])]);

  const refetchRow = useCallback(async (curie) => {
    const tets = await fetchTets(curie);
    setRows((prev) =>
      prev.map((r) => (r.curie === curie ? { ...r, tets } : r))
    );
  }, []);

  return { rows, unresolved, loading, refetchRow };
}
