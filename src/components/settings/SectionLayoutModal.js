// src/components/settings/SectionLayoutModal.js
//
// Graphical preference modal for arranging a page's card sections in a 2D grid,
// modeled on BiblioLayoutPreferenceModal.
//
// The section list, starting arrangement and settings namespace are supplied by
// the caller (`sectionDefs` / `defaultLayout` / `componentName`), so one modal
// serves every page that has this layout feature: the Person and Laboratory
// tabs, Editor and Display alike, each saving to its own namespace.
//
// The modal body contains:
//   1. A react-grid-layout canvas with one schematic, draggable/resizable box per
//      section.
//   2. A list of the user's named layouts (create / load / save-here / rename /
//      set-default / delete), persisted per-user via usePersonSettings under the
//      caller's component namespace.
//
// Unlike the Biblio modal, the saved payload also carries the section visibility
// (`hidden`) and the metadata toggles (`showTimestamps`, `showCurator`), which are
// controlled on the page itself. Those values are passed in via `current` so
// "Save As New" / "Save Here" capture the live page state, and `onApplyPrefs`
// pushes a loaded layout's full preferences (layout + visibility + toggles) back
// to the page.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { FaGear } from 'react-icons/fa6';
import { useSelector } from 'react-redux';

import GridLayout, { WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { usePersonSettings } from './usePersonSettings';
// LAYOUT_COLS originates here; personSections/laboratorySections only
// re-export it. A shared modal should not reach through one caller's module.
import { LAYOUT_COLS } from '../biblio/biblioEditorSections';

const ReactGridLayout = WidthProvider(GridLayout);

// A rotating palette so the boxes are visually distinguishable on the canvas.
// Exported with the box style so every customization modal that arranges
// sections (this one, the search-card display settings) draws its boxes in the
// same visual language.
export const SECTION_PALETTE = [
  '#e9f2ff', '#eaf7ee', '#fff4e6', '#fdeaf1', '#f0eafb',
  '#e6f7fa', '#fbf6e0', '#eef0f2', '#f9e9e9', '#eafbf1',
];
export const colorForIndex = (i) => SECTION_PALETTE[i % SECTION_PALETTE.length];
export const sectionBoxStyle = (background) => ({
  background,
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
});

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

// Stable signature of a layout's full preferences, for modified-detection on
// the active-layout indicator: item and list order are normalized so a drag
// that merely reorders the array (same coordinates) or a differently-ordered
// hidden list does not read as a change.
const layoutSignature = (layout, hidden, showTimestamps, showCurator) => JSON.stringify({
  layout: normalizeLayout(layout || [])
    .slice()
    .sort((a, b) => String(a.i).localeCompare(String(b.i))),
  hidden: [...(hidden || [])].sort(),
  showTimestamps: showTimestamps !== false,
  showCurator: showCurator !== false,
});

const SectionLayoutModal = ({
  sectionDefs,
  defaultLayout,
  componentName,
  // Names the tab this modal belongs to -- "Display" or "Editor". Drives the
  // button tooltip, the dialog title and the body copy from one value, so a
  // Display tab cannot end up describing itself as an editor.
  pageLabel = 'Section',
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

  // Element ids are derived from the caller's namespace rather than hardcoded:
  // this modal is shared, so a fixed "person-" prefix put id="person-..." in the
  // DOM on the Laboratory page, and two modals rendered together would collide
  // on duplicate ids -- which silently sends a label's click to the first match.
  const idPrefix = (componentName || 'section-layout').replace(/_/g, '-');

  const [showModal, setShowModal] = useState(false);
  const [workingLayout, setWorkingLayout] = useState(defaultLayout);
  // Mirror of workingLayout so drag/resize-stop handlers can read the latest full
  // layout (including hidden sections' coords) without waiting for a state flush.
  const workingRef = useRef(defaultLayout);
  useEffect(() => { workingRef.current = workingLayout; }, [workingLayout]);
  const [newName, setNewName] = useState('');
  const [nameEdits, setNameEdits] = useState({});
  const [message, setMessage] = useState(null); // { variant, text }
  // Which saved layout the page is currently using, shown on the trigger
  // button as "Layout: <name>" with a trailing * once modified -- the same
  // idiom as the search-card Layout button (curator request). The snapshot
  // holds the signature of the preferences last loaded or saved; any live
  // divergence (drag, visibility, metadata toggles) reads as modified. It is
  // state, not a ref, because the label is derived from it during render.
  const [activeName, setActiveName] = useState(null);
  const [namedSnapshot, setNamedSnapshot] = useState(null);
  // Latest `current` for the mount-time load effect, which must not re-run
  // when the page's live prefs change.
  const currentRef = useRef(current);
  useEffect(() => { currentRef.current = current; }, [current]);

  // Record which named layout the page is now using and the exact preferences
  // that were pushed to it, so later divergence can be detected. `name` is
  // null for the built-in default (after Reset, or when the active layout is
  // deleted); the snapshot is still taken so plain "Layout" can grow a * too.
  const markActive = useCallback((name, prefs) => {
    setActiveName(name || null);
    setNamedSnapshot(layoutSignature(
      prefs.layout || currentRef.current?.layout || workingRef.current,
      prefs.hidden,
      prefs.showTimestamps,
      prefs.showCurator
    ));
  }, []);

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
    componentName,
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
        if (!picked) {
          // No saved default: the page is on the built-in arrangement. Take
          // that as the baseline so a later tweak reads as modified.
          const cur = currentRef.current || {};
          markActive(null, {
            layout: defaultLayout,
            hidden: cur.hidden,
            showTimestamps: cur.showTimestamps,
            showCurator: cur.showCurator,
          });
          return;
        }
        const prefs = prefsFromSetting(picked);
        if (prefs.layout) setWorkingLayout(prefs.layout);
        if (typeof onApplyPrefs === 'function') onApplyPrefs(prefs);
        markActive(picked.setting_name || picked.name, prefs);
      })
      .catch((err) => {
        const msg = err?.response?.data?.detail || err?.message || String(err);
        console.error(`Failed to load ${componentName} preferences:`, msg);
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
      notify(`A layout named "${clean}" already exists.`, 'warning');
      return;
    }
    try {
      const payload = buildPayload();
      const created = await create(clean, payload);
      await load();
      if (created?.person_setting_id) setSelectedSettingId(created.person_setting_id);
      setNewName('');
      markActive(clean, payload);
      notify(`Layout "${clean}" created.`, 'success');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || String(err);
      notify(`Failed to create layout: ${msg}`, 'danger');
    }
  }, [newName, settings, create, buildPayload, load, setSelectedSettingId, markActive, notify]);

  const handleLoad = useCallback(
    (setting) => {
      const prefs = prefsFromSetting(setting);
      setWorkingLayout(prefs.layout || defaultLayout);
      setSelectedSettingId(setting.person_setting_id);
      if (typeof onApplyPrefs === 'function') onApplyPrefs(prefs);
      markActive(setting.setting_name || setting.name, prefs);
      notify(`Loaded "${setting.setting_name || setting.name}".`, 'info');
    },
    [setSelectedSettingId, onApplyPrefs, markActive, notify, defaultLayout]
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
        // The page now matches this entry exactly, whichever layout it was
        // showing before -- so it becomes the active one, unmodified.
        markActive(setting.setting_name || setting.name, payload);
        notify(`Saved current layout to "${setting.setting_name || setting.name}".`, 'success');
      } catch (err) {
        const msg = err?.response?.data?.detail || err?.message || String(err);
        notify(`Failed to save layout: ${msg}`, 'danger');
      }
    },
    [savePayloadTo, buildPayload, load, onApplyPrefs, markActive, notify]
  );

  const handleMakeDefault = useCallback(
    async (setting) => {
      try {
        await makeDefault(setting.person_setting_id);
        const prefs = prefsFromSetting(setting);
        if (prefs.layout) setWorkingLayout(prefs.layout);
        if (typeof onApplyPrefs === 'function') onApplyPrefs(prefs);
        markActive(setting.setting_name || setting.name, prefs);
        notify(`"${setting.setting_name || setting.name}" is now your default layout.`, 'success');
      } catch (err) {
        const msg = err?.response?.data?.detail || err?.message || String(err);
        notify(`Failed to set default: ${msg}`, 'danger');
      }
    },
    [makeDefault, onApplyPrefs, markActive, notify]
  );

  const handleDelete = useCallback(
    async (id) => {
      const victim = (settings || []).find((s) => s.person_setting_id === id);
      const victimName = victim ? (victim.setting_name || victim.name) : null;
      try {
        await remove(id);
        // The page keeps the arrangement, but it no longer has a name. The
        // snapshot stays so further edits still read as modified.
        if (victimName && victimName === activeName) setActiveName(null);
        notify('Layout deleted.', 'success');
      } catch (err) {
        const msg = err?.response?.data?.detail || err?.message || String(err);
        notify(`Failed to delete settings: ${msg}`, 'danger');
      }
    },
    [settings, activeName, remove, notify]
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
        // The trigger button names the active layout, so it follows a rename.
        if ((setting.setting_name || setting.name) === activeName) setActiveName(val);
        notify(`Renamed to "${val}".`, 'success');
      } catch (err) {
        const msg = err?.response?.data?.detail || err?.message || String(err);
        notify(`Failed to rename: ${msg}`, 'danger');
      }
    },
    [nameEdits, activeName, rename, load, notify]
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
    setWorkingLayout(defaultLayout);
    const prefs = {
      layout: defaultLayout,
      hidden: Array.isArray(current?.hidden) ? current.hidden : [],
      showTimestamps: current?.showTimestamps !== false,
      showCurator: current?.showCurator !== false,
    };
    if (typeof onApplyPrefs === 'function') onApplyPrefs(prefs);
    // Back on the built-in arrangement: the button drops the name.
    markActive(null, prefs);
    notify('Layout reset to the default stacked arrangement.', 'info');
  }, [onApplyPrefs, current, markActive, notify, defaultLayout]);

  const hasSettings = (settings || []).length > 0;

  /* ---------- trigger-button label ---------- */

  // "Layout" for the built-in default, "Layout: <name>" for a saved layout, a
  // trailing * once the page's live preferences diverge from what was loaded
  // or saved. The live signature reads the page's own state (`current`) so a
  // drag on the canvas, a visibility checkbox or a metadata switch all count;
  // before the initial load resolves there is no snapshot and nothing is
  // flagged.
  const liveSignature = layoutSignature(
    current?.layout || workingLayout,
    current?.hidden,
    current?.showTimestamps,
    current?.showCurator
  );
  const isModified = namedSnapshot !== null && liveSignature !== namedSnapshot;
  const layoutButtonLabel = activeName
    ? `Layout: ${activeName}${isModified ? '*' : ''}`
    : (isModified ? 'Layout*' : 'Layout');
  const layoutButtonTitle =
    (activeName
      ? `Active ${pageLabel.toLowerCase()} layout: ${activeName}`
      : `Active ${pageLabel.toLowerCase()} layout: built-in default`)
    + (isModified ? ' (modified since loading)' : '')
    + ' — click to customize';

  const labelById = useMemo(() => {
    const m = {};
    for (const s of sectionDefs) m[s.id] = s.label;
    return m;
  }, [sectionDefs]);
  const indexById = useMemo(() => {
    const m = {};
    sectionDefs.forEach((s, i) => { m[s.id] = i; });
    return m;
  }, [sectionDefs]);

  const hiddenIds = current?.hidden || [];
  const visibleSectionDefs = sectionDefs.filter((s) => !hiddenIds.includes(s.id));
  const visibleLayout = workingLayout.filter((it) => !hiddenIds.includes(it.i));

  return (
    <>
      <Button
        variant="outline-primary"
        size="sm"
        title={layoutButtonTitle}
        onClick={() => setShowModal(true)}
      >
        <FaGear size={14} style={{ marginRight: '6px' }} />
        {layoutButtonLabel}
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
          <Modal.Title>{pageLabel} Layout</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {message && (
            <Alert variant={message.variant} className="py-2" dismissible onClose={() => setMessage(null)}>
              {message.text}
            </Alert>
          )}

          {/* The timestamp / curator clause is gated on the same condition as the
              fieldset itself -- otherwise a page without those toggles describes a
              control that is not on the screen. */}
          <p className="text-muted">
            Drag and resize the sections to arrange them, choose which sections are visible
            {(onToggleTimestamps || onToggleCurator) ? ', and set the timestamp / curator display' : ''}.
            {' '}Changes apply to the {pageLabel.toLowerCase()} as you
            make them. Save them
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
                <div key={s.id} style={sectionBoxStyle(colorForIndex(indexById[s.id]))}>
                  {labelById[s.id] || s.id}
                </div>
              ))}
            </ReactGridLayout>
          </div>

          {/* Section visibility */}
          <Form.Group className="mb-4">
            <Form.Label>Visible sections</Form.Label>
            <div className="d-flex flex-wrap align-items-center" style={{ gap: '0.5rem 1.75rem' }}>
              {sectionDefs.map((s) => (
                <Form.Check
                  key={s.id}
                  type="checkbox"
                  id={`${idPrefix}-section-toggle-${s.id}`}
                  label={s.label}
                  checked={!(current?.hidden || []).includes(s.id)}
                  onChange={() => onToggleSection && onToggleSection(s.id)}
                  style={{ whiteSpace: 'nowrap' }}
                />
              ))}
            </div>
          </Form.Group>

          {/* Metadata toggles.
              Only for pages that have per-field timestamp / curator metadata to show.
              A page without it (the Biblio Person screen) passes neither handler, and
              rendering the switches anyway would put two controls on screen that look
              live and change nothing. The saved payload still carries the two values
              either way, so a layout saved on one page stays readable on another. */}
          {(onToggleTimestamps || onToggleCurator) ? (
          <Form.Group className="mb-4">
            <Form.Label>Metadata</Form.Label>
            <div className="d-flex flex-wrap align-items-center" style={{ gap: '0.5rem 2.5rem' }}>
              <Form.Check
                type="switch"
                id={`${idPrefix}-show-timestamps`}
                label="Show timestamps"
                checked={current?.showTimestamps !== false}
                onChange={(e) => onToggleTimestamps && onToggleTimestamps(e.target.checked)}
              />
              <Form.Check
                type="switch"
                id={`${idPrefix}-show-curator`}
                label="Show curator"
                checked={current?.showCurator !== false}
                onChange={(e) => onToggleCurator && onToggleCurator(e.target.checked)}
              />
            </div>
          </Form.Group>
          ) : null}

          {/* Create new settings */}
          <Form.Group className="mb-4">
            <Form.Label>Save as a new layout</Form.Label>
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
                Maximum number of saved layouts reached. Delete one to create another.
              </Form.Text>
            )}
          </Form.Group>

          {/* Existing settings */}
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
                  const isCurrent = (setting.setting_name || setting.name) === activeName;
                  return (
                    <div
                      key={id}
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <div className="d-flex align-items-center flex-grow-1 me-3">
                        <span className="me-2" title={isDefault ? 'Default layout' : ''}>
                          {isDefault ? '★' : ''}
                        </span>
                        {isCurrent && (
                          // Inline-styled pill, matching the search-card
                          // layout list: the app runs Bootstrap 4, where the
                          // BS5 badge classes are inert.
                          <span
                            style={{
                              backgroundColor: '#d1ecf1',
                              color: '#0c5460',
                              borderRadius: '10px',
                              padding: '2px 10px',
                              marginRight: '12px',
                              fontSize: '0.8em',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}
                            title={`The layout the ${pageLabel.toLowerCase()} is currently using`}
                          >
                            current{isModified ? ' (modified)' : ''}
                          </span>
                        )}
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
                        <Button variant="outline-secondary" size="sm" disabled={busy} title="Load this layout" onClick={() => handleLoad(setting)}>
                          Load
                        </Button>
                        <Button variant="outline-success" size="sm" disabled={busy} title="Overwrite with the current layout" onClick={() => handleSaveHere(setting)}>
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

export default SectionLayoutModal;
