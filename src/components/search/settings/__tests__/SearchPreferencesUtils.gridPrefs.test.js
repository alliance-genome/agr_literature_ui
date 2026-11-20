import {
  buildSearchSettingsState,
  applySearchSettingsFromJson,
} from '../SearchPreferencesUtils';
import {
  SEARCH_SET_GRID_PREFERENCES,
  SEARCH_APPLY_GRID_PREFERENCES,
} from '../../../../actions/searchActions';
import searchReducer from '../../../../reducers/searchReducer';

// A representative Topic-grid arrangement: toolbar checkboxes, topic/source
// visibility, and a user column order + widths (colIds as the grid emits them).
const gridPrefs = {
  displayOptions: {
    inlineNote: true,
    showLevel: false,
    showScore: true,
    showAuthors: false,
  },
  hiddenTopicCuries: ['ATP:0000122'],
  sourceFilterModel: ['textpresso'],
  columnState: [
    { colId: '__select', width: 44 },
    { colId: '__ids', width: 180 },
    { colId: '__title', width: 320 },
    { colId: 'ATP:0000018__val', width: 95 },
    { colId: 'ATP:0000018', width: 210 },
    { colId: 'ATP:0000018__tag', width: 60 },
    { colId: 'ATP:0000018__note', width: 240 },
  ],
  topicsKey: '["ATP:0000018"]',
};

describe('Topic grid preferences in saved settings (grid save/restore ticket)', () => {
  test('buildSearchSettingsState captures gridPreferences from Redux', () => {
    const built = buildSearchSettingsState({
      search: { gridPreferences: gridPrefs },
      isLogged: {},
    });
    expect(built.gridPreferences).toEqual(gridPrefs);
  });

  test('buildSearchSettingsState defaults gridPreferences to null', () => {
    const built = buildSearchSettingsState({ search: {}, isLogged: {} });
    expect(built.gridPreferences).toBeNull();
  });

  test('applySearchSettingsFromJson dispatches applyGridPreferences when saved', () => {
    const dispatched = [];
    applySearchSettingsFromJson(
      { state: { gridPreferences: gridPrefs } },
      (a) => dispatched.push(a),
      { runSearch: false }
    );
    const applyAction = dispatched.find(
      (a) => a.type === SEARCH_APPLY_GRID_PREFERENCES
    );
    expect(applyAction).toEqual({
      type: SEARCH_APPLY_GRID_PREFERENCES,
      payload: gridPrefs,
    });
  });

  test('legacy saved searches (no gridPreferences) leave grid state untouched', () => {
    const dispatched = [];
    applySearchSettingsFromJson(
      { state: { query: 'foo' } },
      (a) => dispatched.push(a),
      { runSearch: false }
    );
    expect(
      dispatched.some((a) => a.type === SEARCH_APPLY_GRID_PREFERENCES)
    ).toBe(false);
  });

  test('a full build -> apply cycle preserves the arrangement', () => {
    const built = buildSearchSettingsState({
      search: { gridPreferences: gridPrefs },
      isLogged: {},
    });
    const dispatched = [];
    applySearchSettingsFromJson({ state: built }, (a) => dispatched.push(a), {
      runSearch: false,
    });
    const applyAction = dispatched.find(
      (a) => a.type === SEARCH_APPLY_GRID_PREFERENCES
    );
    expect(applyAction.payload).toEqual(gridPrefs);
  });
});

describe('searchReducer grid preferences', () => {
  test('SET mirrors without touching the applied nonce', () => {
    const next = searchReducer(undefined, {
      type: SEARCH_SET_GRID_PREFERENCES,
      payload: gridPrefs,
    });
    expect(next.gridPreferences).toEqual(gridPrefs);
    expect(next.gridPreferencesApplied).toBeNull();
  });

  test('APPLY sets prefs and bumps the nonce each time', () => {
    const first = searchReducer(undefined, {
      type: SEARCH_APPLY_GRID_PREFERENCES,
      payload: gridPrefs,
    });
    expect(first.gridPreferences).toEqual(gridPrefs);
    expect(first.gridPreferencesApplied).toEqual({ prefs: gridPrefs, nonce: 1 });

    const second = searchReducer(first, {
      type: SEARCH_APPLY_GRID_PREFERENCES,
      payload: gridPrefs,
    });
    // Re-applying the SAME prefs still bumps the nonce, so loading the same
    // saved search twice re-imposes the arrangement over interim tweaks.
    expect(second.gridPreferencesApplied.nonce).toBe(2);
  });
});
