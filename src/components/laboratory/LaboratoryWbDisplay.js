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

const personRoles = (lp) => {
  const roles = [];
  if (lp.lab_position) roles.push(lp.lab_position);
  if (lp.is_pi) roles.push(`PI since ${formatTimestamp(lp.is_pi)}`);
  if (lp.former_pi) roles.push(`former PI since ${formatTimestamp(lp.former_pi)}`);
  if (lp.alum) roles.push(`alum since ${formatTimestamp(lp.alum)}`);
  if (lp.is_lab_contact) roles.push('lab contact');
  if (lp.can_edit_lab) roles.push('can edit');
  return roles;
};

const LaboratoryWbDisplay = ({ laboratory }) => {
  const cognitoMod = useSelector((s) => s.isLogged.cognitoMod);
  const testerMod = useSelector((s) => s.isLogged.testerMod);
  const effectiveMod = testerMod !== 'No' ? testerMod : cognitoMod;
  const personHref = (curie) =>
    '/person?personCurie=' + encodeURIComponent(curie) + (effectiveMod === 'WB' ? '&tab=wbdisplay' : '');

  if (!laboratory) return null;
  const lab = laboratory;
  const status = lab.status || 'unknown';
  const statusVariant = status === 'active' ? 'success' : 'secondary';
  const recordTs = tsLabel(lab.updated_by, lab.date_updated);

  const emails = lab.email ?? [];
  const institutions = lab.institution ?? [];
  const webpages = lab.webpage ?? [];
  const alleles = lab.allele_designations ?? [];
  const xrefs = lab.cross_references ?? [];
  const labPersons = lab.lab_persons ?? [];

  const hasAddress =
    lab.street_address || lab.city || lab.state || lab.postal_code || lab.country;

  return (
    <div style={{ textAlign: 'left' }}>
      <Card className="mb-3" style={{ borderLeft: '4px solid #6b4a8a' }}>
        <Card.Body>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h4 style={{ marginBottom: 4 }}>
                {lab.name || <span style={muted}>(no name)</span>}
              </h4>
              {lab.strain_designation && (
                <div style={muted}>strain_designation: {lab.strain_designation}</div>
              )}
              <div style={{ ...muted, fontSize: '0.9em' }}>{lab.curie}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Badge variant={statusVariant} style={{ fontSize: '0.95em' }}>{status}</Badge>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Section title="Laboratory">
        <FieldRow label="name" ts={recordTs}>{lab.name}</FieldRow>
        <FieldRow label="strain_designation" ts={recordTs}>{lab.strain_designation}</FieldRow>
        <FieldRow label="status" ts={recordTs}>{status}</FieldRow>
        {/* lab_is_open = who may edit the lab: false -> no one, true -> anyone */}
        <FieldRow label="lab_is_open" ts={recordTs}>{lab.lab_is_open ? 'anyone' : 'no one'}</FieldRow>
      </Section>

      <Section title="Email">
        {emails.length === 0 ? (
          <FieldRow label={`email (${lab.email_visibility || 'not_shown'})`} />
        ) : (
          emails.map((addr, i) => (
            <FieldRow key={i} label={`email (${lab.email_visibility || 'not_shown'})`} ts={recordTs}>
              {addr}
            </FieldRow>
          ))
        )}
      </Section>

      <Section title="Address">
        {!hasAddress ? (
          <FieldRow label="address" />
        ) : (
          <>
            <FieldRow label="street" ts={recordTs}>
              {lab.street_address ? (
                <span style={{ whiteSpace: 'pre-wrap' }}>{lab.street_address}</span>
              ) : null}
            </FieldRow>
            <FieldRow label="city" ts={recordTs}>{lab.city || null}</FieldRow>
            <FieldRow label="state" ts={recordTs}>{lab.state || null}</FieldRow>
            <FieldRow label="postal_code" ts={recordTs}>{lab.postal_code || null}</FieldRow>
            <FieldRow label="country" ts={recordTs}>{lab.country || null}</FieldRow>
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

      <Section title="Allele designations">
        {alleles.length === 0 ? (
          <FieldRow label="allele_designation" />
        ) : (
          alleles.map((ad, i) => (
            <FieldRow
              key={ad.laboratory_allele_designation_id ?? i}
              label={ad.mod_abbreviation || `mod ${ad.mod_id}`}
              ts={tsLabel(ad.updated_by, ad.date_updated)}
            >
              {ad.allele_designation}
            </FieldRow>
          ))
        )}
      </Section>

      <Section title="Cross references">
        {xrefs.length === 0 ? (
          <FieldRow label="xref" />
        ) : (
          xrefs.map((x, i) => {
            const firstPage = Array.isArray(x.pages) && x.pages[0] ? x.pages[0] : null;
            const isObsolete = x.is_obsolete === true;
            const valStyle = {
              textDecoration: isObsolete ? 'line-through' : 'none',
              color: isObsolete ? '#888' : 'inherit',
            };
            const editTs = tsLabel(x.updated_by, x.date_updated);
            const ts = [isObsolete ? 'obsolete' : null, editTs].filter(Boolean).join(' · ') || null;
            return (
              <FieldRow key={x.laboratory_cross_reference_id ?? i} label={x.curie_prefix || 'xref'} ts={ts}>
                {firstPage ? (
                  <a href={firstPage} target="_blank" rel="noreferrer noopener" style={valStyle}>
                    {x.curie}
                  </a>
                ) : (
                  <span style={valStyle}>{x.curie}</span>
                )}
              </FieldRow>
            );
          })
        )}
      </Section>

      <Section title="Personnel">
        {labPersons.length === 0 ? (
          <FieldRow label="lab_person" />
        ) : (
          labPersons.map((lp, i) => {
            const label = lp.person_display_name || lp.person_curie || '(unknown person)';
            const roles = personRoles(lp);
            return (
              <FieldRow
                key={lp.laboratory_person_id ?? i}
                label="lab_person"
                ts={tsLabel(lp.updated_by, lp.date_updated)}
              >
                {lp.person_curie ? (
                  <a href={personHref(lp.person_curie)}>{label}</a>
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

      <Section title="Research / Notes">
        <FieldRow label="research_area" ts={recordTs}>{lab.research_area}</FieldRow>
        <FieldRow label="short_research_description" ts={recordTs}>
          {lab.short_research_description ? (
            <span style={{ whiteSpace: 'pre-wrap' }}>{lab.short_research_description}</span>
          ) : null}
        </FieldRow>
        <FieldRow label="additional_information" ts={recordTs}>
          {lab.additional_information ? (
            <span style={{ whiteSpace: 'pre-wrap' }}>{lab.additional_information}</span>
          ) : null}
        </FieldRow>
        <FieldRow label="private_note" ts={recordTs}>
          {lab.private_note ? (
            <span style={{ whiteSpace: 'pre-wrap' }}>{lab.private_note}</span>
          ) : null}
        </FieldRow>
      </Section>

      <div style={{ ...muted, fontSize: '0.8em', textAlign: 'left', marginTop: 8 }}>
        Created by {lab.created_by || '?'} on {formatTimestamp(lab.date_created)}
        {' · '}
        Updated by {lab.updated_by || '?'} on {formatTimestamp(lab.date_updated)}
      </div>
    </div>
  );
};

export default LaboratoryWbDisplay;
