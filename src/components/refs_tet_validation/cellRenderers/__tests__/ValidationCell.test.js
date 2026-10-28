import React from 'react';
import { render, screen } from '@testing-library/react';
import ValidationCell from '../ValidationCell';
import {
  VALIDATION_FILTER_KEYS,
  VALIDATION_STATE_LABELS,
} from '../../helpers/groupTets';

// The cell only needs the species lookup and the curator's MOD from the store.
let mockCognitoMod = 'WB';
jest.mock('react-redux', () => ({
  useSelector: (selector) =>
    selector({
      biblio: { curieToNameTaxon: {} },
      isLogged: { cognitoMod: mockCognitoMod, testerMod: 'No' },
    }),
}));
// Rendered only on the "no curator assessment yet" path; not under test here.
jest.mock('../CellValidationStrip', () => () => <div data-testid="strip" />);

// One server by_curator group from a curator of `mod`.
const group = (name, negated, mod) => ({
  name,
  negated,
  sources: [{
    method: 'abc_literature_system',
    label: `abc_literature_system / ${mod}`,
  }],
});

// Pills are found by their tooltip, which starts with the answer.
const Y_PILL = /^Y \(data present\):/;
const N_PILL = /^N \(no data\):/;

const cellWith = (validation) => ({
  value: { tets: [], validation },
  colDef: { cellRendererParams: { topicCurie: 'ATP:0001' } },
  data: { curie: 'AGRKB:101' },
});

beforeEach(() => {
  mockCognitoMod = 'WB';
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
          by_curator: [{
            name: 'curator_a',
            negated: false,
            sources: [{
              method: 'abc_literature_system',
              label: 'abc_literature_system / WB',
            }],
          }],
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

  test('renders "conflict" when curators of the same MOD disagree, with a Y/N mark per curator', () => {
    render(
      <ValidationCell
        {...cellWith({
          state: 'conflict',
          positives: 1,
          negatives: 1,
          by_curator: [
            group('curator_a', false, 'WB'),
            group('curator_b', true, 'WB'),
          ],
        })}
      />
    );
    expect(screen.getByText('conflict (WB)')).toBeInTheDocument();
    expect(screen.getByTitle(Y_PILL)).toHaveTextContent('Y(WB)');
    expect(screen.getByTitle(N_PILL)).toHaveTextContent('N(WB)');
    expect(screen.getByTitle('assessed Y (data present for this topic)')).toHaveTextContent('Y');
    expect(screen.getByTitle('assessed N (no data for this topic)')).toHaveTextContent('N');
  });

  test('falls back to the validation strip when no curator has assessed', () => {
    render(<ValidationCell {...cellWith(null)} />);
    expect(screen.getByTestId('strip')).toBeInTheDocument();
  });
});

// SCRUM-6256: assessments are per MOD, so another MOD's assessment must leave
// the ✓ / ✗ strip available to a curator whose MOD has not assessed yet.
describe('ValidationCell per-MOD assessment (SCRUM-6256)', () => {
  const assessedBy = (mod) => ({
    state: 'positive',
    positives: 1,
    negatives: 0,
    by_curator: [{
      name: 'curator_a',
      negated: false,
      sources: [{
        method: 'abc_literature_system',
        label: `abc_literature_system / ${mod}`,
      }],
    }],
  });

  test('shows the summary and the strip when only another MOD assessed', () => {
    render(<ValidationCell {...cellWith(assessedBy('ZFIN'))} />);
    expect(screen.getByText('Y')).toBeInTheDocument();
    expect(screen.getByTestId('strip')).toBeInTheDocument();
  });

  test('hides the strip once the curator\'s own MOD assessed', () => {
    render(<ValidationCell {...cellWith(assessedBy('WB'))} />);
    expect(screen.getByText('Y')).toBeInTheDocument();
    expect(screen.queryByTestId('strip')).not.toBeInTheDocument();
  });

  test('hides the strip on an assessed cell when the curator has no MOD', () => {
    mockCognitoMod = null;
    render(<ValidationCell {...cellWith(assessedBy('ZFIN'))} />);
    expect(screen.queryByTestId('strip')).not.toBeInTheDocument();
  });
});

