// src/components/settings/BiblioPreferenceControls.js
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { applyGridState, columnStateFromColDefs } from '../../utils/gridState';
import AgGridTablePreferenceControls from './AgGridTablePreferenceControls';

/**
 * Biblio-specific wrapper around AgGridTablePreferenceControls.
 *
 * Goal:
 * - Keep TopicEntityTable free of preferences logic.
 * - Encapsulate: load/apply default, seed defaults, pending apply timing, grid-state capture.
 * - Able to use this for WFT without having to make a separate .js file
 */
const BiblioPreferenceControls = ({
  // auth / identity
  accessToken,
  email,
  accessLevel,

  // grid handles
  gridRef,
  getGridApi,
  isGridReady,

  // column/checkbox list sync
  getInitialItems,
  updateColDefsWithItems,
  setItems,
  setColDefs,

  // UI feedback
  showNotification,

  // optional
  title = 'Manage Table Preferences',
  componentName = 'tet_table'
}) => {
  // Preference timing: settings may load after first render.
  const pendingAutoApplyRef = useRef(null);
  const lastAppliedKeyRef = useRef(null);
  const pendingInitActionRef = useRef(null);

  // This is to make AG Grid actually recalculate and redraw after we applied settings
  // It’s specifically there to fix: filter UI appears set but rows don’t change, etc
  const forceFilterRefresh = useCallback(() => {
    const api = getGridApi?.();
    if (!api) return;

    // External + internal filter pipeline + UI
    api.onFilterChanged?.();
    api.refreshClientSideRowModel?.('filter');

    api.refreshHeader?.();
    api.redrawRows?.();
    api.refreshCells?.({ force: true });
  }, [getGridApi]);

  // extractCurrentGridState() reads from the grid API if possible  
  const extractCurrentGridState = useCallback(() => {
    const api = getGridApi?.();
    if (!api?.getColumnState) return null;

    try {
      const columnState = api.getColumnState();
      const filterModel = api.getFilterModel ? api.getFilterModel() : {};
      const sortModel = api.getSortModel ? api.getSortModel() : [];

      if (!Array.isArray(columnState)) return null;

      return {
        columnState,
        filterModel: filterModel || {},
        sortModel: sortModel || []
      };
    } catch (err) {
      console.error('Error extracting grid state:', err);
      return null;
    }
  }, [getGridApi]);

  // getSafeCurrentState() makes sure we always return something usable
  const getSafeCurrentState = useCallback(() => {
    const state = extractCurrentGridState();
    if (state) return state;

    const defaultItems = getInitialItems();
    return {
      columnState: columnStateFromColDefs(updateColDefsWithItems(defaultItems)),
      filterModel: {},
      sortModel: []
    };
  }, [extractCurrentGridState, getInitialItems, updateColDefsWithItems]);

  // Keep Hide/Show checkbox list in sync
  const syncItemsFromGridColumnState = useCallback(() => {
    const api = getGridApi?.();
    if (!api?.getColumnState) return;

    const currentColumnState = api.getColumnState() || [];
    const updatedItems = getInitialItems().map((item) => {
      const colState = currentColumnState.find((c) => c.colId === item.field);
      return { ...item, checked: colState ? !colState.hide : item.checked };
    });
    setItems(updatedItems);
  }, [getGridApi, getInitialItems, setItems]);

  const applySettingsToGrid = useCallback(
    async (payload, settingId = null, options = {}) => {
      const { silent = false } = options;

      const api = getGridApi?.();
      if (!api) return;

      try {
        const { columnState, filterModel, sortModel } = payload || {};

        // Merge sortModel into columnState (AG Grid stores sort on columnState)
        let combinedState = Array.isArray(columnState) ? [...columnState] : [];
        if (Array.isArray(sortModel)) {
          sortModel.forEach((s) => {
            const existing = combinedState.find((c) => c.colId === s.colId);
            if (existing) existing.sort = s.sort;
            else combinedState.push({ colId: s.colId, sort: s.sort });
          });
        }

        if (api.applyColumnState && combinedState.length > 0) {
          api.applyColumnState({ state: combinedState, applyOrder: true });
        }

        // Let column state settle (especially for custom filters)
        await new Promise((r) => setTimeout(r, 0));

        if (api.setFilterModel) {
          if (filterModel && Object.keys(filterModel).length > 0) api.setFilterModel(filterModel);
          else api.setFilterModel(null);
        }

        // Let filter instances mount/update
        await new Promise((r) => setTimeout(r, 0));

        // Critical: force filter pipeline + UI refresh
        forceFilterRefresh();

        // Sync Hide/Show checkbox list to actual grid state
        syncItemsFromGridColumnState();

        if (!silent) showNotification?.('Settings applied successfully!', 'success');
      } catch (err) {
        console.error('Error applying settings:', err);
        showNotification?.('Error applying settings. Using default layout.', 'error');

        const fallbackItems = getInitialItems();
        setItems(fallbackItems);
        setColDefs(updateColDefsWithItems(fallbackItems));

        const defaultState = columnStateFromColDefs(updateColDefsWithItems(fallbackItems));
        const api2 = getGridApi?.();
        api2?.applyColumnState?.({ state: defaultState, applyOrder: true });
        api2?.setFilterModel?.(null);
        forceFilterRefresh();
      }
    },
    [
      forceFilterRefresh,
      getGridApi,
      getInitialItems,
      setColDefs,
      setItems,
      showNotification,
      syncItemsFromGridColumnState,
      updateColDefsWithItems
    ]
  );

  // Applies a pending saved setting once grid is actually ready (and only once per "key").
  const tryApplyPending = useCallback(() => {
    const api = getGridApi?.();
    if (!api) return;

    const pending = pendingAutoApplyRef.current;
    if (!pending) return;

    // Avoid reapplying the same thing repeatedly
    if (lastAppliedKeyRef.current === pending.applyKey) return;

    applySettingsToGrid(pending.payload, pending.settingId, { silent: true }).then(() => {
      setTimeout(() => forceFilterRefresh(), 0);
    });

    lastAppliedKeyRef.current = pending.applyKey;
    pendingAutoApplyRef.current = null;
  }, [applySettingsToGrid, forceFilterRefresh, getGridApi]);

  // If grid becomes ready later, run any deferred init action.
  useEffect(() => {
    if (!isGridReady) return;

    if (typeof pendingInitActionRef.current === 'function') {
      pendingInitActionRef.current();
      pendingInitActionRef.current = null;
    }

    // also try to apply any pending setting after ready
    tryApplyPending();
  }, [isGridReady, tryApplyPending]);

  const buildSeedPresetName = useCallback(
    () => (accessLevel === 'SGD' ? 'SGD Default' : 'MOD Default'),
    [accessLevel]
  );

  /**
   * Called by AgGridTablePreferenceControls AFTER it loads settings from server.
   * We:
   * - pick default (or picked) and schedule apply
   * - or seed a default preset if none exist
   */
  const onPreferencesAfterLoad = useCallback(
    (prefsApi, { existing, picked }) => {
      const run = () => {
        const list = existing || [];

        // Case 1: existing settings -> apply default/picked
        if (list.length > 0) {
          const s = picked || list.find((x) => x.default_setting) || list[0];
          if (s?.json_settings) {
            pendingAutoApplyRef.current = {
              payload: s.json_settings,
              settingId: s.person_setting_id,
              // applyKey should change when user changes reference, etc.
              // For TET, the simplest stable key is: component + accessLevel + defaultSettingId
              applyKey: `${componentName}:${accessLevel}:${s.person_setting_id}`
            };
            setTimeout(() => tryApplyPending(), 0);
            return;
          }
        }

        // Case 2: no saved settings -> seed default
        const defaultItems = getInitialItems();
        const seedState = {
          columnState: columnStateFromColDefs(updateColDefsWithItems(defaultItems)),
          filterModel: {},
          sortModel: []
        };

        setItems(defaultItems);
        setColDefs(updateColDefsWithItems(defaultItems));

        setTimeout(() => {
          const api = getGridApi?.();

          if (api?.applyColumnState) {
            api.applyColumnState({ state: seedState.columnState, applyOrder: true });
          } else if (typeof applyGridState === 'function') {
            applyGridState(gridRef, seedState);
          }

          forceFilterRefresh();

          prefsApi
            .seed({
              name: buildSeedPresetName(),
              payload: { ...seedState, meta: { accessLevel } },
              isDefault: true
            })
            .then((created) => {
              if (created?.person_setting_id) prefsApi.setSelectedSettingId(created.person_setting_id);
            });
        }, 200);
      };

      // If grid isn't ready yet, defer the whole thing.
      if (!getGridApi?.()) {
        pendingInitActionRef.current = run;
        return;
      }
      run();
    },
    [
      accessLevel,
      buildSeedPresetName,
      componentName,
      forceFilterRefresh,
      getGridApi,
      getInitialItems,
      gridRef,
      setColDefs,
      setItems,
      tryApplyPending,
      updateColDefsWithItems
    ]
  );

  // Memo so we don't churn props
  const prefsProps = useMemo(
    () => ({
      accessToken,
      email,
      componentName,
      accessLevel,
      isReady: isGridReady,
      getSafeCurrentState,
      applySettingsToGrid,
      onAfterLoad: onPreferencesAfterLoad,
      showNotification,
      title
    }),
    [
      accessLevel,
      accessToken,
      applySettingsToGrid,
      componentName,
      email,
      getSafeCurrentState,
      isGridReady,
      onPreferencesAfterLoad,
      showNotification,
      title
    ]
  );

  return <AgGridTablePreferenceControls {...prefsProps} />;
};

export default BiblioPreferenceControls;
