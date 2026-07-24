import { useRef, useCallback, useEffect } from 'react';

/**
 * Helper for typeahead `onSearch` handlers that hit the API.
 *
 * Each call aborts the previous in-flight request before starting a new one and
 * ignores any response that has since been superseded, so only the latest
 * keystroke's result is applied. This prevents a slow / out-of-order response
 * (e.g. a broad "n" substring search that the backend answers slowly) from
 * clobbering the suggestions for what the curator has since typed.
 *
 * Usage:
 *   const runSearch = useAbortableSearch();
 *   onSearch={(query) => runSearch(
 *     (signal) => api.get(url, { signal }),   // pass signal so the request is truly cancelled
 *     (res, err) => { if (err) setOptions([]); else setOptions(map(res.data)); },
 *     setLoading,                              // optional
 *   )}
 *
 * `fetcher(signal)` should return a promise (an api.get, or Promise.all of a few).
 * `apply(result, err)` runs only for the latest, non-aborted request; `err` is set
 * only on a genuine failure (aborted requests never call it). `setLoading` is
 * optional and is toggled around only the latest request.
 */
export default function useAbortableSearch() {
  const ctrlRef = useRef(null);
  const seqRef = useRef(0);

  // Abort any request still in flight when the component unmounts.
  useEffect(() => () => { if (ctrlRef.current) ctrlRef.current.abort(); }, []);

  return useCallback(async (fetcher, apply, setLoading) => {
    if (ctrlRef.current) ctrlRef.current.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    const seq = ++seqRef.current;
    if (setLoading) setLoading(true);
    try {
      const result = await fetcher(ctrl.signal);
      if (seq !== seqRef.current) return; // superseded by a newer search
      apply(result, null);
    } catch (err) {
      if (ctrl.signal.aborted) return; // cancelled in favor of a newer search
      if (seq !== seqRef.current) return;
      apply(null, err);
    } finally {
      if (seq === seqRef.current && setLoading) setLoading(false);
    }
  }, []);
}
