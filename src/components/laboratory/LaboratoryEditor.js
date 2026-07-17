import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, faSpinner } from '@fortawesome/free-solid-svg-icons';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';

import { api } from '../../api';
import PersonCuriePicker from '../person/PersonCuriePicker';
import { enumDict } from '../biblio/BiblioEditor';
import LaboratoryEditorLayoutModal from '../settings/LaboratoryEditorLayoutModal';
import { SECTION_DEFS, layoutToCssGrid, defaultHiddenSections } from './laboratoryEditorSections';
import './laboratoryEditorSections.css';

// Controlled vocabularies — mirror the API enums (laboratory_schemas.py /
// laboratory_position_enum.py). The DB columns are plain strings, so the
// frontend enforces the allowed values.
const STATUS_OPTIONS = ['active', 'closed', 'unknown'];
const EMAIL_VISIBILITY_OPTIONS = ['public', 'logged_in_user', 'not_shown'];
const LAB_POSITION_OPTIONS = [
  'other',
  'co_pi',
  'research_professor',
  'md_vet',
  'administrator',
  'animal_facility_staff',
  'research_staff',
  'technical_staff',
  'postdoc',
  'graduate_student',
  'undergrad',
  'masters_student',
  'phd_student',
  'high_school',
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
const xrefFields = (r) => ({ curie_prefix: r.curie_prefix || '', curie: r.curie || '', is_obsolete: !!r.is_obsolete });
const alleleFields = (r) => ({ mod_abbreviation: r.mod_abbreviation || '', allele_designation: r.allele_designation || '', is_obsolete: !!r.is_obsolete });
const memberFields = (r) => ({
  personCurie: r.personCurie || '',
  is_pi: !!r.is_pi, former_pi: !!r.former_pi, alum: !!r.alum,
  is_lab_contact: !!r.is_lab_contact, can_edit_lab: !!r.can_edit_lab,
  lab_position: r.lab_position || '',
});
const xrefSnap = (r) => JSON.stringify(xrefFields(r));
const alleleSnap = (r) => JSON.stringify(alleleFields(r));
const memberSnap = (r) => JSON.stringify(memberFields(r));

// Allowed cross-reference prefixes. The API stores a single curie "PREFIX:ID";
// the editor edits prefix + id separately (like the Person editor).
const LAB_XREF_PREFIXES = ['ZFIN', 'XenBase', 'WB', 'SGD'];
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
  const style = show ? { ...(props.style || {}), ...hlStyle(error) } : props.style;
  return <BaseCheck {...props} style={style} />;
};

