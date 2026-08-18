import createReducer from './createReducer';

const dispatchTo = (state, value, subField = 'curie') => createReducer(state, {
  type: 'UPDATE_BUTTON_CREATE',
  payload: {
    responseMessage: 'update success',
    index: 0, value, pmidOrAlliance: 'alliance', field: null, subField,
  },
});

describe('UPDATE_BUTTON_CREATE redirect', () => {
  const base = createReducer(undefined, { type: '@@INIT' });

  test('a create that returns a curie redirects to it', () => {
    const next = dispatchTo(base, 'AGRKB:101000001995035');
    expect(next.redirectToBiblio).toBe(true);
    expect(next.redirectCurie).toBe('AGRKB:101000001995035');
    expect(next.updateFailure).toBe(0);
    expect(next.updateMessages).toEqual([]);
  });

  test('a create that returns no id reports instead of redirecting to nothing', () => {
    // Redirecting on a null id lands the curator on ?referenceCurie=null with no error --
    // silent, and indistinguishable from a broken Biblio page.
    const next = dispatchTo(base, null);
    expect(next.redirectToBiblio).toBe(false);
    expect(next.updateFailure).toBe(1);
    expect(next.updateMessages.join(' ')).toContain('created');
    expect(next.updateMessages.join(' ')).toContain('curie');
  });

  test('undefined is treated the same as null', () => {
    const next = dispatchTo(base, undefined);
    expect(next.redirectToBiblio).toBe(false);
    expect(next.updateFailure).toBe(1);
  });

  test('a genuine failure still reports and does not redirect', () => {
    const next = createReducer(base, {
      type: 'UPDATE_BUTTON_CREATE',
      payload: {
        responseMessage: 'error: reference/ : boom',
        index: 0, value: null, pmidOrAlliance: 'alliance', field: null, subField: 'curie',
      },
    });
    expect(next.redirectToBiblio).toBe(false);
    expect(next.updateFailure).toBe(1);
    expect(next.updateMessages.join(' ')).toContain('boom');
  });
});
