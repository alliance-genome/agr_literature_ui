// Display settings for the search-result cards (SCRUM-6512).
//
// A "Layout" button (far right of the list/topic-grid switchbar) opens a
// modal that edits the card display profile: section order and visibility,
// per-prefix cross-reference selection, the action icons, and the person icon
// (paper's authors on the person screen). Every change applies to the cards
// immediately via Redux; named profiles persist per-user through person_settings under the
// 'search_display' namespace — separate from saved searches on purpose, so a
// curator like Cecilia can keep one "author curation" card layout while
// switching between many saved searches.
//
// The controls deliberately reuse the visual language of the other
// customization modals (SectionLayoutModal / BiblioLayoutPreferenceModal,
// curator request): a react-grid-layout canvas of colored, draggable section
// boxes for ordering (single column — a card is a vertical stack, so only the
// order is draggable, not the size), a flex-wrap checkbox row for visibility,
// and a saved-profile list with load / save-here / rename / set-default /
// delete. Each box also carries aria-labeled up/down buttons: the canvas
// itself has no keyboard support, so the buttons keep reordering reachable
// for keyboard and screen-reader users (review finding).

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { FaGear } from 'react-icons/fa6';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons';

import GridLayout, { WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { usePersonSettings } from '../../settings/usePersonSettings';
import { colorForIndex, sectionBoxStyle } from '../../settings/SectionLayoutModal';
import { setSearchDisplayPrefs } from '../../../actions/searchActions';
import {
  CARD_SECTIONS,
  DEFAULT_DISPLAY_PREFS,
  SEARCH_DISPLAY_COMPONENT,
  normalizeDisplayPrefs,
  xrefPrefix,
} from './searchDisplayPrefs';

const ReactGridLayout = WidthProvider(GridLayout);

const sectionLabel = (id) =>
  (CARD_SECTIONS.find((s) => s.id === id) || { label: id }).label;

// Stable color per section (by its index in CARD_SECTIONS), so a section keeps
// its color however the user orders the boxes.
const sectionColor = (id) =>
  colorForIndex(Math.max(0, CARD_SECTIONS.findIndex((s) => s.id === id)));

const SearchDisplaySettings = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector((state) => state.isLogged.accessToken);
  const email = useSelector((state) => state.isLogged.email);
  // Observers can customize their session live but cannot persist profiles
  // (person_settings POSTs are rejected for the read-only role, SCRUM-6431).
  const cognitoObserver = useSelector((state) => state.isLogged.cognitoObserver);
  const rawPrefs = useSelector((state) => state.search.searchDisplayPrefs);
  const searchResults = useSelector((state) => state.search.searchResults);

  const prefs = useMemo(() => normalizeDisplayPrefs(rawPrefs), [rawPrefs]);

  const [showModal, setShowModal] = useState(false);
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
    componentName: SEARCH_DISPLAY_COMPONENT,
    maxCount: 10,
  });

  const notify = useCallback((text, variant = 'success') => {
    setMessage(text ? { variant, text } : null);
  }, []);

  const applyPrefs = useCallback(
    (next) => dispatch(setSearchDisplayPrefs(normalizeDisplayPrefs(next))),
    [dispatch]
  );

  // Refresh the saved-profile list when the modal opens. The DEFAULT profile
  // is applied by useSearchDisplayProfile (mounted in SearchLayout), NOT here:
  // this component unmounts with the results switchbar on every search, and a
  // load-and-apply on mount re-applied the default over the user's working
  // profile each time (review finding). Loading is a GET (observer-permitted);
  // only the save/create controls are role-gated below.
  useEffect(() => {
    if (!showModal || !accessToken || !email) return;
    load().catch((err) => {
      const msg = err?.response?.data?.detail || err?.message || String(err);
      console.error('Failed to load search display profiles:', msg);
    });
  }, [showModal, accessToken, email, load]);

  const canCreateMore = (settings || []).length < 10;

  // The prefixes offered for selection: everything visible in the current
  // results plus anything the profile already hides (so a hidden prefix can be
  // re-enabled even when no current result carries it).
  const xrefPrefixes = useMemo(() => {
    const found = new Set(prefs.hiddenXrefPrefixes);
    for (const ref of searchResults || []) {
      for (const xref of ref.cross_references || []) {
        const prefix = xrefPrefix(xref.curie);
        if (prefix) found.add(prefix);
      }
    }
    return Array.from(found).sort();
  }, [searchResults, prefs.hiddenXrefPrefixes]);

  /* ---------- canvas ---------- */

  // A card is a vertical stack, so the canvas is a single column of boxes for
  // the visible sections; the box order (top to bottom) is the section order.
  const visibleOrder = prefs.sectionOrder.filter(
    (id) => !prefs.hiddenSections.includes(id)
  );
  const canvasLayout = visibleOrder.map((id, idx) => ({
    i: id, x: 0, y: idx, w: 1, h: 1,
  }));

  // The canvas only shows visible sections; hidden sections keep their slot in
  // sectionOrder (so re-showing one restores its place). Refill the visible
  // slots with the dragged order and leave the hidden slots alone.
  const handleDragStop = (layout) => {
    const draggedOrder = [...layout].sort((a, b) => a.y - b.y).map((it) => it.i);
    if (draggedOrder.length !== visibleOrder.length) return;
    let vi = 0;
    const order = prefs.sectionOrder.map((id) =>
      prefs.hiddenSections.includes(id) ? id : draggedOrder[vi++]
    );
    applyPrefs({ ...prefs, sectionOrder: order });
  };

  // Keyboard-reachable reordering (the canvas is mouse-only): move a section
  // one step among the visible slots — the same semantics as a drag.
  const moveVisibleSection = (id, delta) => {
    const vis = [...visibleOrder];
    const from = vis.indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= vis.length) return;
    vis.splice(from, 1);
    vis.splice(to, 0, id);
    let vi = 0;
    const order = prefs.sectionOrder.map((sid) =>
      prefs.hiddenSections.includes(sid) ? sid : vis[vi++]
    );
    applyPrefs({ ...prefs, sectionOrder: order });
  };

  const toggleSection = (id) => {
    const hidden = prefs.hiddenSections.includes(id)
      ? prefs.hiddenSections.filter((s) => s !== id)
      : [...prefs.hiddenSections, id];
    applyPrefs({ ...prefs, hiddenSections: hidden });
  };

  const toggleXrefPrefix = (prefix) => {
    const hidden = prefs.hiddenXrefPrefixes.includes(prefix)
      ? prefs.hiddenXrefPrefixes.filter((p) => p !== prefix)
      : [...prefs.hiddenXrefPrefixes, prefix];
    applyPrefs({ ...prefs, hiddenXrefPrefixes: hidden });
  };

  /* ---------- list actions ---------- */

  const buildPayload = useCallback(
    () => ({ meta: { version: '1.0' }, state: prefs }),
    [prefs]
  );

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

  const handleLoad = (setting) => {
    const stored = setting?.json_settings?.state;
    if (!stored) return;
    applyPrefs(stored);
    setSelectedSettingId(setting.person_setting_id);
    notify(`Loaded "${setting.setting_name || setting.name}".`, 'info');
  };

  const handleSaveHere = async (setting) => {
    try {
      await savePayloadTo(setting.person_setting_id, buildPayload());
      await load();
      notify(`Saved current layout to "${setting.setting_name || setting.name}".`, 'success');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || String(err);
      notify(`Failed to save layout: ${msg}`, 'danger');
    }
  };

  const handleMakeDefault = async (setting) => {
    try {
      await makeDefault(setting.person_setting_id);
      notify(`"${setting.setting_name || setting.name}" is now your default layout.`, 'success');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || String(err);
      notify(`Failed to set default: ${msg}`, 'danger');
    }
  };

  const handleDelete = async (id) => {
    try {
      await remove(id);
      notify('Layout deleted.', 'success');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || String(err);
      notify(`Failed to delete layout: ${msg}`, 'danger');
    }
  };

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

  return (
    <>
      <Button
        variant="outline-primary"
        size="sm"
        title="Customize the search-result card layout"
        onClick={() => setShowModal(true)}
      >
        <FaGear size={14} style={{ marginRight: '4px' }} />
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
          <Modal.Title>Search Card Layout</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {message && (
            <Alert variant={message.variant} className="py-2" dismissible onClose={() => setMessage(null)}>
              {message.text}
            </Alert>
          )}
          <p className="text-muted">
            Drag the sections to arrange their order on each search-result card
            and choose which sections are visible. Changes apply immediately;
            save them as a named layout to reuse later. Card layouts are
            separate from saved searches.
          </p>

          {/* Section order: same canvas as the other layout modals, one column */}
          <div className="border rounded mb-4" style={{ background: '#f8f9fa', padding: '8px' }}>
            {visibleOrder.length === 0 && (
              <div className="text-muted text-center py-3">
                All sections are hidden. Re-enable a section below to arrange it.
              </div>
            )}
            <ReactGridLayout
              className="layout"
              layout={canvasLayout}
              cols={1}
              rowHeight={30}
              margin={[8, 6]}
              compactType="vertical"
              isDraggable
              isResizable={false}
              draggableCancel=".search-display-order-btn"
              onDragStop={handleDragStop}
            >
              {visibleOrder.map((id, idx) => (
                <div
                  key={id}
                  style={{
                    ...sectionBoxStyle(sectionColor(id)),
                    justifyContent: 'space-between',
                    padding: '0 6px',
                  }}
                >
                  <span style={{ flexGrow: 1, textAlign: 'center' }}>{sectionLabel(id)}</span>
                  <span className="d-flex" style={{ gap: '4px' }}>
                    <Button
                      variant="outline-secondary" size="sm"
                      className="search-display-order-btn py-0 px-1"
                      aria-label={`Move ${sectionLabel(id)} up`}
                      disabled={idx === 0}
                      onClick={() => moveVisibleSection(id, -1)}
                    >
                      <FontAwesomeIcon icon={faArrowUp} />
                    </Button>
                    <Button
                      variant="outline-secondary" size="sm"
                      className="search-display-order-btn py-0 px-1"
                      aria-label={`Move ${sectionLabel(id)} down`}
                      disabled={idx === visibleOrder.length - 1}
                      onClick={() => moveVisibleSection(id, 1)}
                    >
                      <FontAwesomeIcon icon={faArrowDown} />
                    </Button>
                  </span>
                </div>
              ))}
            </ReactGridLayout>
          </div>

          {/* Section visibility */}
          <Form.Group className="mb-4">
            <Form.Label>Visible sections</Form.Label>
            <div className="d-flex flex-wrap align-items-center" style={{ gap: '0.5rem 1.75rem' }}>
              {CARD_SECTIONS.map((s) => (
                <Form.Check
                  key={s.id}
                  type="checkbox"
                  id={`search-display-section-${s.id}`}
                  label={s.label}
                  checked={!prefs.hiddenSections.includes(s.id)}
                  onChange={() => toggleSection(s.id)}
                  style={{ whiteSpace: 'nowrap' }}
                />
              ))}
            </div>
          </Form.Group>

          {/* Cross-reference prefixes */}
          <Form.Group className="mb-4">
            <Form.Label>Cross-references to show</Form.Label>
            {xrefPrefixes.length === 0 ? (
              <div className="text-muted">
                Run a search to list the cross-reference types in your results.
              </div>
            ) : (
              <div className="d-flex flex-wrap align-items-center" style={{ gap: '0.25rem 1.5rem' }}>
                {xrefPrefixes.map((prefix) => (
                  <Form.Check
                    key={prefix}
                    type="checkbox"
                    id={`search-display-xref-${prefix}`}
                    label={prefix}
                    checked={!prefs.hiddenXrefPrefixes.includes(prefix)}
                    onChange={() => toggleXrefPrefix(prefix)}
                    style={{ whiteSpace: 'nowrap' }}
                  />
                ))}
              </div>
            )}
            <Form.Text className="text-muted">
              A type not listed here (new to your results) is always shown.
            </Form.Text>
          </Form.Group>

          {/* Icons + author link */}
          <Form.Group className="mb-4">
            <Form.Label>Extras</Form.Label>
            <div className="d-flex flex-wrap align-items-center" style={{ gap: '0.5rem 2.5rem' }}>
              <Form.Check
                type="switch"
                id="search-display-show-icons"
                label="Show action icons (TET / PDF / images)"
                checked={prefs.showIcons}
                onChange={(e) => applyPrefs({ ...prefs, showIcons: e.target.checked })}
              />
              <Form.Check
                type="switch"
                id="search-display-person-icon"
                label="Show person icon (opens the paper's authors on the person screen)"
                checked={prefs.showPersonIcon}
                onChange={(e) => applyPrefs({ ...prefs, showPersonIcon: e.target.checked })}
              />
            </div>
          </Form.Group>

          {/* Named profiles (hidden for observers: the saves would 403) */}
          {!cognitoObserver && (
            <>
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

              <div>
                <h6>Saved Layouts</h6>
                {(settings || []).length === 0 ? (
                  <p className="text-muted mb-0">No layouts saved yet. Create one above.</p>
                ) : (
                  <div className="list-group">
                    {settings.map((setting) => {
                      const id = setting.person_setting_id;
                      const isDefault = !!setting.default_setting;
                      const isEditing = Object.prototype.hasOwnProperty.call(nameEdits, id);
                      return (
                        <div key={id} className="list-group-item d-flex justify-content-between align-items-center">
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
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-between">
          <Button
            variant="outline-secondary"
            disabled={busy}
            onClick={() => {
              applyPrefs(DEFAULT_DISPLAY_PREFS);
              notify('Reset to the default card layout.', 'info');
            }}
          >
            Reset Layout
          </Button>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default SearchDisplaySettings;
