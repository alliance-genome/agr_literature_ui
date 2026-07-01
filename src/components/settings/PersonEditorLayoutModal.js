// src/components/settings/PersonEditorLayoutModal.js
//
// Graphical preference modal for arranging the Person Editor's sections in a 2D
// grid, modeled on BiblioLayoutPreferenceModal.
//
// The modal body contains:
//   1. A react-grid-layout canvas with one schematic, draggable/resizable box per
//      section (the WB editor's ten card headers).
//   2. A list of the user's named layouts (create / load / save-here / rename /
//      set-default / delete), persisted per-user via usePersonSettings under the
//      `person_editor_layout` component namespace.
//
// Unlike the Biblio modal, the saved payload also carries the section visibility
// (`hidden`) and the metadata toggles (`showTimestamps`, `showCurator`), which are
// controlled on the editor page itself. Those values are passed in via `current`
// so "Save As New" / "Save Here" capture the live page state, and `onApplyPrefs`
// pushes a loaded layout's full preferences (layout + visibility + toggles) back
// to the editor.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  PERSON_EDITOR_LAYOUT_COMPONENT_NAME,
} from '../person/personEditorSections';

const ReactGridLayout = WidthProvider(GridLayout);

// A rotating palette so the ten boxes are visually distinguishable on the canvas.
const SECTION_PALETTE = [
  '#e9f2ff', '#eaf7ee', '#fff4e6', '#fdeaf1', '#f0eafb',
  '#e6f7fa', '#fbf6e0', '#eef0f2', '#f9e9e9', '#eafbf1',
];
const colorForIndex = (i) => SECTION_PALETTE[i % SECTION_PALETTE.length];

const normalizeLayout = (l) =>
  (l || []).map(({ i, x, y, w, h }) => ({ i, x, y, w, h }));

const prefsFromSetting = (s) => {
  const js = s?.json_settings || {};
  return {
    layout: Array.isArray(js.layout) ? js.layout : null,
    hidden: Array.isArray(js.hidden) ? js.hidden : [],
    showTimestamps: js.showTimestamps !== false,
    showCurator: js.showCurator !== false,
  };
};

