import { resolveOne, fetchTets } from '../useReferenceTets';
import { api } from '../../../../api';

jest.mock('../../../../api', () => ({
  api: { get: jest.fn() },
}));

beforeEach(() => api.get.mockReset());

describe('resolveOne', () => {
  test('AGRKB curie hits /reference/{curie}', async () => {
    api.get.mockResolvedValueOnce({
      data: { curie: 'AGRKB:42', title: 'X' },
    });
    const out = await resolveOne('AGRKB:42');
    expect(api.get).toHaveBeenCalledWith('/reference/AGRKB%3A42');
    expect(out.curie).toBe('AGRKB:42');
  });

  test('non-AGRKB id hits /reference/by_cross_reference/{id}', async () => {
    api.get.mockResolvedValueOnce({
      data: { curie: 'AGRKB:42', title: 'X' },
    });
    const out = await resolveOne('PMID:12345');
    expect(api.get).toHaveBeenCalledWith(
      '/reference/by_cross_reference/PMID%3A12345'
    );
    expect(out.curie).toBe('AGRKB:42');
  });

  test('returns null on resolution failure', async () => {
    api.get.mockRejectedValueOnce({ response: { status: 404 } });
    const out = await resolveOne('PMID:DOES_NOT_EXIST');
    expect(out).toBeNull();
  });
});

describe('fetchTets', () => {
  test('returns the array when api responds with array data', async () => {
    api.get.mockResolvedValueOnce({
      data: [{ topic_entity_tag_id: 1 }, { topic_entity_tag_id: 2 }],
    });
    const tets = await fetchTets('AGRKB:42');
    expect(tets).toHaveLength(2);
    expect(api.get).toHaveBeenCalledWith(
      '/topic_entity_tag/by_reference/AGRKB%3A42?page=1&page_size=8000'
    );
  });

  test('falls back to topic_entity_tags property if data is an object', async () => {
    api.get.mockResolvedValueOnce({
      data: { topic_entity_tags: [{ topic_entity_tag_id: 9 }] },
    });
    const tets = await fetchTets('AGRKB:99');
    expect(tets).toEqual([{ topic_entity_tag_id: 9 }]);
  });

  test('returns empty array on error', async () => {
    api.get.mockRejectedValueOnce(new Error('network'));
    const tets = await fetchTets('AGRKB:err');
    expect(tets).toEqual([]);
  });
});
