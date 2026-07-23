import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { useSelector } from 'react-redux';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Container from 'react-bootstrap/Container';

import { api } from '../../api';
import PersonCuriePicker from './PersonCuriePicker';
import LabCuriePicker from './LabCuriePicker';
import PersonEditorLayoutModal from '../settings/PersonEditorLayoutModal';
import { SECTION_DEFS, layoutToCssGrid, defaultHiddenSections } from './personEditorSections';
import './personEditorSections.css';

const STATUS_OPTIONS = ['active', 'retired', 'deceased'];
const PRIVACY_OPTIONS = ['show_all', 'logged_in_only', 'fully_hidden', 'hide_email'];
const XREF_PREFIXES = ['ORCID', 'WB', 'ZFIN', 'XenBase'];
// PersonPersonRole controlled vocabulary (person_lineage.relationship).
const PERSON_PERSON_ROLES = [
  'phd_supervisor_of',
  'postdoc_supervisor_of',
  'masters_supervisor_of',
  'undergrad_supervisor_of',
  'highschool_supervisor_of',
  'sabbatical_supervisor_of',
  'lab_visitor_supervisor_of',
  'research_staff_supervisor_of',
  'assistant_professor_supervisor_of',
  'unknown_supervisor_of',
  'collaborator_of',
];

const formatTimestamp = (s) => {
  if (!s) return '';
  try {
    const str = String(s);
    const d = new Date(str);
    if (Number.isNaN(d.getTime())) return str;
    const hasTime = /T?\d{2}:\d{2}/.test(str);
    if (hasTime) {
      return d.toISOString().slice(0, 19).replace('T', ' ');
    }
    return d.toISOString().slice(0, 10);
  } catch {
    return String(s);
  }
};

// Pull a human-readable message out of an Axios error.
const errDetail = (err) => {
  const d = err?.response?.data?.detail;
  return typeof d === 'string' ? d : err?.message || 'Request failed';
};

// Each child collection has a `*Fields` extractor (the editable field values, used
// for the per-field `_saved` baseline) and a `*Snap` string (row-level dirty, for
// the meta pencil). Snap = JSON of the fields.
const nameFields = (r) => ({ first_name: r.first_name || '', middle_name: r.middle_name || '', last_name: r.last_name || '', is_primary: !!r.is_primary });
const emailFields = (r) => ({ email_address: r.email_address || '', invalidated: !!r.invalidated });
const noteFields = (r) => ({ note: r.note || '' });
const xrefFields = (r) => ({ curie_prefix: r.curie_prefix || '', curie: r.curie || '', is_obsolete: !!r.is_obsolete });
const labFields = (r) => ({ labCurie: r.labCurie || '', alum: !!r.alum, is_pi: !!r.is_pi, former_pi: !!r.former_pi });
const nameSnap = (r) => JSON.stringify(nameFields(r));
const emailSnap = (r) => JSON.stringify(emailFields(r));
const noteSnap = (r) => JSON.stringify(noteFields(r));
const xrefSnap = (r) => JSON.stringify(xrefFields(r));
const labSnap = (r) => JSON.stringify(labFields(r));
const EMAIL_RE = /^[^@\s]+@[^@\s]+$/;
// The API stores a single curie "PREFIX:ID"; the editor edits prefix + id separately.
const xrefIdPart = (fullCurie, prefix) => {
  const s = fullCurie || '';
  if (prefix && s.startsWith(prefix + ':')) return s.slice(prefix.length + 1);
  const idx = s.indexOf(':');
  return idx >= 0 ? s.slice(idx + 1) : s;
};

const useAutoGrowList = (initial, makeEmpty, isEmpty) => {
  const [items, setItems] = useState(() => [...initial, makeEmpty()]);
  const update = (idx, patch) => {
    setItems((prev) => {
      const next = prev.map((it, i) => (i === idx ? { ...it, ...patch } : it));
      if (!isEmpty(next[next.length - 1])) {
        next.push(makeEmpty());
      }
      return next;
    });
  };
  const remove = (idx) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0 || !isEmpty(next[next.length - 1])) {
        next.push(makeEmpty());
      }
      return next;
    });
  };
  return [items, update, remove, setItems];
};

const labelColStyle = {
  width: 200,
  fontWeight: 600,
  paddingTop: 6,
  textAlign: 'left',
  flexShrink: 0,
};
const tsStyle = { color: '#888', fontSize: '0.8em' };

const META_COL_WIDTH = 320;
const TRASH_SLOT_WIDTH = 36;

// `status` (optional): 'dirty' | 'saving' | 'error' | 'saved' drives the per-row
// save indicator shown in the meta column (icon-by-row). When status is undefined
// the meta column just shows `ts` (legacy read-only metadata). `error` renders a
// red, dismissable row beneath the input.
// A FieldLine publishes its row "unsaved/error" highlight here; HlControl applies it
// to each individual input (only non-empty ones) so composite rows box each field
// rather than the whole row. (Destructured so a global HlControl->HlControl
// rename can't recurse into this base.)
const { Control: BaseControl, Check: BaseCheck } = Form;
// Per-field "unsaved" highlight: a control compares its own value to `savedValue`
// (its last-saved value) and outlines itself only if THAT field changed — so
// changing one field in a composite row doesn't light up the others. The row's
// focus/error state comes from context (suppress while typing; red on save error).
const FieldHlContext = React.createContext({ focused: false, error: false });
const fieldChanged = (cur, saved) =>
  typeof cur === 'boolean' || typeof saved === 'boolean'
    ? !!cur !== !!saved
    : String(cur ?? '') !== String(saved ?? '');
// Unsaved/edited field → the Biblio editor's purple background (consistency);
// a failed save → a red outline so it's distinct from a normal pending edit.
const hlStyle = (error) =>
  error
    ? { outline: '2px solid #cc6666', outlineOffset: 1, borderRadius: 4 }
    : { backgroundColor: 'var(--updated-purple, #e6deff)' };
const HlControl = ({ savedValue, ...props }) => {
  const { focused, error } = React.useContext(FieldHlContext);
  const dirty = savedValue !== undefined && fieldChanged(props.value, savedValue);
  const show = dirty && (error || !focused);
  const style = show ? { ...(props.style || {}), ...hlStyle(error) } : props.style;
  return <BaseControl {...props} style={style} />;
};
const HlCheck = ({ savedValue, ...props }) => {
  const { focused, error } = React.useContext(FieldHlContext);
  const dirty = savedValue !== undefined && fieldChanged(props.checked, savedValue);
  const show = dirty && (error || !focused);
  // Only add the outline — don't change display/padding, which would break
  // Bootstrap's .form-check layout (input sits in its left padding).
  const style = show ? { ...(props.style || {}), ...hlStyle(error) } : props.style;
  return <BaseCheck {...props} style={style} />;
};

