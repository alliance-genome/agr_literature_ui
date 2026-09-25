// Display settings for the search-result cards (SCRUM-6512).
//
// A "Display settings" button (far right of the list/topic-grid switchbar)
// opens a modal that edits the card display profile: section order and
// visibility, per-prefix cross-reference selection, the action icons, and the
// author -> person-screen link. Every change applies to the cards immediately
// via Redux; named profiles persist per-user through person_settings under the
// 'search_display' namespace — separate from saved searches on purpose, so a
// curator like Cecilia can keep one "author curation" card layout while
// switching between many saved searches.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { FaGear } from 'react-icons/fa6';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons';

import { usePersonSettings } from '../../settings/usePersonSettings';
import { setSearchDisplayPrefs } from '../../../actions/searchActions';
import {
  CARD_SECTIONS,
  DEFAULT_DISPLAY_PREFS,
  SEARCH_DISPLAY_COMPONENT,
  normalizeDisplayPrefs,
  xrefPrefix,
} from './searchDisplayPrefs';

const sectionLabel = (id) =>
  (CARD_SECTIONS.find((s) => s.id === id) || { label: id }).label;

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
  const [message, setMessage] = useState(null); // { variant, text }

  const {
    settings,
    setSelectedSettingId,
    busy,
    load,
    create,
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

  // Apply the user's default profile once auth is available. Loading is a GET
  // (observer-permitted); only the save/create controls are role-gated below.
  useEffect(() => {
    if (!accessToken || !email) return;
    load()
      .then(({ picked }) => {
        const stored = picked?.json_settings?.state;
        if (stored) applyPrefs(stored);
      })
      .catch((err) => {
        const msg = err?.response?.data?.detail || err?.message || String(err);
        console.error('Failed to load search display profile:', msg);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, email, load]);

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

  const toggleSection = (id) => {
    const hidden = prefs.hiddenSections.includes(id)
      ? prefs.hiddenSections.filter((s) => s !== id)
      : [...prefs.hiddenSections, id];
    applyPrefs({ ...prefs, hiddenSections: hidden });
  };

  const moveSection = (id, delta) => {
    const order = [...prefs.sectionOrder];
    const from = order.indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= order.length) return;
    order.splice(from, 1);
    order.splice(to, 0, id);
    applyPrefs({ ...prefs, sectionOrder: order });
  };

  const toggleXrefPrefix = (prefix) => {
    const hidden = prefs.hiddenXrefPrefixes.includes(prefix)
      ? prefs.hiddenXrefPrefixes.filter((p) => p !== prefix)
      : [...prefs.hiddenXrefPrefixes, prefix];
    applyPrefs({ ...prefs, hiddenXrefPrefixes: hidden });
  };

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
      notify(`A profile named "${clean}" already exists.`, 'warning');
      return;
    }
    try {
      const created = await create(clean, buildPayload());
      await load();
      if (created?.person_setting_id) setSelectedSettingId(created.person_setting_id);
      setNewName('');
      notify(`Display profile "${clean}" created.`, 'success');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || String(err);
      notify(`Failed to create profile: ${msg}`, 'danger');
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
      notify(`Saved current display to "${setting.setting_name || setting.name}".`, 'success');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || String(err);
      notify(`Failed to save profile: ${msg}`, 'danger');
    }
  };

  const handleMakeDefault = async (setting) => {
    try {
      await makeDefault(setting.person_setting_id);
      notify(`"${setting.setting_name || setting.name}" is now your default display.`, 'success');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || String(err);
      notify(`Failed to set default: ${msg}`, 'danger');
    }
  };

  const handleDelete = async (id) => {
    try {
      await remove(id);
      notify('Display profile deleted.', 'success');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || String(err);
      notify(`Failed to delete profile: ${msg}`, 'danger');
    }
  };

  return (
    <>
      <Button
        variant="outline-primary"
        size="sm"
        title="Customize how search-result cards display"
        onClick={() => setShowModal(true)}
      >
        <FaGear size={14} style={{ marginRight: '4px' }} />
        Display settings
      </Button>

      <Modal show={showModal} onHide={() => { setShowModal(false); setMessage(null); }} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Search Card Display Settings</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {message && (
            <Alert variant={message.variant} className="py-2" dismissible onClose={() => setMessage(null)}>
              {message.text}
            </Alert>
          )}
          <p className="text-muted">
            Choose which parts of each search-result card are shown and in what
            order. Changes apply immediately; save them as a named profile to
            reuse later. Display profiles are separate from saved searches.
          </p>

          {/* Section order + visibility */}
          <Form.Group className="mb-4">
            <Form.Label>Card sections</Form.Label>
            <div className="list-group">
              {prefs.sectionOrder.map((id, idx) => (
                <div key={id} className="list-group-item d-flex align-items-center py-1">
                  <Form.Check
                    type="checkbox"
                    id={`search-display-section-${id}`}
                    label={sectionLabel(id)}
                    checked={!prefs.hiddenSections.includes(id)}
                    onChange={() => toggleSection(id)}
                    className="flex-grow-1"
                  />
                  <Button
                    variant="outline-secondary" size="sm" className="me-1"
                    aria-label={`Move ${sectionLabel(id)} up`}
                    disabled={idx === 0}
                    onClick={() => moveSection(id, -1)}
                  >
                    <FontAwesomeIcon icon={faArrowUp} />
                  </Button>
                  <Button
                    variant="outline-secondary" size="sm"
                    aria-label={`Move ${sectionLabel(id)} down`}
                    disabled={idx === prefs.sectionOrder.length - 1}
                    onClick={() => moveSection(id, 1)}
                  >
                    <FontAwesomeIcon icon={faArrowDown} />
                  </Button>
                </div>
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
                id="search-display-author-links"
                label="Link authors to the person screen"
                checked={prefs.linkAuthorsToPerson}
                onChange={(e) => applyPrefs({ ...prefs, linkAuthorsToPerson: e.target.checked })}
              />
            </div>
          </Form.Group>

          {/* Named profiles (hidden for observers: the saves would 403) */}
          {!cognitoObserver && (
            <>
              <Form.Group className="mb-4">
                <Form.Label>Save current display as a new profile</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="text"
                    placeholder="Enter profile name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreate();
                      }
                    }}
                    disabled={busy}
                  />
                  <Button variant="primary" disabled={busy || !(newName || '').trim()} onClick={handleCreate}>
                    {busy ? <Spinner animation="border" size="sm" /> : 'Save As New'}
                  </Button>
                </div>
              </Form.Group>

              <div>
                <h6>Saved Display Profiles</h6>
                {(settings || []).length === 0 ? (
                  <p className="text-muted mb-0">No profiles saved yet. Create one above.</p>
                ) : (
                  <div className="list-group">
                    {settings.map((setting) => {
                      const id = setting.person_setting_id;
                      const isDefault = !!setting.default_setting;
                      return (
                        <div key={id} className="list-group-item d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center flex-grow-1 me-3">
                            <span className="me-2" title={isDefault ? 'Default profile' : ''}>
                              {isDefault ? '★' : ''}
                            </span>
                            <span className="flex-grow-1">{setting.setting_name || setting.name}</span>
                          </div>
                          <div className="d-flex flex-wrap gap-2">
                            <Button variant="outline-secondary" size="sm" disabled={busy} onClick={() => handleLoad(setting)}>
                              Load
                            </Button>
                            <Button variant="outline-success" size="sm" disabled={busy} onClick={() => handleSaveHere(setting)}>
                              Save Here
                            </Button>
                            {!isDefault && (
                              <Button variant="outline-primary" size="sm" disabled={busy} onClick={() => handleMakeDefault(setting)}>
                                Set Default
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
              notify('Display reset to the default card layout.', 'info');
            }}
          >
            Reset Display
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