const PersonEditorLayoutModal = ({
  onApplyPrefs,
  current,
  onToggleSection,
  onToggleTimestamps,
  onToggleCurator,
  maxCount = 10,
}) => {
  const accessToken = useSelector((state) => state.isLogged.accessToken);
  const cognitoMod = useSelector((state) => state.isLogged.cognitoMod);
  const testerMod = useSelector((state) => state.isLogged.testerMod);
  const email = useSelector((state) => state.isLogged.email);
  const accessLevel = testerMod !== 'No' ? testerMod : cognitoMod;

  const [showModal, setShowModal] = useState(false);
  const [workingLayout, setWorkingLayout] = useState(DEFAULT_LAYOUT);
  // Mirror of workingLayout so drag/resize-stop handlers can read the latest full
  // layout (including hidden sections' coords) without waiting for a state flush.
  const workingRef = useRef(DEFAULT_LAYOUT);
  useEffect(() => { workingRef.current = workingLayout; }, [workingLayout]);
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
    componentName: PERSON_EDITOR_LAYOUT_COMPONENT_NAME,
    maxCount,
  });

  const notify = useCallback((text, variant = 'success') => {
    setMessage(text ? { variant, text } : null);
  }, []);

  // Build the persisted payload: the canvas arrangement plus the live page-level
  // visibility + toggles supplied via `current`.
  const buildPayload = useCallback(
    () => ({
      layout: normalizeLayout(workingLayout),
      hidden: Array.isArray(current?.hidden) ? current.hidden : [],
      showTimestamps: current?.showTimestamps !== false,
      showCurator: current?.showCurator !== false,
      meta: { accessLevel, version: '1.0' },
    }),
    [workingLayout, current, accessLevel]
  );

  // Load saved layouts once we have auth context; apply the default to the editor.
  useEffect(() => {
    if (!accessToken || !email) return;
    load()
      .then(({ picked }) => {
        if (!picked) return;
        const prefs = prefsFromSetting(picked);
        if (prefs.layout) setWorkingLayout(prefs.layout);
        if (typeof onApplyPrefs === 'function') onApplyPrefs(prefs);
      })
      .catch((err) => {
        const msg = err?.response?.data?.detail || err?.message || String(err);
        console.error('Failed to load Person editor layout preferences:', msg);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, email, load]);

  const canCreateMore = (settings || []).length < maxCount;

  /* ---------- canvas ---------- */

  // The canvas only renders boxes for visible sections, but we preserve the saved
  // coordinates of hidden sections in workingLayout so they reappear where they were
  // when re-shown. onLayoutChange reports only the visible (rendered) boxes, so merge
  // those updates back over the full layout rather than replacing it.
  const handleLayoutChange = useCallback((l) => {
    const changed = {};
    for (const it of normalizeLayout(l)) changed[it.i] = it;
    setWorkingLayout((prev) => {
      const merged = prev.map((it) => changed[it.i] || it);
      for (const it of Object.values(changed)) {
        if (!prev.some((p) => p.i === it.i)) merged.push(it);
      }
      return merged;
    });
  }, []);

  /* ---------- list actions ---------- */

  const handleCreate = useCallback(async () => {
    const clean = (newName || '').trim();
    if (!clean) return;
    const exists = (settings || []).some(
      (s) => (s.setting_name || s.name || '').trim().toLowerCase() === clean.toLowerCase()
    );
    if (exists) {
      notify(`Settings named "${clean}" already exist.`, 'warning');
      return;
    }
    try {
      const created = await create(clean, buildPayload());
      await load();
      if (created?.person_setting_id) setSelectedSettingId(created.person_setting_id);
      setNewName('');
      notify(`Settings "${clean}" created.`, 'success');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || String(err);
      notify(`Failed to create settings: ${msg}`, 'danger');
    }
  }, [newName, settings, create, buildPayload, load, setSelectedSettingId, notify]);

  const handleLoad = useCallback(
    (setting) => {
      const prefs = prefsFromSetting(setting);
      setWorkingLayout(prefs.layout || DEFAULT_LAYOUT);
      setSelectedSettingId(setting.person_setting_id);
      if (typeof onApplyPrefs === 'function') onApplyPrefs(prefs);
      notify(`Loaded "${setting.setting_name || setting.name}".`, 'info');
    },
    [setSelectedSettingId, onApplyPrefs, notify]
  );

  const handleSaveHere = useCallback(
    async (setting) => {
      try {
        const payload = buildPayload();
        await savePayloadTo(setting.person_setting_id, payload);
        await load();
        if (setting.default_setting && typeof onApplyPrefs === 'function') {
          onApplyPrefs(prefsFromSetting({ json_settings: payload }));
        }
        notify(`Saved current settings to "${setting.setting_name || setting.name}".`, 'success');
      } catch (err) {
        const msg = err?.response?.data?.detail || err?.message || String(err);
        notify(`Failed to save settings: ${msg}`, 'danger');
      }
    },
    [savePayloadTo, buildPayload, load, onApplyPrefs, notify]
  );

  const handleMakeDefault = useCallback(
    async (setting) => {
      try {
        await makeDefault(setting.person_setting_id);
        const prefs = prefsFromSetting(setting);
        if (prefs.layout) setWorkingLayout(prefs.layout);
        if (typeof onApplyPrefs === 'function') onApplyPrefs(prefs);
        notify(`"${setting.setting_name || setting.name}" are now your default settings.`, 'success');
      } catch (err) {
        const msg = err?.response?.data?.detail || err?.message || String(err);
        notify(`Failed to set default: ${msg}`, 'danger');
      }
    },
    [makeDefault, onApplyPrefs, notify]
  );

  const handleDelete = useCallback(
    async (id) => {
      try {
        await remove(id);
        notify('Settings deleted.', 'success');
      } catch (err) {
        const msg = err?.response?.data?.detail || err?.message || String(err);
        notify(`Failed to delete settings: ${msg}`, 'danger');
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

  /* ---------- live apply ---------- */

  // Push a layout to the editor immediately, keeping the current visibility/toggles.
  // Merges the just-finished visible boxes over the previous full layout so hidden
  // sections keep their saved coordinates.
  const applyLayoutLive = useCallback(
    (l) => {
      if (typeof onApplyPrefs !== 'function') return;
      const changed = {};
      for (const it of normalizeLayout(l || [])) changed[it.i] = it;
      const prev = workingRef.current || [];
      const merged = prev.map((it) => changed[it.i] || it);
      for (const it of Object.values(changed)) {
        if (!prev.some((p) => p.i === it.i)) merged.push(it);
      }
      onApplyPrefs({
        layout: merged,
        hidden: Array.isArray(current?.hidden) ? current.hidden : [],
        showTimestamps: current?.showTimestamps !== false,
        showCurator: current?.showCurator !== false,
      });
    },
    [onApplyPrefs, current]
  );

  /* ---------- footer ---------- */

  const handleResetCanvas = useCallback(() => {
    setWorkingLayout(DEFAULT_LAYOUT);
    if (typeof onApplyPrefs === 'function') {
      onApplyPrefs({
        layout: DEFAULT_LAYOUT,
        hidden: Array.isArray(current?.hidden) ? current.hidden : [],
        showTimestamps: current?.showTimestamps !== false,
        showCurator: current?.showCurator !== false,
      });
    }
    notify('Layout reset to the default stacked arrangement.', 'info');
  }, [onApplyPrefs, current, notify]);

  const hasSettings = (settings || []).length > 0;

  const labelById = useMemo(() => {
    const m = {};
    for (const s of SECTION_DEFS) m[s.id] = s.label;
    return m;
  }, []);
  const indexById = useMemo(() => {
    const m = {};
    SECTION_DEFS.forEach((s, i) => { m[s.id] = i; });
    return m;
  }, []);

  const hiddenIds = current?.hidden || [];
  const visibleSectionDefs = SECTION_DEFS.filter((s) => !hiddenIds.includes(s.id));
  const visibleLayout = workingLayout.filter((it) => !hiddenIds.includes(it.i));

  return (
    <>
      <Button
        variant="outline-primary"
        size="sm"
        title="Editor settings"
        onClick={() => setShowModal(true)}
      >
        <FaGear size={14} style={{ marginRight: '6px' }} />
        Settings
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
          <Modal.Title>Editor Settings</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {message && (
            <Alert variant={message.variant} className="py-2" dismissible onClose={() => setMessage(null)}>
              {message.text}
            </Alert>
          )}

          <p className="text-muted">
            Drag and resize the sections to arrange them, choose which sections are visible, and set
            the timestamp / curator display. Changes apply to the editor as you make them. Save them
            as a named entry below to reuse later; your default is applied automatically.
          </p>

          {/* Graphical canvas */}
          <div className="border rounded mb-4" style={{ background: '#f8f9fa', padding: '8px' }}>
            {visibleSectionDefs.length === 0 && (
              <div className="text-muted text-center py-3">
                All sections are hidden. Re-enable a section below to arrange it.
              </div>
            )}
            <ReactGridLayout
              className="layout"
              layout={visibleLayout}
              cols={LAYOUT_COLS}
              rowHeight={26}
              margin={[8, 6]}
              compactType="vertical"
              isDraggable
              isResizable
              onLayoutChange={handleLayoutChange}
              onDragStop={applyLayoutLive}
              onResizeStop={applyLayoutLive}
            >
              {visibleSectionDefs.map((s) => (
                <div
                  key={s.id}
                  style={{
                    background: colorForIndex(indexById[s.id]),
                    border: '1px solid #b8c2cc',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    color: '#37485b',
                    cursor: 'move',
                    userSelect: 'none',
                    textAlign: 'center',
                    padding: '0 4px',
                  }}
                >
                  {labelById[s.id] || s.id}
                </div>
              ))}
            </ReactGridLayout>
          </div>

          {/* Section visibility */}
          <Form.Group className="mb-4">
            <Form.Label>Visible sections</Form.Label>
            <div className="d-flex flex-wrap align-items-center" style={{ gap: '0.5rem 1.75rem' }}>
              {SECTION_DEFS.map((s) => (
                <Form.Check
                  key={s.id}
                  type="checkbox"
                  id={`person-section-toggle-${s.id}`}
                  label={s.label}
                  checked={!(current?.hidden || []).includes(s.id)}
                  onChange={() => onToggleSection && onToggleSection(s.id)}
                  style={{ whiteSpace: 'nowrap' }}
                />
              ))}
            </div>
          </Form.Group>

          {/* Metadata toggles */}
          <Form.Group className="mb-4">
            <Form.Label>Metadata</Form.Label>
            <div className="d-flex flex-wrap align-items-center" style={{ gap: '0.5rem 2.5rem' }}>
              <Form.Check
                type="switch"
                id="person-show-timestamps"
                label="Show timestamps"
                checked={current?.showTimestamps !== false}
                onChange={(e) => onToggleTimestamps && onToggleTimestamps(e.target.checked)}
              />
              <Form.Check
                type="switch"
                id="person-show-curator"
                label="Show curator"
                checked={current?.showCurator !== false}
                onChange={(e) => onToggleCurator && onToggleCurator(e.target.checked)}
              />
            </div>
          </Form.Group>

          {/* Create new settings */}
          <Form.Group className="mb-4">
            <Form.Label>Save current settings as a new entry</Form.Label>
            <div className="d-flex gap-2">
              <Form.Control
                type="text"
                placeholder="Enter settings name"
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
                Maximum number of saved settings reached. Delete one to create another.
              </Form.Text>
            )}
          </Form.Group>

          {/* Existing settings */}
          <div>
            <h6>Saved Settings</h6>
            {!hasSettings ? (
              <p className="text-muted mb-0">No settings saved yet. Create one above.</p>
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
                        <Button variant="outline-secondary" size="sm" disabled={busy} title="Load these settings" onClick={() => handleLoad(setting)}>
                          Load
                        </Button>
                        <Button variant="outline-success" size="sm" disabled={busy} title="Overwrite with the current settings" onClick={() => handleSaveHere(setting)}>
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
          <Button variant="outline-secondary" onClick={handleResetCanvas} disabled={busy}>
            Reset Layout
          </Button>
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={busy}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default PersonEditorLayoutModal;
