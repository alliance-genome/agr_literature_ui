import React from "react";
import { Dropdown } from "react-bootstrap";

export default function SettingsDropdown({ settings, selectedId, onPick, label = "Load setting" }) {
  return (
    <Dropdown className="ms-2">
      <Dropdown.Toggle variant="outline-primary" size="sm">
        {label}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {(!settings || settings.length === 0) && (
          <Dropdown.Item disabled>No saved settings</Dropdown.Item>
        )}
        {settings.map((s) => (
          <Dropdown.Item
            key={s.person_setting_id}
            active={s.person_setting_id === selectedId}
            onClick={() => onPick(s.person_setting_id)}
          >
            {s.setting_name}{s.default_setting ? " (default)" : ""}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