const FieldLine = ({ label, children, ts, trail, status, error, onDismissError }) => {
  // Track focus within this row so the "unsaved" highlight only shows once the
  // curator clicks away (not while they're still typing). Intra-row moves (e.g.
  // first -> middle name, or xref prefix -> id) don't count as leaving.
  const [focused, setFocused] = useState(false);
  const hlCtx = { focused, error: status === 'error' };
  let metaContent;
  if (status === 'saving') {
    metaContent = <FontAwesomeIcon icon={faSpinner} spin title="Saving…" style={{ color: '#888' }} />;
  } else if (status === 'dirty') {
    metaContent = <FontAwesomeIcon icon={faPencilAlt} title="Unsaved — saves when complete" style={{ color: '#b58900' }} />;
  } else if (status === 'error') {
    metaContent = <FontAwesomeIcon icon={faPencilAlt} title="Save failed" style={{ color: '#cc0000' }} />;
  } else {
    metaContent = ts ?? '';
  }
  const showMeta = !!(metaContent || trail);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={labelColStyle}>{label}</div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{ flex: 1, minWidth: 240 }}
            onFocus={() => setFocused(true)}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}
          >
            <FieldHlContext.Provider value={hlCtx}>{children}</FieldHlContext.Provider>
          </div>
          {showMeta && (
            <div
              style={{
                width: META_COL_WIDTH,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div
                style={{
                  ...tsStyle,
                  whiteSpace: 'nowrap',
                  paddingTop: 8,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {metaContent}
              </div>
              <div
                style={{
                  width: TRASH_SLOT_WIDTH,
                  paddingTop: 4,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  flexShrink: 0,
                }}
              >
                {trail}
              </div>
            </div>
          )}
        </div>
      </div>
      {error && (
        <div
          style={{
            marginLeft: labelColStyle.width + 12,
            marginTop: 4,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            background: '#fdecea',
            border: '1px solid #f5c6cb',
            borderRadius: 4,
            padding: '4px 8px',
            color: '#a00',
            fontSize: '0.8em',
          }}
        >
          <span style={{ flex: 1 }}>{error}</span>
          {onDismissError && (
            <button
              type="button"
              onClick={onDismissError}
              style={{ border: 'none', background: 'none', color: '#a00', cursor: 'pointer', lineHeight: 1, padding: 0 }}
              title="Dismiss"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const RemoveBtn = ({ onClick }) => (
  <Button variant="outline-danger" size="sm" onClick={onClick} title="Remove">
    🗑
  </Button>
);

const inlineRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};

// Start/end dates as two independent native date inputs. `start`/`end` are
// 'YYYY-MM-DD' strings (or ''); onChange(start, end) reports the same. Each input
// is editable on its own (so an end-only edit doesn't disturb the start), keyboard
// entry works (full year, month/day), and either can be cleared since lineage
// dates are optional. End-only / open-ended ("still at that position") is fine —
// just leave the end blank.
const DATES_COL_WIDTH = 330;
const LineageDateRange = ({ start, end, onChange, disabled }) => (
  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', width: DATES_COL_WIDTH, flexShrink: 0 }}>
    <HlControl
      type="date"
      value={start || ''}
      onChange={(ev) => onChange(ev.target.value, end || '')}
      disabled={disabled}
      style={{ flex: 1, minWidth: 0 }}
      title="start date"
    />
    <span style={{ color: '#888' }}>–</span>
    <HlControl
      type="date"
      value={end || ''}
      onChange={(ev) => onChange(start || '', ev.target.value)}
      disabled={disabled}
      style={{ flex: 1, minWidth: 0 }}
      title="end date"
    />
  </span>
);

// Read-only claim cell, sized to sit directly above/under the matching editable
// input so claim rows line up with the editable rows.
const claimCellBase = {
  fontSize: '0.85em',
  color: '#555',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  boxSizing: 'border-box',
  alignSelf: 'center',
};
const dateRange = (a, b) =>
  [a, b].some(Boolean)
    ? `${a ? String(a).slice(0, 10) : '?'}${b ? `–${String(b).slice(0, 10)}` : ''}`
    : '';

// A submitted person_lineage_submission rendered as column-aligned, read-only
// cells (subject · relationship · object · dates · who). Used for the claim above
// an unvalidated submission and for the submissions linked beneath a canonical.
// `lead` is an optional marker on the first cell (e.g. '↳ '); `showStatus` appends
// the status badge to the trailing cell.
const LineageClaimRow = ({ submission, lead = '', showStatus = false, style, trailing }) => (
  <div style={{ ...inlineRow, ...style }}>
    <span style={{ ...claimCellBase, width: 240 }} title={submission.person_subject_name}>
      {lead}{submission.person_subject_name}
    </span>
    <span style={{ ...claimCellBase, width: 260 }} title={submission.relationship}>{submission.relationship}</span>
    <span style={{ ...claimCellBase, width: 240 }} title={submission.person_object_name}>{submission.person_object_name}</span>
    <span style={{ ...claimCellBase, width: DATES_COL_WIDTH }}>{dateRange(submission.start_date, submission.end_date)}</span>
    <span style={{ ...claimCellBase, width: 'auto' }}>
      by {submission.who_sent_this}
      {showStatus && <>{' '}<Badge variant="secondary">{submission.status}</Badge></>}
    </span>
    {trailing}
  </div>
);

const PersonEditor = ({ person }) => {
  const p = person ?? {};

  // Effective MOD (testerMod overrides cognitoMod) drives per-section default
  // visibility — see SECTION_DEFS `mods` gating in personEditorSections.js.
  const cognitoMod = useSelector((s) => s.isLogged.cognitoMod);
  const testerMod = useSelector((s) => s.isLogged.testerMod);
  const effectiveMod = testerMod !== 'No' ? testerMod : cognitoMod;
  const isWB = effectiveMod === 'WB';

  // ---- layout / visibility / metadata-toggle state (restored from saved prefs) ----
  const [activeLayout, setActiveLayout] = useState(null);
  const [hiddenSections, setHiddenSections] = useState(() =>
    defaultHiddenSections(effectiveMod),
  );
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showCurator, setShowCurator] = useState(true);

  // Once the user (or a loaded setting) explicitly decides section visibility, stop
  // letting the MOD default override it.
  const visibilityDecidedRef = useRef(false);

  // Keep MOD-gated sections in sync with the effective MOD until an explicit choice
  // is made. The useState initializer above only runs on first mount, and the
  // editor is keyed by curie, so without this a mid-session role change (or Redux
  // populating the MOD after mount) would not re-evaluate the defaults.
  useEffect(() => {
    if (visibilityDecidedRef.current) return;
    setHiddenSections(defaultHiddenSections(effectiveMod));
  }, [effectiveMod]);

  const applyPrefs = (prefs) => {
    if (!prefs) return;
    if (Array.isArray(prefs.layout)) setActiveLayout(prefs.layout);
    if (Array.isArray(prefs.hidden)) {
      setHiddenSections(new Set(prefs.hidden));
      // A loaded setting is an explicit visibility decision.
      visibilityDecidedRef.current = true;
    }
    if (typeof prefs.showTimestamps === 'boolean') setShowTimestamps(prefs.showTimestamps);
    if (typeof prefs.showCurator === 'boolean') setShowCurator(prefs.showCurator);
  };

  const toggleSection = (id) => {
    // Any manual toggle is an explicit decision; freeze the MOD default.
    visibilityDecidedRef.current = true;
    setHiddenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Compose the per-field metadata string honoring the two toggles independently.
  const metaLabel = (by, date) => {
    const parts = [];
    if (showCurator && by) parts.push(by);
    if (showTimestamps && date) parts.push(formatTimestamp(date));
    return parts.length ? parts.join(' · ') : null;
  };

  // ---- person scalar/toggle save-on-blur ----
  // Editable person scalars are controlled here; each saves on blur (text) or change
  // (select/checkbox) via PATCH /person, only when changed. `savedScalars` is the
  // last-persisted baseline (dirty = live !== saved); `recordMeta` holds the
  // record-level who/when, refreshed from each PATCH response (no full reload).
  const makeScalars = () => ({
    display_name: p.display_name ?? '',
    active_status: p.active_status || 'active',
    privacy: p.privacy || 'hide_email',
    unsubscribe: !!p.unsubscribe,
    street_address: p.street_address ?? '',
    city: p.city ?? '',
    state: p.state ?? '',
    postal_code: p.postal_code ?? '',
    country: p.country ?? '',
    biography_research_interest: p.biography_research_interest ?? '',
  });
  const [live, setLive] = useState(makeScalars);
  const [savedScalars, setSavedScalars] = useState(makeScalars);
  const [fieldStatus, setFieldStatus] = useState({}); // field -> 'saving'
  const [fieldError, setFieldError] = useState({}); // field -> message
  const [recordMeta, setRecordMeta] = useState({
    updated_by: p.updated_by,
    date_updated: p.date_updated,
    address_last_updated: p.address_last_updated,
  });

  const setLiveField = (field, value) => setLive((prev) => ({ ...prev, [field]: value }));
  const dropKey = (obj, key) => { const n = { ...obj }; delete n[key]; return n; };
  const dismissFieldError = (field) => setFieldError((e) => dropKey(e, field));

  const fieldStatusOf = (field) => {
    if (fieldStatus[field] === 'saving') return 'saving';
    if (fieldError[field]) return 'error';
    return live[field] !== savedScalars[field] ? 'dirty' : 'saved';
  };

  const saveScalar = (field, valueArg) => {
    const value = valueArg !== undefined ? valueArg : live[field];
    if (value === savedScalars[field]) return; // unchanged — nothing to do
    if (field === 'display_name' && !String(value).trim()) {
      setFieldError((e) => ({ ...e, display_name: 'Display name is required.' }));
      return;
    }
    setFieldStatus((s) => ({ ...s, [field]: 'saving' }));
    setFieldError((e) => dropKey(e, field));
    api.patch('/person/' + p.curie, { [field]: value })
      .then((res) => {
        setSavedScalars((sv) => ({ ...sv, [field]: value }));
        const d = res?.data || {};
        setRecordMeta({
          updated_by: d.updated_by,
          date_updated: d.date_updated,
          address_last_updated: d.address_last_updated,
        });
        setFieldStatus((s) => dropKey(s, field));
      })
      .catch((err) => {
        setFieldStatus((s) => dropKey(s, field));
        setFieldError((e) => ({ ...e, [field]: errDetail(err) }));
      });
  };

  // ---- person string-array save (institution / webpage) ----
  // Saved as one array via PATCH /person, but each ROW tracks its own last-saved
  // value (_savedValue) so only the row you changed shows "unsaved", not the whole
  // section.
  const [savedArrays, setSavedArrays] = useState({
    institution: (p.institution ?? []).filter(Boolean),
    webpage: (p.webpage ?? []).filter(Boolean),
  });
  const arraysEqual = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const stringRowStatus = (row, valueKey) =>
    row._status === 'saving' ? 'saving'
      : row._error ? 'error'
      : ((row[valueKey] || '').trim() !== (row._savedValue || '') ? 'dirty' : 'saved');
  const cleanStrings = (list, valueKey) => list.map((x) => (x[valueKey] || '').trim()).filter(Boolean);
  const reconcileSaved = (setList, valueKey) =>
    setList((prev) => prev.map((r) => ({ ...r, _savedValue: (r[valueKey] || '').trim(), _status: null, _error: null })));
  const patchStringArray = ({ setList, field, valueKey, cleaned, i }) => {
    setList((prev) => prev.map((r, j) => (j === i ? { ...r, _status: 'saving', _error: null } : r)));
    api.patch('/person/' + p.curie, { [field]: cleaned })
      .then((res) => {
        setSavedArrays((sv) => ({ ...sv, [field]: cleaned }));
        const d = res?.data || {};
        setRecordMeta({
          updated_by: d.updated_by,
          date_updated: d.date_updated,
          address_last_updated: d.address_last_updated,
        });
        reconcileSaved(setList, valueKey);
      })
      .catch((err) => setList((prev) => prev.map((r, j) => (j === i ? { ...r, _status: null, _error: errDetail(err) } : r))));
  };
  const saveStringArray = ({ list, setList, field, valueKey, i }) => {
    const cleaned = cleanStrings(list, valueKey);
    if (arraysEqual(cleaned, savedArrays[field])) { reconcileSaved(setList, valueKey); return; }
    patchStringArray({ setList, field, valueKey, cleaned, i });
  };
  const removeStringArrayRow = ({ list, setList, remove, field, valueKey, i }) => {
    const cleaned = cleanStrings(list.filter((_, j) => j !== i), valueKey);
    remove(i);
    if (!arraysEqual(cleaned, savedArrays[field])) {
      patchStringArray({ setList, field, valueKey, cleaned, i: -1 });
    }
  };

  const currentStatus = live.active_status;
  const statusOptions = STATUS_OPTIONS.includes(currentStatus)
    ? STATUS_OPTIONS
    : [...STATUS_OPTIONS, currentStatus];

  const currentPrivacy = live.privacy;
  const privacyOptions = PRIVACY_OPTIONS.includes(currentPrivacy)
    ? PRIVACY_OPTIONS
    : [...PRIVACY_OPTIONS, currentPrivacy];

  // Names
  const emptyName = () => {
    const r = {
      first_name: '', middle_name: '', last_name: '', is_primary: false,
      _ts: null, _by: null, _id: null, _status: null, _error: null,
    };
    return { ...r, _saved: nameFields(r), _savedKey: nameSnap(r) };
  };
  const nameIsEmpty = (n) => !n.first_name && !n.middle_name && !n.last_name;
  const initialNames = (p.names ?? []).map((n) => {
    const r = {
      first_name: n.first_name ?? '',
      middle_name: n.middle_name ?? '',
      last_name: n.last_name ?? '',
      is_primary: !!n.is_primary,
      _ts: n.date_updated ?? null,
      _by: n.updated_by ?? null,
      _id: n.person_name_id ?? null,
      _status: null,
      _error: null,
    };
    return { ...r, _saved: nameFields(r), _savedKey: nameSnap(r) };
  });
  const [names, updateName, removeName, setNames] = useAutoGrowList(
    initialNames,
    emptyName,
    nameIsEmpty,
  );

  // Emails
  const emptyEmail = () => {
    const r = {
      email_address: '', invalidated: false, _origOldDate: null,
      _ts: null, _by: null, _created: null, _id: null, _status: null, _error: null,
    };
    return { ...r, _saved: emailFields(r), _savedKey: emailSnap(r) };
  };
  const emailIsEmpty = (e) => !e.email_address;
  const initialEmails = (p.emails ?? []).map((e) => {
    const r = {
      email_address: e.email_address ?? '',
      invalidated: !!e.date_made_old_email,
      _origOldDate: e.date_made_old_email ?? null,
      _ts: e.date_updated ?? null,
      _by: e.updated_by ?? null,
      _created: e.date_created ?? null,
      _id: e.person_email_id ?? null,
      _status: null,
      _error: null,
    };
    return { ...r, _saved: emailFields(r), _savedKey: emailSnap(r) };
  });
  const [emails, updateEmail, removeEmail] = useAutoGrowList(
    initialEmails,
    emptyEmail,
    emailIsEmpty,
  );

  // Webpages — saved as the person.webpage array; per-row _savedValue tracks dirty.
  const emptyUrl = () => ({ url: '', _savedValue: '', _status: null, _error: null });
  const urlIsEmpty = (u) => !u.url;
  const initialUrls = (p.webpage ?? []).map((u) => ({ url: u ?? '', _savedValue: u ?? '', _status: null, _error: null }));
  const [urls, updateUrl, removeUrl, setUrls] = useAutoGrowList(initialUrls, emptyUrl, urlIsEmpty);

  // Institutions — saved as the person.institution array; per-row _savedValue tracks dirty.
  const emptyInst = () => ({ value: '', _savedValue: '', _status: null, _error: null });
  const instIsEmpty = (it) => !it.value;
  const initialInsts = (p.institution ?? []).map((it) => ({ value: it ?? '', _savedValue: it ?? '', _status: null, _error: null }));
  const [insts, updateInst, removeInst, setInsts] = useAutoGrowList(initialInsts, emptyInst, instIsEmpty);

  // Cross references — page url is API-only, not editable, not shown
  const emptyXref = () => {
    const r = {
      curie_prefix: '', curie: '', is_obsolete: false,
      _ts: null, _by: null, _id: null, _status: null, _error: null,
    };
    return { ...r, _saved: xrefFields(r), _savedKey: xrefSnap(r) };
  };
  const xrefIsEmpty = (x) => !x.curie_prefix && !x.curie;
  const initialXrefs = (p.cross_references ?? []).map((x) => {
    const r = {
      curie_prefix: x.curie_prefix ?? '',
      // store just the id part for editing; recombined to PREFIX:ID on save
      curie: xrefIdPart(x.curie, x.curie_prefix),
      is_obsolete: !!x.is_obsolete,
      _ts: x.date_updated ?? null,
      _by: x.updated_by ?? null,
      _id: x.person_cross_reference_id ?? null,
      _status: null,
      _error: null,
    };
    return { ...r, _saved: xrefFields(r), _savedKey: xrefSnap(r) };
  });
  const [xrefs, updateXref, removeXref] = useAutoGrowList(initialXrefs, emptyXref, xrefIsEmpty);

  // Notes / comments
  const emptyNote = () => {
    const r = { note: '', _ts: null, _by: null, _id: null, _status: null, _error: null };
    return { ...r, _saved: noteFields(r), _savedKey: noteSnap(r) };
  };
  const noteIsEmpty = (n) => !n.note;
  const initialNotes = (p.notes ?? []).map((n) => {
    const r = {
      note: n.note ?? '',
      _ts: n.date_updated ?? null,
      _by: n.updated_by ?? null,
      _id: n.person_note_id ?? null,
      _status: null,
      _error: null,
    };
    return { ...r, _saved: noteFields(r), _savedKey: noteSnap(r) };
  });
  const [notes, updateNote, removeNote] = useAutoGrowList(initialNotes, emptyNote, noteIsEmpty);

  // Laboratory connections — editable, auto-growing like the other lists. The
  // alum / is_pi / former_pi DateTime fields are shown as checkboxes; the stored
  // timestamp (when set in the database) is displayed beside the box. Mockup-only.
  const emptyLab = () => {
    const r = {
      labCurie: '', labName: '', labStrain: '',
      alum: false, is_pi: false, former_pi: false,
      _alum_ts: null, _is_pi_ts: null, _former_pi_ts: null,
      _ts: null, _by: null, _id: null, _status: null, _error: null,
    };
    return { ...r, _saved: labFields(r), _savedKey: labSnap(r) };
  };
  const labIsEmpty = (l) => !l.labCurie;
  const initialLabs = (p.lab_persons ?? []).map((lp) => {
    const r = {
      labCurie: lp.laboratory_curie || '',
      labName: lp.laboratory_name || '',
      labStrain: lp.laboratory_strain_designation || '',
      alum: !!lp.alum,
      is_pi: !!lp.is_pi,
      former_pi: !!lp.former_pi,
      _alum_ts: lp.alum ?? null,
      _is_pi_ts: lp.is_pi ?? null,
      _former_pi_ts: lp.former_pi ?? null,
      _ts: lp.date_updated ?? null,
      _by: lp.updated_by ?? null,
      _id: lp.laboratory_person_id ?? null,
      _status: null,
      _error: null,
    };
    return { ...r, _saved: labFields(r), _savedKey: labSnap(r) };
  });
  const [labs, updateLab, removeLab] = useAutoGrowList(initialLabs, emptyLab, labIsEmpty);

  // ---- Lineage (person_lineage + person_lineage_submission) — WIRED ----
  // Neither is nested in the person record; both are fetched from their by-person
  // endpoints when the section is visible. The loaded person (p.curie) is always
  // one resolved side of every submission shown, so that side is locked and the
  // curator only resolves the other side. Validated submissions are grouped under
  // their canonical via person_lineage_id.
  const lineageVisible = !hiddenSections.has('lineage');
  const [submissions, setSubmissions] = useState([]);
  const [canonicals, setCanonicals] = useState([]);
  const [subEdits, setSubEdits] = useState({}); // submissionId -> {otherCurie, otherName, relationship, start, end}
  const [canonEdits, setCanonEdits] = useState({}); // person_lineage_id -> {relationship, start, end}
  // anchor = which side the curator picked first (the "other" person, editable);
  // the opposite side auto-fills the loaded person and locks until anchor is cleared.
  const [newCanon, setNewCanon] = useState({
    anchor: null, subjectCurie: '', subjectName: '', objectCurie: '', objectName: '',
    relationship: '', start: '', end: '',
  });
  const [lineageBusy, setLineageBusy] = useState(false);
  const [lineageError, setLineageError] = useState('');
  const [showRejected, setShowRejected] = useState(false);

  const loadLineage = () => {
    if (!p.curie) return Promise.resolve();
    return Promise.all([
      api.get('/person_lineage_submission/person/' + p.curie)
        .then((r) => (Array.isArray(r.data) ? r.data : [])).catch(() => []),
      api.get('/person_lineage/person/' + p.curie)
        .then((r) => (Array.isArray(r.data) ? r.data : [])).catch(() => []),
    ]).then(([subs, canons]) => {
      setSubmissions(subs);
      setCanonicals(canons);
    });
  };

  // Drop a single row's edit draft so it re-derives from fresh server data on the
  // next render (e.g. a validated submission that later returns to the unvalidated
  // pool must show its original claim again, not the curator's pre-validation edit).
  const clearSubEdit = (id) =>
    setSubEdits((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  const clearCanonEdit = (id) =>
    setCanonEdits((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });

  useEffect(() => {
    if (!lineageVisible || !p.curie) return;
    loadLineage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.curie, lineageVisible]);

  // Which side of a submission is the loaded person (locked); the other is editable.
  const lockedSide = (s) =>
    s.person_subject_curie === p.curie ? 'subject'
      : s.person_object_curie === p.curie ? 'object'
      : 'subject';

  const subEdit = (s) => {
    const existing = subEdits[s.person_lineage_submission_id];
    if (existing) return existing;
    const side = lockedSide(s);
    return {
      otherCurie: (side === 'subject' ? s.person_object_curie : s.person_subject_curie) || '',
      otherName: (side === 'subject' ? s.person_object_name : s.person_subject_name) || '',
      relationship: s.relationship || '',
      start: s.start_date ? String(s.start_date).slice(0, 10) : '',
      end: s.end_date ? String(s.end_date).slice(0, 10) : '',
    };
  };
  const patchSubEdit = (s, patch) =>
    setSubEdits((prev) => ({
      ...prev,
      [s.person_lineage_submission_id]: { ...subEdit(s), ...patch },
    }));

  const handleValidate = (s) => {
    const e = subEdit(s);
    const side = lockedSide(s);
    const body = { relationship: e.relationship || undefined };
    if (e.start) body.start_date = e.start;
    if (e.end) body.end_date = e.end;
    // The locked (loaded-person) side is omitted, so validate falls back to the
    // submission's stored id; we only send the curator-resolved other side.
    if (side === 'subject') body.person_object_curie_or_id = e.otherCurie || undefined;
    else body.person_subject_curie_or_id = e.otherCurie || undefined;
    setLineageBusy(true); setLineageError('');
    api.post('/person_lineage_submission/' + s.person_lineage_submission_id + '/validate', body)
      .then(() => { clearSubEdit(s.person_lineage_submission_id); return loadLineage(); })
      .catch((err) => setLineageError(errDetail(err)))
      .finally(() => setLineageBusy(false));
  };

  // Reject an unvalidated submission / send a rejected one back to the pool.
  const setSubmissionStatus = (s, status) => {
    setLineageBusy(true); setLineageError('');
    api.patch('/person_lineage_submission/' + s.person_lineage_submission_id, { status })
      .then(() => { clearSubEdit(s.person_lineage_submission_id); return loadLineage(); })
      .catch((err) => setLineageError(errDetail(err)))
      .finally(() => setLineageBusy(false));
  };

  // For a canonical on this person's page, which side is the loaded person (locked);
  // the other side's person is editable (corrects a mis-resolution).
  const canonLockedSide = (c) => (c.person_subject_curie === p.curie ? 'subject' : 'object');
  const canonEdit = (c) => {
    const existing = canonEdits[c.person_lineage_id];
    if (existing) return existing;
    const side = canonLockedSide(c);
    return {
      relationship: c.relationship || '',
      start: c.start_date ? String(c.start_date).slice(0, 10) : '',
      end: c.end_date ? String(c.end_date).slice(0, 10) : '',
      otherCurie: (side === 'subject' ? c.person_object_curie : c.person_subject_curie) || '',
      otherName: (side === 'subject' ? c.person_object_name : c.person_subject_name) || '',
    };
  };
  const patchCanonEdit = (c, patch) =>
    setCanonEdits((prev) => ({ ...prev, [c.person_lineage_id]: { ...canonEdit(c), ...patch } }));

  const handleSaveCanonical = (c) => {
    const e = canonEdit(c);
    const side = canonLockedSide(c);
    const body = {
      relationship: e.relationship || undefined,
      start_date: e.start || null,
      end_date: e.end || null,
    };
    // Only the non-loaded side's person can change; the loaded side stays put.
    if (side === 'subject') body.person_object_curie_or_id = e.otherCurie || undefined;
    else body.person_subject_curie_or_id = e.otherCurie || undefined;
    setLineageBusy(true); setLineageError('');
    api.patch('/person_lineage/' + c.person_lineage_id, body)
      .then(() => { clearCanonEdit(c.person_lineage_id); return loadLineage(); })
      .catch((err) => setLineageError(errDetail(err)))
      .finally(() => setLineageBusy(false));
  };

  const handleDeleteCanonical = (c) => {
    setLineageBusy(true); setLineageError('');
    api.delete('/person_lineage/' + c.person_lineage_id)
      .then(() => {
        clearCanonEdit(c.person_lineage_id);
        // Submissions linked to this canonical return to the unvalidated pool — drop
        // their stale drafts so they show their original claim, not the prior edit.
        submissions
          .filter((s) => s.person_lineage_id === c.person_lineage_id)
          .forEach((s) => clearSubEdit(s.person_lineage_submission_id));
        return loadLineage();
      })
      .catch((err) => setLineageError(errDetail(err)))
      .finally(() => setLineageBusy(false));
  };

  const handleAddCanonical = () => {
    if (!newCanon.subjectCurie || !newCanon.objectCurie || !newCanon.relationship) {
      setLineageError('Subject, object and relationship are required.');
      return;
    }
    if (newCanon.subjectCurie !== p.curie && newCanon.objectCurie !== p.curie) {
      setLineageError(`One side must be the loaded person (${p.curie}).`);
      return;
    }
    setLineageBusy(true); setLineageError('');
    api.post('/person_lineage/', {
      person_subject_curie_or_id: newCanon.subjectCurie,
      person_object_curie_or_id: newCanon.objectCurie,
      relationship: newCanon.relationship,
      start_date: newCanon.start || undefined,
      end_date: newCanon.end || undefined,
    })
      .then(() => {
        setNewCanon({
          anchor: null, subjectCurie: '', subjectName: '', objectCurie: '', objectName: '',
          relationship: '', start: '', end: '',
        });
        return loadLineage();
      })
      .catch((err) => setLineageError(errDetail(err)))
      .finally(() => setLineageBusy(false));
  };

  const relOptionsFor = (current) =>
    PERSON_PERSON_ROLES.includes(current) || !current
      ? PERSON_PERSON_ROLES
      : [...PERSON_PERSON_ROLES, current];

  const setNamePrimary = (idx) =>
    setNames((prev) => prev.map((row, i) => ({ ...row, is_primary: i === idx })));

  // ---- generic child-row save (per-row endpoints) ----
  const childStatus = (row, snap) =>
    row._status === 'saving' ? 'saving'
      : row._error ? 'error'
      : (snap(row) !== row._savedKey ? 'dirty' : 'saved');

  // Create (POST, when complete) or update (PATCH) one child row; tracks status on
  // the row itself. `after` runs on success (e.g. refetch a collection).
  const persistChild = ({ list, update, i, idKey, endpoint, createPath, completeFn, bodyFn, snap, savedOf, after, override, applyResp }) => {
    const row = { ...list[i], ...(override || {}) };
    // Guard against a second save firing while one is in flight — otherwise a
    // brand-new row (no _id yet) could POST twice in one interaction (e.g. input
    // blur + checkbox change) and create duplicate rows.
    if (row._status === 'saving') return;
    if (!completeFn(row)) return; // not enough to save yet
    const key = snap(row);
    if (row._id && key === row._savedKey) return; // saved & unchanged
    update(i, { _status: 'saving', _error: null });
    const isCreate = !row._id;
    // On PATCH, only send the fields that changed vs the last-saved baseline, so
    // unrelated (possibly stale/invalid) values aren't resent and a concurrent
    // edit to another field isn't clobbered. bodyFn maps these to API fields.
    let changedKeys = null;
    if (!isCreate && savedOf) {
      const cur = savedOf(row);
      const base = row._saved || {};
      changedKeys = Object.keys(cur).filter((k) => cur[k] !== base[k]);
    }
    const body = bodyFn(row, isCreate, changedKeys);
    const req = isCreate ? api.post(createPath, body) : api.patch(`${endpoint}/${row._id}`, body);
    req
      .then((res) => {
        const d = res?.data || {};
        update(i, {
          _status: null, _error: null,
          _id: row._id || d[idKey],
          _by: d.updated_by ?? row._by,
          _ts: d.date_updated ?? row._ts,
          _savedKey: key,
          ...(savedOf ? { _saved: savedOf(row) } : {}),
          ...(applyResp ? applyResp(d) : {}),
        });
        if (after) after();
      })
      .catch((err) => update(i, { _status: null, _error: errDetail(err) }));
  };

  const deleteChild = ({ list, update, remove, i, endpoint }) => {
    const row = list[i];
    if (!row._id) { remove(i); return; } // unsaved new row — just drop it
    update(i, { _status: 'saving', _error: null });
    api.delete(`${endpoint}/${row._id}`)
      .then(() => remove(i))
      .catch((err) => update(i, { _status: null, _error: errDetail(err) }));
  };

  // Names
  const refetchNames = () =>
    api.get('/person_name/person/' + p.curie)
      .then((res) => {
        const rows = (Array.isArray(res.data) ? res.data : []).map((n) => {
          const r = {
            first_name: n.first_name ?? '', middle_name: n.middle_name ?? '',
            last_name: n.last_name ?? '', is_primary: !!n.is_primary,
            _ts: n.date_updated ?? null, _by: n.updated_by ?? null,
            _id: n.person_name_id ?? null, _status: null, _error: null,
          };
          return { ...r, _saved: nameFields(r), _savedKey: nameSnap(r) };
        });
        setNames([...rows, emptyName()]);
      })
      .catch(() => {});

  const saveName = (i) => persistChild({
    list: names, update: updateName, i,
    idKey: 'person_name_id', endpoint: '/person_name', createPath: `/person_name/person/${p.curie}`,
    completeFn: (r) => !!(r.last_name && r.last_name.trim()),
    bodyFn: (r, isCreate, changed) => {
      const full = {
        first_name: r.first_name || null,
        middle_name: r.middle_name || null,
        last_name: r.last_name,
        is_primary: !!r.is_primary,
      };
      if (isCreate) return full;
      const body = {};
      ['first_name', 'middle_name', 'last_name', 'is_primary'].forEach((k) => { if (changed.includes(k)) body[k] = full[k]; });
      return body;
    },
    snap: nameSnap, savedOf: nameFields,
  });
  const deleteName = (i) => deleteChild({ list: names, update: updateName, remove: removeName, i, endpoint: '/person_name' });

  // Emails
  const saveEmail = (i, override) => persistChild({
    list: emails, update: updateEmail, i, override,
    idKey: 'person_email_id', endpoint: '/person_email', createPath: `/person_email/person/${p.curie}`,
    completeFn: (r) => EMAIL_RE.test((r.email_address || '').trim()),
    bodyFn: (r, isCreate, changed) => {
      const full = {
        email_address: (r.email_address || '').trim(),
        // checked => mark old (keep an existing old-date, else now); unchecked => clear.
        date_made_old_email: r.invalidated ? (r._origOldDate || new Date().toISOString()) : null,
      };
      if (isCreate) return full;
      const body = {};
      if (changed.includes('email_address')) body.email_address = full.email_address;
      if (changed.includes('invalidated')) body.date_made_old_email = full.date_made_old_email;
      return body;
    },
    snap: emailSnap, savedOf: emailFields,
  });
  const deleteEmail = (i) => deleteChild({ list: emails, update: updateEmail, remove: removeEmail, i, endpoint: '/person_email' });
  // Email is optional, but if one is entered it must be a valid address. An empty
  // field just doesn't save; a non-empty invalid one shows a validation error.
  const handleEmailBlur = (i) => {
    const v = (emails[i].email_address || '').trim();
    if (!v) { updateEmail(i, { _error: null }); return; }
    if (!EMAIL_RE.test(v)) { updateEmail(i, { _error: 'Enter a valid email address.' }); return; }
    saveEmail(i);
  };

  // Notes
  const saveNote = (i) => persistChild({
    list: notes, update: updateNote, i,
    idKey: 'person_note_id', endpoint: '/person_note', createPath: '/person_note/',
    completeFn: (r) => !!(r.note && r.note.trim()),
    bodyFn: (r, isCreate, changed) => {
      if (isCreate) return { note: r.note, person_curie: p.curie };
      const body = {};
      if (changed.includes('note')) body.note = r.note;
      return body;
    },
    snap: noteSnap, savedOf: noteFields,
  });
  const deleteNote = (i) => deleteChild({ list: notes, update: updateNote, remove: removeNote, i, endpoint: '/person_note' });

  // Cross references — recombine prefix + id into the API's single curie.
  const saveXref = (i, override) => persistChild({
    list: xrefs, update: updateXref, i, override,
    idKey: 'person_cross_reference_id', endpoint: '/person_cross_reference', createPath: '/person_cross_reference/',
    completeFn: (r) => !!((r.curie_prefix || '').trim() && (r.curie || '').trim()),
    bodyFn: (r, isCreate, changed) => {
      const full = { curie: `${r.curie_prefix}:${(r.curie || '').trim()}`, is_obsolete: !!r.is_obsolete };
      if (isCreate) return { ...full, person_curie: p.curie };
      const body = {};
      // prefix + id both feed the single API `curie` field.
      if (changed.includes('curie_prefix') || changed.includes('curie')) body.curie = full.curie;
      if (changed.includes('is_obsolete')) body.is_obsolete = full.is_obsolete;
      return body;
    },
    snap: xrefSnap, savedOf: xrefFields,
  });
  const deleteXref = (i) => deleteChild({ list: xrefs, update: updateXref, remove: removeXref, i, endpoint: '/person_cross_reference' });

  // Laboratories — laboratory_person link. Create needs the lab curie (person is the
  // loaded one); the alum/is_pi/former_pi checkboxes are DateTime fields: checked =>
  // set (keep an existing date, else now), unchecked => clear. The lab itself can't
  // change on PATCH, so it's locked once the link exists.
  const saveLab = (i, override) => persistChild({
    list: labs, update: updateLab, i, override,
    idKey: 'laboratory_person_id', endpoint: '/laboratory_person', createPath: '/laboratory_person/',
    completeFn: (r) => !!r.labCurie,
    bodyFn: (r, isCreate, changed) => {
      const now = new Date().toISOString();
      const val = (key) => {
        if (key === 'is_pi') return r.is_pi ? (r._is_pi_ts || now) : null;
        if (key === 'former_pi') return r.former_pi ? (r._former_pi_ts || now) : null;
        if (key === 'alum') return r.alum ? (r._alum_ts || now) : null;
        return undefined;
      };
      if (isCreate) {
        return { is_pi: val('is_pi'), former_pi: val('former_pi'), alum: val('alum'), laboratory_curie: r.labCurie, person_curie: p.curie };
      }
      // PATCH only the changed date-flag(s); the lab link itself is immutable here.
      const body = {};
      changed.forEach((k) => { const v = val(k); if (v !== undefined) body[k] = v; });
      return body;
    },
    snap: labSnap, savedOf: labFields,
    applyResp: (d) => ({
      alum: !!d.alum, is_pi: !!d.is_pi, former_pi: !!d.former_pi,
      _alum_ts: d.alum ?? null, _is_pi_ts: d.is_pi ?? null, _former_pi_ts: d.former_pi ?? null,
    }),
  });
  const deleteLab = (i) => deleteChild({ list: labs, update: updateLab, remove: removeLab, i, endpoint: '/laboratory_person' });
  // is_primary: persisted by PATCH, then refetch so the server-side demotion of the
  // previous primary is reflected. New (unsaved) rows just set it locally.
  const setPrimaryAndSave = (i) => {
    setNamePrimary(i);
    const row = names[i];
    if (!row || !row._id) return;
    updateName(i, { _status: 'saving', _error: null });
    api.patch('/person_name/' + row._id, { is_primary: true })
      .then(() => refetchNames())
      .catch((err) => updateName(i, { _status: null, _error: errDetail(err) }));
  };

  const labelForName = (n, i) => {
    if (i === names.length - 1 && nameIsEmpty(n)) return 'name (new)';
    return n.is_primary ? 'name (primary)' : 'name';
  };
  const labelForEmail = (e, i) => {
    if (i === emails.length - 1 && emailIsEmpty(e)) return 'email (new)';
    if (e.invalidated) return 'old_email';
    return 'email';
  };
  const labelForUrl = (u, i) =>
    i === urls.length - 1 && urlIsEmpty(u) ? 'webpage (new)' : 'webpage';
  const labelForInst = (it, i) =>
    i === insts.length - 1 && instIsEmpty(it) ? 'institution (new)' : 'institution';
  const labelForXref = (x, i) =>
    i === xrefs.length - 1 && xrefIsEmpty(x) ? 'xref (new)' : x.curie_prefix || 'xref';
  const labelForNote = (n, i) =>
    i === notes.length - 1 && noteIsEmpty(n) ? 'comment (new)' : 'comment';
  const labelForLab = (l, i) =>
    i === labs.length - 1 && labIsEmpty(l) ? 'laboratory (new)' : 'laboratory';

  const recordTs = metaLabel(recordMeta.updated_by, recordMeta.date_updated);

  if (!person) return null;

  // ---- build the section cards, keyed by section id (placed by the layout grid) ----
  const sectionRows = {};

  sectionRows.profile = (
    <Card className="mb-3">
      <Card.Header>Profile</Card.Header>
      <Card.Body>
        <FieldLine
          label="display_name"
          ts={recordTs}
          status={fieldStatusOf('display_name')}
          error={fieldError.display_name}
          onDismissError={() => dismissFieldError('display_name')}
        >
          <HlControl
            type="text"
            placeholder="display name (required)"
            value={live.display_name}
            savedValue={savedScalars.display_name}
            onChange={(ev) => setLiveField('display_name', ev.target.value)}
            onBlur={() => saveScalar('display_name')}
            style={{ maxWidth: 480 }}
          />
        </FieldLine>
        <FieldLine
          label="status"
          ts={recordTs}
          status={fieldStatusOf('active_status')}
          error={fieldError.active_status}
          onDismissError={() => dismissFieldError('active_status')}
        >
          <HlControl
            as="select"
            value={currentStatus}
            savedValue={savedScalars.active_status}
            onChange={(ev) => { setLiveField('active_status', ev.target.value); saveScalar('active_status', ev.target.value); }}
            style={{ maxWidth: 240 }}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </HlControl>
        </FieldLine>
        <FieldLine
          label="privacy"
          ts={recordTs}
          status={fieldStatusOf('privacy')}
          error={fieldError.privacy}
          onDismissError={() => dismissFieldError('privacy')}
        >
          <HlControl
            as="select"
            value={currentPrivacy}
            savedValue={savedScalars.privacy}
            onChange={(ev) => { setLiveField('privacy', ev.target.value); saveScalar('privacy', ev.target.value); }}
            style={{ maxWidth: 240 }}
          >
            {privacyOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </HlControl>
        </FieldLine>
        <FieldLine
          label="unsubscribe"
          ts={recordTs}
          status={fieldStatusOf('unsubscribe')}
          error={fieldError.unsubscribe}
          onDismissError={() => dismissFieldError('unsubscribe')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 6 }}>
            <input
              type="checkbox"
              id="person-unsubscribe"
              checked={live.unsubscribe}
              onChange={(ev) => { setLiveField('unsubscribe', ev.target.checked); saveScalar('unsubscribe', ev.target.checked); }}
            />
            <label htmlFor="person-unsubscribe" style={{ marginBottom: 0 }}>
              unsubscribed from email
            </label>
          </div>
        </FieldLine>
      </Card.Body>
    </Card>
  );

  sectionRows.names = (
    <Card className="mb-3">
      <Card.Header>Names</Card.Header>
      <Card.Body>
        {names.map((n, i) => (
            <FieldLine
              key={i}
              label={labelForName(n, i)}
              ts={metaLabel(n._by, n._ts)}
              status={childStatus(n, nameSnap)}
              error={n._error}
              onDismissError={() => updateName(i, { _error: null })}
              trail={<RemoveBtn onClick={() => deleteName(i)} />}
            >
              <div style={inlineRow}>
                <HlControl
                  placeholder="firstname"
                  value={n.first_name}
                  savedValue={n._saved?.first_name}
                  onChange={(e) => updateName(i, { first_name: e.target.value })}
                  onBlur={() => saveName(i)}
                  style={{ flex: '1 1 120px', minWidth: 100 }}
                />
                <HlControl
                  placeholder="middlename"
                  value={n.middle_name}
                  savedValue={n._saved?.middle_name}
                  onChange={(e) => updateName(i, { middle_name: e.target.value })}
                  onBlur={() => saveName(i)}
                  style={{ flex: '1 1 120px', minWidth: 100 }}
                />
                <HlControl
                  placeholder="lastname (required)"
                  value={n.last_name}
                  savedValue={n._saved?.last_name}
                  onChange={(e) => updateName(i, { last_name: e.target.value })}
                  onBlur={() => saveName(i)}
                  style={{ flex: '1 1 120px', minWidth: 100 }}
                />
                <HlCheck
                  type="radio"
                  id={`person-name-primary-${i}`}
                  name="person-name-primary"
                  label="primary"
                  checked={n.is_primary}
                  savedValue={n._saved?.is_primary}
                  onChange={(e) => {
                    if (e.target.checked) setPrimaryAndSave(i);
                  }}
                  style={{ whiteSpace: 'nowrap' }}
                />
              </div>
            </FieldLine>
        ))}
      </Card.Body>
    </Card>
  );

  sectionRows.email = (
    <Card className="mb-3">
      <Card.Header>Email</Card.Header>
      <Card.Body>
        {emails.map((e, i) => {
          // Show created + old-since only for an email that's old with dates from the
          // DB. The input flexes to fill the space; created/old are fixed-width
          // columns right before the checkbox, so checkboxes line up across rows.
          const showDates = showTimestamps && e.invalidated && !!(e._created || e._origOldDate);
          const dateSlotBase = { ...tsStyle, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
          return (
            <FieldLine
              key={i}
              label={labelForEmail(e, i)}
              ts={metaLabel(e._by, e._ts)}
              status={childStatus(e, emailSnap)}
              error={e._error}
              onDismissError={() => updateEmail(i, { _error: null })}
              trail={<RemoveBtn onClick={() => deleteEmail(i)} />}
            >
              <div style={inlineRow}>
                <HlControl
                  type="email"
                  placeholder="email address"
                  value={e.email_address}
                  savedValue={e._saved?.email_address}
                  onChange={(ev) => updateEmail(i, { email_address: ev.target.value })}
                  onBlur={() => handleEmailBlur(i)}
                  style={{ flex: '1 1 200px', minWidth: 200 }}
                />
                {showDates && (
                  <span style={{ ...dateSlotBase, fontSize: '0.75em', width: 340 }}>
                    {[
                      e._created ? `created ${formatTimestamp(e._created)}` : null,
                      e._origOldDate ? `old since ${formatTimestamp(e._origOldDate)}` : null,
                    ].filter(Boolean).join(' · ')}
                  </span>
                )}
                <HlCheck
                  type="checkbox"
                  id={`person-email-old-${i}`}
                  label="mark as old"
                  checked={e.invalidated}
                  savedValue={e._saved?.invalidated}
                  onChange={(ev) => {
                    updateEmail(i, { invalidated: ev.target.checked });
                    saveEmail(i, { invalidated: ev.target.checked });
                  }}
                  style={{ whiteSpace: 'nowrap' }}
                />
              </div>
            </FieldLine>
          );
        })}
      </Card.Body>
    </Card>
  );

  const addrField = (field, label, props = {}) => (
    <FieldLine
      label={label}
      ts={recordTs}
      status={fieldStatusOf(field)}
      error={fieldError[field]}
      onDismissError={() => dismissFieldError(field)}
    >
      <HlControl
        type="text"
        {...props}
        value={live[field]}
        savedValue={savedScalars[field]}
        onChange={(ev) => setLiveField(field, ev.target.value)}
        onBlur={() => saveScalar(field)}
      />
    </FieldLine>
  );

  sectionRows.address = (
    <Card className="mb-3">
      <Card.Header>Address</Card.Header>
      <Card.Body>
        <FieldLine label="address_last_updated">
          <HlControl
            type="text"
            value={recordMeta.address_last_updated ? formatTimestamp(recordMeta.address_last_updated) : ''}
            disabled
            readOnly
            style={{ maxWidth: 240 }}
          />
        </FieldLine>
        <FieldLine
          label="street"
          ts={recordTs}
          status={fieldStatusOf('street_address')}
          error={fieldError.street_address}
          onDismissError={() => dismissFieldError('street_address')}
        >
          <HlControl
            as="textarea"
            rows={4}
            value={live.street_address}
            savedValue={savedScalars.street_address}
            onChange={(ev) => setLiveField('street_address', ev.target.value)}
            onBlur={() => saveScalar('street_address')}
          />
        </FieldLine>
        {addrField('city', 'city', { style: { maxWidth: 360 } })}
        {addrField('state', 'state', { style: { maxWidth: 240 } })}
        {addrField('postal_code', 'postal_code', { style: { maxWidth: 200 } })}
        {addrField('country', 'country', { style: { maxWidth: 320 } })}
      </Card.Body>
    </Card>
  );

  sectionRows.institutions = (
    <Card className="mb-3">
      <Card.Header>Institutions</Card.Header>
      <Card.Body>
        {insts.map((it, i) => (
          <FieldLine
            key={i}
            label={labelForInst(it, i)}
            ts={recordTs}
            status={stringRowStatus(it, 'value')}
            error={it._error}
            onDismissError={() => updateInst(i, { _error: null })}
            trail={<RemoveBtn onClick={() => removeStringArrayRow({ list: insts, setList: setInsts, remove: removeInst, field: 'institution', valueKey: 'value', i })} />}
          >
            <HlControl
              value={it.value}
              savedValue={it._savedValue}
              onChange={(ev) => updateInst(i, { value: ev.target.value })}
              onBlur={() => saveStringArray({ list: insts, setList: setInsts, field: 'institution', valueKey: 'value', i })}
            />
          </FieldLine>
        ))}
      </Card.Body>
    </Card>
  );

  sectionRows.webpages = (
    <Card className="mb-3">
      <Card.Header>Webpages</Card.Header>
      <Card.Body>
        {urls.map((u, i) => (
          <FieldLine
            key={i}
            label={labelForUrl(u, i)}
            ts={recordTs}
            status={stringRowStatus(u, 'url')}
            error={u._error}
            onDismissError={() => updateUrl(i, { _error: null })}
            trail={<RemoveBtn onClick={() => removeStringArrayRow({ list: urls, setList: setUrls, remove: removeUrl, field: 'webpage', valueKey: 'url', i })} />}
          >
            <HlControl
              type="url"
              value={u.url}
              savedValue={u._savedValue}
              onChange={(ev) => updateUrl(i, { url: ev.target.value })}
              onBlur={() => saveStringArray({ list: urls, setList: setUrls, field: 'webpage', valueKey: 'url', i })}
            />
          </FieldLine>
        ))}
      </Card.Body>
    </Card>
  );

  sectionRows.laboratories = (
    <Card className="mb-3">
      <Card.Header>Laboratories</Card.Header>
      <Card.Body>
        {labs.map((lab, i) => {
          const flags = [
            { key: 'alum', tsKey: '_alum_ts' },
            { key: 'is_pi', tsKey: '_is_pi_ts' },
            { key: 'former_pi', tsKey: '_former_pi_ts' },
          ];
          const labDisp = isWB
            ? (lab.labStrain || lab.labName || lab.labCurie)
            : (lab.labName || lab.labStrain || lab.labCurie);
          return (
            <FieldLine
              key={i}
              label={labelForLab(lab, i)}
              ts={metaLabel(lab._by, lab._ts)}
              status={childStatus(lab, labSnap)}
              error={lab._error}
              onDismissError={() => updateLab(i, { _error: null })}
              trail={<RemoveBtn onClick={() => deleteLab(i)} />}
            >
              <div style={inlineRow}>
                {lab._id ? (
                  // Existing link: the lab isn't editable in place (pending an API
                  // decision); WB sees the strain designation, other MODs the name.
                  <span
                    style={{
                      display: 'inline-flex', alignItems: 'center', padding: '6px 10px',
                      background: '#eef2f7', border: '1px solid #d4dce6', borderRadius: 4,
                      width: 300, flexShrink: 0, boxSizing: 'border-box',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                    title={`${labDisp} ${lab.labCurie}`}
                  >
                    {labDisp && labDisp !== lab.labCurie ? `${labDisp} — ${lab.labCurie}` : lab.labCurie}
                  </span>
                ) : (
                  <div style={{ width: 300, flexShrink: 0 }}>
                    <LabCuriePicker
                      id={`person-lab-${i}`}
                      disabled={lab._status === 'saving'}
                      onChange={(o) => {
                        const patch = { labCurie: o?.curie || '', labName: o?.name || '', labStrain: o?.strain_designation || '' };
                        updateLab(i, patch);
                        if (o?.curie) saveLab(i, patch);
                      }}
                    />
                  </div>
                )}
                {flags.map(({ key, tsKey }) => {
                  const stamp =
                    showTimestamps && lab[key] && lab[tsKey]
                      ? formatTimestamp(lab[tsKey])
                      : null;
                  return (
                    <div
                      key={key}
                      style={{
                        width: 230,
                        flexShrink: 0,
                        boxSizing: 'border-box',
                        paddingLeft: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                      }}
                    >
                      <HlCheck
                        type="checkbox"
                        id={`person-labperson-${i}-${key}`}
                        label={key}
                        checked={lab[key]}
                        savedValue={lab._saved?.[key]}
                        disabled={!lab.labCurie}
                        onChange={(ev) => {
                          updateLab(i, { [key]: ev.target.checked });
                          saveLab(i, { [key]: ev.target.checked });
                        }}
                        style={{ whiteSpace: 'nowrap' }}
                      />
                      {stamp && <span style={tsStyle}>{stamp}</span>}
                    </div>
                  );
                })}
              </div>
            </FieldLine>
          );
        })}
      </Card.Body>
    </Card>
  );

  sectionRows.cross_references = (
    <Card className="mb-3">
      <Card.Header>Cross references</Card.Header>
      <Card.Body>
        {xrefs.map((x, i) => {
          const prefixOptions =
            XREF_PREFIXES.includes(x.curie_prefix) || !x.curie_prefix
              ? XREF_PREFIXES
              : [...XREF_PREFIXES, x.curie_prefix];
          return (
            <FieldLine
              key={i}
              label={labelForXref(x, i)}
              ts={metaLabel(x._by, x._ts)}
              status={childStatus(x, xrefSnap)}
              error={x._error}
              onDismissError={() => updateXref(i, { _error: null })}
              trail={<RemoveBtn onClick={() => deleteXref(i)} />}
            >
              <div style={inlineRow}>
                <HlControl
                  as="select"
                  value={x.curie_prefix}
                  savedValue={x._saved?.curie_prefix}
                  onChange={(ev) => updateXref(i, { curie_prefix: ev.target.value })}
                  onBlur={() => saveXref(i)}
                  style={{ maxWidth: 140 }}
                >
                  <option value="">prefix (required)</option>
                  {prefixOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </HlControl>
                <HlControl
                  placeholder="id (required)"
                  value={x.curie}
                  savedValue={x._saved?.curie}
                  onChange={(ev) => updateXref(i, { curie: ev.target.value })}
                  onBlur={() => saveXref(i)}
                  style={{ flex: '1 1 240px', minWidth: 200 }}
                />
                <HlCheck
                  type="checkbox"
                  id={`person-xref-obsolete-${i}`}
                  label="is_obsolete"
                  checked={x.is_obsolete}
                  savedValue={x._saved?.is_obsolete}
                  onChange={(ev) => {
                    updateXref(i, { is_obsolete: ev.target.checked });
                    saveXref(i, { is_obsolete: ev.target.checked });
                  }}
                  style={{ whiteSpace: 'nowrap' }}
                />
              </div>
            </FieldLine>
          );
        })}
      </Card.Body>
    </Card>
  );

  sectionRows.research_interest = (
    <Card className="mb-3">
      <Card.Header>Research interest</Card.Header>
      <Card.Body>
        <FieldLine
          label="biography"
          ts={recordTs}
          status={fieldStatusOf('biography_research_interest')}
          error={fieldError.biography_research_interest}
          onDismissError={() => dismissFieldError('biography_research_interest')}
        >
          <HlControl
            as="textarea"
            rows={4}
            value={live.biography_research_interest}
            savedValue={savedScalars.biography_research_interest}
            onChange={(ev) => setLiveField('biography_research_interest', ev.target.value)}
            onBlur={() => saveScalar('biography_research_interest')}
          />
        </FieldLine>
      </Card.Body>
    </Card>
  );

  sectionRows.comments = (
    <Card className="mb-3">
      <Card.Header>Comments</Card.Header>
      <Card.Body>
        {notes.map((n, i) => (
            <FieldLine
              key={i}
              label={labelForNote(n, i)}
              ts={metaLabel(n._by, n._ts)}
              status={childStatus(n, noteSnap)}
              error={n._error}
              onDismissError={() => updateNote(i, { _error: null })}
              trail={<RemoveBtn onClick={() => deleteNote(i)} />}
            >
              <HlControl
                as="textarea"
                rows={2}
                placeholder="comment"
                value={n.note}
                savedValue={n._saved?.note}
                onChange={(ev) => updateNote(i, { note: ev.target.value })}
                onBlur={() => saveNote(i)}
              />
            </FieldLine>
        ))}
      </Card.Body>
    </Card>
  );

  const lockedPill = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    background: '#eef2f7',
    border: '1px solid #d4dce6',
    borderRadius: 4,
    fontSize: '0.85em',
    color: '#37485b',
    whiteSpace: 'nowrap',
  };
  // Locked-person pill sized to match a PersonCuriePicker slot, so toggling between
  // the picker and the locked pill doesn't resize the row.
  const lockedSlot = {
    ...lockedPill,
    width: '100%',
    minHeight: 38,
    boxSizing: 'border-box',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };
  const personLabel = (name, curie) => (name ? `${name} (${curie})` : curie || '');
  // Fixed-width person pill so the validated rows' columns (subject · relationship ·
  // object · dates) line up regardless of name length; long labels clip with ellipsis.
  const canonPersonStyle = {
    ...lockedPill,
    width: 240,
    flexShrink: 0,
    boxSizing: 'border-box',
    minHeight: 38,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };
  // Shared fixed sizes so all three Lineage sub-blocks line up evenly.
  const personSlot = { width: 240, flexShrink: 0 };
  const relSelectStyle = { width: 260, flexShrink: 0 };

  const unvalidatedSubs = submissions.filter((s) => !s.person_lineage_id && s.status !== 'rejected');
  const rejectedSubs = submissions.filter((s) => s.status === 'rejected');
  const subsForCanonical = (cid) => submissions.filter((s) => s.person_lineage_id === cid);

  sectionRows.lineage = (
    <Card className="mb-3">
      <Card.Header>Lineage</Card.Header>
      <Card.Body>
        <div style={{ color: '#888', fontSize: '0.85em', marginBottom: 12 }}>
          Submissions are claims; a curator resolves the other person +
          relationship/dates and promotes them to canonical connections.
        </div>

        {lineageError && (
          <Alert variant="danger" dismissible onClose={() => setLineageError('')}>
            {lineageError}
          </Alert>
        )}

        {/* 1. Unvalidated submissions */}
        <h6 className="text-muted">Unvalidated submissions</h6>
        {unvalidatedSubs.length === 0 && (
          <div style={{ color: '#888', marginBottom: 12 }}>(none)</div>
        )}
        {unvalidatedSubs.map((s, si) => {
          const side = lockedSide(s);
          const e = subEdit(s);
          const lockedCurie = side === 'subject' ? s.person_subject_curie : s.person_object_curie;
          const claimedOther = side === 'subject' ? s.person_object_name : s.person_subject_name;
          const lockedCell = (
            <span style={canonPersonStyle} title={`${lockedCurie} · this person`}>
              {lockedCurie} · this person
            </span>
          );
          const otherPicker = (
            <div style={personSlot}>
              <PersonCuriePicker
                id={`sub-other-${s.person_lineage_submission_id}`}
                value={e.otherCurie}
                valueName={e.otherName}
                disabled={lineageBusy}
                placeholder={claimedOther ? `resolve: ${claimedOther}` : (side === 'subject' ? 'object (search name)' : 'subject (search name)')}
                onChange={(o) => patchSubEdit(s, { otherCurie: o?.curie || '', otherName: o?.name || '' })}
              />
            </div>
          );
          return (
            <div key={s.person_lineage_submission_id}>
              {si > 0 && <hr style={{ borderTop: '1px dashed #e0e0e0', margin: '12px 0' }} />}
              {/* Claim row — submitted values, each column aligned above its input. */}
              <LineageClaimRow submission={s} style={{ marginBottom: 4 }} />
              {/* Validation row — editable inputs + status/Validate below the submitter. */}
              <div style={inlineRow}>
                {side === 'subject' ? lockedCell : otherPicker}
                <HlControl
                  as="select"
                  value={e.relationship}
                  onChange={(ev) => patchSubEdit(s, { relationship: ev.target.value })}
                  style={relSelectStyle}
                  disabled={lineageBusy}
                >
                  <option value=""></option>
                  {relOptionsFor(e.relationship).map((o) => <option key={o} value={o}>{o}</option>)}
                </HlControl>
                {side === 'object' ? lockedCell : otherPicker}
                <LineageDateRange
                  start={e.start}
                  end={e.end}
                  disabled={lineageBusy}
                  onChange={(st, en) => patchSubEdit(s, { start: st, end: en })}
                />
                <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                  <Badge variant="secondary">{s.status}</Badge>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={lineageBusy || !e.otherCurie || !e.relationship}
                    onClick={() => handleValidate(s)}
                    title="Promote to a canonical connection"
                  >
                    Validate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    disabled={lineageBusy}
                    onClick={() => setSubmissionStatus(s, 'rejected')}
                    title="Reject this submission"
                  >
                    Reject
                  </Button>
                </span>
              </div>
            </div>
          );
        })}

        <hr />

        {/* 2. Validated canonical connections (primary), with linked submissions */}
        <h6 className="text-muted">Validated relationships</h6>
        {canonicals.length === 0 && (
          <div style={{ color: '#888', marginBottom: 12 }}>(none)</div>
        )}
        {canonicals.map((c, ci) => {
          const e = canonEdit(c);
          const linked = subsForCanonical(c.person_lineage_id);
          return (
            <div key={c.person_lineage_id}>
              {ci > 0 && <hr style={{ borderTop: '1px dashed #e0e0e0', margin: '12px 0' }} />}
              {(() => {
                const cside = canonLockedSide(c);
                const otherPicker = (
                  <div style={personSlot}>
                    <PersonCuriePicker
                      id={`canon-other-${c.person_lineage_id}`}
                      value={e.otherCurie}
                      valueName={e.otherName}
                      disabled={lineageBusy}
                      placeholder={cside === 'subject' ? 'object (search name)' : 'subject (search name)'}
                      onChange={(o) => patchCanonEdit(c, { otherCurie: o?.curie || '', otherName: o?.name || '' })}
                    />
                  </div>
                );
                const subjectCell = cside === 'subject'
                  ? <span style={canonPersonStyle} title={personLabel(c.person_subject_name, c.person_subject_curie)}>{personLabel(c.person_subject_name, c.person_subject_curie)}</span>
                  : otherPicker;
                const objectCell = cside === 'object'
                  ? <span style={canonPersonStyle} title={personLabel(c.person_object_name, c.person_object_curie)}>{personLabel(c.person_object_name, c.person_object_curie)}</span>
                  : otherPicker;
                return (
              <div style={inlineRow}>
                {subjectCell}
                <HlControl
                  as="select"
                  value={e.relationship}
                  onChange={(ev) => patchCanonEdit(c, { relationship: ev.target.value })}
                  style={relSelectStyle}
                  disabled={lineageBusy}
                >
                  {relOptionsFor(e.relationship).map((o) => <option key={o} value={o}>{o}</option>)}
                </HlControl>
                {objectCell}
                <LineageDateRange
                  start={e.start}
                  end={e.end}
                  disabled={lineageBusy}
                  onChange={(st, en) => patchCanonEdit(c, { start: st, end: en })}
                />
                <Button size="sm" variant="outline-primary" disabled={lineageBusy} onClick={() => handleSaveCanonical(c)}>
                  Save
                </Button>
                <Button size="sm" variant="outline-danger" disabled={lineageBusy} onClick={() => handleDeleteCanonical(c)}>
                  Delete
                </Button>
              </div>
                );
              })()}
              {linked.map((s) => (
                <LineageClaimRow
                  key={s.person_lineage_submission_id}
                  submission={s}
                  lead="↳ "
                  showStatus
                  style={{ marginTop: 2 }}
                />
              ))}
            </div>
          );
        })}

        <hr />

        {/* 3. Add a brand-new canonical connection directly */}
        <h6 className="text-muted">Add a new connection</h6>
        <div style={inlineRow}>
          {newCanon.anchor === 'object' ? (
            <div style={personSlot}>
              <span style={lockedSlot}>{newCanon.subjectCurie} · this person</span>
            </div>
          ) : (
            <div style={personSlot}>
              <PersonCuriePicker
                id="newcanon-subject"
                value={newCanon.subjectCurie}
                valueName={newCanon.subjectName}
                disabled={lineageBusy}
                placeholder="subject (search name)"
                onChange={(o) => setNewCanon((n) => {
                  if (!o?.curie) {
                    // Clearing the anchor side resets the pair (keep relationship/dates).
                    return n.anchor === 'subject'
                      ? { ...n, anchor: null, subjectCurie: '', subjectName: '', objectCurie: '', objectName: '' }
                      : { ...n, subjectCurie: '', subjectName: '' };
                  }
                  // Picking subject anchors it and locks the object to the loaded person.
                  return {
                    ...n, anchor: 'subject',
                    subjectCurie: o.curie, subjectName: o.name || '',
                    objectCurie: p.curie, objectName: p.display_name || '',
                  };
                })}
              />
            </div>
          )}
          <HlControl
            as="select"
            value={newCanon.relationship}
            onChange={(ev) => setNewCanon((n) => ({ ...n, relationship: ev.target.value }))}
            style={relSelectStyle}
            disabled={lineageBusy}
          >
            <option value=""></option>
            {PERSON_PERSON_ROLES.map((o) => <option key={o} value={o}>{o}</option>)}
          </HlControl>
          {newCanon.anchor === 'subject' ? (
            <div style={personSlot}>
              <span style={lockedSlot}>{newCanon.objectCurie} · this person</span>
            </div>
          ) : (
            <div style={personSlot}>
              <PersonCuriePicker
                id="newcanon-object"
                value={newCanon.objectCurie}
                valueName={newCanon.objectName}
                disabled={lineageBusy}
                placeholder="object (search name)"
                onChange={(o) => setNewCanon((n) => {
                  if (!o?.curie) {
                    return n.anchor === 'object'
                      ? { ...n, anchor: null, subjectCurie: '', subjectName: '', objectCurie: '', objectName: '' }
                      : { ...n, objectCurie: '', objectName: '' };
                  }
                  return {
                    ...n, anchor: 'object',
                    objectCurie: o.curie, objectName: o.name || '',
                    subjectCurie: p.curie, subjectName: p.display_name || '',
                  };
                })}
              />
            </div>
          )}
          <LineageDateRange
            start={newCanon.start}
            end={newCanon.end}
            disabled={lineageBusy}
            onChange={(st, en) => setNewCanon((n) => ({ ...n, start: st, end: en }))}
          />
          <Button
            size="sm"
            variant="success"
            disabled={lineageBusy || !newCanon.subjectCurie || !newCanon.objectCurie || !newCanon.relationship}
            onClick={handleAddCanonical}
          >
            Add
          </Button>
        </div>

        {/* 4. Rejected submissions — collapsed by default, count + toggle. */}
        {rejectedSubs.length > 0 && (
          <>
            <hr />
            <Button
              size="sm"
              variant="link"
              className="p-0"
              onClick={() => setShowRejected((v) => !v)}
            >
              {showRejected ? '▾' : '▸'} Rejected submissions ({rejectedSubs.length})
            </Button>
            {showRejected && rejectedSubs.map((s) => (
              <LineageClaimRow
                key={s.person_lineage_submission_id}
                submission={s}
                style={{ marginTop: 4 }}
                trailing={(
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    disabled={lineageBusy}
                    onClick={() => setSubmissionStatus(s, 'pending')}
                    title="Return this submission to the unvalidated list"
                  >
                    Set Pending
                  </Button>
                )}
              />
            ))}
          </>
        )}
      </Card.Body>
    </Card>
  );

  // ---- arrange sections per the active layout, dropping hidden ones ----
  const grid = layoutToCssGrid(activeLayout);
  const wideLayout = !!(grid && grid.multiColumn);
  const knownIds = SECTION_DEFS.map((s) => s.id);
  const orderedIds = (
    grid ? [...grid.order, ...knownIds.filter((id) => !grid.order.includes(id))] : knownIds
  ).filter((id) => !hiddenSections.has(id));

  const sectionsRender = grid ? (
    <div
      className={`person-editor-grid${wideLayout ? ' person-editor-grid--wide' : ''}`}
      style={{ '--person-col-floor': `${grid.colFloor}px` }}
    >
      {orderedIds.map((id) => (
        <div
          key={id}
          className="person-editor-section"
          style={grid.styles[id] || { gridColumn: '1 / -1' }}
        >
          {sectionRows[id]}
        </div>
      ))}
    </div>
  ) : (
    orderedIds.map((id) => (
      <React.Fragment key={id}>{sectionRows[id]}</React.Fragment>
    ))
  );

  return (
    <Container fluid>
      <div className="text-muted mb-2" style={{ fontSize: '0.85em' }}>
        Changes save automatically — fields save when you click away (or change a checkbox/select);
        list rows save once their required fields are filled.
      </div>

      <div className="d-flex justify-content-end mb-3">
        <PersonEditorLayoutModal
          onApplyPrefs={applyPrefs}
          current={{
            layout: activeLayout,
            hidden: Array.from(hiddenSections),
            showTimestamps,
            showCurator,
          }}
          onToggleSection={toggleSection}
          onToggleTimestamps={setShowTimestamps}
          onToggleCurator={setShowCurator}
        />
      </div>

      <Form>
        {sectionsRender}
        <div style={{ marginBottom: 24 }} />
      </Form>
    </Container>
  );
};

export default PersonEditor;
