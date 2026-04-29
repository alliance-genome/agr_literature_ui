import React from 'react';
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

const fullName = (n) => {
  return [n.first_name, n.middle_name, n.last_name].filter(Boolean).join(' ');
};

const muted = { color: '#888' };

const NamesCard = ({ names }) => {
  const list = names ?? [];
  return (
    <Card className="mb-3">
      <Card.Header>Names</Card.Header>
      <Card.Body>
        {list.length === 0 ? (
          <span style={muted}>—</span>
        ) : (
          <ul style={{ listStyle: 'none', paddingLeft: 0, marginBottom: 0 }}>
            {list.map((n, i) => (
              <li key={n.person_name_id ?? i} style={{ padding: '2px 0' }}>
                {n.primary && <span title="primary" style={{ color: '#e7a700' }}>★ </span>}
                <span style={{ fontWeight: n.primary ? 600 : 400 }}>
                  {fullName(n) || <span style={muted}>(blank)</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card.Body>
    </Card>
  );
};

const EmailsCard = ({ emails }) => {
  const list = emails ?? [];
  return (
    <Card className="mb-3">
      <Card.Header>Emails</Card.Header>
      <Card.Body>
        {list.length === 0 ? (
          <span style={muted}>—</span>
        ) : (
          <ul style={{ listStyle: 'none', paddingLeft: 0, marginBottom: 0 }}>
            {list.map((e, i) => {
              const invalid = !!e.date_invalidated;
              return (
                <li key={e.email_id ?? i} style={{ padding: '2px 0' }}>
                  {e.primary && <span title="primary" style={{ color: '#e7a700' }}>★ </span>}
                  <span
                    style={{
                      fontWeight: e.primary ? 600 : 400,
                      textDecoration: invalid ? 'line-through' : 'none',
                      color: invalid ? '#888' : 'inherit',
                    }}
                  >
                    {e.email_address}
                  </span>
                  {invalid && (
                    <span style={{ ...muted, fontSize: '0.85em', marginLeft: 6 }}>
                      (invalidated {formatDate(e.date_invalidated)})
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card.Body>
    </Card>
  );
};

const CrossReferencesCard = ({ refs }) => {
  const list = refs ?? [];
  return (
    <Card className="mb-3">
      <Card.Header>Cross References</Card.Header>
      <Card.Body>
        {list.length === 0 ? (
          <span style={muted}>—</span>
        ) : (
          <ul style={{ listStyle: 'none', paddingLeft: 0, marginBottom: 0 }}>
            {list.map((x, i) => {
              const label = x.curie || `${x.curie_prefix ?? ''}:`;
              const firstPage = Array.isArray(x.pages) && x.pages.length > 0 ? x.pages[0] : null;
              const isObsolete = x.is_obsolete === true;
              const style = {
                textDecoration: isObsolete ? 'line-through' : 'none',
                color: isObsolete ? '#888' : 'inherit',
              };
              return (
                <li key={x.person_cross_reference_id ?? i} style={{ padding: '2px 0' }}>
                  {firstPage ? (
                    <a href={firstPage} target="_blank" rel="noreferrer noopener" style={style}>
                      {label}
                    </a>
                  ) : (
                    <span style={style}>{label}</span>
                  )}
                  {x.curie_prefix && x.curie && !x.curie.includes(':') && (
                    <span style={{ ...muted, fontSize: '0.85em', marginLeft: 6 }}>
                      ({x.curie_prefix})
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card.Body>
    </Card>
  );
};

const BiographyCard = ({ bio }) => (
  <Card className="mb-3">
    <Card.Header>Biography / Research Interest</Card.Header>
    <Card.Body>
      {bio ? (
        <div style={{ whiteSpace: 'pre-wrap' }}>{bio}</div>
      ) : (
        <span style={muted}>—</span>
      )}
    </Card.Body>
  </Card>
);

const AddressCard = ({ person }) => {
  const { street_address, city, state, postal_code, country, address_last_updated } = person;
  const hasAny = street_address || city || state || postal_code || country;
  const cityLine = [city, state].filter(Boolean).join(', ');
  const cityZip = [cityLine, postal_code].filter(Boolean).join(' ');
  return (
    <Card className="mb-3">
      <Card.Header>Address</Card.Header>
      <Card.Body>
        {!hasAny ? (
          <span style={muted}>—</span>
        ) : (
          <>
            {street_address && <div>{street_address}</div>}
            {cityZip && <div>{cityZip}</div>}
            {country && <div>{country}</div>}
            {address_last_updated && (
              <div style={{ ...muted, fontSize: '0.85em', marginTop: 6 }}>
                Updated {formatDate(address_last_updated)}
              </div>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );
};

const WebpagesCard = ({ pages }) => {
  const list = pages ?? [];
  return (
    <Card className="mb-3">
      <Card.Header>Webpages</Card.Header>
      <Card.Body>
        {list.length === 0 ? (
          <span style={muted}>—</span>
        ) : (
          <ul style={{ listStyle: 'none', paddingLeft: 0, marginBottom: 0 }}>
            {list.map((url, i) => (
              <li key={i} style={{ padding: '2px 0' }}>
                <a href={url} target="_blank" rel="noreferrer noopener">{url}</a>
              </li>
            ))}
          </ul>
        )}
      </Card.Body>
    </Card>
  );
};

const NotesCard = ({ notes }) => {
  const list = notes ?? [];
  return (
    <Card className="mb-3">
      <Card.Header>Notes</Card.Header>
      <Card.Body>
        {list.length === 0 ? (
          <span style={muted}>—</span>
        ) : (
          <ul style={{ listStyle: 'none', paddingLeft: 0, marginBottom: 0 }}>
            {list.map((n, i) => (
              <li key={n.person_note_id ?? i} style={{ padding: '4px 0', borderTop: i === 0 ? 'none' : '1px solid #eee' }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{n.note}</div>
                <div style={{ ...muted, fontSize: '0.8em' }}>
                  {n.updated_by ? `${n.updated_by} · ` : ''}{formatDate(n.date_updated)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card.Body>
    </Card>
  );
};

const PersonCcDisplay = ({ person }) => {
  if (!person) return null;
  const status = person.active_status || 'unknown';
  const statusVariant = status === 'active' ? 'success' : 'secondary';
  const roles = person.mod_roles ?? [];

  return (
    <div>
      <Card className="mb-3" style={{ borderLeft: '4px solid #4a90e2' }}>
        <Card.Body>
          <Row>
            <Col>
              <h3 style={{ marginBottom: 4 }}>{person.display_name || <span style={muted}>(no display name)</span>}</h3>
              <div style={{ ...muted, fontSize: '0.95em' }}>{person.curie}</div>
              {roles.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {roles.map((r, i) => (
                    <Badge key={i} variant="info" style={{ marginRight: 6 }}>{r}</Badge>
                  ))}
                </div>
              )}
              {person.okta_id && (
                <div style={{ ...muted, fontSize: '0.85em', marginTop: 6 }}>
                  okta: {person.okta_id}
                </div>
              )}
            </Col>
            <Col xs="auto">
              <Badge variant={statusVariant} style={{ fontSize: '0.95em' }}>{status}</Badge>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Row>
        <Col md={6}>
          <NamesCard names={person.names} />
          <EmailsCard emails={person.emails} />
          <CrossReferencesCard refs={person.cross_references} />
        </Col>
        <Col md={6}>
          <BiographyCard bio={person.biography_research_interest} />
          <AddressCard person={person} />
          <WebpagesCard pages={person.webpage} />
          <NotesCard notes={person.notes} />
        </Col>
      </Row>

      <div style={{ ...muted, fontSize: '0.8em', textAlign: 'center', marginTop: 8 }}>
        Created by {person.created_by || '?'} on {formatDate(person.date_created)}
        {' · '}
        Updated by {person.updated_by || '?'} on {formatDate(person.date_updated)}
      </div>
    </div>
  );
};

export default PersonCcDisplay;
