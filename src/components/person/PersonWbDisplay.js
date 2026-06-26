import React from 'react';
import { useSelector } from 'react-redux';
import Card from 'react-bootstrap/Card';
import Badge from 'react-bootstrap/Badge';

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

const muted = { color: '#888' };
const labelColStyle = {
  width: 200,
  fontWeight: 600,
  paddingTop: 2,
  textAlign: 'left',
  flexShrink: 0,
};
const tsStyle = { color: '#888', fontSize: '0.8em' };

const FieldRow = ({ label, children, ts }) => (
  <div style={{ marginBottom: 6 }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={labelColStyle}>{label}:</div>
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, textAlign: 'left', minWidth: 200 }}>
          {children ?? <span style={muted}>—</span>}
        </div>
        {ts && (
          <span style={{ ...tsStyle, whiteSpace: 'nowrap', paddingTop: 2 }}>{ts}</span>
        )}
      </div>
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <Card className="mb-3">
    <Card.Header style={{ fontWeight: 600 }}>{title}</Card.Header>
    <Card.Body style={{ textAlign: 'left' }}>{children}</Card.Body>
  </Card>
);

const fullName = (n) => [n.first_name, n.middle_name, n.last_name].filter(Boolean).join(' ');

const xrefHref = (x) => {
  if (Array.isArray(x.pages) && x.pages[0]) return x.pages[0];
  if (x.curie_prefix === 'ORCID') {
    const id = (x.curie || '').replace(/^ORCID:/i, '');
    return id ? `https://orcid.org/${id}` : null;
  }
  return null;
};

const labRoles = (lp) => {
  const roles = [];
  if (lp.lab_position) roles.push(lp.lab_position);
  if (lp.is_pi) roles.push(`PI since ${formatTimestamp(lp.is_pi)}`);
  if (lp.former_pi) roles.push(`former PI since ${formatTimestamp(lp.former_pi)}`);
  if (lp.alum) roles.push(`alum since ${formatTimestamp(lp.alum)}`);
  if (lp.is_lab_contact) roles.push('lab contact');
  if (lp.can_edit_lab) roles.push('can edit');
  return roles;
};

