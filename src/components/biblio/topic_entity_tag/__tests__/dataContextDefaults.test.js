import {
  DATA_CONTEXT_ROOT,
  DATA_CONTEXT_EXPERIMENTALLY_STUDIED,
  defaultDataContext,
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

  test.each(['FB', 'MGI', 'SGD', 'ZFIN', 'RGD', 'XB'])(
    '%s defaults to experimentally studied whatever the shape', (mod) => {
      // Backfill rule 4 (FB) and rule 5 (everyone else) are uniform: any tag
      // gets ATP:0000325. Only WB splits by shape.
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
