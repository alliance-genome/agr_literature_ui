import React from "react";
import { Modal, Button, Form, Spinner, Alert } from "react-bootstrap";

export default function SettingsGearModal({
  show, onHide,
  settings, nameEdits, setNameEdits,
  onCreate, onRename, onDelete, onMakeDefault,
  canCreateMore, busy,
  title = "Table column preferences"
}) {
  const [newName, setNewName] = React.useState("");
  const [createError, setCreateError] = React.useState("");
  const [createSuccess, setCreateSuccess] = React.useState("");

  React.useEffect(() => { 
    if (!show) {
      setNewName("");
      setCreateError("");
      setCreateSuccess("");
    }
  }, [show]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    
    setCreateError("");
    setCreateSuccess("");
    
    try {
      const result = await onCreate(newName.trim());
      if (result) {
        setCreateSuccess(`Setting "${newName.trim()}" created successfully!`);
        setNewName("");
        // Auto-close after success, or let user see the success message
        setTimeout(() => {
          setCreateSuccess("");
        }, 2000);
      } else {
        setCreateError("Failed to create setting. Please try again.");
      }
    } catch (error) {
      setCreateError(`Error creating setting: ${error.message}`);
    }
  };

  const handleRename = async (person_setting_id, newName) => {
    if (!newName.trim()) {
      setCreateError("Setting name cannot be empty");
      return;
    }
    
    try {
      await onRename(person_setting_id, newName.trim());
      // Clear any name edit for this ID after successful rename
      setNameEdits(prev => {
        const updated = { ...prev };
        delete updated[person_setting_id];
        return updated;
      });
    } catch (error) {
      setCreateError(`Error renaming setting: ${error.message}`);
    }
  };

  const handleDelete = async (person_setting_id) => {
    if (window.confirm("Are you sure you want to delete this setting?")) {
      try {
        await onDelete(person_setting_id);
      } catch (error) {
        setCreateError(`Error deleting setting: ${error.message}`);
      }
    }
  };

  const handleMakeDefault = async (person_setting_id) => {
    try {
      await onMakeDefault(person_setting_id);
    } catch (error) {
      setCreateError(`Error setting default: ${error.message}`);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Success/Error Messages */}
        {createSuccess && (
          <Alert variant="success" className="py-2">
            {createSuccess}
          </Alert>
        )}
        {createError && (
          <Alert variant="danger" className="py-2">
            {createError}
          </Alert>
        )}

        {/* Create New Setting */}
        <div className="d-flex gap-2 mb-3">
          <Form.Control
            placeholder="Name this setting…"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setCreateError("");
            }}
            disabled={busy}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newName.trim() && !busy) {
                handleCreate();
              }
            }}
          />
          <Button
            variant="primary"
            disabled={!newName.trim() || !canCreateMore || busy}
            onClick={handleCreate}
          >
            {busy ? <Spinner animation="border" size="sm" /> : "Save"}
          </Button>
        </div>

        {/* Existing Settings */}
        {settings.length === 0 ? (
          <div className="text-muted text-center py-3">
            No saved settings yet. Create one above.
          </div>
        ) : (
          settings.map((s) => (
            <div key={s.person_setting_id} className="d-flex align-items-center gap-2 mb-2">
              <Form.Check
                type="radio"
                name="default-setting"
                checked={!!s.default_setting}
                onChange={() => handleMakeDefault(s.person_setting_id)}
                disabled={busy}
                title="Make this my default"
              />
              <Form.Control
                value={nameEdits[s.person_setting_id] ?? s.setting_name}
                onChange={(e) => setNameEdits({ ...nameEdits, [s.person_setting_id]: e.target.value })}
                disabled={busy}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleRename(s.person_setting_id, nameEdits[s.person_setting_id] ?? s.setting_name);
                  }
                }}
              />
              <Button
                size="sm" 
                variant="outline-success" 
                disabled={busy || !nameEdits[s.person_setting_id] || nameEdits[s.person_setting_id] === s.setting_name}
                onClick={() => handleRename(s.person_setting_id, nameEdits[s.person_setting_id] ?? s.setting_name)}
                title="Save name"
              >
                {busy ? <Spinner animation="border" size="sm" /> : "Save"}
              </Button>
              <Button
                size="sm" 
                variant="outline-danger" 
                disabled={busy || settings.length <= 1} // Don't allow deleting the last setting
                onClick={() => handleDelete(s.person_setting_id)}
                title={settings.length <= 1 ? "Cannot delete the last setting" : "Delete setting"}
              >
                Delete
              </Button>
            </div>
          ))
        )}

        {!canCreateMore && (
          <div className="text-muted mt-2">
            <small>You've reached the maximum of 10 stored preferences.</small>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={busy}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
