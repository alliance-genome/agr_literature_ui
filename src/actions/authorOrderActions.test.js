import { api } from '../api';
import { updateBiblioAuthors, mergeAuthors } from './authorOrderActions';
import { mergeAuthorPlanCallCount } from '../utils/authorOrdering';

jest.mock('../api', () => ({ api: { request: jest.fn() } }));

// the thunks defer their dispatches by 500ms to match the existing update actions
const flush = async () => {
  await Promise.resolve();
  jest.runAllTimers();
  await Promise.resolve();
};

const runThunk = async (thunk) => {
  const dispatch = jest.fn();
  const promise = thunk(dispatch);
  // let every awaited phase settle, draining the 500ms timers between them
  for (let i = 0; i < 12; i++) { await flush(); }
  await promise;
  await flush();
  return dispatch;
};

const callsTo = (method) =>
  api.request.mock.calls.map(([cfg]) => cfg).filter((cfg) => cfg.method === method);

describe('updateBiblioAuthors', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    api.request.mockReset();
    api.request.mockResolvedValue({ status: 200, data: {} });
    // the thunk logs failures on purpose; keep the expected noise out of the test output
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.useRealTimers();
  });

  test('never sends author_order on a PATCH', async () => {
    const plan = {
      deletes: [],
      patches: [{ author_id: 1, payload: { reference_curie: 'AGRKB:101', last_name: 'One' } }],
      creates: [],
      finalSequence: [{ kind: 'existing', author_id: 1, author_order: 1 }],
      needsFlatten: false,
    };
    await runThunk(updateBiblioAuthors('AGRKB:101', plan));
    const patches = callsTo('PATCH');
    expect(patches).toHaveLength(1);
    expect(patches[0].data).not.toHaveProperty('author_order');
    expect(callsTo('POST')).toHaveLength(0);
  });

  test('deletes first, then flattens with POST /author/reorder', async () => {
    const plan = {
      deletes: [{ author_id: 2 }],
      patches: [],
      creates: [],
      finalSequence: [
        { kind: 'existing', author_id: 1, author_order: 1 },
        { kind: 'deleting', author_id: 2 },
        { kind: 'existing', author_id: 3, author_order: 3 },
      ],
      needsFlatten: true,
    };
    await runThunk(updateBiblioAuthors('AGRKB:101', plan));
    const urls = api.request.mock.calls.map(([cfg]) => cfg.url);
    expect(urls).toEqual(['/author/2', '/author/reorder']);
    const reorder = callsTo('POST')[0];
    expect(reorder.data).toEqual({
      reference_curie: 'AGRKB:101',
      ordering: [{ author_id: 1, author_order: 1 }, { author_id: 3, author_order: 2 }],
    });
  });

  test('a created author id is resolved into the flatten payload', async () => {
    api.request.mockImplementation(async ({ url }) => {
      if (url === '/author/') { return { status: 201, data: { author_id: 77 } }; }
      return { status: 200, data: {} };
    });
    const plan = {
      deletes: [],
      patches: [],
      creates: [{ payload: { reference_curie: 'AGRKB:101', name: 'Fresh', author_order: 2 } }],
      finalSequence: [
        { kind: 'existing', author_id: 1, author_order: 1 },
        { kind: 'created', createIndex: 0 },
      ],
      needsFlatten: true,
    };
    await runThunk(updateBiblioAuthors('AGRKB:101', plan));
    expect(callsTo('POST')[0].data.author_order).toBe(2); // create keeps its provisional order
    const reorder = callsTo('POST').find((cfg) => cfg.url === '/author/reorder');
    expect(reorder.data.ordering).toEqual([
      { author_id: 1, author_order: 1 },
      { author_id: 77, author_order: 2 },
    ]);
  });

  test('a failed delete stays in the flatten payload and the counter still balances', async () => {
    api.request.mockImplementation(async ({ url, method }) => {
      if (method === 'DELETE' && url === '/author/2') {
        const error = new Error('boom');
        error.response = { data: { detail: 'author busy' } };
        throw error;
      }
      return { status: 200, data: {} };
    });
    const plan = {
      deletes: [{ author_id: 2 }],
      patches: [],
      creates: [],
      finalSequence: [
        { kind: 'existing', author_id: 1, author_order: 1 },
        { kind: 'deleting', author_id: 2 },
      ],
      needsFlatten: true,
    };
    const dispatch = await runThunk(updateBiblioAuthors('AGRKB:101', plan));
    const reorder = callsTo('POST')[0];
    expect(reorder.data.ordering).toEqual([
      { author_id: 1, author_order: 1 },
      { author_id: 2, author_order: 2 },
    ]);
    // one dispatch per call: the failed DELETE plus the reorder
    expect(dispatch).toHaveBeenCalledTimes(2);
    const messages = dispatch.mock.calls.map(([action]) => action.payload.responseMessage);
    expect(messages).toContain('author busy');
    expect(messages).toContain('update success');
  });

  test('dispatches exactly one action per call so the spinner clears', async () => {
    const plan = {
      deletes: [{ author_id: 2 }],
      patches: [{ author_id: 1, payload: { reference_curie: 'AGRKB:101' } }],
      creates: [{ payload: { reference_curie: 'AGRKB:101', author_order: 3 } }],
      finalSequence: [{ kind: 'existing', author_id: 1, author_order: 1 }],
      needsFlatten: true,
    };
    const dispatch = await runThunk(updateBiblioAuthors('AGRKB:101', plan));
    expect(dispatch).toHaveBeenCalledTimes(4); // 1 delete + 1 patch + 1 create + 1 reorder
    dispatch.mock.calls.forEach(([action]) => {
      expect(action.type).toBe('UPDATE_BUTTON_BIBLIO');
    });
  });

  test('reports once without calling reorder when the ordering resolves empty', async () => {
    const plan = {
      deletes: [{ author_id: 1 }],
      patches: [],
      creates: [],
      finalSequence: [{ kind: 'deleting', author_id: 1 }],
      needsFlatten: true,
    };
    const dispatch = await runThunk(updateBiblioAuthors('AGRKB:101', plan));
    expect(api.request.mock.calls.map(([cfg]) => cfg.url)).toEqual(['/author/1']);
    expect(dispatch).toHaveBeenCalledTimes(2); // the delete, plus the accounted-for reorder
  });
});

