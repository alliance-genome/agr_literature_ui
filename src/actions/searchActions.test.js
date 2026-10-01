import { api } from '../api';
import { fetchAdvancedFacetsVocab, SEARCH_SET_ADVANCED_FACETS_VOCAB } from './searchActions';

jest.mock('../api', () => ({ api: { post: jest.fn(), get: jest.fn() } }));

const flush = async () => { for (let i = 0; i < 10; i++) { await Promise.resolve(); } };

// A third-party pipeline source (SCRUM-6338): data_provider is where the data came
// from, secondary_data_provider_abbreviation is the MOD that owns it.
const GEO_SOURCE = {
  source_method: 'GEO dataset association pipeline',
  data_provider: 'GEO',
  secondary_data_provider_abbreviation: 'FB',
};
const WB_SOURCE = {
  source_method: 'WB curation',
  data_provider: 'WB',
  secondary_data_provider_abbreviation: 'WB',
};

// The fallback list: the search aggregation returns no source methods, so they are
// derived from /tag_source/all and scoped to the selected MOD.
const sourceMethodsFor = async (mods) => {
  api.post.mockResolvedValue({ data: { aggregations: {} } });
  api.get.mockResolvedValue({ data: [GEO_SOURCE, WB_SOURCE] });
  const dispatch = jest.fn();
  const getState = () => ({ search: { searchFacetsValues: { 'mods_in_corpus.keyword': mods } } });
  fetchAdvancedFacetsVocab()(dispatch, getState);
  await flush();
  const action = dispatch.mock.calls.map(([a]) => a).find((a) => a.type === SEARCH_SET_ADVANCED_FACETS_VOCAB);
  return action ? action.payload.facets.source_methods.buckets.map((b) => b.key) : [];
};

describe('fetchAdvancedFacetsVocab source methods', () => {
  beforeEach(() => { api.post.mockReset(); api.get.mockReset(); });

  it('scopes a source to the MOD that owns it, not to its data_provider', async () => {
    expect(await sourceMethodsFor(['FB'])).toEqual(['GEO dataset association pipeline']);
  });

  it('does not offer another MOD\'s source', async () => {
    expect(await sourceMethodsFor(['WB'])).toEqual(['WB curation']);
  });
});
