import { useEffect, useState } from 'react';
import { api } from '../api';

// Controlled-vocabulary fetch for the API's source-opaque /vocabulary/{name}
// endpoint. Response is [{ value, label, is_obsolete }] (value = term id for
// table-backed vocabs, or the string itself for static Literal vocabs).

const cache = new Map(); // name -> Promise<term[]>
export const __clearVocabCache = () => cache.clear();

// Cached fetch (one request per vocabulary name per session; the lists are stable).
export function loadVocabulary(name) {
  if (!cache.has(name)) {
    const promise = api.get(`/vocabulary/${name}`).then((r) => r.data);
    // Don't cache a rejection — drop it so a transient failure retries on next mount
    // instead of permanently emptying the dropdown for the session.
    promise.catch(() => cache.delete(name));
    cache.set(name, promise);
  }
  return cache.get(name);
}

// Pure: derive dropdown options (obsolete filtered out) + a label resolver that
// still resolves obsolete/unknown values (so a record holding a now-obsolete term
// still renders).
export function deriveVocabulary(terms) {
  const list = terms || [];
  const options = list
    .filter((t) => !t.is_obsolete)
    .map((t) => ({ value: t.value, label: t.label }));
  const labelFor = (value) => {
    const hit = list.find((t) => String(t.value) === String(value));
    return hit ? hit.label : value == null ? '' : String(value);
  };
  return { options, labelFor };
}

export function useVocabulary(name) {
  const [terms, setTerms] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let live = true;
    loadVocabulary(name)
      .then((t) => live && setTerms(t))
      .catch((e) => live && setError(e));
    return () => {
      live = false;
    };
  }, [name]);

  const { options, labelFor } = deriveVocabulary(terms);
  return { options, labelFor, loading: terms === null && !error, error };
}
