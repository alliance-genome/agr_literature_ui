// src/utils/userSettings.js

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

/**
 * Get person_id from okta_id by calling /person/by/okta/{oktaId}
 */
async function getPersonIdByOktaId({ baseUrl, token, oktaId }) {
  console.log(`Getting person_id for okta_id: ${oktaId}`);
  
  const { status, json } = await authed(
    baseUrl,
    token,
    `/person/by/okta/${encodeURIComponent(oktaId)}`
  );
  
  if (status === 204 || !json) {
    throw new Error(`No person found for okta_id: ${oktaId}`);
  }
  
  console.log(`Found person_id: ${json.person_id} for okta_id: ${oktaId}`);
  return json.person_id;
}

/**
 * List settings for a user + component.
 */
export async function listPersonSettings({
  baseUrl,
  token,
  oktaId,
  componentName,
}) {
  if (!oktaId) throw new Error("listPersonSettings: oktaId is required");
  
  console.log(`Listing settings for okta_id: ${oktaId}, component: ${componentName}`);
  
  const { status, json } = await authed(
    baseUrl,
    token,
    `/person_setting/by/okta/${encodeURIComponent(oktaId)}`
  );
  
  if (status === 204 || !Array.isArray(json)) {
    console.log(`No settings found for okta_id: ${oktaId}`);
    return [];
  }
  
  // Filter by component_name on the client side
  const filtered = json.filter((row) => row.component_name === componentName);
  console.log(`Found ${filtered.length} settings for component: ${componentName}`);
  return filtered;
}

/**
 * Create a new person_setting row.
 */
export async function createPersonSetting({
  baseUrl,
  token,
  oktaId,
  componentName,
  name,
  isDefault = false,
  payload = {},
}) {
  console.log(`Creating setting:`, {
    oktaId,
    componentName,
    name,
    isDefault,
    payload
  });

  try {
    // First, get the person_id from the okta_id
    const person_id = await getPersonIdByOktaId({ baseUrl, token, oktaId });
    
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
export async function makeDefaultPersonSetting({
  baseUrl,
  token,
  componentName,
  person_setting_id,
}) {
  const patch = { default_setting: true };
  return updatePersonSetting({ baseUrl, token, person_setting_id, patch });
}

/** Pick the default setting from a list (fallback to first if none marked). */
export function pickDefaultSetting(settings = []) {
  if (!Array.isArray(settings) || settings.length === 0) return null;
  return settings.find((s) => s.default_setting) || settings[0];
}
