import React from 'react';
import Card from 'react-bootstrap/Card';
import Badge from 'react-bootstrap/Badge';

const muted = { color: '#888' };

const fullName = (n) => [n.first_name, n.middle_name, n.last_name].filter(Boolean).join(' ');

const PersonCompact = ({ person }) => {
  if (!person) return null;

  const emails = person.emails ?? [];
  const names = person.names ?? [];
  const xrefs = person.cross_references ?? [];
  const webpages = person.webpage ?? [];
  const notes = person.notes ?? [];
  const roles = person.mod_roles ?? [];

  const primaryEmail = emails.find(e => e.primary)?.email_address || emails[0]?.email_address || null;
  const primaryNameRow = names.find(n => n.primary) || names[0];
  const primaryName = primaryNameRow ? fullName(primaryNameRow) : null;
  const status = person.active_status || 'unknown';
  const statusVariant = status === 'active' ? 'success' : 'secondary';

  const parts = [
    person.display_name || '(no name)',
    person.curie || null,
    primaryEmail || 'no email',
    primaryName || 'no name record',
    roles.length > 0 ? roles.join(', ') : 'no roles',
  ].filter(Boolean);

  const counts = [
    `${emails.length} email${emails.length === 1 ? '' : 's'}`,
    `${names.length} name${names.length === 1 ? '' : 's'}`,
    `${xrefs.length} cross-reference${xrefs.length === 1 ? '' : 's'}`,
    `${webpages.length} webpage${webpages.length === 1 ? '' : 's'}`,
    `${notes.length} note${notes.length === 1 ? '' : 's'}`,
  ];

  return (
    <Card>
      <Card.Body>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span>
            {parts.map((p, i) => (
              <span key={i}>
                {i > 0 && <span style={muted}> · </span>}
                <span>{p}</span>
              </span>
            ))}
          </span>
          <Badge variant={statusVariant}>{status}</Badge>
        </div>
        <div style={{ ...muted, fontSize: '0.85em', marginTop: 6 }}>
          {counts.join(' · ')}
        </div>
      </Card.Body>
    </Card>
  );
};

export default PersonCompact;
