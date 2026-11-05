import {
  DATA_CONTEXT_ROOT,
  DATA_CONTEXT_EXPERIMENTALLY_STUDIED,
  DATA_CONTEXT_EXPERIMENTAL_DATA,
  DATA_CONTEXT_EXPERIMENTALLY_STUDIED_ENTITY,
  CURATOR_VALIDATION_DATA_CONTEXT,
  defaultDataContext,
  hidesDataContextPulldown,
} from '../dataContextDefaults';

describe('defaultDataContext', () => {
  test('a WB topic-only tag defaults to the data context root', () => {
    // Ceri Van Slyke on SCRUM-5697 (2026-09-01): for WB, topic tags take
    // ATP:0000323. The backfill gave WB's existing topic-only tags that value,
    // so a curator-created one has to match or it never looks like a duplicate.
    expect(defaultDataContext('WB', false)).toBe(DATA_CONTEXT_ROOT);
  });

  test('a WB tag with an entity defaults to experimentally studied', () => {
    expect(defaultDataContext('WB', true)).toBe(DATA_CONTEXT_EXPERIMENTALLY_STUDIED);
  });

  test('FB defaults to experimental data whatever the shape', () => {
    // SCRUM-6815: ATP:0000325 is deprecated; FlyBase asked for ATP:0000405 on
    // all of theirs, and their existing tags were moved to it, so a
    // curator-created FB tag has to match or it never looks like a duplicate.
    expect(defaultDataContext('FB', false)).toBe(DATA_CONTEXT_EXPERIMENTAL_DATA);
    expect(defaultDataContext('FB', true)).toBe(DATA_CONTEXT_EXPERIMENTAL_DATA);
  });

  test('ZFIN splits by shape: entities are experimentally studied entities', () => {
    // SCRUM-6815 (Ceri): curator-added entities take ATP:0000406, topic tags
    // ATP:0000405, matching the ZFIN backfill.
    expect(defaultDataContext('ZFIN', true)).toBe(DATA_CONTEXT_EXPERIMENTALLY_STUDIED_ENTITY);
    expect(defaultDataContext('ZFIN', false)).toBe(DATA_CONTEXT_EXPERIMENTAL_DATA);
  });

  test.each(['MGI', 'SGD', 'RGD', 'XB'])(
    '%s defaults to experimentally studied whatever the shape', (mod) => {
      // Backfill rule 5 is uniform: any tag gets ATP:0000325 until the MOD
      // picks a replacement (SCRUM-6815). Only WB splits by shape.
      expect(defaultDataContext(mod, false)).toBe(DATA_CONTEXT_EXPERIMENTALLY_STUDIED);
      expect(defaultDataContext(mod, true)).toBe(DATA_CONTEXT_EXPERIMENTALLY_STUDIED);
    });

  test('an unknown or missing mod falls back to experimentally studied', () => {
    // The server default is ATP:0000325, so an unresolved accessLevel should
    // send what the server would have filled in rather than WB's term.
    expect(defaultDataContext(undefined, false)).toBe(DATA_CONTEXT_EXPERIMENTALLY_STUDIED);
    expect(defaultDataContext(null, false)).toBe(DATA_CONTEXT_EXPERIMENTALLY_STUDIED);
    expect(defaultDataContext('', false)).toBe(DATA_CONTEXT_EXPERIMENTALLY_STUDIED);
  });
});

describe('hidesDataContextPulldown (SCRUM-6553)', () => {
  test('FB hides the pulldown', () => {
    expect(hidesDataContextPulldown('FB')).toBe(true);
  });

  test.each(['WB', 'MGI', 'SGD', 'ZFIN', 'RGD', 'XB'])('%s keeps the pulldown', (mod) => {
    expect(hidesDataContextPulldown(mod)).toBe(false);
  });

  test('an unresolved mod keeps the pulldown', () => {
    // Hiding is an FB-specific accommodation; with no accessLevel yet there is
    // no reason to take the choice away.
    expect(hidesDataContextPulldown(undefined)).toBe(false);
    expect(hidesDataContextPulldown(null)).toBe(false);
    expect(hidesDataContextPulldown('')).toBe(false);
  });
});

describe('CURATOR_VALIDATION_DATA_CONTEXT (SCRUM-6815)', () => {
  test('is experimental data, not the deprecated ATP:0000325', () => {
    // Must match CURATOR_VALIDATION_DATA_CONTEXT on the server, or a bulk
    // assessment and a single-cell one store different tags.
    expect(CURATOR_VALIDATION_DATA_CONTEXT).toBe('ATP:0000405');
  });
});