const FieldLine = ({ label, children, ts, trail, status, error, onDismissError }) => {
  // Track focus within this row so the "unsaved" highlight only shows once the
  // curator clicks away (not while they're still typing).
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
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div
            style={{ flex: 1, minWidth: 240 }}
            onFocus={() => setFocused(true)}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}
          >
            <FieldHlContext.Provider value={hlCtx}>{children}</FieldHlContext.Provider>
          </div>
          {showMeta && (
            <div style={{ width: META_COL_WIDTH, flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ ...tsStyle, whiteSpace: 'nowrap', paddingTop: 8, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {metaContent}
              </div>
              <div style={{ width: TRASH_SLOT_WIDTH, paddingTop: 4, display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                {trail}
              </div>
            </div>
          )}
        </div>
      </div>
      {error && (
        <div
          style={{
            marginLeft: labelColStyle.width + 12, marginTop: 4, display: 'flex', alignItems: 'flex-start', gap: 8,
            background: '#fdecea', border: '1px solid #f5c6cb', borderRadius: 4, padding: '4px 8px', color: '#a00', fontSize: '0.8em',
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

const inlineRow = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };

const LaboratoryEditor = ({ laboratory }) => {
  const lab = laboratory ?? {};
  const curie = lab.curie;

  const cognitoMod = useSelector((s) => s.isLogged.cognitoMod);
  const testerMod = useSelector((s) => s.isLogged.testerMod);
  const effectiveMod = testerMod !== 'No' ? testerMod : cognitoMod;

  // ---- layout / visibility / metadata-toggle state (restored from saved prefs) ----
  const [activeLayout, setActiveLayout] = useState(null);
  const [hiddenSections, setHiddenSections] = useState(() => defaultHiddenSections(effectiveMod));
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showCurator, setShowCurator] = useState(true);
  // Once the user (or a loaded setting) decides visibility, stop the MOD default.
  const visibilityDecidedRef = useRef(false);
  useEffect(() => {
    if (visibilityDecidedRef.current) return;
    setHiddenSections(defaultHiddenSections(effectiveMod));
  }, [effectiveMod]);

  const applyPrefs = (prefs) => {
    if (!prefs) return;
    if (Array.isArray(prefs.layout)) setActiveLayout(prefs.layout);
    if (Array.isArray(prefs.hidden)) {
      setHiddenSections(new Set(prefs.hidden));
      visibilityDecidedRef.current = true;
    }
    if (typeof prefs.showTimestamps === 'boolean') setShowTimestamps(prefs.showTimestamps);
    if (typeof prefs.showCurator === 'boolean') setShowCurator(prefs.showCurator);
  };

  const toggleSection = (id) => {
    visibilityDecidedRef.current = true;
    setHiddenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Compose the per-field metadata string, honoring the two toggles independently.
  const metaLabel = (by, date) => {
    const parts = [];
    if (showCurator && by) parts.push(by);
    if (showTimestamps && date) parts.push(formatTimestamp(date));
    return parts.length ? parts.join(' · ') : null;
  };

  // ---- laboratory scalar/toggle save-on-blur ----
  // Each scalar saves on blur (text) or change (select/checkbox) via PATCH
  // /laboratory, only when changed. `savedScalars` is the last-persisted baseline.
  const makeScalars = () => ({
    name: lab.name ?? '',
    strain_designation: lab.strain_designation ?? '',
    status: lab.status || 'active',
    lab_is_open: !!lab.lab_is_open,
    email_visibility: lab.email_visibility || 'not_shown',
    street_address: lab.street_address ?? '',
    city: lab.city ?? '',
    state: lab.state ?? '',
    postal_code: lab.postal_code ?? '',
    country: lab.country ?? '',
    research_area: lab.research_area ?? '',
    short_research_description: lab.short_research_description ?? '',
    additional_information: lab.additional_information ?? '',
    private_note: lab.private_note ?? '',
  });
  const [live, setLive] = useState(makeScalars);
  const [savedScalars, setSavedScalars] = useState(makeScalars);
  const [fieldStatus, setFieldStatus] = useState({});
  const [fieldError, setFieldError] = useState({});
  const [recordMeta, setRecordMeta] = useState({ updated_by: lab.updated_by, date_updated: lab.date_updated });

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
    // name / strain_designation: send NULL (not '') for empty/whitespace-only
    // input, so the DB's ck_laboratory_name_or_strain (IS NOT NULL) rejects
    // clearing both — the resulting 422 surfaces inline as this field's error.
    const payloadValue =
      (field === 'name' || field === 'strain_designation') &&
      typeof value === 'string' && value.trim() === ''
        ? null
        : value;
    setFieldStatus((s) => ({ ...s, [field]: 'saving' }));
    setFieldError((e) => dropKey(e, field));
    api.patch('/laboratory/' + curie, { [field]: payloadValue })
      .then((res) => {
        setSavedScalars((sv) => ({ ...sv, [field]: value }));
        const d = res?.data || {};
        setRecordMeta({ updated_by: d.updated_by, date_updated: d.date_updated });
        setFieldStatus((s) => dropKey(s, field));
      })
      .catch((err) => {
        setFieldStatus((s) => dropKey(s, field));
        setFieldError((e) => ({ ...e, [field]: errDetail(err) }));
      });
  };

  // ---- laboratory string-array save (institution / webpage / email) ----
  // Saved as one array via PATCH /laboratory, but each ROW tracks its own last-saved
  // value (_savedValue) so only the row you changed shows "unsaved".
  const [savedArrays, setSavedArrays] = useState({
    institution: (lab.institution ?? []).filter(Boolean),
    webpage: (lab.webpage ?? []).filter(Boolean),
    email: (lab.email ?? []).filter(Boolean),
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
    api.patch('/laboratory/' + curie, { [field]: cleaned })
      .then((res) => {
        setSavedArrays((sv) => ({ ...sv, [field]: cleaned }));
        const d = res?.data || {};
        setRecordMeta({ updated_by: d.updated_by, date_updated: d.date_updated });
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

  const currentStatus = live.status;
  const statusOptions = STATUS_OPTIONS.includes(currentStatus) ? STATUS_OPTIONS : [...STATUS_OPTIONS, currentStatus];
  const currentVis = live.email_visibility;
  const visOptions = EMAIL_VISIBILITY_OPTIONS.includes(currentVis) ? EMAIL_VISIBILITY_OPTIONS : [...EMAIL_VISIBILITY_OPTIONS, currentVis];

  // ---- string-array collections ----
  const emptyInst = () => ({ value: '', _savedValue: '', _status: null, _error: null });
  const instIsEmpty = (it) => !it.value;
  const initialInsts = (lab.institution ?? []).map((it) => ({ value: it ?? '', _savedValue: it ?? '', _status: null, _error: null }));
  const [insts, updateInst, removeInst, setInsts] = useAutoGrowList(initialInsts, emptyInst, instIsEmpty);

  const emptyUrl = () => ({ url: '', _savedValue: '', _status: null, _error: null });
  const urlIsEmpty = (u) => !u.url;
  const initialUrls = (lab.webpage ?? []).map((u) => ({ url: u ?? '', _savedValue: u ?? '', _status: null, _error: null }));
  const [urls, updateUrl, removeUrl, setUrls] = useAutoGrowList(initialUrls, emptyUrl, urlIsEmpty);

  const emptyMail = () => ({ email: '', _savedValue: '', _status: null, _error: null });
  const mailIsEmpty = (m) => !m.email;
  const initialMails = (lab.email ?? []).map((m) => ({ email: m ?? '', _savedValue: m ?? '', _status: null, _error: null }));
  const [mails, updateMail, removeMail, setMails] = useAutoGrowList(initialMails, emptyMail, mailIsEmpty);

  // ---- child collections (per-row endpoints) ----
  const childStatus = (row, snap) =>
    row._status === 'saving' ? 'saving'
      : row._error ? 'error'
      : (snap(row) !== row._savedKey ? 'dirty' : 'saved');

  // Create (POST, when complete) or update (PATCH) one child row; tracks status on
  // the row itself.
  const persistChild = ({ list, update, i, idKey, endpoint, createPath, completeFn, bodyFn, snap, savedOf, after, override, applyResp }) => {
    const row = { ...list[i], ...(override || {}) };
    // Guard against a second save firing while one is in flight — otherwise a
    // brand-new row (no _id yet) could POST twice in one interaction and create
    // duplicate rows.
    if (row._status === 'saving') return;
    if (!completeFn(row)) return; // not enough to save yet
    const key = snap(row);
    if (row._id && key === row._savedKey) return; // saved & unchanged
    update(i, { _status: 'saving', _error: null });
    const isCreate = !row._id;
    const body = bodyFn(row, isCreate);
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

  // Cross references — prefix + id edited separately, recombined to PREFIX:ID on save.
  const emptyXref = () => {
    const r = { curie_prefix: '', curie: '', is_obsolete: false, _ts: null, _by: null, _id: null, _status: null, _error: null };
    return { ...r, _saved: xrefFields(r), _savedKey: xrefSnap(r) };
  };
  const xrefIsEmpty = (x) => !x.curie_prefix && !x.curie;
  const initialXrefs = (lab.cross_references ?? []).map((x) => {
    const r = {
      curie_prefix: x.curie_prefix ?? '',
      // store just the id part for editing; recombined to PREFIX:ID on save
      curie: xrefIdPart(x.curie, x.curie_prefix),
      is_obsolete: !!x.is_obsolete,
      _ts: x.date_updated ?? null, _by: x.updated_by ?? null,
      _id: x.laboratory_cross_reference_id ?? null, _status: null, _error: null,
    };
    return { ...r, _saved: xrefFields(r), _savedKey: xrefSnap(r) };
  });
  const [xrefs, updateXref, removeXref] = useAutoGrowList(initialXrefs, emptyXref, xrefIsEmpty);
  const saveXref = (i, override) => persistChild({
    list: xrefs, update: updateXref, i, override,
    idKey: 'laboratory_cross_reference_id', endpoint: '/laboratory_cross_reference', createPath: '/laboratory_cross_reference/',
    completeFn: (r) => !!((r.curie_prefix || '').trim() && (r.curie || '').trim()),
    bodyFn: (r, isCreate) => {
      const body = { curie: `${r.curie_prefix}:${(r.curie || '').trim()}`, is_obsolete: !!r.is_obsolete };
      return isCreate ? { ...body, laboratory_curie: curie } : body;
    },
    snap: xrefSnap, savedOf: xrefFields,
  });
  const deleteXref = (i) => deleteChild({ list: xrefs, update: updateXref, remove: removeXref, i, endpoint: '/laboratory_cross_reference' });

  // Allele designations
  const emptyAllele = () => {
    const r = { mod_abbreviation: '', allele_designation: '', is_obsolete: false, _ts: null, _by: null, _id: null, _status: null, _error: null };
    return { ...r, _saved: alleleFields(r), _savedKey: alleleSnap(r) };
  };
  const alleleIsEmpty = (a) => !a.mod_abbreviation && !a.allele_designation;
  const initialAlleles = (lab.allele_designations ?? []).map((a) => {
    const r = {
      mod_abbreviation: a.mod_abbreviation ?? '',
      allele_designation: a.allele_designation ?? '',
      is_obsolete: !!a.is_obsolete,
      _ts: a.date_updated ?? null, _by: a.updated_by ?? null,
      _id: a.laboratory_allele_designation_id ?? null, _status: null, _error: null,
    };
    return { ...r, _saved: alleleFields(r), _savedKey: alleleSnap(r) };
  });
  const [alleles, updateAllele, removeAllele] = useAutoGrowList(initialAlleles, emptyAllele, alleleIsEmpty);
  const saveAllele = (i, override) => persistChild({
    list: alleles, update: updateAllele, i, override,
    idKey: 'laboratory_allele_designation_id', endpoint: '/laboratory_allele_designation', createPath: '/laboratory_allele_designation/',
    completeFn: (r) => !!((r.mod_abbreviation || '').trim() && (r.allele_designation || '').trim()),
    bodyFn: (r, isCreate) => {
      const body = { mod_abbreviation: r.mod_abbreviation, allele_designation: (r.allele_designation || '').trim(), is_obsolete: !!r.is_obsolete };
      return isCreate ? { ...body, laboratory_curie: curie } : body;
    },
    snap: alleleSnap, savedOf: alleleFields,
  });
  const deleteAllele = (i) => deleteChild({ list: alleles, update: updateAllele, remove: removeAllele, i, endpoint: '/laboratory_allele_designation' });

  // Lab members (laboratory_person). is_pi / former_pi / alum are DateTime fields
  // shown as checkboxes: checked => set (keep existing date, else now), unchecked =>
  // clear. The person link can't change on PATCH, so it's locked once created.
  const emptyMember = () => {
    const r = {
      personCurie: '', personName: '',
      is_pi: false, former_pi: false, alum: false,
      is_lab_contact: false, can_edit_lab: false, lab_position: '',
      _is_pi_ts: null, _former_pi_ts: null, _alum_ts: null,
      _ts: null, _by: null, _id: null, _status: null, _error: null,
    };
    return { ...r, _saved: memberFields(r), _savedKey: memberSnap(r) };
  };
  const memberIsEmpty = (m) => !m.personCurie;
  const initialMembers = (lab.lab_persons ?? []).map((lp) => {
    const r = {
      personCurie: lp.person_curie || '',
      personName: lp.person_display_name || '',
      is_pi: !!lp.is_pi, former_pi: !!lp.former_pi, alum: !!lp.alum,
      is_lab_contact: !!lp.is_lab_contact, can_edit_lab: !!lp.can_edit_lab,
      lab_position: lp.lab_position || '',
      _is_pi_ts: lp.is_pi ?? null, _former_pi_ts: lp.former_pi ?? null, _alum_ts: lp.alum ?? null,
      _ts: lp.date_updated ?? null, _by: lp.updated_by ?? null,
      _id: lp.laboratory_person_id ?? null, _status: null, _error: null,
    };
    return { ...r, _saved: memberFields(r), _savedKey: memberSnap(r) };
  });
  const [members, updateMember, removeMember] = useAutoGrowList(initialMembers, emptyMember, memberIsEmpty);
  const saveMember = (i, override) => persistChild({
    list: members, update: updateMember, i, override,
    idKey: 'laboratory_person_id', endpoint: '/laboratory_person', createPath: '/laboratory_person/',
    completeFn: (r) => !!r.personCurie,
    bodyFn: (r, isCreate) => {
      const now = new Date().toISOString();
      const flags = {
        is_pi: r.is_pi ? (r._is_pi_ts || now) : null,
        former_pi: r.former_pi ? (r._former_pi_ts || now) : null,
        alum: r.alum ? (r._alum_ts || now) : null,
        is_lab_contact: !!r.is_lab_contact,
        can_edit_lab: !!r.can_edit_lab,
        lab_position: r.lab_position || null,
      };
      return isCreate ? { ...flags, laboratory_curie: curie, person_curie: r.personCurie } : flags;
    },
    snap: memberSnap, savedOf: memberFields,
    applyResp: (d) => ({
      is_pi: !!d.is_pi, former_pi: !!d.former_pi, alum: !!d.alum,
      is_lab_contact: !!d.is_lab_contact, can_edit_lab: !!d.can_edit_lab,
      lab_position: d.lab_position || '',
      _is_pi_ts: d.is_pi ?? null, _former_pi_ts: d.former_pi ?? null, _alum_ts: d.alum ?? null,
    }),
  });
  const deleteMember = (i) => deleteChild({ list: members, update: updateMember, remove: removeMember, i, endpoint: '/laboratory_person' });

  const recordTs = metaLabel(recordMeta.updated_by, recordMeta.date_updated);
  const rowLabel = (list, i, one) => (i === list.length - 1 ? `new ${one}` : `${one} ${i + 1}`);
  const modOptions = (enumDict.mods || []).filter(Boolean);

  const scalarField = (field, label, props = {}) => (
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

  const sectionRows = {};

  sectionRows.profile = (
        <Card className="mb-3">
          <Card.Header>Profile</Card.Header>
          <Card.Body>
            {scalarField('name', 'name', { placeholder: 'lab name', style: { maxWidth: 480 } })}
            {scalarField('strain_designation', 'strain_designation', { placeholder: 'strain designation', style: { maxWidth: 480 } })}
            <FieldLine
              label="status"
              ts={recordTs}
              status={fieldStatusOf('status')}
              error={fieldError.status}
              onDismissError={() => dismissFieldError('status')}
            >
              <HlControl
                as="select"
                value={currentStatus}
                savedValue={savedScalars.status}
                onChange={(ev) => { setLiveField('status', ev.target.value); saveScalar('status', ev.target.value); }}
                style={{ maxWidth: 240 }}
              >
                {statusOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
              </HlControl>
            </FieldLine>
            <FieldLine
              label="lab_is_open"
              ts={recordTs}
              status={fieldStatusOf('lab_is_open')}
              error={fieldError.lab_is_open}
              onDismissError={() => dismissFieldError('lab_is_open')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  id="lab-is-open"
                  checked={live.lab_is_open}
                  onChange={(ev) => { setLiveField('lab_is_open', ev.target.checked); saveScalar('lab_is_open', ev.target.checked); }}
                />
                <label htmlFor="lab-is-open" style={{ marginBottom: 0 }}>lab is open</label>
              </div>
            </FieldLine>
            <FieldLine
              label="email_visibility"
              ts={recordTs}
              status={fieldStatusOf('email_visibility')}
              error={fieldError.email_visibility}
              onDismissError={() => dismissFieldError('email_visibility')}
            >
              <HlControl
                as="select"
                value={currentVis}
                savedValue={savedScalars.email_visibility}
                onChange={(ev) => { setLiveField('email_visibility', ev.target.value); saveScalar('email_visibility', ev.target.value); }}
                style={{ maxWidth: 240 }}
              >
                {visOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
              </HlControl>
            </FieldLine>
          </Card.Body>
        </Card>
  );

  sectionRows.address = (
        <Card className="mb-3">
          <Card.Header>Address</Card.Header>
          <Card.Body>
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
            {scalarField('city', 'city', { style: { maxWidth: 360 } })}
            {scalarField('state', 'state', { style: { maxWidth: 240 } })}
            {scalarField('postal_code', 'postal_code', { style: { maxWidth: 200 } })}
            {scalarField('country', 'country', { style: { maxWidth: 320 } })}
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
                label={rowLabel(insts, i, 'institution')}
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
                label={rowLabel(urls, i, 'webpage')}
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

  sectionRows.emails = (
        <Card className="mb-3">
          <Card.Header>Emails</Card.Header>
          <Card.Body>
            {mails.map((m, i) => (
              <FieldLine
                key={i}
                label={rowLabel(mails, i, 'email')}
                ts={recordTs}
                status={stringRowStatus(m, 'email')}
                error={m._error}
                onDismissError={() => updateMail(i, { _error: null })}
                trail={<RemoveBtn onClick={() => removeStringArrayRow({ list: mails, setList: setMails, remove: removeMail, field: 'email', valueKey: 'email', i })} />}
              >
                <HlControl
                  type="email"
                  value={m.email}
                  savedValue={m._savedValue}
                  onChange={(ev) => updateMail(i, { email: ev.target.value })}
                  onBlur={() => saveStringArray({ list: mails, setList: setMails, field: 'email', valueKey: 'email', i })}
                />
              </FieldLine>
            ))}
          </Card.Body>
        </Card>
  );

  sectionRows.research = (
        <Card className="mb-3">
          <Card.Header>Research</Card.Header>
          <Card.Body>
            {scalarField('research_area', 'research_area', { style: { maxWidth: 480 } })}
            <FieldLine
              label="short_research_description"
              ts={recordTs}
              status={fieldStatusOf('short_research_description')}
              error={fieldError.short_research_description}
              onDismissError={() => dismissFieldError('short_research_description')}
            >
              <HlControl
                as="textarea"
                rows={3}
                value={live.short_research_description}
                savedValue={savedScalars.short_research_description}
                onChange={(ev) => setLiveField('short_research_description', ev.target.value)}
                onBlur={() => saveScalar('short_research_description')}
              />
            </FieldLine>
            <FieldLine
              label="additional_information"
              ts={recordTs}
              status={fieldStatusOf('additional_information')}
              error={fieldError.additional_information}
              onDismissError={() => dismissFieldError('additional_information')}
            >
              <HlControl
                as="textarea"
                rows={3}
                value={live.additional_information}
                savedValue={savedScalars.additional_information}
                onChange={(ev) => setLiveField('additional_information', ev.target.value)}
                onBlur={() => saveScalar('additional_information')}
              />
            </FieldLine>
            <FieldLine
              label="private_note"
              ts={recordTs}
              status={fieldStatusOf('private_note')}
              error={fieldError.private_note}
              onDismissError={() => dismissFieldError('private_note')}
            >
              <HlControl
                as="textarea"
                rows={3}
                value={live.private_note}
                savedValue={savedScalars.private_note}
                onChange={(ev) => setLiveField('private_note', ev.target.value)}
                onBlur={() => saveScalar('private_note')}
              />
            </FieldLine>
          </Card.Body>
        </Card>
  );

  sectionRows.cross_references = (
        <Card className="mb-3">
          <Card.Header>Cross references</Card.Header>
          <Card.Body>
            {xrefs.map((x, i) => {
              const prefixOptions = LAB_XREF_PREFIXES.includes(x.curie_prefix) || !x.curie_prefix
                ? LAB_XREF_PREFIXES
                : [...LAB_XREF_PREFIXES, x.curie_prefix];
              return (
              <FieldLine
                key={i}
                label={i === xrefs.length - 1 && xrefIsEmpty(x) ? 'xref (new)' : (x.curie_prefix || 'xref')}
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
                    id={`lab-xref-obsolete-${i}`}
                    label="is_obsolete"
                    checked={x.is_obsolete}
                    savedValue={x._saved?.is_obsolete}
                    onChange={(ev) => { updateXref(i, { is_obsolete: ev.target.checked }); saveXref(i, { is_obsolete: ev.target.checked }); }}
                    style={{ whiteSpace: 'nowrap' }}
                  />
                </div>
              </FieldLine>
              );
            })}
          </Card.Body>
        </Card>
  );

  sectionRows.allele_designations = (
        <Card className="mb-3">
          <Card.Header>Allele designations</Card.Header>
          <Card.Body>
            {alleles.map((a, i) => (
              <FieldLine
                key={i}
                label={i === alleles.length - 1 && alleleIsEmpty(a) ? 'designation (new)' : (a.mod_abbreviation || 'designation')}
                ts={metaLabel(a._by, a._ts)}
                status={childStatus(a, alleleSnap)}
                error={a._error}
                onDismissError={() => updateAllele(i, { _error: null })}
                trail={<RemoveBtn onClick={() => deleteAllele(i)} />}
              >
                <div style={inlineRow}>
                  <HlControl
                    as="select"
                    value={a.mod_abbreviation}
                    savedValue={a._saved?.mod_abbreviation}
                    onChange={(ev) => updateAllele(i, { mod_abbreviation: ev.target.value })}
                    onBlur={() => saveAllele(i)}
                    style={{ maxWidth: 160 }}
                  >
                    <option value="">MOD (required)</option>
                    {modOptions.map((m) => (<option key={m} value={m}>{m}</option>))}
                  </HlControl>
                  <HlControl
                    placeholder="allele_designation (required)"
                    value={a.allele_designation}
                    savedValue={a._saved?.allele_designation}
                    onChange={(ev) => updateAllele(i, { allele_designation: ev.target.value })}
                    onBlur={() => saveAllele(i)}
                    style={{ flex: '1 1 240px', minWidth: 200 }}
                  />
                  <HlCheck
                    type="checkbox"
                    id={`lab-allele-obsolete-${i}`}
                    label="is_obsolete"
                    checked={a.is_obsolete}
                    savedValue={a._saved?.is_obsolete}
                    onChange={(ev) => { updateAllele(i, { is_obsolete: ev.target.checked }); saveAllele(i, { is_obsolete: ev.target.checked }); }}
                    style={{ whiteSpace: 'nowrap' }}
                  />
                </div>
              </FieldLine>
            ))}
          </Card.Body>
        </Card>
  );

  sectionRows.lab_members = (
        <Card className="mb-3">
          <Card.Header>Lab members</Card.Header>
          <Card.Body>
            {members.map((m, i) => {
              const positionOptions = LAB_POSITION_OPTIONS.includes(m.lab_position) || !m.lab_position
                ? LAB_POSITION_OPTIONS
                : [...LAB_POSITION_OPTIONS, m.lab_position];
              const dateFlags = [
                { key: 'is_pi', tsKey: '_is_pi_ts' },
                { key: 'former_pi', tsKey: '_former_pi_ts' },
                { key: 'alum', tsKey: '_alum_ts' },
              ];
              return (
                <FieldLine
                  key={i}
                  label={rowLabel(members, i, 'member')}
                  ts={metaLabel(m._by, m._ts)}
                  status={childStatus(m, memberSnap)}
                  error={m._error}
                  onDismissError={() => updateMember(i, { _error: null })}
                  trail={<RemoveBtn onClick={() => deleteMember(i)} />}
                >
                  <div style={inlineRow}>
                    {m._id ? (
                      <span
                        style={{
                          display: 'inline-flex', alignItems: 'center', padding: '6px 10px',
                          background: '#eef2f7', border: '1px solid #d4dce6', borderRadius: 4,
                          width: 300, flexShrink: 0, boxSizing: 'border-box',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                        title={`${m.personName} ${m.personCurie}`}
                      >
                        {m.personName && m.personName !== m.personCurie ? `${m.personName} — ${m.personCurie}` : m.personCurie}
                      </span>
                    ) : (
                      <div style={{ width: 300, flexShrink: 0 }}>
                        <PersonCuriePicker
                          id={`lab-member-${i}`}
                          disabled={m._status === 'saving'}
                          onChange={(o) => {
                            const patch = { personCurie: o?.curie || '', personName: o?.name || '' };
                            updateMember(i, patch);
                            if (o?.curie) saveMember(i, patch);
                          }}
                        />
                      </div>
                    )}
                    <HlControl
                      as="select"
                      value={m.lab_position}
                      savedValue={m._saved?.lab_position}
                      disabled={!m.personCurie}
                      onChange={(ev) => { updateMember(i, { lab_position: ev.target.value }); saveMember(i, { lab_position: ev.target.value }); }}
                      style={{ maxWidth: 200 }}
                    >
                      <option value="">position</option>
                      {positionOptions.map((p) => (<option key={p} value={p}>{p}</option>))}
                    </HlControl>
                    {dateFlags.map(({ key, tsKey }) => {
                      const stamp = showTimestamps && m[key] && m[tsKey] ? formatTimestamp(m[tsKey]) : null;
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, whiteSpace: 'nowrap' }}>
                          <HlCheck
                            type="checkbox"
                            id={`lab-member-${i}-${key}`}
                            label={key}
                            checked={m[key]}
                            savedValue={m._saved?.[key]}
                            disabled={!m.personCurie}
                            onChange={(ev) => { updateMember(i, { [key]: ev.target.checked }); saveMember(i, { [key]: ev.target.checked }); }}
                            style={{ whiteSpace: 'nowrap' }}
                          />
                          {stamp && <span style={tsStyle}>{stamp}</span>}
                        </div>
                      );
                    })}
                    {['is_lab_contact', 'can_edit_lab'].map((key) => (
                      <HlCheck
                        key={key}
                        type="checkbox"
                        id={`lab-member-${i}-${key}`}
                        label={key}
                        checked={m[key]}
                        savedValue={m._saved?.[key]}
                        disabled={!m.personCurie}
                        onChange={(ev) => { updateMember(i, { [key]: ev.target.checked }); saveMember(i, { [key]: ev.target.checked }); }}
                        style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                      />
                    ))}
                  </div>
                </FieldLine>
              );
            })}
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
      className={`laboratory-editor-grid${wideLayout ? ' laboratory-editor-grid--wide' : ''}`}
      style={{ '--laboratory-col-floor': `${grid.colFloor}px` }}
    >
      {orderedIds.map((id) => (
        <div key={id} className="laboratory-editor-section" style={grid.styles[id] || { gridColumn: '1 / -1' }}>
          {sectionRows[id]}
        </div>
      ))}
    </div>
  ) : (
    orderedIds.map((id) => <React.Fragment key={id}>{sectionRows[id]}</React.Fragment>)
  );

  return (
    <Container fluid>
      <div className="text-muted mb-2" style={{ fontSize: '0.85em' }}>
        Changes save automatically — fields save when you click away (or change a checkbox/select);
        list rows save once their required fields are filled.
      </div>
      <div className="d-flex justify-content-end mb-3">
        <LaboratoryEditorLayoutModal
          onApplyPrefs={applyPrefs}
          current={{ layout: activeLayout, hidden: Array.from(hiddenSections), showTimestamps, showCurator }}
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

export default LaboratoryEditor;
