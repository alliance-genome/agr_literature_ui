// People attached to this reference without being one of its authors.
//
// These are author rows with author_order NULL carrying only a person_id -- what
// link_person calls a person-only stub. They usually mean a curator (or an import)
// knew a person belonged to the paper before anyone worked out which author they
// were. Picking the author here resolves that: link_person absorbs the stub into the
// chosen author, so one PATCH both makes the link and clears the row.
//
// Unlike everything else on this screen, choosing here writes immediately rather than
// staging. There is nothing to batch it with: the stub disappears the moment it is
// resolved, and the author it resolves to leaves the list of candidates.
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';

const BiblioPersonStubs = ({
  stubs, availableAuthors, linkingStub, removingStub, onLinkStub, onRemoveStub, disabled,
  metaLabel, metaSlotClass, showMeta,
}) => {
  if (stubs.length === 0) return null;

  const stubMeta = (stub) => (metaLabel ? metaLabel(stub.updated_by, stub.date_updated) : null);

  return (
    <div className="biblio-person-section">
      {/* No margin of its own: biblio-person-section spaces this off from what
          surrounds it, and a margin here too would double the gap at the top. */}
      <Row>
        <Col sm="12">
          <strong>People on this Reference who are not an Author</strong>{' '}
          <span className="biblio-person-muted">
            — pick the author each one is, and the two are joined straight away.
          </span>
        </Col>
      </Row>

      {stubs.map((stub) => (
        <div key={stub.author_id} className="biblio-person-author biblio-person-stub-row">
          <Row>
            <Col sm="4">
              {stub.curie ? (
                <a href={`/person?personCurie=${encodeURIComponent(stub.curie)}`}
                  target="_blank" rel="noopener noreferrer">{stub.curie}</a>
              ) : stub.resolveFailed ? (
                // Terminal: nothing retries the lookup, so say that rather than leave
                // an ellipsis implying a request still in flight.
                <span style={{ color: '#a00', fontSize: '0.85rem' }}>
                  person {stub.person_id} — could not look this person up
                </span>
              ) : (
                // Resolving person_id -> curie; the reference payload carries no curie
                // for these rows, so there is nothing to link to until it lands.
                <span className="biblio-person-muted">person {stub.person_id}…</span>
              )}
              {stub.name ? <span> ({stub.name})</span> : null}
            </Col>
            <Col sm="4">
              {/* Also disabled until the curie resolves. The link is a PATCH carrying
                  person_curie -- person_id is never accepted -- so until it lands there
                  is nothing to send, and an enabled select would take a choice, snap
                  back to the placeholder and do nothing at all. */}
              <Form.Control
                as="select"
                size="sm"
                value=""
                disabled={disabled || linkingStub === stub.author_id
                  || availableAuthors.length === 0 || !stub.curie}
                aria-label={`author for person ${stub.curie || stub.person_id}`}
                onChange={(e) => {
                  if (e.target.value) onLinkStub(stub, Number(e.target.value));
                }}
              >
                <option value="">
                  {!stub.curie
                    ? (stub.resolveFailed
                      ? 'could not look this person up — reload to retry'
                      : 'looking this person up…')
                    : availableAuthors.length === 0
                      ? '(every author already has a person)'
                      : 'choose the author this person is…'}
                </option>
                {availableAuthors.map((author) => (
                  <option key={author.author_id} value={author.author_id}>
                    {author.author_order}. {author.name
                      || [author.first_name, author.last_name].filter(Boolean).join(' ')
                      || '(unnamed)'}
                  </option>
                ))}
              </Form.Control>
            </Col>
            <Col sm="2">
              {linkingStub === stub.author_id
                ? <span className="biblio-person-muted"><Spinner animation="border" size="sm" /> linking…</span>
                : (
                  /* Deletes the row rather than clearing its person: a person-only row
                     has no author_order, so clearing person_id would leave
                     ck_author_person_or_order unsatisfiable and the API refuses it.
                     For these, removal IS deletion -- which is also what the curator
                     means when the person does not belong on the paper. */
                  <Button
                    size="sm"
                    variant="outline-danger"
                    disabled={disabled || removingStub === stub.author_id}
                    onClick={() => onRemoveStub(stub)}
                  >
                    {removingStub === stub.author_id ? 'removing…' : 'remove'}
                  </Button>
                )}
            </Col>
            {/* Last on the row, in the same fixed slot the author rows use, so the two
                sections line up with each other as well as within themselves. A Col is
                already a flex item, so the class's flex basis overrides the Bootstrap
                width. Rendered on the toggles rather than on whether this row has a
                value, so every row keeps the same shape -- and not at all when both
                toggles are off, which used to leave an empty 8.5rem column here. */}
            {showMeta ? (
              <Col
                className={`biblio-person-muted ${metaSlotClass}`}
                title={stubMeta(stub) || ''}
              >
                {stubMeta(stub)}
              </Col>
            ) : null}
          </Row>
          {stub.error ? (
            <Alert variant="danger">{stub.error}</Alert>
          ) : null}
        </div>
      ))}
    </div>
  );
};

export default BiblioPersonStubs;
