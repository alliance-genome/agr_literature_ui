// Active-layout indicator state (curator feedback on SCRUM-6512): the reducer
// tracks which saved layout the display came from and whether it has been
// tweaked since. Every prefs write marks the display modified; recording a
// profile name clears the flag, so the load/save flows (prefs then name) end
// clean while standalone tweaks end dirty.
import searchReducer from '../../../../reducers/searchReducer';
import {
  setSearchDisplayPrefs,
  setSearchDisplayProfileName,
} from '../../../../actions/searchActions';
import { DEFAULT_DISPLAY_PREFS } from '../searchDisplayPrefs';

describe('searchReducer display profile name', () => {
  test('initial state is the built-in default, not modified', () => {
    const state = searchReducer(undefined, { type: '@@INIT' });
    expect(state.searchDisplayProfileName).toBeNull();
    expect(state.searchDisplayProfileDirty).toBe(false);
  });

  test('a prefs write alone marks the display modified', () => {
    const state = searchReducer(undefined, setSearchDisplayPrefs(DEFAULT_DISPLAY_PREFS));
    expect(state.searchDisplayProfileDirty).toBe(true);
  });

  test('loading/saving a named layout ends clean (prefs then name)', () => {
    let state = searchReducer(undefined, setSearchDisplayPrefs(DEFAULT_DISPLAY_PREFS));
    state = searchReducer(state, setSearchDisplayProfileName('author curation'));
    expect(state.searchDisplayProfileName).toBe('author curation');
    expect(state.searchDisplayProfileDirty).toBe(false);
  });

  test('tweaking after a load marks the named layout modified', () => {
    let state = searchReducer(undefined, setSearchDisplayPrefs(DEFAULT_DISPLAY_PREFS));
    state = searchReducer(state, setSearchDisplayProfileName('author curation'));
    state = searchReducer(state, setSearchDisplayPrefs({ ...DEFAULT_DISPLAY_PREFS, showIcons: false }));
    expect(state.searchDisplayProfileName).toBe('author curation');
    expect(state.searchDisplayProfileDirty).toBe(true);
  });

  test('reset clears back to the built-in default', () => {
    let state = searchReducer(undefined, setSearchDisplayProfileName('author curation'));
    state = searchReducer(state, setSearchDisplayPrefs(DEFAULT_DISPLAY_PREFS));
    state = searchReducer(state, setSearchDisplayProfileName(null));
    expect(state.searchDisplayProfileName).toBeNull();
    expect(state.searchDisplayProfileDirty).toBe(false);
  });
});
