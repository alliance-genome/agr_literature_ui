// src/components/settings/usePersonSettings.js
import { useState, useCallback } from "react";
import {
  listPersonSettings,
  createPersonSetting,
  updatePersonSetting,
  deletePersonSetting,
  makeDefaultPersonSetting,
  pickDefaultSetting,
} from "../../utils/userSettings";

export function usePersonSettings({
  baseUrl,
  token,
  email,
  componentName,
  maxCount = 10,
}) {
  const [settings, setSettings] = useState([]);
  const [selectedSettingId, setSelectedSettingId] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !email) {
      console.warn("Cannot load settings: missing token or email");
      return { existing: [], picked: null };
    }

    setBusy(true);
    try {
      const existing = await listPersonSettings({
        baseUrl,
        token,
        email,
        componentName,
      });
      setSettings(existing);
      const picked = pickDefaultSetting(existing);
      setSelectedSettingId(picked?.person_setting_id ?? null);
      return { existing, picked };
    } catch (error) {
      console.error("Failed to load person settings:", error);
      if (error.message.includes("No person found")) {
        console.warn("No person record found for user, returning empty settings");
        return { existing: [], picked: null };
      }
      throw error;
    } finally {
      setBusy(false);
    }
  }, [baseUrl, token, email, componentName]);

  const seed = useCallback(
    async ({ name, payload, isDefault = true }) => {
      if (!token || !email) {
        console.warn("Cannot seed settings: missing token or email");
        return null;
      }

      setBusy(true);
      try {
        const created = await createPersonSetting({
          baseUrl,
          token,
          email,
          componentName,
          name,
          isDefault,
          payload,
        });
        setSettings([created]);
        setSelectedSettingId(created.person_setting_id);
        return created;
      } catch (error) {
        console.error("Failed to seed settings:", error);
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [baseUrl, token, componentName, email]
  );
  
  const create = useCallback(
    async (name, payload) => {
      if (settings.length >= maxCount) {
        throw new Error(`Maximum settings count (${maxCount}) reached`);
      }
      if (!token || !email) {
        throw new Error("Cannot create setting: missing authentication");
      }
      if (!name || !name.trim()) {
        throw new Error("Setting name is required");
      }

      setBusy(true);
      try {
        const created = await createPersonSetting({
          baseUrl,
          token,
          email,
          componentName,
          name: name.trim(),
          isDefault: false,
          payload, // This will be stored in json_settings field
        });
        setSettings((prev) => [...prev, created]);
        setSelectedSettingId(created.person_setting_id);
        return created;
      } catch (error) {
        console.error("Failed to create setting:", error);
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [baseUrl, token, email, componentName, settings.length, maxCount]
  );

  const rename = useCallback(
    async (id, newName) => {
      if (!newName || !newName.trim()) {
        throw new Error("Setting name cannot be empty");
      }
      if (!token) {
        throw new Error("Cannot rename setting: missing authentication");
      }
    
      setBusy(true);
      try {
        const updated = await updatePersonSetting({
          baseUrl,
          token,
          person_setting_id: id,
          patch: { setting_name: newName.trim() }, // Changed from 'name' to 'setting_name'
        });
        setSettings((prev) =>
          prev.map((s) =>
            s.person_setting_id === id ? { ...s, setting_name: newName.trim() } : s
          )
        );
        return updated;
      } catch (error) {
        console.error("Failed to rename setting:", error);
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [baseUrl, token]
  );

  const remove = useCallback(
    async (id) => {
      if (!token) {
        throw new Error("Cannot delete setting: missing authentication");
      }
      if (settings.length <= 1) {
        throw new Error("Cannot delete the last setting");
      }
      
      setBusy(true);
      try {
        await deletePersonSetting({ baseUrl, token, person_setting_id: id });
        setSettings((prev) => prev.filter((s) => s.person_setting_id !== id));
        setSelectedSettingId((prev) => (prev === id ? null : prev));
        return true;
      } catch (error) {
        console.error("Failed to delete setting:", error);
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [baseUrl, token, settings.length]
  );

  const makeDefault = useCallback(
    async (id) => {
      if (!token) {
        throw new Error("Cannot set default: missing authentication");
      }

      setBusy(true);
      try {
        // Use the utility function with all required parameters
        await makeDefaultPersonSetting({
          baseUrl,
          token,
          email, // This was missing before
          componentName,
          person_setting_id: id
        });

        // Update local state
        setSettings((prev) =>
          prev.map((s) => ({ ...s, default_setting: s.person_setting_id === id }))
        );
        return true;
      } catch (error) {
        console.error("Failed to set default setting:", error);
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [baseUrl, token, email, componentName]
  );

  const savePayloadTo = useCallback(
    async (id, payload) => {
      if (!token) {
        throw new Error("Cannot save payload: missing authentication");
      }
    
      setBusy(true);
      try {
        const updated = await updatePersonSetting({
          baseUrl,
          token,
          person_setting_id: id,
          patch: { json_settings: payload }, // Make sure this is json_settings, not just payload
        });
        setSettings((prev) =>
          prev.map((s) =>
            s.person_setting_id === id ? { ...s, json_settings: payload } : s
          )
        );
        return updated;
      } catch (error) {
        console.error("Failed to save payload:", error);
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [baseUrl, token]
  );

  return {
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
  };
}
