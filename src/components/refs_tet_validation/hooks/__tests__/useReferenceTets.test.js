import { resolveOne, fetchTets } from '../useReferenceTets';
import { api } from '../../../../api';

jest.mock('../../../../api', () => ({
  api: { get: jest.fn() },
}));

beforeEach(() => {
  api.get.mockReset();
  // Make backoff sleeps no-ops in tests so retries run back-to-back.
  jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
    fn();
    return 0;
  });
});

afterEach(() => {
  global.setTimeout.mockRestore();
});

describe('resolveOne', () => {
  test('AGRKB curie hits /reference/{curie}', async () => {
    api.get.mockResolvedValueOnce({
      data: { curie: 'AGRKB:42', title: 'X' },
    });
    const out = await resolveOne('AGRKB:42');
    expect(api.get).toHaveBeenCalledWith('/reference/AGRKB:42');
    expect(out.curie).toBe('AGRKB:42');
  });

  test('non-AGRKB id hits /reference/by_cross_reference/{id}', async () => {
    api.get.mockResolvedValueOnce({
      data: { curie: 'AGRKB:42', title: 'X' },
    });
    const out = await resolveOne('PMID:12345');
    expect(api.get).toHaveBeenCalledWith(
      '/reference/by_cross_reference/PMID:12345'
    );
    expect(out.curie).toBe('AGRKB:42');
  });

  test('returns null on 404 with no retry', async () => {
    api.get.mockRejectedValueOnce({ response: { status: 404 } });
    const out = await resolveOne('PMID:DOES_NOT_EXIST');
    expect(out).toBeNull();
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  test('retries on 5xx and recovers', async () => {
    api.get
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockResolvedValueOnce({ data: { curie: 'AGRKB:7' } });
    const out = await resolveOne('AGRKB:7');
    expect(out.curie).toBe('AGRKB:7');
    expect(api.get).toHaveBeenCalledTimes(3);
  });

  test('gives up after final retry on persistent 5xx', async () => {
    api.get.mockRejectedValue({ response: { status: 500 } });
    const out = await resolveOne('AGRKB:8');
    expect(out).toBeNull();
    expect(api.get).toHaveBeenCalledTimes(4);
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
      '/topic_entity_tag/by_reference/AGRKB:42?page=1&page_size=8000'
    );
  });

  test('falls back to topic_entity_tags property if data is an object', async () => {
    api.get.mockResolvedValueOnce({
      data: { topic_entity_tags: [{ topic_entity_tag_id: 9 }] },
    });
    const tets = await fetchTets('AGRKB:99');
    expect(tets).toEqual([{ topic_entity_tag_id: 9 }]);
  });

  test('returns empty array after retrying network errors', async () => {
    api.get.mockRejectedValue(new Error('network'));
    const tets = await fetchTets('AGRKB:err');
    expect(tets).toEqual([]);
    expect(api.get).toHaveBeenCalledTimes(4);
  });
});
