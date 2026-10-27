import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SearchResults from '../SearchResults';

// SCRUM-1463: the journal sits on the publication date's line, with the rest of
// the bibliographic info, instead of in its own section (which a saved profile
// left below the matching text). A journal match shows as a "resource" row.

const mockState = {
  search: {
    searchResults: [],
    searchSuccess: true,
    searchError: false,
    crossReferenceResults: {},
    curiePDFIDsMap: {},
    searchDisplayPrefs: null,
  },
  isLogged: { isSignedIn: false, cognitoObserver: false },
};

jest.mock('react-redux', () => ({
  useSelector: (fn) => fn(mockState),
  useDispatch: () => jest.fn(),
}));

jest.mock('../../../api', () => ({ api: { get: jest.fn() } }));

const reference = {
  curie: 'AGRKB:101000000000001',
  title: 'Shared targets of two toxicants',
  citation: 'Doe J, (2026) Shared targets of two toxicants. Toxicology and applied pharmacology 506:117660',
  resource_title: 'Toxicology and applied pharmacology',
  date_published: '2026-01-15',
  abstract: null,
  authors: [],
  cross_references: [],
  highlight: { resource: ['<em>Toxicology</em> and applied pharmacology'] },
};

function renderResults(results) {
  mockState.search = { ...mockState.search, searchResults: results };
  return render(<MemoryRouter><SearchResults /></MemoryRouter>);
}

test('the journal is on the publication date line, left of the date', () => {
  renderResults([reference]);
  // one line holds both, journal first
  const line = screen.getByText((content, element) =>
    element.classList.contains('searchRow-other') &&
    element.textContent === 'Journal: Toxicology and applied pharmacologyPublication Date: 2026-01-15');
  expect(line).toBeInTheDocument();
});

test('the journal comes before the matching text', () => {
  renderResults([reference]);
  const journal = screen.getByText('Journal: Toxicology and applied pharmacology');
  const matching = screen.getByText(/Matching Text:/);
  // eslint-disable-next-line no-bitwise
  expect(journal.compareDocumentPosition(matching) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('a journal match shows as a resource row in the matching text', () => {
  renderResults([reference]);
  expect(screen.getByText('resource')).toHaveClass('highlight-label');
});

test('without a resource title the journal falls back to the citation', () => {
  renderResults([{ ...reference, resource_title: null }]);
  expect(screen.getByText('Journal: Toxicology and applied pharmacology 506:117660')).toBeInTheDocument();
});

test('without any journal only the date shows', () => {
  renderResults([{ ...reference, resource_title: null, citation: '' }]);
  expect(screen.queryByText(/Journal:/)).not.toBeInTheDocument();
  expect(screen.getByText('Publication Date: 2026-01-15')).toBeInTheDocument();
});
