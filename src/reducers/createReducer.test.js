import createReducer from './createReducer';

// A fresh state per test. createReducer(undefined, ...) hands back the module-level
// initialState by identity, so sharing it across cases lets one test's dispatch leak into
// the next -- which is exactly the aliasing bug these tests also cover.
const freshState = () => ({
  ...createReducer(undefined, { type: '@@INIT' }),
  updateMessages: [],
  updateFailure: 0,
});

const created = (state, value, subField = 'curie') => createReducer(state, {
  type: 'UPDATE_BUTTON_CREATE',
  payload: {
    responseMessage: 'update success',
    index: 0, value, pmidOrAlliance: 'alliance', field: null, subField,
  },
});

const failed = (state, message) => createReducer(state, {
  type: 'UPDATE_BUTTON_CREATE',
  payload: {
    responseMessage: message,
    index: 0, value: null, pmidOrAlliance: 'alliance', field: null, subField: 'curie',
  },
});

describe('UPDATE_BUTTON_CREATE redirect', () => {
  test('a create that returns a curie redirects to it', () => {
    const next = created(freshState(), 'AGRKB:101000001995035');
    expect(next.redirectToBiblio).toBe(true);
    expect(next.redirectCurie).toBe('AGRKB:101000001995035');
    expect(next.updateFailure).toBe(0);
    expect(next.updateMessages).toEqual([]);
  });

  test('a create that returns no id reports instead of redirecting to nothing', () => {
    // redirecting on a null id lands the curator on ?referenceCurie=null with no error --
    // silent, and indistinguishable from a broken Biblio page
    const next = created(freshState(), null);
    expect(next.redirectToBiblio).toBe(false);
    expect(next.updateFailure).toBe(1);
    expect(next.updateMessages).toHaveLength(1);
    expect(next.updateMessages[0]).toContain('created');
    expect(next.updateMessages[0]).toContain('curie');
  });

  test('undefined is treated the same as null', () => {
    const next = created(freshState(), undefined);
    expect(next.redirectToBiblio).toBe(false);
    expect(next.updateFailure).toBe(1);
    expect(next.updateMessages).toHaveLength(1);
  });

  test('a genuine failure still reports and does not redirect', () => {
    const next = failed(freshState(), 'error: reference/ : boom');
    expect(next.redirectToBiblio).toBe(false);
    expect(next.updateFailure).toBe(1);
    expect(next.updateMessages).toEqual(['error: reference/ : boom']);
  });
});

describe('update alert lifetime', () => {
  test('a dispatch never mutates the state it was given', () => {
    // .push() on an aliased state.updateMessages would corrupt the previous state object,
    // and for an untouched store that array is the module-level initialState
    const before = freshState();
    created(before, null);
    expect(before.updateMessages).toEqual([]);
    expect(before.updateFailure).toBe(0);
  });

  test('the initial state is not corrupted by dispatches against it', () => {
    // each createReducer(undefined, ...) hands back the same module-level object, so a push
    // against one of these would show up in the assertion below
    created(createReducer(undefined, { type: '@@INIT' }), null);
    created(createReducer(undefined, { type: '@@INIT' }), null);
    expect(createReducer(undefined, { type: '@@INIT' }).updateMessages).toEqual([]);
  });

  test('starting a new create clears the previous attempt message', () => {
    const stale = created(freshState(), null);
    expect(stale.updateMessages).toHaveLength(1);
    for (const type of ['CREATE_SET_PMID_CREATE_LOADING', 'CREATE_SET_ALLIANCE_CREATE_LOADING']) {
      const next = createReducer(stale, { type, payload: true });
      expect(next.updateMessages).toEqual([]);
      expect(next.updateFailure).toBe(0);
    }
  });

  test('arriving at Create drops an alert left over from a previous visit', () => {
    // clearing at create-start only covers a second create without leaving the page; this is
    // the curator who read the message, went to Search as it told them to, and came back
    const stale = created(freshState(), null);
    expect(stale.updateMessages).toHaveLength(1);
    const onMount = createReducer(stale, { type: 'RESET_CREATE_ALERT' });
    expect(onMount.updateMessages).toEqual([]);
    expect(onMount.updateFailure).toBe(0);
    expect(onMount.updateAlert).toBe(0);
  });

  test('the mount reset leaves everything else alone', () => {
    const stale = { ...created(freshState(), null), pmid: '31896237', modIdent: 'WBPaper1' };
    const onMount = createReducer(stale, { type: 'RESET_CREATE_ALERT' });
    expect(onMount.pmid).toBe('31896237');
    expect(onMount.modIdent).toBe('WBPaper1');
  });

  test('two failures in a row do not stack duplicates from an earlier state', () => {
    const first = failed(freshState(), 'error: boom');
    const second = failed(first, 'error: boom');
    // second builds on first legitimately, but first itself must be untouched
    expect(first.updateMessages).toHaveLength(1);
    expect(second.updateMessages).toHaveLength(2);
  });
});
