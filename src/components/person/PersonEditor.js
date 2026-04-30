import React from 'react';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';

const SaveDisabledTitle = 'Save not wired yet — mockup only';

const ListSection = ({ title, rows, renderRow, addLabel }) => (
  <Card className="mb-3">
    <Card.Header>{title}</Card.Header>
    <Card.Body>
      {(rows ?? []).length === 0 && (
        <div style={{ color: '#888', marginBottom: 8 }}>(none)</div>
      )}
      {(rows ?? []).map((row, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          {renderRow(row, i)}
        </div>
      ))}
      <Button variant="outline-secondary" size="sm" disabled title={SaveDisabledTitle}>
        + {addLabel}
      </Button>
    </Card.Body>
  </Card>
);

const trashBtn = (
  <Button variant="outline-danger" size="sm" disabled title={SaveDisabledTitle}>
    🗑
  </Button>
);

const PersonEditor = ({ person }) => {
  if (!person) return null;
  const p = person;

  return (
    <Form>
      <Card className="mb-3">
        <Card.Header>Identity</Card.Header>
        <Card.Body>
          <Row className="mb-2">
            <Col md={6}>
              <Form.Label>Display name</Form.Label>
              <Form.Control type="text" defaultValue={p.display_name ?? ''} />
            </Col>
            <Col md={6}>
              <Form.Label>Curie</Form.Label>
              <Form.Control type="text" defaultValue={p.curie ?? ''} disabled />
            </Col>
          </Row>
          <Row className="mb-2">
            <Col md={6}>
              <Form.Label>Okta ID</Form.Label>
              <Form.Control type="text" defaultValue={p.okta_id ?? ''} />
            </Col>
            <Col md={6}>
              <Form.Label>Active status</Form.Label>
              <Form.Control as="select" defaultValue={p.active_status ?? 'active'}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </Form.Control>
            </Col>
          </Row>
          <Row className="mb-2">
            <Col>
              <Form.Label>Biography / Research interest</Form.Label>
              <Form.Control as="textarea" rows={4} defaultValue={p.biography_research_interest ?? ''} />
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label>MOD roles (comma-separated)</Form.Label>
              <Form.Control type="text" defaultValue={(p.mod_roles ?? []).join(', ')} />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="mb-3">
        <Card.Header>Address</Card.Header>
        <Card.Body>
          <Row className="mb-2">
            <Col md={12}>
              <Form.Label>Street</Form.Label>
              <Form.Control type="text" defaultValue={p.street_address ?? ''} />
            </Col>
          </Row>
          <Row className="mb-2">
            <Col md={5}>
              <Form.Label>City</Form.Label>
              <Form.Control type="text" defaultValue={p.city ?? ''} />
            </Col>
            <Col md={3}>
              <Form.Label>State</Form.Label>
              <Form.Control type="text" defaultValue={p.state ?? ''} />
            </Col>
            <Col md={4}>
              <Form.Label>Postal code</Form.Label>
              <Form.Control type="text" defaultValue={p.postal_code ?? ''} />
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <Form.Label>Country</Form.Label>
              <Form.Control type="text" defaultValue={p.country ?? ''} />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <ListSection
        title="Names"
        rows={p.names}
        addLabel="Add name"
        renderRow={(n) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Form.Control placeholder="First" defaultValue={n.first_name ?? ''} />
            <Form.Control placeholder="Middle" defaultValue={n.middle_name ?? ''} />
            <Form.Control placeholder="Last" defaultValue={n.last_name ?? ''} />
            <Form.Check type="checkbox" label="primary" defaultChecked={!!n.primary} style={{ whiteSpace: 'nowrap' }} />
            {trashBtn}
          </div>
        )}
      />

      <ListSection
        title="Emails"
        rows={p.emails}
        addLabel="Add email"
        renderRow={(e) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Form.Control type="email" defaultValue={e.email_address ?? ''} />
            <Form.Check type="checkbox" label="primary" defaultChecked={!!e.primary} style={{ whiteSpace: 'nowrap' }} />
            {trashBtn}
          </div>
        )}
      />

      <ListSection
        title="Cross references"
        rows={p.cross_references}
        addLabel="Add cross reference"
        renderRow={(x) => (
          <InputGroup>
            <Form.Control placeholder="prefix" defaultValue={x.curie_prefix ?? ''} style={{ maxWidth: 140 }} />
            <Form.Control placeholder="curie" defaultValue={x.curie ?? ''} />
            <Form.Control placeholder="page url" defaultValue={(Array.isArray(x.pages) && x.pages[0]) || ''} />
            {trashBtn}
          </InputGroup>
        )}
      />

      <ListSection
        title="Webpages"
        rows={p.webpage}
        addLabel="Add webpage"
        renderRow={(url) => (
          <InputGroup>
            <Form.Control type="url" defaultValue={url ?? ''} />
            {trashBtn}
          </InputGroup>
        )}
      />

      <ListSection
        title="Notes"
        rows={p.notes}
        addLabel="Add note"
        renderRow={(n) => (
          <InputGroup>
            <Form.Control as="textarea" rows={2} defaultValue={n.note ?? ''} />
            {trashBtn}
          </InputGroup>
        )}
      />

      <div style={{ marginTop: 12, marginBottom: 24 }}>
        <Button variant="primary" disabled title={SaveDisabledTitle}>Save</Button>
        <span style={{ color: '#888', marginLeft: 12 }}>{SaveDisabledTitle}</span>
      </div>
    </Form>
  );
};

export default PersonEditor;
