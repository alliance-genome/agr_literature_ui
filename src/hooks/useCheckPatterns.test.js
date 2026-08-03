import { api } from '../api';
import {
  deriveCheckPatterns,
  loadCheckPatterns,
  __clearCheckPatternsCache,
} from './useCheckPatterns';

jest.mock('../api', () => ({ api: { get: jest.fn() } }));

const MAP = { ZFIN: '^ZFIN:\\d+$', Xenbase: '^Xenbase:XB-PERS-\\d+$' };

describe('deriveCheckPatterns', () => {
  test('exposes prefix keys and compiled regexFor', () => {
    const { prefixes, regexFor } = deriveCheckPatterns(MAP);
    expect(prefixes).toEqual(['ZFIN', 'Xenbase']);
    expect(regexFor('Xenbase').test('Xenbase:XB-PERS-7')).toBe(true);
    expect(regexFor('Xenbase').test('Xenbase:nope')).toBe(false);
    expect(regexFor('WB')).toBeNull();
  });

  test('handles null map', () => {
    const { prefixes, regexFor } = deriveCheckPatterns(null);
    expect(prefixes).toEqual([]);
    expect(regexFor('ZFIN')).toBeNull();
  });
});

describe('loadCheckPatterns', () => {
  beforeEach(() => {
    __clearCheckPatternsCache();
    api.get.mockReset();
    api.get.mockResolvedValue({ data: MAP });
  });

  test('fetches the entity check/patterns and caches per entity', async () => {
    await loadCheckPatterns('person');
    await loadCheckPatterns('person');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/person_cross_reference/check/patterns');
  });
});
