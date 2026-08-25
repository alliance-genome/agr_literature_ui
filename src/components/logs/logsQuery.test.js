import { filtersFromQuery, queryFromFilters } from './logsQuery';

const DEFAULTS = {
  scope: 'mod', mod: 'ZFIN', mode: 'latest', directory: '', family: '',
  includeShared: true, hideStale: true, quickFilter: '', dateRange: ''
};

describe('filtersFromQuery', () => {
  test('returns the defaults for an empty query', () => {
    expect(filtersFromQuery('', DEFAULTS)).toEqual(DEFAULTS);
  });

  test('reads a deep link from the Reports page', () => {
    const filters = filtersFromQuery('?dir=QC&family=duplicate_orcid_report&mode=history', DEFAULTS);
    expect(filters).toMatchObject({
      directory: 'QC', family: 'duplicate_orcid_report', mode: 'all'
    });
  });

  test('accepts mode=all as well as mode=history', () => {
    expect(filtersFromQuery('?mode=all', DEFAULTS).mode).toBe('all');
    expect(filtersFromQuery('?mode=latest', DEFAULTS).mode).toBe('latest');
  });

  test('a mod in the query implies scoping to that mod', () => {
    expect(filtersFromQuery('?mod=WB', DEFAULTS)).toMatchObject({ scope: 'mod', mod: 'WB' });
  });

  test('reads an explicit scope', () => {
    expect(filtersFromQuery('?scope=all', DEFAULTS).scope).toBe('all');
    expect(filtersFromQuery('?scope=shared', DEFAULTS).scope).toBe('shared');
  });

  test('ignores an unknown scope rather than breaking the page', () => {
    expect(filtersFromQuery('?scope=sideways', DEFAULTS).scope).toBe('mod');
  });
});

describe('queryFromFilters', () => {
  test('emits nothing when everything is at its default', () => {
    expect(queryFromFilters(DEFAULTS, DEFAULTS)).toBe('');
  });

  test('emits only what differs from the default', () => {
    expect(queryFromFilters({ ...DEFAULTS, directory: 'QC' }, DEFAULTS)).toBe('?dir=QC');
  });

  test('round-trips a drill-down', () => {
    const filters = { ...DEFAULTS, scope: 'all', mode: 'all', family: 'gaf', directory: 'QC' };
    expect(filtersFromQuery(queryFromFilters(filters, DEFAULTS), DEFAULTS))
      .toMatchObject({ scope: 'all', mode: 'all', family: 'gaf', directory: 'QC' });
  });

  test('escapes a family containing url-significant characters', () => {
    expect(queryFromFilters({ ...DEFAULTS, family: 'interaction-mol&x' }, DEFAULTS))
      .toBe('?family=interaction-mol%26x');
  });
});
