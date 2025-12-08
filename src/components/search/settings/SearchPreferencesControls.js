// src/components/search/settings/SearchPreferencesControls.js
import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from 'react-bootstrap';
import { FaGear } from 'react-icons/fa6';

import { usePersonSettings } from '../../settings/usePersonSettings';
import SettingsDropdown from '../../settings/SettingsDropdown';
import SettingsGearModal from '../../settings/SettingsGearModal';
import {
  buildSearchSettingsState,
  applySearchSettingsFromJson,
} from './SearchPreferencesUtils';

/**
 * Toolbar controls for Search page preferences:
 * - "Preferences" (opens Manage Saved Searches modal)
 * - "Load setting" dropdown
 */
const SearchPreferencesControls = () => {
  const dispatch = useDispatch();

  const accessToken = useSelector((state) => state.isLogged.accessToken);
  const email = useSelector((state) => state.isLogged.email);
  const cognitoMod = useSelector((state) => state.isLogged.cognitoMod);
  const testerMod = useSelector((state) => state.isLogged.testerMod);
  const isLogged = useSelector((state) => state.isLogged);
  const searchState = useSelector((state) => state.search);

  const accessLevel = testerMod && testerMod !== 'No' ? testerMod : cognitoMod;
  const componentName = 'reference_search';

  const [showModal, setShowModal] = useState(false);
  const [nameEdits, setNameEdits] = useState({});

  const {
    settings = [],
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
  } = usePersonSettings({
    baseUrl: process.env.REACT_APP_RESTAPI,
    token: accessToken,
    email,
    componentName,
    maxCount: 20,
  });

  // const canCreateMore = settings.length < maxCount;

  const defaultSettingName = accessLevel
    ? `${accessLevel} Default Search`
    : 'Default Search';

  const buildCurrentStatePayload = useCallback(() => {
    return buildSearchSettingsState({
      search: searchState,
      isLogged,
    });
  }, [searchState, isLogged]);

  // Pick from dropdown → apply to Redux + run search (inside utils)
  const handlePickSetting = useCallback(
    async (person_setting_id) => {
      if (!person_setting_id) return;
      const setting = (settings || []).find(
        (s) => s.person_setting_id === person_setting_id
      );
      if (!setting || !setting.json_settings) return;

      applySearchSettingsFromJson(setting.json_settings, dispatch);
      setSelectedSettingId(person_setting_id);
    },
    [settings, dispatch, setSelectedSettingId]
  );

  // Create new saved search from current Redux state
  const handleCreateSetting = useCallback(
    async (name) => {
      const clean = (name || '').trim();
      if (!clean) return null;

      const existing = settings || [];
      const dup = existing.some(
        (s) =>
          (s.setting_name || s.name || '').trim().toLowerCase() ===
          clean.toLowerCase()
      );
      if (dup) {
        // Let the modal display a generic message if needed
        return null;
      }

      const statePayload = buildCurrentStatePayload();
      const payload = {
        meta: {
          savedAt: new Date().toISOString(),
          version: '1.0',
          accessLevel: accessLevel || null,
        },
        state: statePayload,
      };

      const created = await create(clean, payload);
      await load();
      if (created?.person_setting_id) {
        setSelectedSettingId(created.person_setting_id);
      }
      return created;
    },
    [
      settings,
      accessLevel,
      buildCurrentStatePayload,
      create,
      load,
      setSelectedSettingId,
    ]
  );

  // Save CURRENT search state into an existing setting (by ID)
  const handleSaveToSetting = useCallback(
    async (person_setting_id) => {
      if (!person_setting_id) return;
      const statePayload = buildCurrentStatePayload();
      const payload = {
        meta: {
          savedAt: new Date().toISOString(),
          version: '1.0',
          accessLevel: accessLevel || null,
        },
        state: statePayload,
      };
      await savePayloadTo(person_setting_id, payload);
      await load();
    },
    [buildCurrentStatePayload, accessLevel, savePayloadTo, load]
  );

  // Initial load: seed default if none, then apply default into Redux
  useEffect(() => {
    if (!accessToken || !email) return;

    const run = async () => {
      try {
        const { existing, picked } = await load();
        const all = existing || [];

        if (all.length === 0) {
          const statePayload = buildCurrentStatePayload();
          const payload = {
            meta: {
              savedAt: new Date().toISOString(),
              version: '1.0',
              accessLevel: accessLevel || null,
            },
            state: statePayload,
          };

          const created = await seed({
            name: defaultSettingName,
            payload,
            isDefault: true,
          });

          await load();

          if (created?.person_setting_id) {
            setSelectedSettingId(created.person_setting_id);
          }

          applySearchSettingsFromJson({ state: statePayload }, dispatch);
          return;
        }

        const settingToUse =
          picked || all.find((s) => s.default_setting) || all[0];

        if (settingToUse && settingToUse.json_settings) {
          applySearchSettingsFromJson(settingToUse.json_settings, dispatch);
          setSelectedSettingId(settingToUse.person_setting_id);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load search settings:', err);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, email]);

  return (
    <div
      className="d-flex align-items-center"
      style={{ gap: '0.5rem', marginBottom: '0.5rem' }}
    >
      {/* Preferences / Gear button */}
      <Button
        variant="outline-primary"
        size="sm"
        onClick={() => setShowModal(true)}
        title="Manage saved searches and defaults"
      >
        <FaGear size={14} style={{ marginRight: '4px' }} />
        Preferences
      </Button>

      {/* Saved search selector (Load setting...) */}
      <SettingsDropdown
        settings={settings}
        selectedId={selectedSettingId}
        onPick={handlePickSetting}
        size="sm"
        placeholder="Load setting..."
      />

      <SettingsGearModal
        show={showModal}
        onHide={() => setShowModal(false)}
	title="Manage Saved Searches"
        createLabel="Create New Saved Search"
        createPlaceholder="Enter setting name"
        createButtonText="Create"
        settings={settings || []}
        nameEdits={nameEdits}
        setNameEdits={setNameEdits}
        onCreate={handleCreateSetting}
        onRename={rename}
        onDelete={remove}
        onMakeDefault={makeDefault}
        canCreateMore={(settings || []).length < maxCount}
        busy={busy}
	renderRowActions={(setting, { rowBusy }) => (
          <Button
            size="sm"
            variant="outline-success"
            disabled={busy || rowBusy}
            onClick={() => handleSaveToSetting(setting.person_setting_id)}
          >
            Save Current Search
          </Button>
        )}
      />
    </div>
  );
};

export default SearchPreferencesControls;