describe('mergeAuthors', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    api.request.mockReset();
    api.request.mockResolvedValue({ status: 200, data: {} });
    // the thunk logs failures on purpose; keep the expected noise out of the test output
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.useRealTimers();
  });

  const plan = {
    deletes: [{ author_id: 'A2' }, { author_id: 'B2' }],
    parkOrdering: [{ author_id: 'A1', author_order: 4 }, { author_id: 'A3', author_order: 5 }],
    reparents: [{ author_id: 'B1', payload: { reference_curie: 'AGRKB:R1' } }],
    finalOrdering: [
      { author_id: 'A1', author_order: 1 },
      { author_id: 'A3', author_order: 2 },
      { author_id: 'B1', author_order: 3 },
    ],
    needsFlatten: true,
  };

  test('issues delete, park, reparent, flatten in that order', async () => {
    await runThunk(mergeAuthors('AGRKB:R1', plan));
    expect(api.request.mock.calls.map(([cfg]) => `${cfg.method} ${cfg.url}`)).toEqual([
      'DELETE /author/A2',
      'DELETE /author/B2',
      'POST /author/reorder',
      'PATCH /author/B1',
      'POST /author/reorder',
    ]);
  });

  test('the park payload precedes the flatten payload', async () => {
    await runThunk(mergeAuthors('AGRKB:R1', plan));
    const reorders = api.request.mock.calls.map(([cfg]) => cfg)
      .filter((cfg) => cfg.url === '/author/reorder');
    expect(reorders[0].data.ordering).toEqual(plan.parkOrdering);
    expect(reorders[1].data.ordering).toEqual(plan.finalOrdering);
    expect(reorders[0].data.reference_curie).toBe('AGRKB:R1');
  });

  test('the reparent PATCH carries no author_order', async () => {
    await runThunk(mergeAuthors('AGRKB:R1', plan));
    const patch = api.request.mock.calls.map(([cfg]) => cfg).find((cfg) => cfg.method === 'PATCH');
    expect(patch.data).toEqual({ reference_curie: 'AGRKB:R1' });
  });

  test('aborts before parking when a delete fails, and still balances the counter', async () => {
    api.request.mockImplementation(async ({ method }) => {
      if (method === 'DELETE') {
        const error = new Error('nope');
        error.response = { data: { detail: 'cannot delete' } };
        throw error;
      }
      return { status: 200, data: {} };
    });
    const dispatch = await runThunk(mergeAuthors('AGRKB:R1', plan));
    // only the two deletes were attempted: nothing was parked
    expect(api.request.mock.calls.map(([cfg]) => cfg.url)).toEqual(['/author/A2', '/author/B2']);
    // 2 deletes + park + reparent + flatten = 5 counted calls, all accounted for
    expect(dispatch).toHaveBeenCalledTimes(5);
    dispatch.mock.calls.forEach(([action]) => {
      expect(action.type).toBe('MERGE_BUTTON_API_DISPATCH');
      expect(action.payload.mergeType).toBe('mergeData');
    });
  });

  test('skips the park call when parkOrdering is null', async () => {
    await runThunk(mergeAuthors('AGRKB:R1', { ...plan, parkOrdering: null }));
    const reorders = api.request.mock.calls.map(([cfg]) => cfg)
      .filter((cfg) => cfg.url === '/author/reorder');
    expect(reorders).toHaveLength(1);
    expect(reorders[0].data.ordering).toEqual(plan.finalOrdering);
  });

  test('makes no calls for an empty plan', async () => {
    const dispatch = await runThunk(mergeAuthors('AGRKB:R1', {
      deletes: [], parkOrdering: null, reparents: [], finalOrdering: [], needsFlatten: false,
    }));
    expect(api.request).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  test('a merge with no author changes makes no call and reports nothing', async () => {
    // needsFlatten false with a populated finalOrdering: the keepers are already 1..K and
    // nothing was deleted or transferred, so the flatten is neither counted nor issued
    const noChangePlan = {
      deletes: [],
      parkOrdering: null,
      reparents: [],
      finalOrdering: [{ author_id: 'A1', author_order: 1 }, { author_id: 'A2', author_order: 2 }],
      needsFlatten: false,
    };
    expect(mergeAuthorPlanCallCount(noChangePlan)).toBe(0);
    const dispatch = await runThunk(mergeAuthors('AGRKB:R1', noChangePlan));
    expect(api.request).not.toHaveBeenCalled();
    // a report here would decrement a counter that never counted this call
    expect(dispatch).not.toHaveBeenCalled();
  });

  test('a failed reparent drops out of the flatten, which stays contiguous from 1', async () => {
    api.request.mockImplementation(async ({ method }) => {
      if (method === 'PATCH') {
        const error = new Error('boom');
        error.response = { data: { detail: 'reparent refused' } };
        throw error;
      }
      return { status: 200, data: {} };
    });
    const dispatch = await runThunk(mergeAuthors('AGRKB:R1', plan));
    const reorders = api.request.mock.calls.map(([cfg]) => cfg)
      .filter((cfg) => cfg.url === '/author/reorder');
    // the flatten still runs, bringing the keepers back from their parked orders
    expect(reorders).toHaveLength(2);
    // B1 never left reference 2, so naming it here would 422 the whole flatten
    expect(reorders[1].data.ordering).toEqual([
      { author_id: 'A1', author_order: 1 },
      { author_id: 'A3', author_order: 2 },
    ]);
    // still 5 counted calls: 2 deletes + park + failed reparent + flatten
    expect(dispatch).toHaveBeenCalledTimes(5);
    expect(dispatch.mock.calls.map(([action]) => action.payload.responseMessage))
      .toContain('reparent refused');
  });

  test('reports once without calling reorder when every transfer fails and there are no keepers', async () => {
    api.request.mockImplementation(async ({ method }) => {
      if (method === 'PATCH') { throw new Error('boom'); }
      return { status: 200, data: {} };
    });
    const dispatch = await runThunk(mergeAuthors('AGRKB:R1', {
      deletes: [],
      parkOrdering: null,
      reparents: [{ author_id: 'B1', payload: { reference_curie: 'AGRKB:R1' } }],
      finalOrdering: [{ author_id: 'B1', author_order: 1 }],
      needsFlatten: true,
    }));
    expect(api.request.mock.calls.map(([cfg]) => cfg.url)).toEqual(['/author/B1']);
    expect(dispatch).toHaveBeenCalledTimes(2); // the failed reparent, plus the accounted-for reorder
  });

  test('one transfer failing while another succeeds renumbers the survivors', async () => {
    api.request.mockImplementation(async ({ url, method }) => {
      if (method === 'PATCH' && url === '/author/B1') {
        const error = new Error('boom');
        error.response = { data: { detail: 'B1 refused' } };
        throw error;
      }
      return { status: 200, data: {} };
    });
    const mixedPlan = {
      deletes: [],
      parkOrdering: [{ author_id: 'A1', author_order: 5 }, { author_id: 'A3', author_order: 6 }],
      reparents: [
        { author_id: 'B1', payload: { reference_curie: 'AGRKB:R1' } },
        { author_id: 'B2', payload: { reference_curie: 'AGRKB:R1' } },
      ],
      finalOrdering: [
        { author_id: 'A1', author_order: 1 },
        { author_id: 'A3', author_order: 2 },
        { author_id: 'B1', author_order: 3 },
        { author_id: 'B2', author_order: 4 },
      ],
      needsFlatten: true,
    };
    const dispatch = await runThunk(mergeAuthors('AGRKB:R1', mixedPlan));
    const reorders = api.request.mock.calls.map(([cfg]) => cfg)
      .filter((cfg) => cfg.url === '/author/reorder');
    expect(reorders).toHaveLength(2);
    // B1 stayed on reference 2, so naming it would 422 the flatten and strand the parked keepers;
    // B2 arrived and has to be renumbered down into the gap B1 left
    expect(reorders[1].data.ordering).toEqual([
      { author_id: 'A1', author_order: 1 },
      { author_id: 'A3', author_order: 2 },
      { author_id: 'B2', author_order: 3 },
    ]);
    // park + 2 reparents + flatten
    expect(mergeAuthorPlanCallCount(mixedPlan)).toBe(4);
    expect(dispatch).toHaveBeenCalledTimes(mergeAuthorPlanCallCount(mixedPlan));
    expect(dispatch.mock.calls.map(([action]) => action.payload.responseMessage))
      .toContain('B1 refused');
  });

  test('a failed park does not abort: the reparents and the flatten still run', async () => {
    // only a failed DELETE aborts. A failed park leaves the keepers at their original low
    // orders, so the reparents may collide and 422 -- but the flatten still has to run to
    // guarantee reference 1 ends contiguous, and the counter still has to balance.
    let reorderCalls = 0;
    api.request.mockImplementation(async ({ url }) => {
      if (url === '/author/reorder') {
        reorderCalls += 1;
        if (reorderCalls === 1) {
          const error = new Error('boom');
          error.response = { data: { detail: 'park refused' } };
          throw error;
        }
      }
      return { status: 200, data: {} };
    });
    const dispatch = await runThunk(mergeAuthors('AGRKB:R1', plan));
    expect(api.request.mock.calls.map(([cfg]) => `${cfg.method} ${cfg.url}`)).toEqual([
      'DELETE /author/A2',
      'DELETE /author/B2',
      'POST /author/reorder',   // the park, which failed
      'PATCH /author/B1',       // reparents run anyway
      'POST /author/reorder',   // and so does the flatten
    ]);
    expect(mergeAuthorPlanCallCount(plan)).toBe(5);
    expect(dispatch).toHaveBeenCalledTimes(mergeAuthorPlanCallCount(plan));
    expect(dispatch.mock.calls.map(([action]) => action.payload.responseMessage))
      .toContain('park refused');
  });
});

