// src/components/search/settings/SearchPreferencesControls.js
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
      // json_settings -> apply into Redux + run search
      applySettingsFromJson={(json_settings, dispatch, options) =>
        applySearchSettingsFromJson(json_settings, dispatch, options)
      }
    />
  );
};

export default SearchPreferencesControls;
