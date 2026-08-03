import { useEffect, useState } from 'react';
import { api } from '../api';

// Fetches the entity-specific curie-pattern map from the API
// (GET /{entity}_cross_reference/check/patterns -> { prefix: regexString }). The
// prefix keys drive the xref prefix dropdown; the regexes drive validation.

const cache = new Map(); // entity -> Promise<{prefix: regexString}>
export const __clearCheckPatternsCache = () => cache.clear();

export function loadCheckPatterns(entity) {
  if (!cache.has(entity)) {
    cache.set(
      entity,
      api.get(`/${entity}_cross_reference/check/patterns`).then((r) => r.data)
    );
  }
  return cache.get(entity);
}

// Pure: derive the prefix list + a compiled-regex resolver from the raw map.
export function deriveCheckPatterns(map) {
  const m = map || {};
  const prefixes = Object.keys(m);
  const regexFor = (prefix) => (m[prefix] ? new RegExp(m[prefix]) : null);
  return { prefixes, regexFor };
}

export function useCheckPatterns(entity) {
  const [map, setMap] = useState(null);
  useEffect(() => {
    let live = true;
    loadCheckPatterns(entity)
      .then((m) => live && setMap(m))
      .catch(() => live && setMap({}));
    return () => {
      live = false;
    };
  }, [entity]);

  const { prefixes, regexFor } = deriveCheckPatterns(map);
  return { prefixes, regexFor, loading: map === null };
}
