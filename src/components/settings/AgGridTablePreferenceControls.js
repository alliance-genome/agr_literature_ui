import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from 'react-bootstrap';
import { FaGear } from 'react-icons/fa6';

import { usePersonSettings } from './usePersonSettings';
import SettingsDropdown from './SettingsDropdown';
import SettingsGearModal from './SettingsGearModal';

/**
 * Reusable preferences control for any AG-Grid-like table.
 *
 * Parent must provide:
 * - getSafeCurrentState(): { columnState, filterModel, sortModel }
 * - applySettingsToGrid(payload, settingId, {silent?})
 * - onAfterLoad(prefsApi, {existing, picked})  (optional but recommended)
 * It does the following:
 * 1. UI: Gear button + dropdown + modal
 * 2. Data: loads/saves “person settings” via usePersonSettings
 * 3. Integration points: calls your table callbacks to capture current 
 *    grid state and apply a saved state
 * 
 * Identity / backend:
 * - baseUrl, accessToken, email: needed to load/save settings from the API.
 * - componentName: the namespace key in the DB (e.g. "tet_table", "wft_table"). 
 *                This is how TET and WFT don’t collide.
 * - maxCount: max number of settings allowed (default 10).
 * 
 * Table integration:
 * - getSafeCurrentState(): returns the table’s current layout snapshot
 * - applySettingsToGrid(payload, settingId, { silent }): apply a saved snapshot back onto the grid.
 * 
 * Lifecycle hook:
 * - onAfterLoad(prefsApi, { existing, picked }): runs after settings are 
 *   loaded so the wrapper can: 1. auto-apply the default setting
 *   2. seed a default if none exist
 * 
 * UX:
 * - isReady: used to disable “Save Layout” until grid is ready.
 * - title: modal title
 * - showNotification(msg, variant): toast/alert function

*/
const AgGridTablePreferenceControls = ({
  accessToken,
  email,
  componentName,
  accessLevel,
  isReady,

  getSafeCurrentState,
  applySettingsToGrid,
  onAfterLoad,

  title = 'Manage Table Preferences',
  showNotification = () => {},
  maxCount = 10,
}) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [nameEdits, setNameEdits] = useState({});

  const {
    settings,
    selectedSettingId,
    setSelectedSettingId,
    busy,
    load,
    seed,
    create,
    rename,
    remove,
    makeDefault,
    savePayloadTo,
  } = usePersonSettings({
    token: accessToken,
    email,
    componentName,
    maxCount,
  });

  // Expose a small API object to the parent (for seeding, selecting, etc.)
  const prefsApi = useMemo(
    () => ({
      settings,
      selectedSettingId,
      setSelectedSettingId,
      busy,
      maxCount,
      load,
      seed,
      create,
      rename,
      remove,
      makeDefault,
      savePayloadTo,
    }),
    [
      settings,
      selectedSettingId,
      setSelectedSettingId,
      busy,
      maxCount,
      load,
      seed,
      create,
      rename,
      remove,
      makeDefault,
      savePayloadTo,
    ]
  );

  // Load settings once we have auth context
  useEffect(() => {
    if (!accessToken || !email) return;

    load()
      .then(({ existing, picked }) => {
        if (typeof onAfterLoad === 'function') {
          onAfterLoad(prefsApi, { existing, picked });
        }
      })
      .catch((err) => {
        const msg = err?.response?.data?.detail || err?.message || String(err);
        showNotification(`Failed to load preferences: ${msg}`, 'error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, email, load]);

  // So “pick” means: remember the selection and apply its saved layout to the grid
  const handlePickSetting = useCallback(
    (settingId) => {
      setSelectedSettingId(settingId);
      const setting = (settings || []).find((s) => s.person_setting_id === settingId);
      if (setting?.json_settings) {
        // silent means it won’t spam "applied successfully" notifications unless the wrapper wants to	    
        applySettingsToGrid(setting.json_settings, setting.person_setting_id, { silent: true });
      }
    },
    [applySettingsToGrid, setSelectedSettingId, settings]
  );

  const handleCreateSetting = useCallback(
    async (name) => {
      const clean = (name ?? '').trim();
      if (!clean) {
        showNotification('Setting name cannot be empty.', 'warning');
        return null;
      }

      const exists = (settings || []).some(
        (s) => (s.setting_name || s.name || '').trim().toLowerCase() === clean.toLowerCase()
      );
      if (exists) {
        showNotification(`A setting named "${clean}" already exists.`, 'warning');
        return null;
      }

      try {
        const state = getSafeCurrentState();
        const created = await create(clean, { ...state, meta: { accessLevel } });
        await load();
        if (created?.person_setting_id) setSelectedSettingId(created.person_setting_id);
        showNotification(`Setting "${clean}" created successfully!`, 'success');
        return created;
      } catch (err) {
        const msg = err?.response?.data?.detail || err?.message || String(err);
        showNotification(`Failed to create setting: ${msg}`, 'error');
        return null;
      }
    },
    [
      accessLevel,
      create,
      getSafeCurrentState,
      load,
      setSelectedSettingId,
      settings,
      showNotification,
    ]
  );

  const handleRename = useCallback(
    async (person_setting_id, newName) => {
      const clean = (newName ?? '').trim();
      if (!clean) {
        showNotification('Setting name cannot be empty.', 'warning');
        return false;
      }

      const exists = (settings || []).some(
        (s) =>
          s.person_setting_id !== person_setting_id &&
          (s.setting_name || s.name || '').trim().toLowerCase() === clean.toLowerCase()
      );
      if (exists) {
        showNotification(`A setting named "${clean}" already exists.`, 'warning');
        return false;
      }

      try {
        await rename(person_setting_id, clean);
        await load();
        showNotification(`Renamed to "${clean}".`, 'success');
        return true;
      } catch (err) {
        const msg = err?.response?.data?.detail || err?.message || String(err);
        showNotification(`Failed to rename: ${msg}`, 'error');
        return false;
      }
    },
    [load, rename, settings, showNotification]
  );

  const handleSaveLayout = useCallback(
    async (settingId = null) => {
      const targetSettingId = settingId || selectedSettingId;
      if (!targetSettingId) {
        showNotification('Please select a setting to save to first.', 'warning');
        return;
      }
      if (!isReady) {
        showNotification('Table is still loading. Please wait and try again.', 'warning');
        return;
      }

      try {
        const state = getSafeCurrentState();
        await savePayloadTo(targetSettingId, {
          ...state,
          meta: {
            accessLevel,
            savedAt: new Date().toISOString(),
            version: '1.0',
          },
        });
        await load();
        showNotification('Current layout saved successfully!', 'success');
      } catch (err) {
        const msg = err?.response?.data?.detail || err?.message || String(err);
        showNotification(`Failed to save layout: ${msg}`, 'error');
      }
    },
    [accessLevel, getSafeCurrentState, isReady, load, savePayloadTo, selectedSettingId, showNotification]
  );

  return (
    <>
      <Button
        variant="outline-primary"
        size="sm"
        title="Manage table preferences"
        onClick={() => setShowSettingsModal(true)}
      >
        <FaGear size={14} style={{ marginRight: '6px' }} />
        Preferences
      </Button>

      <SettingsDropdown
        settings={settings}
        selectedId={selectedSettingId}
        onPick={handlePickSetting}
      />

      <SettingsGearModal
        show={showSettingsModal}
        onHide={() => {
          setShowSettingsModal(false);
          setNameEdits({});
        }}
        title={title}
        createLabel="Create New Setting"
        createPlaceholder="Enter setting name"
        createButtonText="Create"
        settings={settings || []}
        nameEdits={nameEdits}
        setNameEdits={setNameEdits}
        onCreate={handleCreateSetting}
        onRename={handleRename}
        onDelete={remove}
        onMakeDefault={makeDefault}
        canCreateMore={(settings || []).length < maxCount}
        busy={busy}
        renderRowActions={(setting, { rowBusy }) => (
          <Button
            variant="outline-success"
            size="sm"
            disabled={busy || rowBusy || !isReady}
            title={!isReady ? 'Table still loading...' : 'Save current layout to this setting'}
            onClick={() => handleSaveLayout(setting.person_setting_id)}
          >
            Save Layout
          </Button>
        )}
      />
    </>
  );
};

export default AgGridTablePreferenceControls;
