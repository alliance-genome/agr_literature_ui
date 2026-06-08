// src/components/settings/BiblioLayoutPreferenceModal.js
//
// SCRUM-6046 — Graphical preference modal for arranging the three BiblioEditor
// sections (Vital / Authors / Additional Info) in a 2D grid.
//
// Renders a "Layout" trigger button plus a modal. The modal body contains:
//   1. A react-grid-layout canvas with three schematic, draggable/resizable boxes.
//   2. A list of the user's named layouts (create / load / save-here / rename /
//      set-default / delete), persisted per-user via usePersonSettings under the
//      `biblio_editor_layout` component namespace.
//
// The active (default) layout is loaded on mount and pushed to the editor via the
// `onApplyLayout` callback so the editor render reflects the saved arrangement.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { FaGear } from 'react-icons/fa6';
import { useSelector } from 'react-redux';

import GridLayout, { WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { usePersonSettings } from './usePersonSettings';
import {
  SECTION_DEFS,
  DEFAULT_LAYOUT,
  LAYOUT_COLS,
  BIBLIO_LAYOUT_COMPONENT_NAME,
} from '../biblio/biblioEditorSections';

const ReactGridLayout = WidthProvider(GridLayout);

const SECTION_COLORS = {
  vital: '#e9f2ff',
  authors: '#eaf7ee',
  additional: '#fff4e6',
};

const normalizeLayout = (l) =>
  (l || []).map(({ i, x, y, w, h }) => ({ i, x, y, w, h }));

const layoutFromSetting = (s) =>
  Array.isArray(s?.json_settings?.layout) ? s.json_settings.layout : null;

const BiblioLayoutPreferenceModal = ({ onApplyLayout, maxCount = 10 }) => {
  const accessToken = useSelector((state) => state.isLogged.accessToken);
  const cognitoMod = useSelector((state) => state.isLogged.cognitoMod);
  const testerMod = useSelector((state) => state.isLogged.testerMod);
  const email = useSelector((state) => state.isLogged.email);
  const accessLevel = testerMod !== 'No' ? testerMod : cognitoMod;

  const [showModal, setShowModal] = useState(false);
  const [workingLayout, setWorkingLayout] = useState(DEFAULT_LAYOUT);
  const [newName, setNewName] = useState('');
  const [nameEdits, setNameEdits] = useState({});
  const [message, setMessage] = useState(null); // { variant, text }

  const {
    settings,
    setSelectedSettingId,
    busy,
    load,
    create,
    rename,
    remove,
    makeDefault,
    savePayloadTo,
  } = usePersonSettings({
    token: accessToken,
    email,
    componentName: BIBLIO_LAYOUT_COMPONENT_NAME,
    maxCount,
  });

  const notify = useCallback((text, variant = 'success') => {
    setMessage(text ? { variant, text } : null);
  }, []);

  const buildPayload = useCallback(
    () => ({
      layout: normalizeLayout(workingLayout),
      meta: { accessLevel, savedAt: new Date().toISOString(), version: '1.0' },
    }),
    [workingLayout, accessLevel]
  );

  // Load saved layouts once we have auth context; apply the default to the editor.
  useEffect(() => {
    if (!accessToken || !email) return;
    load()
      .then(({ picked }) => {
        const layout = layoutFromSetting(picked);
        if (layout) {
          setWorkingLayout(layout);
          if (typeof onApplyLayout === 'function') onApplyLayout(layout);
        }
      })
      .catch((err) => {
        const msg = err?.response?.data?.detail || err?.message || String(err);
        console.error('Failed to load layout preferences:', msg);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, email, load]);

  const canCreateMore = (settings || []).length < maxCount;

  /* ---------- canvas ---------- */

  const handleLayoutChange = useCallback((l) => {
    setWorkingLayout(normalizeLayout(l));
  }, []);

  /* ---------- list actions ---------- */

  const handleCreate = useCallback(async () => {
    const clean = (newName || '').trim();
    if (!clean) return;
    const exists = (settings || []).some(
      (s) => (s.setting_name || s.name || '').trim().toLowerCase() === clean.toLowerCase()
    );
    if (exists) {
      notify(`A layout named "${clean}" already exists.`, 'warning');
      return;
    }
    try {
      const created = await create(clean, buildPayload());
      await load();
      if (created?.person_setting_id) setSelectedSettingId(created.person_setting_id);
      setNewName('');
      notify(`Layout "${clean}" created.`, 'success');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || String(err);
      notify(`Failed to create layout: ${msg}`, 'danger');
    }
  }, [newName, settings, create, buildPayload, load, setSelectedSettingId, notify]);

  const handleLoadIntoCanvas = useCallback(
    (setting) => {
      const layout = layoutFromSetting(setting) || DEFAULT_LAYOUT;
      setWorkingLayout(layout);
      setSelectedSettingId(setting.person_setting_id);
      notify(`Loaded "${setting.setting_name || setting.name}" into the canvas.`, 'info');
    },
    [setSelectedSettingId, notify]
  );

  const handleSaveHere = useCallback(
    async (setting) => {
      try {
        await savePayloadTo(setting.person_setting_id, buildPayload());
        await load();
        if (setting.default_setting && typeof onApplyLayout === 'function') {
          onApplyLayout(normalizeLayout(workingLayout));
        }
        notify(`Saved current arrangement to "${setting.setting_name || setting.name}".`, 'success');
      } catch (err) {
        const msg = err?.response?.data?.detail || err?.message || String(err);
        notify(`Failed to save layout: ${msg}`, 'danger');
      }
    },
    [savePayloadTo, buildPayload, load, onApplyLayout, workingLayout, notify]
  );

  const handleMakeDefault = useCallback(
    async (setting) => {
      try {
        await makeDefault(setting.person_setting_id);
        const layout = layoutFromSetting(setting) || DEFAULT_LAYOUT;
        setWorkingLayout(layout);
        if (typeof onApplyLayout === 'function') onApplyLayout(layout);
        notify(`"${setting.setting_name || setting.name}" is now your default layout.`, 'success');
      } catch (err) {
        const msg = err?.response?.data?.detail || err?.message || String(err);
        notify(`Failed to set default: ${msg}`, 'danger');
      }
    },
    [makeDefault, onApplyLayout, notify]
  );

  const handleDelete = useCallback(
    async (id) => {
      try {
        await remove(id);
        notify('Layout deleted.', 'success');
      } catch (err) {
        const msg = err?.response?.data?.detail || err?.message || String(err);
        notify(`Failed to delete layout: ${msg}`, 'danger');
      }
    },
    [remove, notify]
  );

  const startRename = (setting) =>
    setNameEdits((prev) => ({
      ...prev,
      [setting.person_setting_id]: setting.setting_name || setting.name || '',
    }));
  const cancelRename = (id) =>
    setNameEdits((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  const saveRename = useCallback(
    async (setting) => {
      const id = setting.person_setting_id;
      const val = (nameEdits[id] || '').trim();
      if (!val) {
        notify('Layout name cannot be empty.', 'warning');
        return;
      }
      try {
        await rename(id, val);
        await load();
        cancelRename(id);
        notify(`Renamed to "${val}".`, 'success');
      } catch (err) {
        const msg = err?.response?.data?.detail || err?.message || String(err);
        notify(`Failed to rename: ${msg}`, 'danger');
      }
    },
    [nameEdits, rename, load, notify]
  );

  /* ---------- footer ---------- */

  const handleApplyToEditor = useCallback(() => {
    if (typeof onApplyLayout === 'function') onApplyLayout(normalizeLayout(workingLayout));
    notify('Arrangement applied to the editor for this session.', 'info');
  }, [onApplyLayout, workingLayout, notify]);

  const handleResetCanvas = useCallback(() => {
    setWorkingLayout(DEFAULT_LAYOUT);
    notify('Canvas reset to the default stacked arrangement.', 'info');
  }, [notify]);

  const hasSettings = (settings || []).length > 0;

  const labelById = useMemo(() => {
    const m = {};
    for (const s of SECTION_DEFS) m[s.id] = s.label;
    return m;
  }, []);

  return (
    <>
      <Button
        variant="outline-primary"
        size="sm"
        title="Arrange editor sections"
        onClick={() => setShowModal(true)}
      >
        <FaGear size={14} style={{ marginRight: '6px' }} />
        Layout
      </Button>

      <Modal
        show={showModal}
        onHide={() => {
          setShowModal(false);
          setMessage(null);
          setNameEdits({});
        }}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Arrange Editor Sections</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {message && (
            <Alert variant={message.variant} className="py-2" dismissible onClose={() => setMessage(null)}>
              {message.text}
            </Alert>
          )}

          <p className="text-muted">
            Drag and resize the three sections to arrange them relative to each other, then save
            the arrangement as a named layout below. Your default layout is applied to the editor.
          </p>

          {/* Graphical canvas */}
          <div className="border rounded mb-4" style={{ background: '#f8f9fa', padding: '8px' }}>
            <ReactGridLayout
              className="layout"
              layout={workingLayout}
              cols={LAYOUT_COLS}
              rowHeight={36}
              margin={[8, 8]}
              compactType="vertical"
              isDraggable
              isResizable
              onLayoutChange={handleLayoutChange}
            >
              {SECTION_DEFS.map((s) => (
                <div
                  key={s.id}
                  style={{
                    background: SECTION_COLORS[s.id] || '#eee',
                    border: '1px solid #b8c2cc',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    color: '#37485b',
                    cursor: 'move',
                    userSelect: 'none',
                  }}
                >
                  {labelById[s.id] || s.id}
                </div>
              ))}
            </ReactGridLayout>
          </div>

          {/* Create new layout */}
          <Form.Group className="mb-4">
            <Form.Label>Save current arrangement as a new layout</Form.Label>
            <div className="d-flex gap-2">
              <Form.Control
                type="text"
                placeholder="Enter layout name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                disabled={busy || !canCreateMore}
              />
              <Button
                variant="primary"
                disabled={busy || !canCreateMore || !(newName || '').trim()}
                onClick={handleCreate}
              >
                {busy ? <Spinner animation="border" size="sm" /> : 'Save As New'}
              </Button>
            </div>
            {!canCreateMore && (
              <Form.Text className="text-warning">
                Maximum number of layouts reached. Delete one to create another.
              </Form.Text>
            )}
          </Form.Group>

          {/* Existing layouts */}
          <div>
            <h6>Saved Layouts</h6>
            {!hasSettings ? (
              <p className="text-muted mb-0">No layouts saved yet. Create one above.</p>
            ) : (
              <div className="list-group">
                {settings.map((setting) => {
                  const id = setting.person_setting_id;
                  const isDefault = !!setting.default_setting;
                  const isEditing = Object.prototype.hasOwnProperty.call(nameEdits, id);
                  return (
                    <div
                      key={id}
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <div className="d-flex align-items-center flex-grow-1 me-3">
                        <span className="me-2" title={isDefault ? 'Default layout' : ''}>
                          {isDefault ? '★' : ''}
                        </span>
                        {isEditing ? (
                          <div className="d-flex flex-grow-1 align-items-center">
                            <Form.Control
                              type="text"
                              size="sm"
                              value={nameEdits[id] || ''}
                              onChange={(e) =>
                                setNameEdits((prev) => ({ ...prev, [id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  saveRename(setting);
                                } else if (e.key === 'Escape') {
                                  cancelRename(id);
                                }
                              }}
                              disabled={busy}
                              className="me-2"
                              autoFocus
                            />
                            <Button variant="success" size="sm" className="me-1" disabled={busy} onClick={() => saveRename(setting)}>
                              ✓
                            </Button>
                            <Button variant="secondary" size="sm" disabled={busy} onClick={() => cancelRename(id)}>
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <span className="flex-grow-1">{setting.setting_name || setting.name}</span>
                        )}
                      </div>

                      <div className="d-flex flex-wrap gap-2">
                        <Button variant="outline-secondary" size="sm" disabled={busy} title="Load this layout into the canvas" onClick={() => handleLoadIntoCanvas(setting)}>
                          Load
                        </Button>
                        <Button variant="outline-success" size="sm" disabled={busy} title="Overwrite this layout with the current canvas" onClick={() => handleSaveHere(setting)}>
                          Save Here
                        </Button>
                        {!isDefault && (
                          <Button variant="outline-primary" size="sm" disabled={busy} onClick={() => handleMakeDefault(setting)}>
                            Set Default
                          </Button>
                        )}
                        {!isEditing && (
                          <Button variant="outline-secondary" size="sm" disabled={busy} onClick={() => startRename(setting)}>
                            Rename
                          </Button>
                        )}
                        <Button variant="outline-danger" size="sm" disabled={busy} onClick={() => handleDelete(id)}>
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

        <Modal.Footer className="justify-content-between">
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={handleResetCanvas} disabled={busy}>
              Reset Canvas
            </Button>
            <Button variant="success" onClick={handleApplyToEditor} disabled={busy}>
              Apply to Editor
            </Button>
          </div>
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={busy}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default BiblioLayoutPreferenceModal;
