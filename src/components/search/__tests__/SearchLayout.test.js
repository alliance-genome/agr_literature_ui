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

// The grid unmounts on every search (results are cleared while loading). This
// mock records how the persistRef store behaves across that remount: it writes
// a marker on first mount and reads it back on the next mount. If SearchLayout
// holds the store in a stable ref, the marker survives the remount.
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

test('grid persistence store survives the unmount/remount of a new search', () => {
  const { rerender } = render(<SearchLayout />);

  // Switch to the topic grid view; this mounts the grid once.
  fireEvent.click(screen.getByText(/Topic grid/i));
  expect(screen.getByTestId('tet-grid')).toBeInTheDocument();
  expect(mockGrid.mounts).toBe(1);

  // A new search (pagination/filter change) clears results while loading —
  // referenceIds becomes empty so the grid unmounts.
  setSearchState({ searchResults: [], searchLoading: true });
  rerender(<SearchLayout />);
  expect(screen.queryByTestId('tet-grid')).not.toBeInTheDocument();
  expect(mockGrid.unmounts).toBe(1);

  // Results return — the grid remounts and must read back the marker it stored
  // before the unmount, proving the persistence container is stable.
  setSearchState({
    searchResults: [{ curie: 'AGRKB:101000000000002' }],
    searchLoading: false,
  });
  rerender(<SearchLayout />);
  expect(screen.getByTestId('tet-grid')).toBeInTheDocument();
  expect(mockGrid.mounts).toBe(2);
  expect(mockGrid.sawOnRemount).toBe('kept-selection');
});
