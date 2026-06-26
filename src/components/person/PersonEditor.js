import React, { useState } from 'react';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Container from 'react-bootstrap/Container';

import PersonEditorLayoutModal from '../settings/PersonEditorLayoutModal';
import { SECTION_DEFS, layoutToCssGrid } from './personEditorSections';
import './personEditorSections.css';

const MockupTitle = 'Mockup only — not wired to the API';
const STATUS_OPTIONS = ['active', 'retired', 'deceased'];
const PRIVACY_OPTIONS = ['show_all', 'logged_in_only', 'fully_hidden', 'hide_email'];
const XREF_PREFIXES = ['ORCID', 'WB', 'ZFIN', 'XenBase'];

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

const PersonEditor = ({ person }) => {
  const p = person ?? {};

  // ---- layout / visibility / metadata-toggle state (restored from saved prefs) ----
  const [activeLayout, setActiveLayout] = useState(null);
  const [hiddenSections, setHiddenSections] = useState(() => new Set());
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showCurator, setShowCurator] = useState(true);

  const applyPrefs = (prefs) => {
    if (!prefs) return;
    if (Array.isArray(prefs.layout)) setActiveLayout(prefs.layout);
    if (Array.isArray(prefs.hidden)) setHiddenSections(new Set(prefs.hidden));
    if (typeof prefs.showTimestamps === 'boolean') setShowTimestamps(prefs.showTimestamps);
    if (typeof prefs.showCurator === 'boolean') setShowCurator(prefs.showCurator);
  };

  const toggleSection = (id) =>
    setHiddenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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

  sectionRows.personal_identification = (
    <Card className="mb-3">
      <Card.Header>Personal Identification</Card.Header>
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
