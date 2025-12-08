// src/components/settings/SettingsGearModal.js
import React from "react";
import { Modal, Button, Form, Spinner, Alert } from "react-bootstrap";

/**
 * Generic "Manage XXX Preferences" modal.
 *
 * Shared behaviors:
 *   - Create new setting
 *   - Mark default setting
 *   - Inline rename (✓ / ✕)
 *   - Delete
 *
 * Customizable via props:
 *   - title                      (modal title)
 *   - createLabel                (section label)
 *   - createPlaceholder          (input placeholder)
 *   - createButtonText           (button text for create)
 *   - renderRowActions(setting, helpers)
 *       -> extra buttons per row (e.g. "Save Layout", "Save Current Search")
 */
export default function SettingsGearModal({
  show,
  onHide,

  settings = [],
  nameEdits,
  setNameEdits,

  onCreate,
  onRename,
  onDelete,
  onMakeDefault,

  canCreateMore = true,
  busy = false,

  title = "Manage Preferences",
  createLabel = "Create New Setting",
  createPlaceholder = "Enter setting name",
  createButtonText = "Create",

  // Optional extra row actions, e.g. "Save Layout" or "Save Current Search"
  // renderRowActions(setting, { rowBusy, isDefault })
  renderRowActions,
}) {
  const [newName, setNewName] = React.useState("");
  const [rowBusyId, setRowBusyId] = React.useState(null);
  const [errorMsg, setErrorMsg] = React.useState("");

  // Reset local state when modal closes
  React.useEffect(() => {
    if (!show) {
      setNewName("");
      setRowBusyId(null);
      setErrorMsg("");
      setNameEdits({});
    }
  }, [show, setNameEdits]);

  /* ---------- Create ---------- */

  const handleCreate = async () => {
    const clean = (newName || "").trim();
    if (!clean) return;
    if (!onCreate) return;

    setErrorMsg("");
    try {
      const created = await onCreate(clean);
      if (created) {
        setNewName("");
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || String(err);
      setErrorMsg(`Failed to create setting: ${msg}`);
    }
  };

  const handleCreateKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    }
  };

  /* ---------- Rename ---------- */

  const startRename = (setting) => {
    setNameEdits((prev) => ({
      ...prev,
      [setting.person_setting_id]: setting.setting_name || setting.name || "",
    }));
  };

  const cancelRename = (id) => {
    setNameEdits((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const saveRename = async (setting) => {
    if (!onRename) return;

    const id = setting.person_setting_id;
    const newVal = (nameEdits[id] || "").trim();
    if (!newVal) {
      setErrorMsg("Setting name cannot be empty.");
      return;
    }
    if (newVal === (setting.setting_name || setting.name || "")) {
      cancelRename(id);
      return;
    }

    setRowBusyId(id);
    setErrorMsg("");
    try {
      await onRename(id, newVal);
      cancelRename(id);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || String(err);
      setErrorMsg(`Failed to rename setting: ${msg}`);
    } finally {
      setRowBusyId(null);
    }
  };

  const handleRenameKeyDown = (e, setting) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveRename(setting);
    } else if (e.key === "Escape") {
      cancelRename(setting.person_setting_id);
    }
  };

  /* ---------- Delete ---------- */

  const handleDelete = async (id) => {
    if (!onDelete) return;
    setErrorMsg("");
    setRowBusyId(id);
    try {
      await onDelete(id);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || String(err);
      setErrorMsg(`Failed to delete setting: ${msg}`);
    } finally {
      setRowBusyId(null);
    }
  };

  /* ---------- Default ---------- */

  const handleMakeDefaultClick = async (setting) => {
    if (!onMakeDefault) return;
    setErrorMsg("");
    setRowBusyId(setting.person_setting_id);
    try {
      await onMakeDefault(setting.person_setting_id);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || String(err);
      setErrorMsg(`Failed to set default: ${msg}`);
    } finally {
      setRowBusyId(null);
    }
  };

  const hasSettings = (settings || []).length > 0;

  /* ---------- Render ---------- */

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {errorMsg && (
          <Alert variant="danger" className="py-2">
            {errorMsg}
          </Alert>
        )}

        {/* Create new setting */}
        <div className="mb-4">
          <Form.Group>
            <Form.Label>{createLabel}</Form.Label>
            <div className="d-flex gap-2">
              <Form.Control
                type="text"
                placeholder={createPlaceholder}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleCreateKeyDown}
                disabled={busy || !canCreateMore}
              />
              <Button
                variant="primary"
                disabled={
                  busy || !canCreateMore || !(newName || "").trim()
                }
                onClick={handleCreate}
              >
                {busy ? <Spinner animation="border" size="sm" /> : createButtonText}
              </Button>
            </div>
            {!canCreateMore && (
              <Form.Text className="text-warning">
                Maximum number of settings reached. Delete one to create another.
              </Form.Text>
            )}
          </Form.Group>
        </div>

        {/* Existing settings */}
        <div>
          <h6>Existing Settings</h6>
          {!hasSettings ? (
            <p className="text-muted mb-0">
              No settings saved yet. Use &quot;{createLabel}&quot; above
              to create one.
            </p>
          ) : (
            <div className="list-group">
              {settings.map((setting) => {
                const id = setting.person_setting_id;
                const isDefault = !!setting.default_setting;
                const isEditing = Object.prototype.hasOwnProperty.call(
                  nameEdits,
                  id
                );
                const rowBusy = rowBusyId === id || busy;

                return (
                  <div
                    key={id}
                    className="list-group-item d-flex justify-content-between align-items-center"
                  >
                    {/* Name + star + inline rename */}
                    <div className="d-flex align-items-center flex-grow-1 me-3">
                      <span
                        className="me-2"
                        title={isDefault ? "Default setting" : ""}
                      >
                        {isDefault ? "★" : ""}
                      </span>

                      {isEditing ? (
                        <div className="d-flex flex-grow-1 align-items-center">
                          <Form.Control
                            type="text"
                            size="sm"
                            value={nameEdits[id] || ""}
                            onChange={(e) =>
                              setNameEdits((prev) => ({
                                ...prev,
                                [id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => handleRenameKeyDown(e, setting)}
                            disabled={rowBusy}
                            className="me-2"
                            autoFocus
                          />
                          <Button
                            variant="success"
                            size="sm"
                            className="me-1"
                            disabled={rowBusy}
                            onClick={() => saveRename(setting)}
                          >
                            ✓
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={rowBusy}
                            onClick={() => cancelRename(id)}
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <span className="flex-grow-1">
                          {setting.setting_name || setting.name}
                        </span>
                      )}
                    </div>

                    {/* Right side buttons */}
                    <div className="d-flex flex-wrap gap-2">
                      {/* Extra custom actions (e.g. Save Layout / Save Current Search) */}
                      {renderRowActions &&
                        renderRowActions(setting, { rowBusy, isDefault })}

                      {/* Set Default (non-default only) */}
                      {!isDefault && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          disabled={rowBusy}
                          onClick={() => handleMakeDefaultClick(setting)}
                        >
                          Set Default
                        </Button>
                      )}

                      {/* Rename (only when not already editing) */}
                      {!isEditing && (
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          disabled={rowBusy}
                          onClick={() => startRename(setting)}
                        >
                          Rename
                        </Button>
                      )}

                      {/* Delete */}
                      <Button
                        variant="outline-danger"
                        size="sm"
                        disabled={rowBusy}
                        onClick={() => handleDelete(id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={busy}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
