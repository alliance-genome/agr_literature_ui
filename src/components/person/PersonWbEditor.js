import React, { useState } from 'react';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';

const MockupTitle = 'Mockup only — not wired to the API';
const STATUS_OPTIONS = ['active', 'retired', 'deceased'];
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

const tsLabel = (by, date) => {
  if (!by && !date) return null;
  return `${by ?? '?'} · ${formatTimestamp(date)}`;
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

const PersonWbEditor = ({ person }) => {
  const p = person ?? {};

  const currentStatus = p.active_status || 'active';
  const statusOptions = STATUS_OPTIONS.includes(currentStatus)
    ? STATUS_OPTIONS
    : [...STATUS_OPTIONS, currentStatus];

  // Names
  const emptyName = () => ({
    first_name: '',
    middle_name: '',
    last_name: '',
    primary: false,
    _ts: null,
    _by: null,
  });
  const nameIsEmpty = (n) => !n.first_name && !n.middle_name && !n.last_name;
  const initialNames = (p.names ?? []).map((n) => ({
    first_name: n.first_name ?? '',
    middle_name: n.middle_name ?? '',
    last_name: n.last_name ?? '',
    primary: !!n.primary,
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
    primary: false,
    invalidated: false,
    _origInvalidatedDate: null,
    _ts: null,
    _by: null,
  });
  const emailIsEmpty = (e) => !e.email_address;
  const initialEmails = (p.emails ?? []).map((e) => ({
    email_address: e.email_address ?? '',
    primary: !!e.primary,
    invalidated: !!e.date_invalidated,
    _origInvalidatedDate: e.date_invalidated ?? null,
    _ts: e.date_updated ?? null,
    _by: e.updated_by ?? null,
  }));
  const [emails, updateEmail, removeEmail, setEmails] = useAutoGrowList(
    initialEmails,
    emptyEmail,
    emailIsEmpty,
  );

  // Webpages — strings, no per-row timestamp, no who/when shown
  const emptyUrl = () => ({ url: '' });
  const urlIsEmpty = (u) => !u.url;
  const initialUrls = (p.webpage ?? []).map((u) => ({ url: u ?? '' }));
  const [urls, updateUrl, removeUrl] = useAutoGrowList(initialUrls, emptyUrl, urlIsEmpty);

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

  const setNamePrimary = (idx) =>
    setNames((prev) => prev.map((row, i) => ({ ...row, primary: i === idx })));
  const setEmailPrimary = (idx) =>
    setEmails((prev) => prev.map((row, i) => ({ ...row, primary: i === idx })));

  const labelForName = (n, i) => {
    if (i === names.length - 1 && nameIsEmpty(n)) return 'name (new)';
    return n.primary ? 'name (primary)' : 'name';
  };
  const labelForEmail = (e, i) => {
    if (i === emails.length - 1 && emailIsEmpty(e)) return 'email (new)';
    if (e.invalidated) return 'old_email';
    return e.primary ? 'email (primary)' : 'email';
  };
  const labelForUrl = (u, i) =>
    i === urls.length - 1 && urlIsEmpty(u) ? 'webpage (new)' : 'webpage';
  const labelForXref = (x, i) =>
    i === xrefs.length - 1 && xrefIsEmpty(x) ? 'xref (new)' : x.curie_prefix || 'xref';
  const labelForNote = (n, i) =>
    i === notes.length - 1 && noteIsEmpty(n) ? 'comment (new)' : 'comment';

  const recordTs = tsLabel(p.updated_by, p.date_updated);

  if (!person) return null;

  return (
    <Form>
      <Alert variant="warning">
        <strong>Mockup view</strong> — editing is not yet wired to the API. Changes here will not be saved.
      </Alert>

      <Card className="mb-3">
        <Card.Header>Personal Identification</Card.Header>
        <Card.Body>
          <FieldLine label="standardname" ts={recordTs}>
            <Form.Control type="text" defaultValue={p.display_name ?? ''} style={{ maxWidth: 480 }} />
          </FieldLine>
          <FieldLine label="status" ts={recordTs}>
            <Form.Control as="select" defaultValue={currentStatus} style={{ maxWidth: 240 }}>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Form.Control>
          </FieldLine>
        </Card.Body>
      </Card>

      <Card className="mb-3">
        <Card.Header>Names</Card.Header>
        <Card.Body>
          {names.map((n, i) => {
            const isNew = i === names.length - 1 && nameIsEmpty(n);
            const ts = isNew ? 'new' : tsLabel(n._by, n._ts);
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
                  id={`wb-name-primary-${i}`}
                  name="wb-name-primary"
                  label="primary"
                  checked={n.primary}
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

      <Card className="mb-3">
        <Card.Header>Email</Card.Header>
        <Card.Body>
          {emails.map((e, i) => {
            const isNew = i === emails.length - 1 && emailIsEmpty(e);
            const editTs = tsLabel(e._by, e._ts);
            const invalidatedNote = e._origInvalidatedDate
              ? `invalidated ${formatTimestamp(e._origInvalidatedDate)}`
              : null;
            const computed = [invalidatedNote, editTs].filter(Boolean).join(' · ') || null;
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
                    type="radio"
                    id={`wb-email-primary-${i}`}
                    name="wb-email-primary"
                    label="primary"
                    checked={e.primary}
                    onChange={(ev) => {
                      if (ev.target.checked) setEmailPrimary(i);
                    }}
                    style={{ whiteSpace: 'nowrap' }}
                  />
                  <Form.Check
                    type="checkbox"
                    id={`wb-email-invalidated-${i}`}
                    label="invalidated (old_email)"
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

      <Card className="mb-3">
        <Card.Header>Cross references</Card.Header>
        <Card.Body>
          {xrefs.map((x, i) => {
            const isNew = i === xrefs.length - 1 && xrefIsEmpty(x);
            const ts = isNew ? 'new' : tsLabel(x._by, x._ts);
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
                    id={`wb-xref-obsolete-${i}`}
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

      <Card className="mb-3">
        <Card.Header>Comments</Card.Header>
        <Card.Body>
          {notes.map((n, i) => {
            const isNew = i === notes.length - 1 && noteIsEmpty(n);
            const ts = isNew ? 'new' : tsLabel(n._by, n._ts);
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

      <div style={{ marginTop: 12, marginBottom: 24 }}>
        <Button variant="primary" disabled title={MockupTitle}>Save (mockup)</Button>
        <span style={{ color: '#888', marginLeft: 12 }}>{MockupTitle}</span>
      </div>
    </Form>
  );
};

export default PersonWbEditor;