// SCRUM-6256: one pill per polarity listing its MODs; other MODs' pills are
// marked so they can't be mistaken for the curator's own MOD's assessment.
describe('ValidationCell MOD pills (SCRUM-6256)', () => {
  test('Y and N from several MODs each show their MOD list, without "conflict"', () => {
    render(
      <ValidationCell
        {...cellWith({
          state: 'conflict',
          positives: 2,
          negatives: 2,
          by_curator: [
            group('fb_curator', false, 'FB'),
            group('zfin_curator', false, 'ZFIN'),
            group('wb_curator', true, 'WB'),
            group('mgi_curator', true, 'MGI'),
          ],
        })}
      />
    );
    const y = screen.getByTitle(Y_PILL);
    const n = screen.getByTitle(N_PILL);
    expect(y).toHaveTextContent('Y(FB, ZFIN)');
    expect(n).toHaveTextContent('N(MGI, WB)');
    // Y has no WB curator -> another MOD's answer; N includes WB -> own.
    expect(y).toHaveClass('tetv-validated-other');
    expect(n).not.toHaveClass('tetv-validated-other');
    expect(screen.queryByText(/conflict/)).not.toBeInTheDocument();
    // Each curator row carries its MOD; other MODs' rows are dimmed.
    expect(screen.getByText('(WB)')).toBeInTheDocument();
    expect(screen.getByTitle(/^Another MOD's assessment \(FB\)/))
      .toHaveClass('tetv-validation-by-other');
    expect(screen.queryByTitle(/^Another MOD's assessment \(WB\)/))
      .not.toBeInTheDocument();
  });

  test('flags a pill as another MOD\'s in its tooltip', () => {
    render(
      <ValidationCell
        {...cellWith({
          state: 'positive',
          positives: 1,
          negatives: 0,
          by_curator: [group('fb_curator', false, 'FB')],
        })}
      />
    );
    const y = screen.getByTitle(Y_PILL);
    expect(y).toHaveClass('tetv-validated-other');
    expect(y).toHaveAttribute(
      'title',
      expect.stringMatching(/not your MOD \(WB\)$/)
    );
  });

  test('derives MODs from raw tets on the non-aggregated path', () => {
    const tet = (mod, negated) => ({
      topic: 'ATP:0001',
      entity: null,
      negated,
      created_by: `${mod}_curator`,
      tag_source: {
        source_method: 'abc_literature_system',
        validation_type: 'professional_biocurator',
        secondary_data_provider_abbreviation: mod,
      },
    });
    render(
      <ValidationCell
        value={[tet('FB', false), tet('WB', true)]}
        colDef={{ cellRendererParams: { topicCurie: 'ATP:0001' } }}
        data={{ curie: 'AGRKB:101' }}
      />
    );
    expect(screen.getByTitle(Y_PILL)).toHaveTextContent('Y(FB)');
    expect(screen.getByTitle(N_PILL)).toHaveTextContent('N(WB)');
  });

  test('without a MOD, no pill is marked as another MOD\'s', () => {
    mockCognitoMod = null;
    render(
      <ValidationCell
        {...cellWith({
          state: 'positive',
          positives: 1,
          negatives: 0,
          by_curator: [group('fb_curator', false, 'FB')],
        })}
      />
    );
    expect(screen.getByTitle(Y_PILL)).not.toHaveClass('tetv-validated-other');
  });
});

// SCRUM-6784: a curator's positive mixed topic + entity tags (e.g. gene
// expression + gene) count as their MOD's Y, so the strip goes away for them.
describe('ValidationCell mixed curator tags (SCRUM-6784)', () => {
  const mixed = (entityName, extra = {}) => ({
    topic: 'ATP:0000010',
    entity_type: 'ATP:0000005',
    entity: `ZFIN:${entityName}`,
    entity_name: entityName,
    negated: false,
    data_context: 'ATP:0000325',
    created_by: 'zfin_curator',
    tag_source: {
      source_method: 'abc_literature_system',
      validation_type: 'professional_biocurator',
      secondary_data_provider_abbreviation: 'ZFIN',
    },
    ...extra,
  });
  const cellWithTets = (tets, validation = null) => ({
    value: { tets, validation },
    colDef: { cellRendererParams: { topicCurie: 'ATP:0000010' } },
    data: { curie: 'AGRKB:101' },
  });

  test('shows a Y for the MOD and hides its strip', () => {
    mockCognitoMod = 'ZFIN';
    render(<ValidationCell {...cellWithTets([mixed('fgf8a'), mixed('shha')])} />);
    expect(screen.getByTitle(Y_PILL)).toHaveTextContent('Y(ZFIN)');
    expect(screen.getByTitle(Y_PILL).title).toMatch(/2 professional biocurator tag\(s\) on this topic with an entity/);
    expect(screen.getByText('2 entity tags')).toHaveAttribute(
      'title', expect.stringContaining('fgf8a, shha'));
    expect(screen.queryByTestId('strip')).not.toBeInTheDocument();
  });

  test('merges into another MOD\'s topic-level Y pill', () => {
    mockCognitoMod = 'WB';
    render(
      <ValidationCell
        {...cellWithTets([mixed('fgf8a')], {
          state: 'positive',
          positives: 1,
          negatives: 0,
          by_curator: [group('wb_curator', false, 'WB')],
        })}
      />
    );
    expect(screen.getByTitle(Y_PILL)).toHaveTextContent('Y(WB, ZFIN)');
    expect(screen.getByText('zfin_curator')).toBeInTheDocument();
    expect(screen.queryByTestId('strip')).not.toBeInTheDocument();
  });

  test('another MOD\'s mixed tags leave the strip for the curator\'s MOD', () => {
    mockCognitoMod = 'WB';
    render(<ValidationCell {...cellWithTets([mixed('fgf8a')])} />);
    expect(screen.getByTitle(Y_PILL)).toHaveClass('tetv-validated-other');
    expect(screen.getByTestId('strip')).toBeInTheDocument();
  });

  test('negative or pure entity tags show nothing', () => {
    mockCognitoMod = 'ZFIN';
    render(
      <ValidationCell
        {...cellWithTets([
          mixed('fgf8a', { negated: true }),
          mixed('fgf8a', { topic: 'ATP:0000005' }),
        ])}
      />
    );
    expect(screen.queryByTitle(Y_PILL)).not.toBeInTheDocument();
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
