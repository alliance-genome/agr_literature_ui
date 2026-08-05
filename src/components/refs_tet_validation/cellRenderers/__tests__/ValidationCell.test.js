import React from 'react';
import { render, screen } from '@testing-library/react';
import ValidationCell from '../ValidationCell';
import {
  VALIDATION_FILTER_KEYS,
  VALIDATION_STATE_LABELS,
} from '../../helpers/groupTets';

// The cell only needs the species lookup from the store.
jest.mock('react-redux', () => ({
  useSelector: (selector) => selector({ biblio: { curieToNameTaxon: {} } }),
}));
// Rendered only on the "no curator assessment yet" path; not under test here.
jest.mock('../CellValidationStrip', () => () => <div data-testid="strip" />);

const cellWith = (validation) => ({
  value: { tets: [], validation },
  colDef: { cellRendererParams: { topicCurie: 'ATP:0001' } },
  data: { curie: 'AGRKB:101' },
});

// SCRUM-6330: the biocurator assessment is the same yes/no judgement as the
// "Data" pills and the has_data advanced-search facet, so it must read Y / N
// rather than positive / negative.
describe('ValidationCell assessment labels (SCRUM-6330)', () => {
  test('renders Y for a positive curator assessment', () => {
    render(
      <ValidationCell
        {...cellWith({
          state: 'positive',
          positives: 1,
          negatives: 0,
          by_curator: [{ name: 'curator_a', negated: false }],
        })}
      />
    );
    expect(screen.getByText('Y')).toBeInTheDocument();
    expect(screen.queryByText('positive')).not.toBeInTheDocument();
  });

  test('renders N for a negative curator assessment', () => {
    render(
      <ValidationCell
        {...cellWith({
          state: 'negative',
          positives: 0,
          negatives: 2,
          by_curator: [{ name: 'curator_b', negated: true }],
        })}
      />
    );
    expect(screen.getByText('N')).toBeInTheDocument();
    expect(screen.queryByText('negative')).not.toBeInTheDocument();
  });

  test('renders "conflict" when curators disagree, with a Y/N mark per curator', () => {
    render(
      <ValidationCell
        {...cellWith({
          state: 'conflict',
          positives: 1,
          negatives: 1,
          by_curator: [
            { name: 'curator_a', negated: false },
            { name: 'curator_b', negated: true },
          ],
        })}
      />
    );
    expect(screen.getByText('conflict')).toBeInTheDocument();
    expect(screen.queryByText('assessment conflict')).not.toBeInTheDocument();
    expect(screen.getByText('Y')).toBeInTheDocument();
    expect(screen.getByText('N')).toBeInTheDocument();
  });

  test('falls back to the validation strip when no curator has assessed', () => {
    render(<ValidationCell {...cellWith(null)} />);
    expect(screen.getByTestId('strip')).toBeInTheDocument();
  });
});

// The labels are display-only: the underlying keys are the server's
// `validation.state` values and are persisted in saved AgGrid filter models,
// so renaming them would silently invalidate both.
describe('validation state keys are unchanged by the relabel (SCRUM-6330)', () => {
  test('filter keys keep their raw server values', () => {
    expect(VALIDATION_FILTER_KEYS).toEqual([
      'unvalidated',
      'positive',
      'negative',
      'conflict',
    ]);
  });

  test('every filter key has a display label', () => {
    VALIDATION_FILTER_KEYS.forEach((key) => {
      expect(VALIDATION_STATE_LABELS[key]).toBeTruthy();
    });
    expect(VALIDATION_STATE_LABELS.positive).toBe('Y');
    expect(VALIDATION_STATE_LABELS.negative).toBe('N');
  });
});
