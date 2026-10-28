import searchReducer, { INITIAL_FACETS_LIMIT } from '../searchReducer';
import { setSearchFacetsLimits } from '../../actions/searchActions';

// SCRUM-1463: a saved search from before the Journal / Resource facet has no
// limit for it; without one the facet showed no "+Show More".

test('facet limits restored from a saved search keep the defaults for newer facets', () => {
  const initial = searchReducer(undefined, { type: '@@INIT' });
  const saved = { 'pubmed_types.keyword': 40 };
  const state = searchReducer(initial, setSearchFacetsLimits(saved));
  expect(state.searchFacetsLimits['pubmed_types.keyword']).toBe(40);
  expect(state.searchFacetsLimits['resource_id.keyword']).toBe(INITIAL_FACETS_LIMIT);
});
