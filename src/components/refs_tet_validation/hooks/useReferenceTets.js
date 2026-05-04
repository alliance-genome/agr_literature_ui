import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../api';

export async function resolveOne(id) {
  try {
    if (id.startsWith('AGRKB:')) {
      const r = await api.get(`/reference/${encodeURIComponent(id)}`);
      return r.data;
    }
    const r = await api.get(
      `/reference/by_cross_reference/${encodeURIComponent(id)}`
    );
    return r.data;
  } catch {
    return null;
  }
}

export async function fetchTets(curie) {
  try {
    const r = await api.get(
      `/topic_entity_tag/by_reference/${encodeURIComponent(curie)}?page=1&page_size=8000`
    );
    // Existing TET table uses result.data directly as the array
    return Array.isArray(r.data) ? r.data : (r.data?.topic_entity_tags || []);
  } catch {
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
