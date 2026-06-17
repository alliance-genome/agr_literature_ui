import React from 'react';
import { useSelector } from 'react-redux';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Badge from 'react-bootstrap/Badge';

const formatDate = (s) => {
  if (!s) return '';
  try {
    return new Date(s).toISOString().slice(0, 10);
  } catch {
    return String(s);
  }
};

const muted = { color: '#888' };

const FieldRow = ({ label, children }) => (
  <div style={{ display: 'flex', gap: 10, padding: '2px 0' }}>
    <div style={{ width: 170, fontWeight: 600, flexShrink: 0 }}>{label}</div>
    <div style={{ flex: 1 }}>{children ?? <span style={muted}>—</span>}</div>
  </div>
);

const ListOrDash = ({ items, render }) => {
  const list = items ?? [];
  if (list.length === 0) return <span style={muted}>—</span>;
  return (
    <ul style={{ listStyle: 'none', paddingLeft: 0, marginBottom: 0 }}>
      {list.map((item, i) => (
        <li key={i} style={{ padding: '1px 0' }}>{render(item, i)}</li>
      ))}
    </ul>
  );
};

const GeneralCard = ({ lab }) => {
  const cityLine = [lab.city, lab.state].filter(Boolean).join(', ');
  const cityZip = [cityLine, lab.postal_code].filter(Boolean).join(' ');
  const hasAddress = lab.street_address || cityZip || lab.country;
  return (
    <Card className="mb-3">
      <Card.Header>General</Card.Header>
      <Card.Body style={{ textAlign: 'left' }}>
        <FieldRow label="name">{lab.name}</FieldRow>
        <FieldRow label="strain_designation">{lab.strain_designation}</FieldRow>
        <FieldRow label="research_area">{lab.research_area}</FieldRow>
        <FieldRow label="short_research_description">
          {lab.short_research_description && (
            <span style={{ whiteSpace: 'pre-wrap' }}>{lab.short_research_description}</span>
          )}
        </FieldRow>
        <FieldRow label="additional_information">
          {lab.additional_information && (
            <span style={{ whiteSpace: 'pre-wrap' }}>{lab.additional_information}</span>
          )}
        </FieldRow>
        <FieldRow label="private_note">
          {lab.private_note && <span style={{ whiteSpace: 'pre-wrap' }}>{lab.private_note}</span>}
        </FieldRow>
        <FieldRow label="institution">
          <ListOrDash items={lab.institution} render={(inst) => inst} />
        </FieldRow>
        <FieldRow label="webpage">
          <ListOrDash
            items={lab.webpage}
            render={(url) => (
              <a href={url} target="_blank" rel="noreferrer noopener">{url}</a>
            )}
          />
        </FieldRow>
        <FieldRow label="address">
          {hasAddress ? (
            <>
              {lab.street_address && <div>{lab.street_address}</div>}
              {cityZip && <div>{cityZip}</div>}
              {lab.country && <div>{lab.country}</div>}
            </>
          ) : null}
        </FieldRow>
        <FieldRow label={`email (${lab.email_visibility || 'not_shown'})`}>
          <ListOrDash items={lab.email} render={(addr) => addr} />
        </FieldRow>
      </Card.Body>
    </Card>
  );
};

const AlleleDesignationsCard = ({ list }) => (
  <Card className="mb-3">
    <Card.Header>Allele Designations</Card.Header>
    <Card.Body style={{ textAlign: 'left' }}>
      <ListOrDash
        items={list}
        render={(ad) => (
          <>
            <span style={{ fontWeight: 600 }}>{ad.mod_abbreviation || ad.mod_id}</span>
            {' — '}
            <span>{ad.allele_designation}</span>
          </>
        )}
      />
    </Card.Body>
  </Card>
);

const CrossReferencesCard = ({ list }) => (
  <Card className="mb-3">
    <Card.Header>Cross References</Card.Header>
    <Card.Body style={{ textAlign: 'left' }}>
      <ListOrDash
        items={list}
        render={(x) => {
          const firstPage = Array.isArray(x.pages) && x.pages.length > 0 ? x.pages[0] : null;
          const isObsolete = x.is_obsolete === true;
          const style = {
            textDecoration: isObsolete ? 'line-through' : 'none',
            color: isObsolete ? '#888' : 'inherit',
          };
          return (
            <>
              {firstPage ? (
                <a href={firstPage} target="_blank" rel="noreferrer noopener" style={style}>
                  {x.curie}
                </a>
              ) : (
                <span style={style}>{x.curie}</span>
              )}
              {isObsolete && (
                <span style={{ ...muted, fontSize: '0.85em', marginLeft: 6 }}>(obsolete)</span>
              )}
            </>
          );
        }}
      />
    </Card.Body>
  </Card>
);

