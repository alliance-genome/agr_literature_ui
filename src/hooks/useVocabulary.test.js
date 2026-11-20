import { api } from '../api';
import { deriveVocabulary, loadVocabulary, __clearVocabCache } from './useVocabulary';

jest.mock('../api', () => ({ api: { get: jest.fn() } }));

const TERMS = [
  { value: 1, label: 'Lab Member', is_obsolete: false },
  { value: 2, label: 'Old Role', is_obsolete: true },
];

describe('deriveVocabulary', () => {
  test('options exclude obsolete; labelFor resolves obsolete + unknown', () => {
    const { options, labelFor } = deriveVocabulary(TERMS);
    expect(options).toEqual([{ value: 1, label: 'Lab Member' }]);
    expect(labelFor(2)).toBe('Old Role'); // obsolete still resolvable
    expect(labelFor(999)).toBe('999'); // unknown -> raw string
    expect(labelFor(null)).toBe('');
  });

  test('handles null/undefined terms', () => {
    const { options, labelFor } = deriveVocabulary(null);
    expect(options).toEqual([]);
    expect(labelFor(1)).toBe('1');
  });
});

describe('loadVocabulary', () => {
  beforeEach(() => {
    __clearVocabCache();
    api.get.mockReset();
    api.get.mockResolvedValue({ data: TERMS });
  });

  test('fetches /vocabulary/{name} and caches per name', async () => {
    const a = await loadVocabulary('lab_position');
    const b = await loadVocabulary('lab_position');
    expect(a).toBe(TERMS);
    expect(b).toBe(TERMS);
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/vocabulary/lab_position');
  });

  test('a rejected fetch is not cached — the next call re-fetches', async () => {
    api.get.mockReset();
    api.get.mockRejectedValueOnce(new Error('boom')).mockResolvedValue({ data: TERMS });
    await expect(loadVocabulary('lab_position')).rejects.toThrow('boom');
    const second = await loadVocabulary('lab_position');
    expect(second).toEqual(TERMS);
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
