// The numbered staged institution objects, shared by every author on the page.
//
// These are page scratch, never database rows -- the same idea as
// person_editor.cgi's numbered institution editors. Affiliation strings repeat
// heavily across a paper's authors (twelve authors commonly share three places), so
// a curator fills in an address once here and every author who was there refers to
// it by number.
//
// Three rows per institution, not one field per row: with several institutions on a
// page that also lists every author, a column-per-field layout is the difference
// between reading the screen and scrolling it.
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';

import LabCuriePicker from '../person/LabCuriePicker';

const BiblioPersonInstitutionStaging = ({ staged, onChange, onAdd, disabled }) => {
  const field = (inst, key, placeholder, extra = {}) => (
    <Form.Control
      type="text"
      size="sm"
      placeholder={placeholder}
      aria-label={`institution ${inst.number} ${placeholder}`}
      disabled={disabled}
      value={inst[key]}
      onChange={(e) => onChange(inst.number, { [key]: e.target.value })}
      {...extra}
    />
  );

  return (
    <div className="biblio-person-staging">
      <Row style={{ marginTop: '0.6rem' }}>
        <Col sm="12">
          <strong>Institutions</strong>{' '}
          <span className="biblio-person-muted">
            — numbered for reference only; nothing here is saved until an author above
            chooses it and you commit.
          </span>
        </Col>
      </Row>

      {staged.length === 0 ? (
        <Alert variant="warning">
          No author on this reference has an affiliation. Add an institution below, or
          link authors to existing people without one.
        </Alert>
      ) : null}

      {staged.map((inst) => (
        <div key={inst.number} className="biblio-person-staged-inst">
          <Row>
            <Col sm="12" className="biblio-person-muted">
              <strong>[{inst.number}]</strong>{' '}
              {/* The affiliation exactly as it appears on the paper. Shown rather than
                  parsed: a comma-split heuristic is wrong often enough on real
                  affiliation strings that curators would stop trusting the prefill. */}
              {inst.raw || <span>added by hand — not from this paper</span>}
            </Col>
          </Row>
          <Row>
            <Col sm="5">{field(inst, 'institution', 'institution')}</Col>
            <Col sm="7">
              {/* Multiline: person_editor.cgi gives an address four street rows. ABC
                  stores one scalar street_address, so the newlines ride along in it. */}
              {field(inst, 'street', 'street address', { as: 'textarea', rows: 2 })}
            </Col>
          </Row>
          <Row>
            <Col sm="3">{field(inst, 'city', 'city')}</Col>
            <Col sm="1">{field(inst, 'state', 'state')}</Col>
            <Col sm="2">{field(inst, 'postal_code', 'postal')}</Col>
            <Col sm="2">{field(inst, 'country', 'country')}</Col>
            <Col sm="4">
              {/* An existing laboratory, not free text: laboratory_person links two
                  independently-created objects by curie, so there is nothing to type.
                  The picker puts exact strain-designation hits above name matches. */}
              <LabCuriePicker
                id={`staged-inst-lab-${inst.number}`}
                value={inst.lab}
                valueLabel={inst.labLabel}
                disabled={disabled}
                placeholder="lab (optional)"
                onChange={(picked) => onChange(inst.number, {
                  lab: picked ? picked.curie : null,
                  labLabel: picked ? (picked.strain_designation || picked.name || '') : '',
                })}
              />
            </Col>
          </Row>
          <Row>
            <Col sm="4">{field(inst, 'webpage', 'webpage')}</Col>
            <Col sm="8">{field(inst, 'comment', 'comment')}</Col>
          </Row>
        </div>
      ))}

      {/* After the list, where a new entry will actually appear: appendStagedInstitution
          numbers past the highest in use and adds to the end, so the button sits next to
          the blank row it creates. Not every person's institution is on this paper, so a
          curator who knows where someone is needs somewhere to put it. */}
      <Row>
        <Col sm="12">
          <Button size="sm" variant="outline-secondary" disabled={disabled} onClick={onAdd}>
            + add institution
          </Button>
        </Col>
      </Row>
    </div>
  );
};

export default BiblioPersonInstitutionStaging;