const personRoles = (lp) => {
  const roles = [];
  if (lp.lab_position) roles.push(lp.lab_position);
  if (lp.is_pi) roles.push(`PI since ${formatDate(lp.is_pi)}`);
  if (lp.former_pi) roles.push(`former PI since ${formatDate(lp.former_pi)}`);
  if (lp.alum) roles.push(`alum since ${formatDate(lp.alum)}`);
  if (lp.is_lab_contact) roles.push('lab contact');
  if (lp.can_edit_lab) roles.push('can edit');
  return roles;
};

const PersonnelCard = ({ list, effectiveMod }) => {
  const personHref = (curie) =>
    '/person?personCurie=' + encodeURIComponent(curie) + (effectiveMod === 'WB' ? '&tab=wbdisplay' : '');
  return (
    <Card className="mb-3">
      <Card.Header>Personnel</Card.Header>
      <Card.Body style={{ textAlign: 'left' }}>
        <ListOrDash
          items={list}
          render={(lp) => {
            const label = lp.person_display_name || lp.person_curie || '(unknown person)';
            const roles = personRoles(lp);
            return (
              <div style={{ padding: '2px 0' }}>
                {lp.person_curie ? (
                  <a href={personHref(lp.person_curie)}>{label}</a>
                ) : (
                  <span>{label}</span>
                )}
                {roles.length > 0 && (
                  <span style={{ marginLeft: 8 }}>
                    {roles.map((r, i) => (
                      <Badge key={i} variant="info" style={{ marginRight: 4 }}>{r}</Badge>
                    ))}
                  </span>
                )}
              </div>
            );
          }}
        />
      </Card.Body>
    </Card>
  );
};

const LaboratoryDisplay = ({ laboratory }) => {
  const cognitoMod = useSelector((s) => s.isLogged.cognitoMod);
  const testerMod = useSelector((s) => s.isLogged.testerMod);
  const effectiveMod = testerMod !== 'No' ? testerMod : cognitoMod;

  if (!laboratory) return null;
  const status = laboratory.status || 'unknown';
  const statusVariant = status === 'active' ? 'success' : 'secondary';

  return (
    <div>
      <Card className="mb-3" style={{ borderLeft: '4px solid #4a90e2' }}>
        <Card.Body>
          <Row>
            <Col>
              <h3 style={{ marginBottom: 4 }}>
                {laboratory.name || <span style={muted}>(no name)</span>}
              </h3>
              {laboratory.strain_designation && (
                <div style={muted}>strain: {laboratory.strain_designation}</div>
              )}
              <div style={{ ...muted, fontSize: '0.95em' }}>{laboratory.curie}</div>
            </Col>
            <Col xs="auto" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Badge variant={statusVariant} style={{ fontSize: '0.95em' }}>{status}</Badge>
              <Badge
                variant={laboratory.lab_is_open ? 'success' : 'secondary'}
                style={{ fontSize: '0.95em' }}
              >
                {laboratory.lab_is_open ? 'open' : 'closed'}
              </Badge>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Row>
        <Col md={6}>
          <GeneralCard lab={laboratory} />
        </Col>
        <Col md={6}>
          <AlleleDesignationsCard list={laboratory.allele_designations} />
          <CrossReferencesCard list={laboratory.cross_references} />
          <PersonnelCard list={laboratory.lab_persons} effectiveMod={effectiveMod} />
        </Col>
      </Row>

      <div style={{ ...muted, fontSize: '0.8em', textAlign: 'center', marginTop: 8 }}>
        Created by {laboratory.created_by || '?'} on {formatDate(laboratory.date_created)}
        {' · '}
        Updated by {laboratory.updated_by || '?'} on {formatDate(laboratory.date_updated)}
      </div>
    </div>
  );
};

export default LaboratoryDisplay;
