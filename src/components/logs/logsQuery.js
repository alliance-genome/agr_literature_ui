// Translation between the /logs query string and the page's filter state.
//
// Kept pure and separate from the page so the deep links the Reports page emits
// (?dir=QC&family=…&mode=history) can be tested without rendering anything.

const SCOPES = ['mod', 'all', 'shared'];

// The Reports page links use mode=history; the page state calls it 'all'.
const readMode = (value) => (value === 'history' || value === 'all' ? 'all' : 'latest');

export function filtersFromQuery(search, defaults) {
  const params = new URLSearchParams(search || '');
  const filters = { ...defaults };

  const mod = params.get('mod');
  if (mod) {
    filters.mod = mod;
    filters.scope = 'mod';
  }

  const scope = params.get('scope');
  if (SCOPES.includes(scope)) filters.scope = scope;

  if (params.has('mode')) filters.mode = readMode(params.get('mode'));
  if (params.has('dir')) filters.directory = params.get('dir');
  if (params.has('family')) filters.family = params.get('family');

  return filters;
}

export function queryFromFilters(filters, defaults) {
  const params = new URLSearchParams();
  const add = (key, value, fallback) => {
    if (value && value !== fallback) params.set(key, value);
  };

  add('scope', filters.scope, defaults.scope);
  add('mod', filters.scope === 'mod' ? filters.mod : null, defaults.mod);
  add('mode', filters.mode === 'all' ? 'all' : null, null);
  add('dir', filters.directory, defaults.directory);
  add('family', filters.family, defaults.family);

  const query = params.toString();
  return query ? `?${query}` : '';
}
