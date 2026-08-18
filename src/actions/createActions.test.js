import { api } from '../api';
import { updateButtonCreate } from './createActions';

jest.mock('../api', () => ({ api: { request: jest.fn(), get: jest.fn() } }));

// The create thunk fires checkModCurieThenCreate() without returning it, so drain the
// microtask queue rather than awaiting the dispatch.
const flush = async () => { for (let i = 0; i < 10; i++) { await Promise.resolve(); } };

describe('updateButtonCreate', () => {
  beforeEach(() => {
    api.request.mockReset();
    api.get.mockReset();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => { console.log.mockRestore(); });

  // 'Alliance:new' skips the cross-reference pre-check and creates directly, which is the
  // path both Create.js buttons take for an Alliance-only reference.
  const createThen = async (subField) => {
    api.request.mockResolvedValue({
      status: 201,
      data: { curie: 'AGRKB:101000001995035', title: 'placeholder title' },
    });
    const dispatch = jest.fn();
    updateButtonCreate(
      ['tok', 'reference/', { title: 'placeholder title' }, 'POST', 0, null, subField],
      'alliance', 'Alliance:new',
    )(dispatch);
    await flush();
    return dispatch.mock.calls
      .map(([action]) => action)
      .find((action) => action.type === 'UPDATE_BUTTON_CREATE');
  };

  test('a successful create reports the new reference curie', async () => {
    // createReducer redirects to payload.value, so this is the curie the curator lands on
    const action = await createThen('curie');
    expect(action).toBeDefined();
    expect(action.payload.responseMessage).toBe('update success');
    expect(action.payload.value).toBe('AGRKB:101000001995035');
  });

  test('an unnamed subField loses the curie -- why both create paths pass it', async () => {
    // regression guard for the shim removal: response?.[null] is undefined, so the redirect
    // used to land on ?referenceCurie=null after an otherwise successful create
    const action = await createThen(null);
    expect(action.payload.value).toBeNull();
  });
});
