import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Container from 'react-bootstrap/Container';

import { api } from '../../api';
import PersonCuriePicker from './PersonCuriePicker';
import PersonEditorLayoutModal from '../settings/PersonEditorLayoutModal';
import { SECTION_DEFS, layoutToCssGrid, defaultHiddenSections } from './personEditorSections';
import './personEditorSections.css';

const MockupTitle = 'Mockup only — not wired to the API';
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

const FieldLine = ({ label, children, ts, trail }) => (
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
        <div style={{ flex: 1, minWidth: 240 }}>{children}</div>
        {(ts || trail) && (
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
              {ts ?? ''}
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
  </div>
);

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
    <Form.Control
      type="date"
      value={start || ''}
      onChange={(ev) => onChange(ev.target.value, end || '')}
      disabled={disabled}
      style={{ flex: 1, minWidth: 0 }}
      title="start date"
    />
    <span style={{ color: '#888' }}>–</span>
    <Form.Control
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
const LineageClaimRow = ({ submission, lead = '', showStatus = false, style }) => (
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
  </div>
);

const PersonEditor = ({ person }) => {
  const p = person ?? {};

  // Effective MOD (testerMod overrides cognitoMod) drives per-section default
  // visibility — see SECTION_DEFS `mods` gating in personEditorSections.js.
  const cognitoMod = useSelector((s) => s.isLogged.cognitoMod);
  const testerMod = useSelector((s) => s.isLogged.testerMod);
  const effectiveMod = testerMod !== 'No' ? testerMod : cognitoMod;

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

  const currentStatus = p.active_status || 'active';
  const statusOptions = STATUS_OPTIONS.includes(currentStatus)
    ? STATUS_OPTIONS
    : [...STATUS_OPTIONS, currentStatus];

  const currentPrivacy = p.privacy || 'hide_email';
  const privacyOptions = PRIVACY_OPTIONS.includes(currentPrivacy)
    ? PRIVACY_OPTIONS
    : [...PRIVACY_OPTIONS, currentPrivacy];

  // Names
  const emptyName = () => ({
    first_name: '',
    middle_name: '',
    last_name: '',
    is_primary: false,
    _ts: null,
    _by: null,
  });
  const nameIsEmpty = (n) => !n.first_name && !n.middle_name && !n.last_name;
  const initialNames = (p.names ?? []).map((n) => ({
    first_name: n.first_name ?? '',
    middle_name: n.middle_name ?? '',
    last_name: n.last_name ?? '',
    is_primary: !!n.is_primary,
    _ts: n.date_updated ?? null,
    _by: n.updated_by ?? null,
  }));
  const [names, updateName, removeName, setNames] = useAutoGrowList(
    initialNames,
    emptyName,
    nameIsEmpty,
  );

  // Emails
  const emptyEmail = () => ({
    email_address: '',
    invalidated: false,
    _origOldDate: null,
    _ts: null,
    _by: null,
  });
  const emailIsEmpty = (e) => !e.email_address;
  const initialEmails = (p.emails ?? []).map((e) => ({
    email_address: e.email_address ?? '',
    invalidated: !!e.date_made_old_email,
    _origOldDate: e.date_made_old_email ?? null,
    _ts: e.date_updated ?? null,
    _by: e.updated_by ?? null,
  }));
  const [emails, updateEmail, removeEmail] = useAutoGrowList(
    initialEmails,
    emptyEmail,
    emailIsEmpty,
  );

  const [unsubscribe, setUnsubscribe] = useState(!!p.unsubscribe);

  // Webpages — strings, no per-row timestamp, no who/when shown
  const emptyUrl = () => ({ url: '' });
  const urlIsEmpty = (u) => !u.url;
  const initialUrls = (p.webpage ?? []).map((u) => ({ url: u ?? '' }));
  const [urls, updateUrl, removeUrl] = useAutoGrowList(initialUrls, emptyUrl, urlIsEmpty);

  // Institutions — strings, no per-row timestamp, no who/when shown
  const emptyInst = () => ({ value: '' });
  const instIsEmpty = (it) => !it.value;
  const initialInsts = (p.institution ?? []).map((it) => ({ value: it ?? '' }));
  const [insts, updateInst, removeInst] = useAutoGrowList(initialInsts, emptyInst, instIsEmpty);

  // Cross references — page url is API-only, not editable, not shown
  const emptyXref = () => ({
    curie_prefix: '',
    curie: '',
    is_obsolete: false,
    _ts: null,
    _by: null,
  });
  const xrefIsEmpty = (x) => !x.curie_prefix && !x.curie;
  const initialXrefs = (p.cross_references ?? []).map((x) => ({
    curie_prefix: x.curie_prefix ?? '',
    curie: x.curie ?? '',
    is_obsolete: !!x.is_obsolete,
    _ts: x.date_updated ?? null,
    _by: x.updated_by ?? null,
  }));
  const [xrefs, updateXref, removeXref] = useAutoGrowList(initialXrefs, emptyXref, xrefIsEmpty);

  // Notes / comments
  const emptyNote = () => ({ note: '', _ts: null, _by: null });
  const noteIsEmpty = (n) => !n.note;
  const initialNotes = (p.notes ?? []).map((n) => ({
    note: n.note ?? '',
    _ts: n.date_updated ?? null,
    _by: n.updated_by ?? null,
  }));
  const [notes, updateNote, removeNote] = useAutoGrowList(initialNotes, emptyNote, noteIsEmpty);

  // Laboratory connections — editable, auto-growing like the other lists. The
  // alum / is_pi / former_pi DateTime fields are shown as checkboxes; the stored
  // timestamp (when set in the database) is displayed beside the box. Mockup-only.
  const emptyLab = () => ({
    lab: '',
    alum: false,
    is_pi: false,
    former_pi: false,
    _alum_ts: null,
    _is_pi_ts: null,
    _former_pi_ts: null,
    _ts: null,
    _by: null,
  });
  const labIsEmpty = (l) => !l.lab;
  const initialLabs = (p.lab_persons ?? []).map((lp) => ({
    lab: lp.laboratory_strain_designation || lp.laboratory_curie || '',
    alum: !!lp.alum,
    is_pi: !!lp.is_pi,
    former_pi: !!lp.former_pi,
    _alum_ts: lp.alum ?? null,
    _is_pi_ts: lp.is_pi ?? null,
    _former_pi_ts: lp.former_pi ?? null,
    _ts: lp.date_updated ?? null,
    _by: lp.updated_by ?? null,
  }));
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

  const errDetail = (err) => {
    const d = err?.response?.data?.detail;
    return typeof d === 'string' ? d : err?.message || 'Request failed';
  };

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

  const recordTs = metaLabel(p.updated_by, p.date_updated);

  if (!person) return null;

  // ---- build the section cards, keyed by section id (placed by the layout grid) ----
  const sectionRows = {};

  sectionRows.profile = (
    <Card className="mb-3">
      <Card.Header>Profile</Card.Header>
      <Card.Body>
        <FieldLine label="display_name" ts={recordTs}>
          <Form.Control type="text" defaultValue={p.display_name ?? ''} style={{ maxWidth: 480 }} />
        </FieldLine>
        <FieldLine label="status" ts={recordTs}>
          <Form.Control as="select" defaultValue={currentStatus} style={{ maxWidth: 240 }}>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Form.Control>
        </FieldLine>
        <FieldLine label="privacy" ts={recordTs}>
          <Form.Control as="select" defaultValue={currentPrivacy} style={{ maxWidth: 240 }}>
            {privacyOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Form.Control>
        </FieldLine>
        <FieldLine label="unsubscribe" ts={recordTs}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 6 }}>
            <input
              type="checkbox"
              id="person-unsubscribe"
              checked={unsubscribe}
              onChange={(ev) => setUnsubscribe(ev.target.checked)}
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
        {names.map((n, i) => {
          const isNew = i === names.length - 1 && nameIsEmpty(n);
          const ts = isNew ? 'new' : metaLabel(n._by, n._ts);
          return (
            <FieldLine
              key={i}
              label={labelForName(n, i)}
              ts={ts}
              trail={<RemoveBtn onClick={() => removeName(i)} />}
            >
              <div style={inlineRow}>
                <Form.Control
                  placeholder="firstname"
                  value={n.first_name}
                  onChange={(e) => updateName(i, { first_name: e.target.value })}
                  style={{ flex: '1 1 120px', minWidth: 100 }}
                />
                <Form.Control
                  placeholder="middlename"
                  value={n.middle_name}
                  onChange={(e) => updateName(i, { middle_name: e.target.value })}
                  style={{ flex: '1 1 120px', minWidth: 100 }}
                />
                <Form.Control
                  placeholder="lastname"
                  value={n.last_name}
                  onChange={(e) => updateName(i, { last_name: e.target.value })}
                  style={{ flex: '1 1 120px', minWidth: 100 }}
                />
                <Form.Check
                  type="radio"
                  id={`person-name-primary-${i}`}
                  name="person-name-primary"
                  label="primary"
                  checked={n.is_primary}
                  onChange={(e) => {
                    if (e.target.checked) setNamePrimary(i);
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

  sectionRows.email = (
    <Card className="mb-3">
      <Card.Header>Email</Card.Header>
      <Card.Body>
        {emails.map((e, i) => {
          const isNew = i === emails.length - 1 && emailIsEmpty(e);
          const editTs = metaLabel(e._by, e._ts);
          const oldNote = showTimestamps && e._origOldDate
            ? `old since ${formatTimestamp(e._origOldDate)}`
            : null;
          const computed = [oldNote, editTs].filter(Boolean).join(' · ') || null;
          const ts = isNew ? 'new' : computed;
          return (
            <FieldLine
              key={i}
              label={labelForEmail(e, i)}
              ts={ts}
              trail={<RemoveBtn onClick={() => removeEmail(i)} />}
            >
              <div style={inlineRow}>
                <Form.Control
                  type="email"
                  value={e.email_address}
                  onChange={(ev) => updateEmail(i, { email_address: ev.target.value })}
                  style={{ flex: '1 1 240px', minWidth: 200 }}
                />
                <Form.Check
                  type="checkbox"
                  id={`person-email-old-${i}`}
                  label="mark as old"
                  checked={e.invalidated}
                  onChange={(ev) => updateEmail(i, { invalidated: ev.target.checked })}
                  style={{ whiteSpace: 'nowrap' }}
                />
              </div>
            </FieldLine>
          );
        })}
      </Card.Body>
    </Card>
  );

  sectionRows.address = (
    <Card className="mb-3">
      <Card.Header>Address</Card.Header>
      <Card.Body>
        <FieldLine label="address_last_updated">
          <Form.Control
            type="text"
            defaultValue={p.address_last_updated ? formatTimestamp(p.address_last_updated) : ''}
            disabled
            style={{ maxWidth: 240 }}
          />
        </FieldLine>
        <FieldLine label="street">
          <Form.Control as="textarea" rows={4} defaultValue={p.street_address ?? ''} />
        </FieldLine>
        <FieldLine label="city">
          <Form.Control type="text" defaultValue={p.city ?? ''} style={{ maxWidth: 360 }} />
        </FieldLine>
        <FieldLine label="state">
          <Form.Control type="text" defaultValue={p.state ?? ''} style={{ maxWidth: 240 }} />
        </FieldLine>
        <FieldLine label="postal_code">
          <Form.Control type="text" defaultValue={p.postal_code ?? ''} style={{ maxWidth: 200 }} />
        </FieldLine>
        <FieldLine label="country">
          <Form.Control type="text" defaultValue={p.country ?? ''} style={{ maxWidth: 320 }} />
        </FieldLine>
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
            trail={<RemoveBtn onClick={() => removeInst(i)} />}
          >
            <Form.Control
              value={it.value}
              onChange={(ev) => updateInst(i, { value: ev.target.value })}
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
            trail={<RemoveBtn onClick={() => removeUrl(i)} />}
          >
            <Form.Control
              type="url"
              value={u.url}
              onChange={(ev) => updateUrl(i, { url: ev.target.value })}
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
          const isNew = i === labs.length - 1 && labIsEmpty(lab);
          const ts = isNew ? 'new' : metaLabel(lab._by, lab._ts);
          const flags = [
            { key: 'alum', tsKey: '_alum_ts' },
            { key: 'is_pi', tsKey: '_is_pi_ts' },
            { key: 'former_pi', tsKey: '_former_pi_ts' },
          ];
          return (
            <FieldLine
              key={i}
              label={labelForLab(lab, i)}
              ts={ts}
              trail={<RemoveBtn onClick={() => removeLab(i)} />}
            >
              <div style={inlineRow}>
                <Form.Control
                  placeholder="strain_designation (or lab curie)"
                  value={lab.lab}
                  onChange={(ev) => updateLab(i, { lab: ev.target.value })}
                  style={{ width: 300, flexShrink: 0 }}
                />
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
                      <Form.Check
                        type="checkbox"
                        id={`person-labperson-${i}-${key}`}
                        label={key}
                        checked={lab[key]}
                        onChange={(ev) => updateLab(i, { [key]: ev.target.checked })}
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
          const isNew = i === xrefs.length - 1 && xrefIsEmpty(x);
          const ts = isNew ? 'new' : metaLabel(x._by, x._ts);
          const prefixOptions =
            XREF_PREFIXES.includes(x.curie_prefix) || !x.curie_prefix
              ? XREF_PREFIXES
              : [...XREF_PREFIXES, x.curie_prefix];
          return (
            <FieldLine
              key={i}
              label={labelForXref(x, i)}
              ts={ts}
              trail={<RemoveBtn onClick={() => removeXref(i)} />}
            >
              <div style={inlineRow}>
                <Form.Control
                  as="select"
                  value={x.curie_prefix}
                  onChange={(ev) => updateXref(i, { curie_prefix: ev.target.value })}
                  style={{ maxWidth: 140 }}
                >
                  <option value=""></option>
                  {prefixOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </Form.Control>
                <Form.Control
                  placeholder="curie"
                  value={x.curie}
                  onChange={(ev) => updateXref(i, { curie: ev.target.value })}
                  style={{ flex: '1 1 240px', minWidth: 200 }}
                />
                <Form.Check
                  type="checkbox"
                  id={`person-xref-obsolete-${i}`}
                  label="is_obsolete"
                  checked={x.is_obsolete}
                  onChange={(ev) => updateXref(i, { is_obsolete: ev.target.checked })}
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
        <FieldLine label="biography" ts={recordTs}>
          <Form.Control
            as="textarea"
            rows={4}
            defaultValue={p.biography_research_interest ?? ''}
          />
        </FieldLine>
      </Card.Body>
    </Card>
  );

  sectionRows.comments = (
    <Card className="mb-3">
      <Card.Header>Comments</Card.Header>
      <Card.Body>
        {notes.map((n, i) => {
          const isNew = i === notes.length - 1 && noteIsEmpty(n);
          const ts = isNew ? 'new' : metaLabel(n._by, n._ts);
          return (
            <FieldLine
              key={i}
              label={labelForNote(n, i)}
              ts={ts}
              trail={<RemoveBtn onClick={() => removeNote(i)} />}
            >
              <Form.Control
                as="textarea"
                rows={2}
                value={n.note}
                onChange={(ev) => updateNote(i, { note: ev.target.value })}
              />
            </FieldLine>
          );
        })}
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

  const unvalidatedSubs = submissions.filter((s) => !s.person_lineage_id);
  const subsForCanonical = (cid) => submissions.filter((s) => s.person_lineage_id === cid);

  sectionRows.lineage = (
    <Card className="mb-3">
      <Card.Header>Lineage</Card.Header>
      <Card.Body>
        <div style={{ color: '#888', fontSize: '0.85em', marginBottom: 12 }}>
          Person-to-person relationships for <code>{p.curie}</code>. Submissions are
          claims; a curator resolves the other person + relationship/dates and
          promotes them to canonical connections.
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
          const rejected = s.status === 'rejected';
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
                <Form.Control
                  as="select"
                  value={e.relationship}
                  onChange={(ev) => patchSubEdit(s, { relationship: ev.target.value })}
                  style={relSelectStyle}
                  disabled={lineageBusy}
                >
                  <option value=""></option>
                  {relOptionsFor(e.relationship).map((o) => <option key={o} value={o}>{o}</option>)}
                </Form.Control>
                {side === 'object' ? lockedCell : otherPicker}
                <LineageDateRange
                  start={e.start}
                  end={e.end}
                  disabled={lineageBusy}
                  onChange={(st, en) => patchSubEdit(s, { start: st, end: en })}
                />
                <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                  <Badge variant={rejected ? 'danger' : 'secondary'}>{s.status}</Badge>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={lineageBusy || rejected || !e.otherCurie || !e.relationship}
                    onClick={() => handleValidate(s)}
                    title={rejected ? 'Rejected submissions cannot be validated' : 'Promote to a canonical connection'}
                  >
                    Validate
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
                <Form.Control
                  as="select"
                  value={e.relationship}
                  onChange={(ev) => patchCanonEdit(c, { relationship: ev.target.value })}
                  style={relSelectStyle}
                  disabled={lineageBusy}
                >
                  {relOptionsFor(e.relationship).map((o) => <option key={o} value={o}>{o}</option>)}
                </Form.Control>
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
          <Form.Control
            as="select"
            value={newCanon.relationship}
            onChange={(ev) => setNewCanon((n) => ({ ...n, relationship: ev.target.value }))}
            style={relSelectStyle}
            disabled={lineageBusy}
          >
            <option value=""></option>
            {PERSON_PERSON_ROLES.map((o) => <option key={o} value={o}>{o}</option>)}
          </Form.Control>
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
      <Alert variant="warning">
        <strong>Mockup view</strong> — editing is not yet wired to the API. Changes here will not be saved.
      </Alert>

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

        <div style={{ marginTop: 12, marginBottom: 24 }}>
          <Button variant="primary" disabled title={MockupTitle}>Save (mockup)</Button>
          <span style={{ color: '#888', marginLeft: 12 }}>{MockupTitle}</span>
        </div>
      </Form>
    </Container>
  );
};

export default PersonEditor;