describe('errorMessage shapes reaching the update alert', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    api.request.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { jest.useRealTimers(); console.error.mockRestore(); });

  const planWithOnePatch = {
    deletes: [],
    patches: [{ author_id: 1, payload: { reference_curie: 'AGRKB:101' } }],
    creates: [],
    finalSequence: [{ kind: 'existing', author_id: 1, author_order: 1 }],
    needsFlatten: false,
  };

  const messageFor = async (responseData) => {
    api.request.mockImplementation(async () => {
      const error = new Error('Request failed with status code 422');
      error.response = { data: responseData };
      throw error;
    });
    const dispatch = await runThunk(updateBiblioAuthors('AGRKB:101', planWithOnePatch));
    return dispatch.mock.calls[0][0].payload.responseMessage;
  };

  test('a string detail passes through unchanged', async () => {
    expect(await messageFor({ detail: 'author_order cannot be changed via PATCH' }))
      .toBe('author_order cannot be changed via PATCH');
  });

  test('a pydantic list detail is collapsed to a string, never an array', async () => {
    const message = await messageFor({
      detail: [{ loc: ['body', 'author_order'], msg: 'ensure this value is >= 1', type: 'value_error' }],
    });
    expect(typeof message).toBe('string');
    expect(message).toContain('ensure this value is >= 1');
    expect(message).toContain('author_order');
  });

  test('an unexpected detail shape is still a string', async () => {
    const message = await messageFor({ detail: { unexpected: 'object' } });
    expect(typeof message).toBe('string');
    expect(message).toContain('unexpected');
  });

  test('no detail falls back to the axios message', async () => {
    const message = await messageFor({});
    expect(typeof message).toBe('string');
    expect(message).toContain('author/1');
  });
});
