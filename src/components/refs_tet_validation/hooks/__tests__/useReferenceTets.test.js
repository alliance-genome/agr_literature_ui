import { resolveOne, fetchTets, fetchTetsBatch } from '../useReferenceTets';
import { api } from '../../../../api';

jest.mock('../../../../api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
}));

beforeEach(() => {
  api.get.mockReset();
  api.post.mockReset();
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
    // 1 initial + 5 backoff retries
    expect(api.get).toHaveBeenCalledTimes(6);
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
    // 1 initial + 5 backoff retries
    expect(api.get).toHaveBeenCalledTimes(6);
  });
});

describe('fetchTetsBatch', () => {
  test('no curies → no request, empty tags/counts/entries', async () => {
    const out = await fetchTetsBatch([]);
    expect(out).toEqual({
      tags: {},
      counts: {},
      entries: {},
      validation: {},
      filterFlags: {},
      discovery: null,
    });
    expect(api.post).not.toHaveBeenCalled();
  });

  test('posts curies (no filters) to /by_references and returns tags + counts + entries', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        tags: {
          'AGRKB:1': [{ topic_entity_tag_id: 1 }],
          'AGRKB:2': [],
        },
        counts: {
          'AGRKB:1': { 'ATP:1': { entity_pos: 1, total: 1 } },
          'AGRKB:2': {},
        },
        entries: {
          'AGRKB:1': { 'ATP:1': [{ kind: 'entity-pos', count: 1 }] },
          'AGRKB:2': {},
        },
      },
    });
    const out = await fetchTetsBatch(['AGRKB:1', 'AGRKB:2']);
    expect(api.post).toHaveBeenCalledWith('/topic_entity_tag/by_references', {
      curies_or_reference_ids: ['AGRKB:1', 'AGRKB:2'],
    });
    expect(out.tags['AGRKB:1']).toHaveLength(1);
    expect(out.tags['AGRKB:2']).toEqual([]);
    expect(out.counts['AGRKB:1']).toEqual({ 'ATP:1': { entity_pos: 1, total: 1 } });
    expect(out.counts['AGRKB:2']).toEqual({});
    expect(out.entries['AGRKB:1']).toEqual({ 'ATP:1': [{ kind: 'entity-pos', count: 1 }] });
    expect(out.entries['AGRKB:2']).toEqual({});
  });

  test('sends only non-empty filters in the request body', async () => {
    api.post.mockResolvedValueOnce({ data: { tags: {}, counts: {} } });
    await fetchTetsBatch(['AGRKB:1'], {
      topics: ['ATP:0000122'],
      confidence_levels: [],
      negated_confidence_levels: ['NEG'],
      confidence_score_min: 0.5,
      confidence_score_max: 1,
      entity_types: ['ATP:0000005'],
      entities: [],
      data_novelty: null,
    });
    expect(api.post).toHaveBeenCalledWith('/topic_entity_tag/by_references', {
      curies_or_reference_ids: ['AGRKB:1'],
      filters: {
        topics: ['ATP:0000122'],
        negated_confidence_levels: ['NEG'],
        confidence_score_min: 0.5,
        confidence_score_max: 1,
        entity_types: ['ATP:0000005'],
      },
    });
  });

  test('tolerates an older backend returning a bare { curie: tets[] } map', async () => {
    api.post.mockResolvedValueOnce({
      data: { 'AGRKB:1': [{ topic_entity_tag_id: 1 }] },
    });
    const out = await fetchTetsBatch(['AGRKB:1']);
    expect(out.tags['AGRKB:1']).toEqual([{ topic_entity_tag_id: 1 }]);
    expect(out.counts['AGRKB:1']).toEqual({});
    expect(out.entries['AGRKB:1']).toBeNull();
    // No discovery key from an older backend => null (derive columns/sources
    // from raw tags).
    expect(out.discovery).toBeNull();
  });

  test('returns the batch-global discovery aggregate when present', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        tags: { 'AGRKB:1': [] },
        counts: {},
        discovery: {
          topics: [{ curie: 'ATP:0000122', name: 'phenotype' }],
          sources: [
            {
              label: 'phenotype neural network / WB',
              method: 'phenotype neural network',
            },
          ],
        },
      },
    });
    const out = await fetchTetsBatch(['AGRKB:1']);
    expect(out.discovery).toEqual({
      topics: [{ curie: 'ATP:0000122', name: 'phenotype' }],
      sources: [
        {
          label: 'phenotype neural network / WB',
          method: 'phenotype neural network',
        },
      ],
    });
  });

  test('merges + dedupes discovery across chunks (topics by curie, sources by label)', async () => {
    // TETS_BATCH_SIZE is 50, so 60 curies split into two chunks -> two POSTs,
    // each returning its own (overlapping) discovery. The merge unions them and
    // uppercases topic curies for dedupe.
    const many = Array.from({ length: 60 }, (_, i) => `AGRKB:${i + 1}`);
    api.post
      .mockResolvedValueOnce({
        data: {
          tags: {},
          discovery: {
            topics: [{ curie: 'atp:0000122', name: 'phenotype' }],
            sources: [{ label: 'src A' }],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          tags: {},
          discovery: {
            topics: [
              { curie: 'ATP:0000122', name: 'phenotype' },
              { curie: 'ATP:0000005', name: 'gene' },
            ],
            sources: [{ label: 'src A' }, { label: 'src B' }],
          },
        },
      });
    const out = await fetchTetsBatch(many);
    expect(api.post).toHaveBeenCalledTimes(2);
    const curies = out.discovery.topics.map((t) => t.curie).sort();
    expect(curies).toEqual(['ATP:0000005', 'ATP:0000122']);
    expect(out.discovery.sources.map((s) => s.label).sort()).toEqual([
      'src A',
      'src B',
    ]);
  });

  test('plumbs server validation + filter_flags maps (null on older backend)', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        tags: { 'AGRKB:1': [], 'AGRKB:2': [] },
        counts: {},
        validation: { 'AGRKB:1': { 'ATP:1': { state: 'positive' } } },
        filter_flags: {
          'AGRKB:1': { 'ATP:1': { has_any: true, my_validation_present: true } },
        },
      },
    });
    const out = await fetchTetsBatch(['AGRKB:1', 'AGRKB:2']);
    expect(out.validation['AGRKB:1']).toEqual({ 'ATP:1': { state: 'positive' } });
    expect(out.filterFlags['AGRKB:1']['ATP:1'].my_validation_present).toBe(true);
    // present in request, absent in the server maps => empty object (aggregated,
    // just no rows), not null.
    expect(out.validation['AGRKB:2']).toEqual({});
    expect(out.filterFlags['AGRKB:2']).toEqual({});
  });

  test('dedupes curies and defaults missing keys to empty arrays', async () => {
    api.post.mockResolvedValueOnce({
      data: { tags: { 'AGRKB:1': [{ x: 1 }] }, counts: {} },
    });
    const out = await fetchTetsBatch(['AGRKB:1', 'AGRKB:1', 'AGRKB:3']);
    expect(api.post).toHaveBeenCalledWith('/topic_entity_tag/by_references', {
      curies_or_reference_ids: ['AGRKB:1', 'AGRKB:3'],
    });
    expect(out.tags['AGRKB:1']).toEqual([{ x: 1 }]);
    expect(out.tags['AGRKB:3']).toEqual([]); // present in request, absent in response
    // The response carried no entries map, so entries are null (derive from raw
    // tags), consistent with the "older backend" case above.
    expect(out.entries['AGRKB:3']).toBeNull();
  });

  test('falls back to per-reference GET when batch endpoint fails', async () => {
    api.post.mockRejectedValue({ response: { status: 404 } });
    api.get
      .mockResolvedValueOnce({ data: [{ topic_entity_tag_id: 11 }] })
      .mockResolvedValueOnce({ data: [{ topic_entity_tag_id: 22 }] });
    const out = await fetchTetsBatch(['AGRKB:1', 'AGRKB:2']);
    expect(out.tags['AGRKB:1']).toEqual([{ topic_entity_tag_id: 11 }]);
    expect(out.tags['AGRKB:2']).toEqual([{ topic_entity_tag_id: 22 }]);
    expect(out.counts['AGRKB:1']).toEqual({});
    expect(out.entries['AGRKB:1']).toBeNull();
    expect(api.get).toHaveBeenCalledWith(
      '/topic_entity_tag/by_reference/AGRKB:1?page=1&page_size=8000'
    );
  });
});
