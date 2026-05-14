import React, { useEffect, useState } from 'react';

import PersonSettingsControls from '../../settings/PersonSettingsControls';
import {
  buildSearchSettingsState,
  applySearchSettingsFromJson,
} from './SearchPreferencesUtils';
import { api } from '../../../api';

/**
 * SearchPreferencesControls:
 *
 * Thin wrapper around generic PersonSettingsControls, wired up with
 * search - specific state builder + apply function.
 */
const SearchPreferencesControls = () => {
  const [retractionStatusCuries, setRetractionStatusCuries] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch retraction status CURIEs on mount to use in default exclusions
  useEffect(() => {
    const fetchRetractionStatuses = async () => {
      try {
        const result = await api.get('/ontology/search_descendants/ATP:0000346/true/true/true');
        const curies = (result.data || []).map(entity => entity.curie);
        setRetractionStatusCuries(curies);
      } catch (error) {
        console.error('Error fetching retraction status CURIEs:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    fetchRetractionStatuses();
  }, []);

  // Wait for retraction status CURIEs to be fetched before rendering
  if (!isLoaded) {
    return null;
  }

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
        const excludedFacetsValues = { ...(statePayload.excludedFacetsValues || {}) };

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

        // Exclude all retraction statuses by default (retracted, partially retracted, fully retracted)
        if (
          retractionStatusCuries.length > 0 &&
          (!Array.isArray(excludedFacetsValues['retraction_status.keyword']) ||
            excludedFacetsValues['retraction_status.keyword'].length === 0)
        ) {
          excludedFacetsValues['retraction_status.keyword'] = retractionStatusCuries;
        }

        return { ...statePayload, facetsValues, excludedFacetsValues };
      }}
    />
  );
};

export default SearchPreferencesControls;
