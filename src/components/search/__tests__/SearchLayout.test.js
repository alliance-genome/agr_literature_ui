import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchLayout from '../SearchLayout';

// Mutable redux state read through the mocked useSelector. Tests mutate this
// then re-render to simulate search-loading transitions.
const mockState = {
  search: {
    searchResults: [],
    searchFacetsValues: {},
    searchLoading: false,
  },
};

jest.mock('react-redux', () => ({
  useSelector: (fn) => fn(mockState),
}));

// Once opened, the grid must stay mounted across searches (remounting an
// autoHeight AgGrid crashes React's reconciler — see SCRUM-6229). This mock
// records mount/unmount counts to assert that, and still exercises the
// persistRef store: it writes a marker on first mount and would read it back
// on any later remount (e.g. leaving and revisiting the search page).
const mockGrid = { mounts: 0, unmounts: 0, sawOnRemount: undefined };

jest.mock('../../refs_tet_validation/TetValidationGrid', () => {
  const ReactLib = require('react');
  return function MockTetValidationGrid(props) {
    ReactLib.useEffect(() => {
      mockGrid.mounts += 1;
      const store = props.persistRef.current;
      if (mockGrid.mounts === 1) {
        store.marker = 'kept-selection';
      } else {
        mockGrid.sawOnRemount = store.marker;
      }
      return () => {
        mockGrid.unmounts += 1;
      };
    }, [props.persistRef]);
    return ReactLib.createElement('div', { 'data-testid': 'tet-grid' }, 'grid');
  };
});

// Heavy children that pull in API calls / redux dispatch — stub them out.
jest.mock('../SearchBar', () => () => null);
jest.mock('../SearchResults', () => () => null);
jest.mock('../SearchOptions', () => () => null);
jest.mock('../BreadCrumbs', () => () => null);
jest.mock('../SearchPagination', () => () => null);
jest.mock('../Facets', () => () => null);

function setSearchState(next) {
  mockState.search = { ...mockState.search, ...next };
}

beforeEach(() => {
  mockGrid.mounts = 0;
  mockGrid.unmounts = 0;
  mockGrid.sawOnRemount = undefined;
  setSearchState({
    searchResults: [{ curie: 'AGRKB:101000000000001' }],
    searchFacetsValues: {},
    searchLoading: false,
  });
});

test('grid stays mounted across a new search once opened', () => {
  const { rerender } = render(<SearchLayout />);

  // Switch to the topic grid view; this mounts the grid once.
  fireEvent.click(screen.getByText(/Topic grid/i));
  expect(screen.getByTestId('tet-grid')).toBeInTheDocument();
  expect(mockGrid.mounts).toBe(1);

  // A new search (pagination/filter change) clears results while loading.
  // The grid must NOT unmount — remounting an autoHeight AgGrid crashes
  // React's reconciler ("removeChild/insertBefore ... not a child of this
  // node") — it is only hidden while the search loads.
  setSearchState({ searchResults: [], searchLoading: true });
  rerender(<SearchLayout />);
  expect(screen.getByTestId('tet-grid')).toBeInTheDocument();
  expect(mockGrid.unmounts).toBe(0);

  // Results return — still the same grid instance, no remount, so the
  // persistence store trivially survives the search.
  setSearchState({
    searchResults: [{ curie: 'AGRKB:101000000000002' }],
    searchLoading: false,
  });
  rerender(<SearchLayout />);
  expect(screen.getByTestId('tet-grid')).toBeInTheDocument();
  expect(mockGrid.mounts).toBe(1);
  expect(mockGrid.unmounts).toBe(0);
});
