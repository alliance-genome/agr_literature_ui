import React from 'react';
import { render, screen } from '@testing-library/react';
import BreadCrumbs from '../BreadCrumbs';

// SCRUM-1463: the Journal / Resource facet is keyed by resource_id, and the API
// labels each bucket with the journal title. Breadcrumbs must show the title,
// including for an excluded journal, whose bucket drops out of the aggregation.

const mockState = {
  search: {
    searchFacets: {},
    searchFacetsValues: {},
    searchExcludedFacetsValues: {},
    datePubmedAdded: '',
    datePubmedModified: '',
    datePublished: '',
    dateCreated: '',
    confidenceScore: [0, 1],
    searchResultsCount: 0,
    searchMode: 'simple',
    advancedTopicQuery: null,
  },
};

jest.mock('react-redux', () => ({
  useSelector: (fn) => fn(mockState),
  useDispatch: () => jest.fn(),
}));

function setSearchState(next) {
  mockState.search = { ...mockState.search, ...next };
}

const RESOURCE_FACET = 'resource_id.keyword';
const genetics = { key: '9001', doc_count: 2, name: 'Genetics', curie: 'AGRKB:102000000009001' };

beforeEach(() => {
  setSearchState({ searchFacets: {}, searchFacetsValues: {}, searchExcludedFacetsValues: {} });
});

test('a selected resource shows its journal title', () => {
  setSearchState({
    searchFacets: { [RESOURCE_FACET]: { buckets: [genetics] } },
    searchFacetsValues: { [RESOURCE_FACET]: ['9001'] },
  });
  render(<BreadCrumbs />);
  expect(screen.getByText(/Journal \/ Resource: Genetics/)).toBeInTheDocument();
});

test('an excluded resource keeps its title after its bucket drops out', () => {
  setSearchState({ searchFacets: { [RESOURCE_FACET]: { buckets: [genetics] } } });
  const { rerender } = render(<BreadCrumbs />);

  // excluding the journal removes its bucket from the next aggregation
  setSearchState({
    searchFacets: { [RESOURCE_FACET]: { buckets: [] } },
    searchExcludedFacetsValues: { [RESOURCE_FACET]: ['9001'] },
  });
  rerender(<BreadCrumbs />);

  expect(screen.getByText(/Exclude Journal \/ Resource: Genetics/)).toBeInTheDocument();
  expect(screen.queryByText(/Resource: 9001/)).not.toBeInTheDocument();
});

test('a resource never seen falls back to its id', () => {
  setSearchState({ searchExcludedFacetsValues: { [RESOURCE_FACET]: ['42'] } });
  render(<BreadCrumbs />);
  expect(screen.getByText(/Exclude Journal \/ Resource: 42/)).toBeInTheDocument();
});