const PersonWbDisplay = ({ person }) => {
  const cognitoMod = useSelector((s) => s.isLogged.cognitoMod);
  const testerMod = useSelector((s) => s.isLogged.testerMod);
  const effectiveMod = testerMod !== 'No' ? testerMod : cognitoMod;
  const labHref = (curie) =>
    '/lab?q=' + encodeURIComponent(curie) + (effectiveMod === 'WB' ? '&tab=wbdisplay' : '');

  if (!person) return null;

  const status = person.active_status || 'unknown';
  const statusVariant = status === 'active' ? 'success' : 'secondary';

  const emails = person.emails ?? [];
  const activeEmails = emails.filter((e) => !e.date_made_old_email);
  const oldEmails = emails.filter((e) => !!e.date_made_old_email);
  const names = person.names ?? [];
  const xrefs = person.cross_references ?? [];
  const webpages = person.webpage ?? [];
  const institutions = person.institution ?? [];
  const notes = person.notes ?? [];
  const labPersons = person.lab_persons ?? [];

  const recordTs = tsLabel(person.updated_by, person.date_updated);

  const hasAddress =
    person.street_address || person.city || person.state || person.postal_code || person.country;
  const cityLine = [person.city, person.state].filter(Boolean).join(', ');
  const cityZip = [cityLine, person.postal_code].filter(Boolean).join(' ');

  return (
    <div style={{ textAlign: 'left' }}>
      <Card className="mb-3" style={{ borderLeft: '4px solid #6b4a8a' }}>
        <Card.Body>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h4 style={{ marginBottom: 4 }}>
                {person.display_name || <span style={muted}>(no standard name)</span>}
              </h4>
              <div style={{ ...muted, fontSize: '0.9em' }}>{person.curie}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Badge variant={statusVariant} style={{ fontSize: '0.95em' }}>{status}</Badge>
              {person.unsubscribe && (
                <Badge variant="warning" style={{ fontSize: '0.95em' }}>unsubscribed</Badge>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>

      <Section title="Personal Identification">
        <FieldRow label="display_name" ts={recordTs}>{person.display_name}</FieldRow>
        {names.length === 0 ? (
          <FieldRow label="name" />
        ) : (
          names.map((n, i) => (
            <FieldRow
              key={n.person_name_id ?? i}
              label={n.is_primary ? 'name (primary)' : 'name'}
              ts={tsLabel(n.updated_by, n.date_updated)}
            >
              {fullName(n) || <span style={muted}>(blank)</span>}
            </FieldRow>
          ))
        )}
        <FieldRow label="status" ts={recordTs}>{status}</FieldRow>
        <FieldRow label="privacy" ts={recordTs}>{person.privacy || 'hide_email'}</FieldRow>
      </Section>

      <Section title="Email">
        {activeEmails.length === 0 && oldEmails.length === 0 ? (
          <FieldRow label="email" />
        ) : (
          <>
            {activeEmails.map((e, i) => (
              <FieldRow
                key={e.email_address ?? i}
                label="email"
                ts={tsLabel(e.updated_by, e.date_updated)}
              >
                {e.email_address}
              </FieldRow>
            ))}
            {oldEmails.map((e, i) => {
              const oldNote = `old since ${formatTimestamp(e.date_made_old_email)}`;
              const editTs = tsLabel(e.updated_by, e.date_updated);
              const ts = editTs ? `${oldNote} · ${editTs}` : oldNote;
              return (
                <FieldRow
                  key={`old-${e.email_address ?? i}`}
                  label="old_email"
                  ts={ts}
                >
                  <span style={muted}>{e.email_address}</span>
                </FieldRow>
              );
            })}
          </>
        )}
      </Section>

      <Section title="Address">
        {!hasAddress ? (
          <FieldRow label="address" />
        ) : (
          <>
            <FieldRow label="address_last_updated">
              {person.address_last_updated ? formatTimestamp(person.address_last_updated) : null}
            </FieldRow>
            <FieldRow label="street">
              {person.street_address ? (
                <span style={{ whiteSpace: 'pre-wrap' }}>{person.street_address}</span>
              ) : null}
            </FieldRow>
            <FieldRow label="city">{person.city || null}</FieldRow>
            <FieldRow label="state">{person.state || null}</FieldRow>
            <FieldRow label="postal_code">{person.postal_code || null}</FieldRow>
            <FieldRow label="country">{person.country || null}</FieldRow>
          </>
        )}
      </Section>

      <Section title="Institutions">
        {institutions.length === 0 ? (
          <FieldRow label="institution" />
        ) : (
          institutions.map((inst, i) => (
            <FieldRow key={i} label="institution" ts={recordTs}>{inst}</FieldRow>
          ))
        )}
      </Section>

      <Section title="Webpages">
        {webpages.length === 0 ? (
          <FieldRow label="webpage" />
        ) : (
          webpages.map((url, i) => (
            <FieldRow key={i} label="webpage" ts={recordTs}>
              <a href={url} target="_blank" rel="noreferrer noopener">{url}</a>
            </FieldRow>
          ))
        )}
      </Section>

      <Section title="Cross references">
        {xrefs.length === 0 ? (
          <FieldRow label="xref" />
        ) : (
          xrefs.map((x, i) => {
            const href = xrefHref(x);
            const label = x.curie_prefix || 'xref';
            const value = x.curie || '';
            const isObsolete = x.is_obsolete === true;
            const valStyle = {
              textDecoration: isObsolete ? 'line-through' : 'none',
              color: isObsolete ? '#888' : 'inherit',
            };
            const editTs = tsLabel(x.updated_by, x.date_updated);
            const obsoleteNote = isObsolete ? 'obsolete' : null;
            const ts = [obsoleteNote, editTs].filter(Boolean).join(' · ') || null;
            return (
              <FieldRow key={x.person_cross_reference_id ?? i} label={label} ts={ts}>
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer noopener" style={valStyle}>
                    {value}
                  </a>
                ) : (
                  <span style={valStyle}>{value}</span>
                )}
              </FieldRow>
            );
          })
        )}
      </Section>

      <Section title="Laboratories">
        {labPersons.length === 0 ? (
          <FieldRow label="laboratory" />
        ) : (
          labPersons.map((lp, i) => {
            const label =
              [lp.laboratory_name, lp.laboratory_strain_designation].filter(Boolean).join(' · ') ||
              lp.laboratory_curie ||
              '(unknown lab)';
            const roles = labRoles(lp);
            return (
              <FieldRow
                key={lp.laboratory_person_id ?? i}
                label="laboratory"
                ts={tsLabel(lp.updated_by, lp.date_updated)}
              >
                {lp.laboratory_curie ? (
                  <a href={labHref(lp.laboratory_curie)}>{label}</a>
                ) : (
                  <span>{label}</span>
                )}
                {roles.length > 0 && (
                  <span style={{ marginLeft: 8 }}>
                    {roles.map((r, j) => (
                      <Badge key={j} variant="info" style={{ marginRight: 4 }}>{r}</Badge>
                    ))}
                  </span>
                )}
              </FieldRow>
            );
          })
        )}
      </Section>

      <Section title="Comments / Research interest">
        <FieldRow label="research interest" ts={recordTs}>
          {person.biography_research_interest ? (
            <span style={{ whiteSpace: 'pre-wrap' }}>{person.biography_research_interest}</span>
          ) : null}
        </FieldRow>
        {notes.length === 0 ? (
          <FieldRow label="comment" />
        ) : (
          notes.map((n, i) => (
            <FieldRow
              key={n.person_note_id ?? i}
              label="comment"
              ts={tsLabel(n.updated_by, n.date_updated)}
            >
              <span style={{ whiteSpace: 'pre-wrap' }}>{n.note}</span>
            </FieldRow>
          ))
        )}
      </Section>

      <div style={{ ...muted, fontSize: '0.8em', textAlign: 'left', marginTop: 8 }}>
        Created by {person.created_by || '?'} on {formatTimestamp(person.date_created)}
        {' · '}
        Updated by {person.updated_by || '?'} on {formatTimestamp(person.date_updated)}
      </div>
    </div>
  );
};

export default PersonWbDisplay;
