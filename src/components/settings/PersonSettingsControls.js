// src/components/settings/PersonSettingsControls.js
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from 'react-bootstrap';
import { FaGear } from 'react-icons/fa6';

import { usePersonSettings } from './usePersonSettings';
import SettingsDropdown from './SettingsDropdown';
import SettingsGearModal from './SettingsGearModal';

/**
 * Generic "person settings" toolbar:
 *
 * - Gear button -> opens SettingsGearModal
 * - Dropdown -> lets user load a saved setting
 * - Handles: load/seed default, create/rename/delete, make default, save current state
 *
 * We can plug in:
 *   - componentName          (e.g. 'reference_search', 'tet_table')
 *   - maxCount               (max number of settings)
 *   - buildSettingsState     (reduxState -> JSON-serializable "state" payload)
 *   - applySettingsFromJson  (json_settings, dispatch, options) -> side effects (e.g. run search / apply grid layout)
 */
const PersonSettingsControls = ({
  componentName,
  maxCount = 10,

  // UI text/customization
  title = 'Manage Settings',
  gearButtonLabel = 'Preferences',
  gearButtonTitle = 'Manage settings',
  dropdownPlaceholder = 'Load setting...',
  rowSaveLabel = 'Save Current State',

  // How to build default setting name (given accessLevel)
  defaultSettingNameBuilder,

    // Required:
  buildSettingsState,
  applySettingsFromJson,

  // NEW (optional)
  seedStateTransform,
}) => {
  const dispatch = useDispatch();
  const reduxState = useSelector((state) => state);

  const accessToken = reduxState?.isLogged?.accessToken;
  const email = reduxState?.isLogged?.email;
  const cognitoMod = reduxState?.isLogged?.cognitoMod;
  const testerMod = reduxState?.isLogged?.testerMod;
  const accessLevel =
    testerMod && testerMod !== 'No' ? testerMod : cognitoMod;

  const [showModal, setShowModal] = useState(false);
  const [nameEdits, setNameEdits] = useState({});

  const {
    settings = [],
    selectedSettingId,
    setSelectedSettingId,
    busy,
    maxCount: hookMaxCount, // from usePersonSettings
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

  const effectiveMaxCount = hookMaxCount || maxCount;

  const defaultSettingName =
    (defaultSettingNameBuilder &&
      defaultSettingNameBuilder({ accessLevel })) ||
    'Default';

  // Build meta block for json_settings
  const buildMeta = useCallback(
    () => ({
      savedAt: new Date().toISOString(),
      version: '1.0',
      accessLevel: accessLevel || null,
    }),
    [accessLevel]
  );

  // Build "state" payload from the entire Redux state
  const buildCurrentStatePayload = useCallback(() => {
    if (typeof buildSettingsState !== 'function') {
      // eslint-disable-next-line no-console 	  
      console.error('PersonSettingsControls: buildSettingsState is not a function');
      return {};
    }
    return buildSettingsState(reduxState);
  }, [buildSettingsState, reduxState]);

  // When user picks a setting from dropdown -> apply it
  const handlePickSetting = useCallback(
    async (person_setting_id) => {
      if (!person_setting_id) return;
      const setting = (settings || []).find(
        (s) => s.person_setting_id === person_setting_id
      );
      if (!setting || !setting.json_settings) return;

      // Caller decides what "apply" means (run search, apply grid layout, etc.)
      applySettingsFromJson(setting.json_settings, dispatch, {
        runSearch: true,
        preserveExistingFacetsIfEmpty: true, // safe for older/empty settings
      });
      setSelectedSettingId(person_setting_id);
    },
    [settings, applySettingsFromJson, dispatch, setSelectedSettingId]
  );

  // Create new setting from current state
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
        // Let modal show its own generic error; nothing created
        return null;
      }

      const statePayload = buildCurrentStatePayload();
      const payload = {
        meta: buildMeta(),
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
      buildCurrentStatePayload,
      buildMeta,
      create,
      load,
      setSelectedSettingId,
    ]
  );

  // Save *current* state into an existing setting
  const handleSaveToSetting = useCallback(
    async (person_setting_id) => {
      if (!person_setting_id) return;
      const statePayload = buildCurrentStatePayload();
      const payload = {
        meta: buildMeta(),
        state: statePayload,
      };
      await savePayloadTo(person_setting_id, payload);
      await load();
    },
    [buildCurrentStatePayload, buildMeta, savePayloadTo, load]
  );

  // On mount: load settings, seed default if none, apply default (ONLY on fresh/empty state)
  useEffect(() => {
    if (!accessToken || !email) return;

    // If user already has an active state (e.g. coming back via browser Back),
    // do NOT apply preferences and do NOT run a search.
    const s = reduxState?.search || {};
    const hasActiveSearch =
      (s.searchQuery && String(s.searchQuery).trim() !== '') ||
      (s.authorFilter && String(s.authorFilter).trim() !== '') ||
      (s.searchResults && s.searchResults.length > 0) ||
      (s.searchFacetsValues && Object.keys(s.searchFacetsValues).length > 0) ||
      (s.searchExcludedFacetsValues && Object.keys(s.searchExcludedFacetsValues).length > 0) ||
      !!s.datePubmedAdded ||
      !!s.datePubmedModified ||
      !!s.datePublished ||
      !!s.dateCreated;

    const run = async () => {
      try {
        const { existing, picked } = await load();
        const all = existing || [];

	// If active search exists, do NOT apply anything.
        // But we already loaded, so dropdown will still show saved settings.
	if (hasActiveSearch) {
          return;
        }
        // --- no settings: seed default ---
        if (all.length === 0) {
          let statePayload = buildCurrentStatePayload();

          if (typeof seedStateTransform === 'function') {
            statePayload = seedStateTransform(statePayload, { accessLevel, reduxState });
          }

          const payload = { meta: buildMeta(), state: statePayload };

          const created = await seed({
            name: defaultSettingName,
            payload,
            isDefault: true,
          });

          await load();

          if (created?.person_setting_id) {
            setSelectedSettingId(created.person_setting_id);
          }

          // Apply seed state and run initial search
          applySettingsFromJson({ state: statePayload }, dispatch, {
            runSearch: true,
            preserveExistingFacetsIfEmpty: true,
          });
          return;
        }

        const settingToUse = picked || all.find((s) => s.default_setting) || all[0];
        if (settingToUse && settingToUse.json_settings) {
          // Apply saved settings and run initial search
          applySettingsFromJson(settingToUse.json_settings, dispatch, { runSearch: true });
          setSelectedSettingId(settingToUse.person_setting_id);
        }
      } catch (err) {
        console.error('PersonSettingsControls: failed to load settings:', err);
      }
    };

    run();
  
  }, [accessToken, email]);
  
  return (
    <div
      className="d-flex align-items-center"
      style={{ gap: '0.5rem', marginBottom: '0.5rem' }}
    >
      {/* Gear / Preferences */}
      <Button
        variant="outline-primary"
        size="sm"
        onClick={() => setShowModal(true)}
        title={gearButtonTitle}
      >
        <FaGear size={14} style={{ marginRight: '4px' }} />
        {gearButtonLabel}
      </Button>

      {/* Dropdown: load an existing setting */}
      <SettingsDropdown
        settings={settings}
        selectedId={selectedSettingId}
        onPick={handlePickSetting}
        size="sm"
        label={dropdownPlaceholder}
      />

      {/* Modal: manage settings (create / rename / delete / default / save current) */}
      <SettingsGearModal
        show={showModal}
        onHide={() => setShowModal(false)}
        title={title}
        settings={settings || []}
        nameEdits={nameEdits}
        setNameEdits={setNameEdits}
        onCreate={handleCreateSetting}
        onRename={rename}
        onDelete={remove}
        onMakeDefault={makeDefault}
        canCreateMore={(settings || []).length < effectiveMaxCount}
        busy={busy}
        renderRowActions={(setting, { rowBusy }) => (
          <Button
            size="sm"
            variant="outline-success"
            disabled={busy || rowBusy}
            onClick={() => handleSaveToSetting(setting.person_setting_id)}
          >
            {rowSaveLabel}
          </Button>
        )}
      />
    </div>
  );
};

export default PersonSettingsControls;
