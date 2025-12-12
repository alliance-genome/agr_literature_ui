import React from 'react';

import PersonSettingsControls from '../../settings/PersonSettingsControls';
import {
  buildSearchSettingsState,
  applySearchSettingsFromJson,
} from './SearchPreferencesUtils';

/**
 * SearchPreferencesControls:
 *
 * Thin wrapper around generic PersonSettingsControls, wired up with
 * search - specific state builder + apply function.
 */
const SearchPreferencesControls = () => {
  return (
    <PersonSettingsControls
      componentName="reference_search"
      maxCount={20}
      title="Manage Saved Searches"
      gearButtonLabel="Preferences"
      gearButtonTitle="Manage saved searches and defaults"
      dropdownPlaceholder="Load setting..."
      rowSaveLabel="Save Current Search"
      // Build name like "SGD Default Search" or "Default Search"	
      defaultSettingNameBuilder={({ accessLevel }) =>
        accessLevel ? `${accessLevel} Default Search` : 'Default Search'
      }
      // Redux -> payload.state
      buildSettingsState={(reduxState) =>
        buildSearchSettingsState(reduxState)
      }
      
      applySettingsFromJson={(json_settings, dispatch, options) =>
        applySearchSettingsFromJson(json_settings, dispatch, options)
      }
      // Inject defaults when seeding the very first setting
      seedStateTransform={(statePayload, { accessLevel }) => {
        const facetsValues = { ...(statePayload.facetsValues || {}) };

        if (
          accessLevel &&
          accessLevel !== 'No' &&
          (!Array.isArray(facetsValues['mods_in_corpus_or_needs_review.keyword']) ||
            facetsValues['mods_in_corpus_or_needs_review.keyword'].length === 0)
        ) {
          facetsValues['mods_in_corpus_or_needs_review.keyword'] = [accessLevel];
        }

        if (
          !Array.isArray(facetsValues['language.keyword']) ||
          facetsValues['language.keyword'].length === 0
        ) {
          facetsValues['language.keyword'] = ['English'];
        }

        return { ...statePayload, facetsValues };
      }}
    />
  );
};

export default SearchPreferencesControls;
