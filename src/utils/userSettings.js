// src/utils/userSettings.js

// Global deduplication for person settings API calls
const pendingSettingsRequests = new Map();
const settingsCache = new Map();
const CACHE_DURATION = 5000; // 5 seconds

async function authed(baseUrl, token, path, options = {}) {
  try {
    const url = `${baseUrl}${path}`;
    console.log(`Making API call to: ${url}`, {
      method: options.method || "GET",
      hasBody: !!options.body
    });

    const res = await fetch(url, {
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });

    console.log(`API response status: ${res.status} for ${path}`);

    if (res.status === 204) return { status: 204, json: null };
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`API error ${res.status} at ${path}:`, text);
      throw new Error(`HTTP ${res.status} at ${path} — ${text}`);
    }
    
    const json = await res.json().catch(() => null);
    return { status: res.status, json };
  } catch (error) {
    console.error(`Network error for ${path}:`, error);
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Network error: Cannot connect to server. Check if the server is running and accessible.`);
    }
    throw error;
  }
}

async function getPersonIdByEmail({ baseUrl, token, email }) {
  console.log(`Getting person_id for cognito_id: ${email}`);
  
  const { status, json } = await authed(
    baseUrl,
    token,
    `/person/by/email/${encodeURIComponent(email)}`
  );

  if (status === 204 || !json) {
    throw new Error(`No person found for email: ${email}`);
  }

  console.log(`Found person_id: ${json.person_id} for email: ${email}`);
  return json.person_id;
}

/**
 * List settings for a user + component.
 */
export async function listPersonSettings({
  baseUrl,
  token,
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
      const { status, json } = await authed(
        baseUrl,
        token,
        `/person_setting/by/email/${encodeURIComponent(email)}`
      );

      if (status === 204 || !Array.isArray(json)) {
        console.log(`No settings found for email: ${email}`);
        return [];
      }

      // Cache the full result
      settingsCache.set(cacheKey, {
        data: json,
        timestamp: Date.now()
      });

      return json;
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
  baseUrl,
  token,
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
    const person_id = await getPersonIdByEmail({ baseUrl, token, email });
    
    const requestBody = {
      person_id: person_id,
      component_name: componentName,
      setting_name: name,
      default_setting: isDefault,
      json_settings: payload,
    };
    
    console.log("Sending request body:", requestBody);
    
    const { json: result } = await authed(baseUrl, token, `/person_setting/`, {
      method: "POST",
      body: JSON.stringify(requestBody),
    });
    
    console.log("Successfully created setting:", result);
    return result;
  } catch (error) {
    console.error("Error in createPersonSetting:", error);
    throw error;
  }
}

/** PATCH a person_setting row (partial update) */
export async function updatePersonSetting({
  baseUrl,
  token,
  person_setting_id,
  patch,
}) {
  console.log(`Updating setting ${person_setting_id}:`, patch);
  
  // Simplify the mapping - just pass the patch directly
  // The backend expects the actual column names anyway
  const body = JSON.stringify(patch);
  
  const { json } = await authed(
    baseUrl,
    token,
    `/person_setting/${person_setting_id}`,
    { method: "PATCH", body }
  );
  return json;
}

/** Delete a person_setting row. */
export async function deletePersonSetting({ baseUrl, token, person_setting_id }) {
  console.log(`Deleting setting ${person_setting_id}`);
  await authed(baseUrl, token, `/person_setting/${person_setting_id}`, {
    method: "DELETE",
  });
  return true;
}

/** Fetch a single person_setting row. */
export async function showPersonSetting({ baseUrl, token, person_setting_id }) {
  const { json } = await authed(
    baseUrl,
    token,
    `/person_setting/${person_setting_id}`
  );
  return json;
}

/**
 * Mark one setting as default.
 */
export const makeDefaultPersonSetting = async ({ baseUrl, token, email, componentName, person_setting_id }) => {
  try {
    console.log(`Setting ${person_setting_id} as default for component: ${componentName}`);
    
    // First, get current settings to find existing default
    const { json: allSettings } = await authed(
      baseUrl,
      token,
      `/person_setting/by/email/${encodeURIComponent(email)}`
    );
    
    if (Array.isArray(allSettings)) {
      // Find current default for this component
      const currentDefault = allSettings.find(s => 
        s.component_name === componentName && s.default_setting === true
      );
      
      // Unset current default if it exists and is different
      if (currentDefault && currentDefault.person_setting_id !== person_setting_id) {
        console.log(`Unsetting current default: ${currentDefault.person_setting_id}`);
        await authed(
          baseUrl,
          token,
          `/person_setting/${currentDefault.person_setting_id}`,
          {
            method: "PATCH",
            body: JSON.stringify({ default_setting: false })
          }
        );
      }
    }
    
    // Set new default
    const response = await authed(
      baseUrl,
      token,
      `/person_setting/${person_setting_id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ default_setting: true })
      }
    );
    
    console.log(`Successfully set ${person_setting_id} as default`);
    return response.json;
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
