// src/utils/userSettings.js
import { api } from '../api';

// Global deduplication for person settings API calls
const pendingSettingsRequests = new Map();
const settingsCache = new Map();
const CACHE_DURATION = 5000; // 5 seconds

async function getPersonIdByEmail({ email }) {
  console.log(`Getting person_id for cognito_id: ${email}`);

  const response = await api.get(`/person/by/email/${encodeURIComponent(email)}`);

  if (response.status === 204 || !response.data) {
    throw new Error(`No person found for email: ${email}`);
  }

  console.log(`Found person_id: ${response.data.person_id} for email: ${email}`);
  return response.data.person_id;
}

/**
 * List settings for a user + component.
 */
export async function listPersonSettings({
  email,
  componentName,
}) {
  if (!email) throw new Error("listPersonSettings: email is required");

  console.log(`Listing settings for email: ${email}, component: ${componentName}`);

  // Create cache key based on email only (since the API endpoint fetches all settings for an email)
  const cacheKey = `${email}`;

  // Check if there's a pending request for this email
  if (pendingSettingsRequests.has(cacheKey)) {
    console.log(`Reusing pending request for email: ${email}`);
    const allSettings = await pendingSettingsRequests.get(cacheKey);
    const filtered = allSettings.filter((row) => row.component_name === componentName);
    console.log(`Found ${filtered.length} settings for component: ${componentName} (from pending)`);
    return filtered;
  }

  // Check if we have a recent cached result
  const cached = settingsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Using cached settings for email: ${email}`);
    const filtered = cached.data.filter((row) => row.component_name === componentName);
    console.log(`Found ${filtered.length} settings for component: ${componentName} (from cache)`);
    return filtered;
  }

  // Create the request promise
  const requestPromise = (async () => {
    try {
      const response = await api.get(`/person_setting/by/email/${encodeURIComponent(email)}`);

      if (response.status === 204 || !Array.isArray(response.data)) {
        console.log(`No settings found for email: ${email}`);
        return [];
      }

      // Cache the full result
      settingsCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });

      return response.data;
    } finally {
      // Remove from pending requests
      pendingSettingsRequests.delete(cacheKey);
    }
  })();

  // Store the pending promise
  pendingSettingsRequests.set(cacheKey, requestPromise);

  // Wait for the result
  const allSettings = await requestPromise;

  // Filter by component_name on the client side
  const filtered = allSettings.filter((row) => row.component_name === componentName);
  console.log(`Found ${filtered.length} settings for component: ${componentName}`);
  return filtered;
}

/**
 * Create a new person_setting row.
 */
export async function createPersonSetting({
  email,
  componentName,
  name,
  isDefault = false,
  payload = {},
}) {
  console.log(`Creating setting:`, {
    email,
    componentName,
    name,
    isDefault,
    payload
  });

  try {
    // First, get the person_id from the cognito_id
    const person_id = await getPersonIdByEmail({ email });

    const requestBody = {
      person_id: person_id,
      component_name: componentName,
      setting_name: name,
      default_setting: isDefault,
      json_settings: payload,
    };

    console.log("Sending request body:", requestBody);

    const response = await api.post('/person_setting/', requestBody);

    console.log("Successfully created setting:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error in createPersonSetting:", error);
    throw error;
  }
}

/** PATCH a person_setting row (partial update) */
export async function updatePersonSetting({
  person_setting_id,
  patch,
}) {
  console.log(`Updating setting ${person_setting_id}:`, patch);

  const response = await api.patch(
    `/person_setting/${person_setting_id}`,
    patch
  );
  return response.data;
}

/** Delete a person_setting row. */
export async function deletePersonSetting({ person_setting_id }) {
  console.log(`Deleting setting ${person_setting_id}`);
  await api.delete(`/person_setting/${person_setting_id}`);
  return true;
}

/** Fetch a single person_setting row. */
export async function showPersonSetting({ person_setting_id }) {
  const response = await api.get(`/person_setting/${person_setting_id}`);
  return response.data;
}

/**
 * Mark one setting as default.
 */
export const makeDefaultPersonSetting = async ({ email, componentName, person_setting_id }) => {
  try {
    console.log(`Setting ${person_setting_id} as default for component: ${componentName}`);

    // First, get current settings to find existing default
    const response = await api.get(`/person_setting/by/email/${encodeURIComponent(email)}`);
    const allSettings = response.data;

    if (Array.isArray(allSettings)) {
      // Find current default for this component
      const currentDefault = allSettings.find(s =>
        s.component_name === componentName && s.default_setting === true
      );

      // Unset current default if it exists and is different
      if (currentDefault && currentDefault.person_setting_id !== person_setting_id) {
        console.log(`Unsetting current default: ${currentDefault.person_setting_id}`);
        await api.patch(
          `/person_setting/${currentDefault.person_setting_id}`,
          { default_setting: false }
        );
      }
    }

    // Set new default
    const result = await api.patch(
      `/person_setting/${person_setting_id}`,
      { default_setting: true }
    );

    console.log(`Successfully set ${person_setting_id} as default`);
    return result.data;
  } catch (error) {
    console.error(`Failed to set default setting ${person_setting_id}:`, error);
    throw error;
  }
};

/** Pick the default setting from a list (fallback to first if none marked). */
export function pickDefaultSetting(settings = []) {
  if (!Array.isArray(settings) || settings.length === 0) return null;
  return settings.find((s) => s.default_setting) || settings[0];
}
