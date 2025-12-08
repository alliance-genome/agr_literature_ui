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
    maxCount: 20,        // allow up to 20 saved search presets
  });

  const defaultSettingName = accessLevel
    ? `${accessLevel} Default Search`
    : 'Default Search';

  /** Build payload from current Redux search + login info */
  const buildCurrentStatePayload = useCallback(() => {
    return buildSearchSettingsState({
      search: searchState,
      isLogged,
    });
  }, [searchState, isLogged]);

  /** When user picks a setting from the dropdown, apply to Redux + run search */
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

  /** Create a new saved search from *current* Redux state */
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
        // Let the modal show a generic message if needed
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

  /** Save CURRENT search state into an existing setting (by ID) */
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

  /**
   * Initial load:
   *  - If no settings exist => seed a default one AND
   *    force default facets:
   *      - mods_in_corpus_or_needs_review.keyword = [accessLevel]
   *      - language.keyword = ['English']
   *  - Otherwise => apply the default (or last-picked) setting.
   */
  useEffect(() => {
    if (!accessToken || !email) return;

    const run = async () => {
      try {
        const { existing, picked } = await load();
        const all = existing || [];

        // --- NO SETTINGS YET: create a MOD+English default and apply it ---
        if (all.length === 0) {
          // Base on current Redux search state:
          const baseState = buildCurrentStatePayload();

          // Clone existing facet selections (if any)
          const facetsValues = {
            ...(baseState.facetsValues || {}),
          };

          // 1) Default MOD facet: "in corpus OR needs review" for the logged-in MOD
          if (
            accessLevel &&
            accessLevel !== 'No' &&
            (
              !facetsValues['mods_in_corpus_or_needs_review.keyword'] ||
              !Array.isArray(
                facetsValues['mods_in_corpus_or_needs_review.keyword']
              ) ||
              facetsValues['mods_in_corpus_or_needs_review.keyword'].length === 0
            )
          ) {
            facetsValues['mods_in_corpus_or_needs_review.keyword'] = [
              accessLevel,
            ];
          }

          // 2) Default language facet: English
          if (
            !facetsValues['language.keyword'] ||
            !Array.isArray(facetsValues['language.keyword']) ||
            facetsValues['language.keyword'].length === 0
          ) {
            facetsValues['language.keyword'] = ['English'];
          }

          const statePayload = {
            ...baseState,
            facetsValues,
          };

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

          // Apply this default (MOD+English) to Redux and run search
          applySearchSettingsFromJson({ state: statePayload }, dispatch);
          return;
        }

        // --- SETTINGS EXIST: use picked, or default, or the first one ---
        const settingToUse =
          picked || all.find((s) => s.default_setting) || all[0];

        if (settingToUse && settingToUse.json_settings) {
          applySearchSettingsFromJson(settingToUse.json_settings, dispatch);
          setSelectedSettingId(settingToUse.person_setting_id);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load search settings:', err);
        // On failure, we just keep whatever is already in Redux.
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
