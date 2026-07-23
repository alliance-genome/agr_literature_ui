import {
  buildSearchSettingsState,
  applySearchSettingsFromJson,
} from '../SearchPreferencesUtils';
import {
  SEARCH_SET_SEARCH_MODE,
  SEARCH_SET_ADVANCED_TOPIC_QUERY,
} from '../../../../actions/searchActions';

// A representative advanced-mode builder tree (the ticket example, UI shape).
const advancedTree = {
  operator: 'AND',
  children: [
    {
      operator: 'OR',
      children: [
        { type: 'tet', negate: false, fields: [
          { field: 'topic', value: 'ATP:0000018' },
          { field: 'source_method', value: 'ACKnowledge form' },
        ] },
        { type: 'tet', negate: false, fields: [
          { field: 'topic', value: 'ATP:0000018' },
          { field: 'source_method', value: 'ABC classifier' },
        ] },
      ],
    },
  ],
};

describe('SearchPreferences advanced-mode round-trip (SCRUM-6228)', () => {
  test('buildSearchSettingsState captures searchMode and advancedTopicQuery', () => {
    const built = buildSearchSettingsState({
      search: { searchMode: 'advanced', advancedTopicQuery: advancedTree },
      isLogged: { cognitoMod: 'WB' },
    });
    expect(built.searchMode).toBe('advanced');
    expect(built.advancedTopicQuery).toEqual(advancedTree);
  });

  test('buildSearchSettingsState defaults to facet mode when unset', () => {
    const built = buildSearchSettingsState({ search: {}, isLogged: {} });
    expect(built.searchMode).toBe('facet');
    expect(built.advancedTopicQuery).toBeNull();
  });

  test('applySearchSettingsFromJson restores mode + tree via dispatch', () => {
    const dispatched = [];
    const dispatch = (action) => dispatched.push(action);
    applySearchSettingsFromJson(
      { state: { searchMode: 'advanced', advancedTopicQuery: advancedTree } },
      dispatch,
      { runSearch: false }
    );
    const modeAction = dispatched.find((a) => a.type === SEARCH_SET_SEARCH_MODE);
    const treeAction = dispatched.find((a) => a.type === SEARCH_SET_ADVANCED_TOPIC_QUERY);
    expect(modeAction).toEqual({ type: SEARCH_SET_SEARCH_MODE, payload: 'advanced' });
    expect(treeAction).toEqual({ type: SEARCH_SET_ADVANCED_TOPIC_QUERY, payload: advancedTree });
  });

  test('applySearchSettingsFromJson falls back to facet mode for legacy saved searches', () => {
    const dispatched = [];
    const dispatch = (action) => dispatched.push(action);
    // A saved search from before this feature has neither field.
    applySearchSettingsFromJson(
      { state: { query: 'foo' } },
      dispatch,
      { runSearch: false }
    );
    const modeAction = dispatched.find((a) => a.type === SEARCH_SET_SEARCH_MODE);
    const treeAction = dispatched.find((a) => a.type === SEARCH_SET_ADVANCED_TOPIC_QUERY);
    expect(modeAction.payload).toBe('facet');
    expect(treeAction.payload).toBeNull();
  });

  test('a full build -> apply cycle preserves the tree', () => {
    const built = buildSearchSettingsState({
      search: { searchMode: 'advanced', advancedTopicQuery: advancedTree },
      isLogged: {},
    });
    const dispatched = [];
    applySearchSettingsFromJson({ state: built }, (a) => dispatched.push(a), { runSearch: false });
    const treeAction = dispatched.find((a) => a.type === SEARCH_SET_ADVANCED_TOPIC_QUERY);
    expect(treeAction.payload).toEqual(advancedTree);
  });
});
