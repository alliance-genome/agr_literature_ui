// Pure helpers for cross-reference curie entry/validation. Kept free of React so
// they are unit-testable directly (the repo's hook/util test pattern).

export function splitCurie(curie) {
  const s = curie || '';
  const i = s.indexOf(':');
  if (i < 0) return { prefix: s, id: '' };
  return { prefix: s.slice(0, i), id: s.slice(i + 1) };
}

export function joinCurie(prefix, id) {
  return `${prefix}:${(id || '').trim()}`;
}

// Match a (possibly legacy-cased) prefix to the canonical key from /check/patterns,
// case-insensitively (e.g. legacy 'XenBase' -> 'Xenbase'). Unknown prefixes are
// returned unchanged.
export function normalizePrefix(prefix, knownPrefixes) {
  const hit = (knownPrefixes || []).find(
    (k) => k.toLowerCase() === String(prefix || '').toLowerCase()
  );
  return hit || prefix;
}

// True when the curie is valid for its prefix. A prefix with no pattern is allowed
// (unvalidated), mirroring the backend (unknown prefix -> not rejected).
export function validateCurie(prefix, id, regexFor) {
  const re = regexFor(prefix);
  if (!re) return true;
  return re.test(joinCurie(prefix, id));
}
