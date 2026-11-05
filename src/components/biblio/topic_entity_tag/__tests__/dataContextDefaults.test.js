import {
  DATA_CONTEXT_ROOT,
  DATA_CONTEXT_EXPERIMENTAL_DATA,
  DATA_CONTEXT_EXPERIMENTALLY_STUDIED_ENTITY,
  CURATOR_VALIDATION_DATA_CONTEXT,
  defaultDataContext,
  hidesDataContextPulldown,
} from '../dataContextDefaults';

describe('defaultDataContext (SCRUM-6815 cutover off ATP:0000325)', () => {
  test('WB: topic tags take the root, entities are experimentally studied entities', () => {
    // Ceri on SCRUM-5697: WB topic tags take ATP:0000323 and entities are
    // experimentally studied; ATP:0000406 replaces the deprecated ATP:0000325.
    expect(defaultDataContext('WB', false)).toBe(DATA_CONTEXT_ROOT);
    expect(defaultDataContext('WB', true)).toBe(DATA_CONTEXT_EXPERIMENTALLY_STUDIED_ENTITY);
  });

  test('FB defaults to experimental data whatever the shape', () => {
    // Gillian: ATP:0000405 on everything, and their tags were backfilled to it,
    // so a curator-created FB tag has to match or it never looks like a duplicate.
    expect(defaultDataContext('FB', false)).toBe(DATA_CONTEXT_EXPERIMENTAL_DATA);
    expect(defaultDataContext('FB', true)).toBe(DATA_CONTEXT_EXPERIMENTAL_DATA);
  });

  test('ZFIN splits by shape: entities are experimentally studied entities', () => {
    expect(defaultDataContext('ZFIN', true)).toBe(DATA_CONTEXT_EXPERIMENTALLY_STUDIED_ENTITY);
    expect(defaultDataContext('ZFIN', false)).toBe(DATA_CONTEXT_EXPERIMENTAL_DATA);
  });

  test.each(['MGI', 'SGD', 'RGD', 'XB'])(
    '%s defaults to experimental data whatever the shape', (mod) => {
      expect(defaultDataContext(mod, false)).toBe(DATA_CONTEXT_EXPERIMENTAL_DATA);
      expect(defaultDataContext(mod, true)).toBe(DATA_CONTEXT_EXPERIMENTAL_DATA);
    });

  test('an unknown or missing mod falls back to experimental data', () => {
    // The same fallback as the server, so an unresolved accessLevel sends what
    // the server would have filled in.
    expect(defaultDataContext(undefined, false)).toBe(DATA_CONTEXT_EXPERIMENTAL_DATA);
    expect(defaultDataContext(null, true)).toBe(DATA_CONTEXT_EXPERIMENTAL_DATA);
    expect(defaultDataContext('', false)).toBe(DATA_CONTEXT_EXPERIMENTAL_DATA);
  });

  test.each(['WB', 'FB', 'ZFIN', 'MGI', 'SGD', 'RGD', 'XB', undefined])(
    '%s never defaults to the deprecated ATP:0000325', (mod) => {
      expect(defaultDataContext(mod, false)).not.toBe('ATP:0000325');
      expect(defaultDataContext(mod, true)).not.toBe('ATP:0000325');
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
