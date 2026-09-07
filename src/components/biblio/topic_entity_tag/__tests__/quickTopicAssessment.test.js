import {
  NOVELTY_UNSPECIFIED,
  computeCellState,
  applyChecked,
  applyUnchecked,
  conflictsWithValidated,
  stagedTagsFor,
} from '../quickTopicAssessment';

const row = (curie = 'ATP:1', backend = {}) => ({
  topic_curie: curie,
  topic_name: 'test topic',
  assessment_states: backend,
});

describe('applyChecked cross-check rules', () => {
  test('no_data clears the positive columns', () => {
    expect(applyChecked({}, 'no_data')).toEqual({
      no_data: 'checked',
      has_data: 'cleared',
      new_data: 'cleared',
      new_to_db: 'cleared',
      new_to_field: 'cleared',
    });
  });

  test('a New* column implies has_data as "implied", not "checked"', () => {
    expect(applyChecked({}, 'new_to_db')).toEqual({
      new_to_db: 'checked',
      no_data: 'cleared',
      has_data: 'implied',
    });
  });

  test('an explicit has_data check is not downgraded to implied by a later New*', () => {
    const cur = applyChecked({}, 'has_data');
    applyChecked(cur, 'new_to_field');
    expect(cur.has_data).toBe('checked');
  });

  test('never writes cleared over a biocurator-validated column (finding 1)', () => {
    const backend = { has_data: 'validated' };
    expect(applyChecked({}, 'no_data', backend)).toEqual({
      no_data: 'checked',
      new_data: 'cleared',
      new_to_db: 'cleared',
      new_to_field: 'cleared',
      // has_data untouched: the recorded ✓ keeps showing.
    });
    expect(applyChecked({}, 'has_data', { no_data: 'validated' })).toEqual({
      has_data: 'checked',
      // no_data untouched for the same reason.
    });
  });
});

describe('applyUnchecked undo semantics (finding 2)', () => {
  test('undoing the last New* drops the implied has_data and restores pristine', () => {
    const cur = applyChecked({}, 'new_to_db');
    applyUnchecked(cur, 'new_to_db');
    // Nothing checked remains, so leftover cleared markers are dropped too.
    expect(cur).toEqual({});
  });

  test('undoing one of two New* keeps the implied has_data', () => {
    const cur = applyChecked(applyChecked({}, 'new_to_db'), 'new_to_field');
    applyUnchecked(cur, 'new_to_db');
    expect(cur).toEqual({
      new_to_field: 'checked',
      has_data: 'implied',
      no_data: 'cleared',
    });
  });

  test('undoing a New* never drops an explicitly checked has_data', () => {
    const cur = applyChecked(applyChecked({}, 'has_data'), 'new_to_db');
    applyUnchecked(cur, 'new_to_db');
    expect(cur).toEqual({ has_data: 'checked', no_data: 'cleared' });
  });

  test('unchecking has_data cascades to the New* columns that imply it', () => {
    const cur = applyChecked(applyChecked({}, 'new_to_db'), 'has_data');
    applyUnchecked(cur, 'has_data');
    expect(cur).toEqual({});
  });

  test('the reviewer trace: check New to DB, then undo, stages nothing', () => {
    const r = row();
    const cur = applyChecked({}, 'new_to_db');
    applyUnchecked(cur, 'new_to_db');
    const staged = Object.keys(cur).length > 0 ? { [r.topic_curie]: cur } : {};
    expect(stagedTagsFor(staged, r)).toEqual([]);
  });
});

describe('conflictsWithValidated (finding 1 guard)', () => {
  test('no_data conflicts with any validated positive column', () => {
    expect(conflictsWithValidated(row('ATP:1', { has_data: 'validated' }), 'no_data')).toBe(true);
    expect(conflictsWithValidated(row('ATP:1', { new_to_db: 'validated' }), 'no_data')).toBe(true);
    expect(conflictsWithValidated(row('ATP:1', { has_data: 'unvalidated' }), 'no_data')).toBe(false);
  });

  test('a positive column conflicts only with validated no_data', () => {
    expect(conflictsWithValidated(row('ATP:1', { no_data: 'validated' }), 'has_data')).toBe(true);
    expect(conflictsWithValidated(row('ATP:1', { no_data: 'validated' }), 'new_to_field')).toBe(true);
    expect(conflictsWithValidated(row('ATP:1', { no_data: 'unvalidated' }), 'has_data')).toBe(false);
    expect(conflictsWithValidated(row('ATP:1', {}), 'no_data')).toBe(false);
  });
});

describe('computeCellState', () => {
  test('staged overrides win over backend; implied renders as checked', () => {
    const r = row('ATP:1', { has_data: 'unvalidated' });
    expect(computeCellState({ 'ATP:1': { has_data: 'implied' } }, r, 'has_data')).toBe('checked');
    expect(computeCellState({ 'ATP:1': { has_data: 'cleared' } }, r, 'has_data')).toBe('blank');
    expect(computeCellState({}, r, 'has_data')).toBe('unvalidated');
    expect(computeCellState({}, row('ATP:1', { has_data: 'validated' }), 'has_data')).toBe('validated');
    expect(computeCellState({}, row(), 'has_data')).toBe('blank');
  });
});

describe('stagedTagsFor', () => {
  test('a no_data check stages one negated tag', () => {
    const r = row();
    const staged = { [r.topic_curie]: applyChecked({}, 'no_data') };
    expect(stagedTagsFor(staged, r)).toEqual([
      { kind: 'no', novelty: null, label: 'No Data' },
    ]);
  });

  test('implied has_data is folded into the New* tag, not staged separately', () => {
    const r = row();
    const staged = { [r.topic_curie]: applyChecked({}, 'new_to_db') };
    expect(stagedTagsFor(staged, r)).toEqual([
      { kind: 'new', novelty: 'ATP:0000228', label: 'New to DB' },
    ]);
  });

  test('a bare has_data check stages an unspecified-novelty positive tag', () => {
    const r = row();
    const staged = { [r.topic_curie]: applyChecked({}, 'has_data') };
    expect(stagedTagsFor(staged, r)).toEqual([
      { kind: 'has', novelty: NOVELTY_UNSPECIFIED, label: 'Has data' },
    ]);
  });

  test('a column already biocurator-validated is never re-staged', () => {
    const r = row('ATP:1', { has_data: 'validated' });
    const staged = { [r.topic_curie]: { new_to_db: 'checked' } };
    expect(stagedTagsFor(staged, r)).toEqual([
      { kind: 'new', novelty: 'ATP:0000228', label: 'New to DB' },
    ]);
  });

  test('rows without staged edits stage nothing', () => {
    expect(stagedTagsFor({}, row())).toEqual([]);
  });
});
