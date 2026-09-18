// One author's block: who they are on the paper, which existing people they might
// be, and the person to create if they are none of them.
//
// Every author renders at once -- there is no per-author collapse, because seeing the
// reference's authors together is the point. That makes vertical space the scarce
// resource, so the two things that are only sometimes needed collapse instead: the
// list of suggestions (a count until you open it) and, once a selection is confirmed,
// the comparison. person_editor.cgi fits an author in a couple of lines and this aims
// at the same.
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';

import PersonCuriePicker from '../person/PersonCuriePicker';

// Enough suggestions to judge whether the right person is among them without a common
// surname filling the screen. by_name is an ILIKE '%surname%', so 47 hits for "Doe"
// is normal rather than exceptional.
const MATCHES_SHOWN = 8;

const orcidOf = (person) => {
  const xrefs = (person && person.cross_references) || [];
  const orcid = xrefs.find((x) => x && typeof x.curie === 'string' && x.curie.startsWith('ORCID:'));
  return orcid ? orcid.curie : '';
};

const nameLine = (person) => {
  const names = (person && person.names) || [];
  const primary = names.find((n) => n && n.is_primary) || names[0];
  if (!primary) return '';
  return [primary.first_name, primary.middle_name, primary.last_name].filter(Boolean).join(' ');
};

const institutionLines = (person) => {
  const insts = (person && person.institutions) || [];
  return {
    current: insts.filter((i) => i && !i.date_made_old_institution).map((i) => i.institution),
    old: insts.filter((i) => i && i.date_made_old_institution).map((i) => i.institution),
  };
};

const emailLine = (person) => {
  const emails = (person && person.emails) || [];
  const active = emails.filter((e) => e && !e.date_made_old_email);
  return (active.length ? active : emails).map((e) => e.email_address).filter(Boolean).join(', ');
};

// A person curie as a link to their Person page, opened in a new tab so the curator
// never loses a page of half-filled drafts to check one record. Same URL shape
// Person.js reads (?personCurie=) and LaboratoryDisplay already links with.
const PersonLink = ({ curie }) => (
  <a
    href={`/person?personCurie=${encodeURIComponent(curie)}`}
    target="_blank"
    rel="noopener noreferrer"
  >
    {curie}
  </a>
);

/**
 * The selected person's stored values beside the values derived from the author.
 *
 * Deliberately read-only, with no swap or overwrite control: how a swap should
 * behave has not been settled with curators yet, and guessing would write the wrong
 * thing into records that are already correct. Showing the differences is what lets
 * that conversation happen against real data.
 */
const ComparePanel = ({ person, fields }) => {
  if (!person) return null;
  const insts = institutionLines(person);
  const rows = [
    ['display name', fields.display_name, person.display_name],
    ['name', [fields.first_name, fields.middle_name, fields.last_name].filter(Boolean).join(' '), nameLine(person)],
    ['orcid', fields.orcid ? `ORCID:${fields.orcid}` : '', orcidOf(person)],
    ['email', fields.email, emailLine(person)],
    ['institution', '', insts.current.join('; ')],
    ['old institution', '', insts.old.join('; ')],
  ];
  return (
    <div style={{ margin: '0.2rem 0', padding: '0.25rem 0.4rem', background: '#f7f7f7', border: '1px solid #ddd' }}>
      <div className="biblio-person-muted">
        <strong>Compare</strong> — read-only; nothing here is written.
      </div>
      <Row style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
        <Col sm="3">field</Col>
        <Col sm="4">from this paper</Col>
        <Col sm="5">stored on {person.curie}</Col>
      </Row>
      {rows.map(([label, fromPaper, stored]) => (
        <Row key={label} style={{ fontSize: '0.8rem' }}>
          <Col sm="3">{label}</Col>
          <Col sm="4" style={{ color: '#666' }}>{fromPaper || <span>&mdash;</span>}</Col>
          <Col sm="5">{stored || <span style={{ color: '#999' }}>&mdash;</span>}</Col>
        </Row>
      ))}
    </div>
  );
};

const BiblioPersonAuthorRow = ({
  author, draft, staged, matches, matchState, selectedPersonDetail,
  errors, result, disabled, matchesOpen, showAllMatches, unlinking,
  onToggleMatches, onToggleShowAll, onChange, onRemoveLink,
}) => {
  // isLinked, not the curie: an author loaded from the reference carries person_id but
  // no curie until it is resolved, and treating that gap as "unlinked" is what made a
  // reloaded page offer to create a person who already exists.
  const linked = !!draft.isLinked;
  const creating = draft.mode === 'create';
  const linking = draft.mode === 'link';
  const shown = showAllMatches ? matches : matches.slice(0, MATCHES_SHOWN);

  const setField = (key, value) => onChange({ fields: { ...draft.fields, [key]: value } });

  const instOptions = (
    <>
      <option value="">(none)</option>
      {staged.map((inst) => (
        <option key={inst.number} value={inst.number}>
          [{inst.number}] {inst.institution || inst.raw || '(blank)'}
        </option>
      ))}
    </>
  );

  return (
    <div className="biblio-person-author">
      <div className="biblio-person-author-head">
        {/* Fixed-width and first, so every author's name starts at the same x position
            however many suggestions were found. */}
        {/* An already-linked author gets neither slot's content: there is nothing to
            suggest and nothing to create while the link stands. The slots stay in place
            so names keep their column. */}
        <span className="biblio-person-slot-possible">
          {linked ? null : matchState === 'loading' ? (
            <span className="biblio-person-muted">
              <Spinner animation="border" size="sm" /> searching…
            </span>
          ) : matchState === 'error' ? (
            <span style={{ color: '#a00', fontSize: '0.85rem' }}>search failed</span>
          ) : (
            <button type="button" className="biblio-person-toggle"
              disabled={disabled} onClick={onToggleMatches}>
              {matches.length} suggestions {matchesOpen ? '▾' : '▸'}
            </button>
          )}
        </span>

        <span className="biblio-person-slot-create">
          {linked ? null : (
            <Form.Check
              type="checkbox"
              id={`create-${author.author_id}`}
              label="create"
              disabled={disabled || linking}
              checked={creating}
              onChange={(e) => onChange({ mode: e.target.checked ? 'create' : 'none' })}
            />
          )}
        </span>

        <span style={{ flex: 1, minWidth: 0 }}>
          <strong>
            {author.author_order === null || author.author_order === undefined
              ? '(no order)' : `${author.author_order}.`}{' '}
            {author.name || [author.first_name, author.last_name].filter(Boolean).join(' ') || '(unnamed)'}
          </strong>
          {author.affiliations && author.affiliations.length > 0 ? (
            <span className="biblio-person-muted"> · {author.affiliations.join(' | ')}</span>
          ) : null}
        </span>

        {/* The outcome trails the author info rather than taking a fixed slot: a curie
            plus a name is far wider than a count, and padding every row to fit one
            would undo the compaction the fixed slots buy. */}
        {linked ? (
          <span style={{ color: '#2a6', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
            linked to{' '}
            {draft.existingPersonCurie
              ? <PersonLink curie={draft.existingPersonCurie} />
              // The curie is still being resolved from person_id; say so rather than
              // rendering a dead link or an empty space that reads as a glitch.
              : <span className="biblio-person-muted">person {draft.existingPersonId}…</span>}
            {draft.existingPersonName ? ` (${draft.existingPersonName})` : ''}
            {' '}
            {/* A button, not a checkbox. Every checkbox on this screen stages something
                for the commit and changes nothing until then; this one writes to the
                database the moment it is pressed. Wearing the same control as the staged
                ones would misrepresent that. It writes immediately rather than joining the
                batch because suggestions and create stay hidden while the link stands, so
                there is nothing for it to be batched with. */}
            <Button
              size="sm"
              variant="outline-danger"
              disabled={disabled || unlinking}
              onClick={onRemoveLink}
            >
              {unlinking ? 'removing…' : 'remove'}
            </Button>
          </span>
        ) : linking && !matchesOpen ? (
          // Confirmed: the list and the comparison are gone and only the outcome stays,
          // which is all the curator needs while working further down the page.
          <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
            → <strong>{draft.selectedPerson.curie}</strong>{' '}
            {draft.selectedPerson.name ? `(${draft.selectedPerson.name})` : ''}{' '}
            <button type="button" className="biblio-person-toggle"
              disabled={disabled} onClick={onToggleMatches}>change</button>
          </span>
        ) : null}
      </div>

      {linked ? null : (
        <>
          {matchesOpen ? (
            <div style={{ borderLeft: '2px solid #eee', paddingLeft: '0.4rem' }}>
              {matchState === 'done' && matches.length === 0 ? (
                <div className="biblio-person-muted">
                  No existing person matches this surname — create one below.
                </div>
              ) : null}

              {shown.map((person) => (
                <Form.Check
                  key={person.curie}
                  type="radio"
                  id={`match-${author.author_id}-${person.curie}`}
                  name={`match-${author.author_id}`}
                  disabled={disabled}
                  checked={!!(draft.selectedPerson && draft.selectedPerson.curie === person.curie)}
                  onChange={() => onChange({
                    mode: 'link',
                    selectedPerson: { curie: person.curie, name: person.display_name || '' },
                  })}
                  label={
                    <span>
                      {person.display_name || '(no name)'}{' '}
                      <span className="biblio-person-muted">
                        {person.curie}
                        {orcidOf(person) ? ` · ${orcidOf(person)}` : ''}
                        {institutionLines(person).current.length
                          ? ` · ${institutionLines(person).current.join('; ')}` : ''}
                      </span>
                    </span>
                  }
                />
              ))}

              {matches.length > MATCHES_SHOWN ? (
                <button type="button" className="biblio-person-toggle" onClick={onToggleShowAll}>
                  {showAllMatches
                    ? 'show fewer'
                    : `showing ${MATCHES_SHOWN} of ${matches.length} — show all`}
                </button>
              ) : null}

              <Row>
                <Col sm="7">
                  <PersonCuriePicker
                    id={`person-search-${author.author_id}`}
                    value={draft.selectedPerson ? draft.selectedPerson.curie : null}
                    valueName={draft.selectedPerson ? draft.selectedPerson.name : ''}
                    disabled={disabled}
                    placeholder="or search for a person yourself"
                    onChange={(picked) => onChange(
                      picked
                        ? { mode: 'link', selectedPerson: { curie: picked.curie, name: picked.name } }
                        : { mode: 'none', selectedPerson: null },
                    )}
                  />
                </Col>
                <Col sm="5">
                  {linking ? (
                    <>
                      <Button variant="outline-secondary" size="sm" disabled={disabled}
                        onClick={() => onChange({ mode: 'none', selectedPerson: null })}>
                        clear selection
                      </Button>{' '}
                      {/* Confirming is what collapses the list and the comparison.
                          Selecting alone must not, or a misclicked radio would hide the
                          evidence the curator needs to notice it was wrong. */}
                      <Button variant="primary" size="sm" disabled={disabled}
                        onClick={onToggleMatches}>
                        confirm selection
                      </Button>
                    </>
                  ) : null}
                </Col>
              </Row>

              {linking ? <ComparePanel person={selectedPersonDetail} fields={draft.fields} /> : null}
            </div>
          ) : null}

          {creating ? (
            <>
              <Row>
                <Col sm="2">
                  <Form.Control type="text" size="sm" placeholder="standard name"
                    aria-label={`display name for author ${author.author_id}`}
                    value={draft.fields.display_name}
                    onChange={(e) => setField('display_name', e.target.value)} />
                </Col>
                <Col sm="2">
                  <Form.Control type="text" size="sm" placeholder="first"
                    aria-label={`first name for author ${author.author_id}`}
                    value={draft.fields.first_name}
                    onChange={(e) => setField('first_name', e.target.value)} />
                </Col>
                <Col sm="1">
                  <Form.Control type="text" size="sm" placeholder="mid"
                    aria-label={`middle name for author ${author.author_id}`}
                    value={draft.fields.middle_name}
                    onChange={(e) => setField('middle_name', e.target.value)} />
                </Col>
                <Col sm="2">
                  <Form.Control type="text" size="sm" placeholder="last"
                    aria-label={`last name for author ${author.author_id}`}
                    value={draft.fields.last_name}
                    onChange={(e) => setField('last_name', e.target.value)} />
                </Col>
                <Col sm="3">
                  <Form.Control type="text" size="sm" placeholder="orcid (id only)"
                    aria-label={`orcid for author ${author.author_id}`}
                    value={draft.fields.orcid}
                    onChange={(e) => setField('orcid', e.target.value)} />
                </Col>
                <Col sm="2">
                  <Form.Control type="text" size="sm" placeholder="email"
                    aria-label={`email for author ${author.author_id}`}
                    value={draft.fields.email}
                    onChange={(e) => setField('email', e.target.value)} />
                </Col>
              </Row>
              <Row>
                <Col sm="6">
                  <Form.Control as="select" size="sm"
                    aria-label={`current institution for author ${author.author_id}`}
                    value={draft.instChoice === null ? '' : String(draft.instChoice)}
                    onChange={(e) => onChange({
                      instChoice: e.target.value === '' ? null : Number(e.target.value),
                    })}>
                    {instOptions}
                  </Form.Control>
                  <span className="biblio-person-muted">
                    current — address, webpage and comment come from this one
                  </span>
                </Col>
                <Col sm="6">
                  <Form.Control as="select" size="sm"
                    aria-label={`old institution for author ${author.author_id}`}
                    value={draft.oldInstChoice === null ? '' : String(draft.oldInstChoice)}
                    onChange={(e) => onChange({
                      oldInstChoice: e.target.value === '' ? null : Number(e.target.value),
                    })}>
                    {instOptions}
                  </Form.Control>
                  <span className="biblio-person-muted">old</span>
                </Col>
              </Row>
            </>
          ) : null}
        </>
      )}

      {/* Red, not the cream of an advisory alert: every one of these disables Commit. */}
      {errors.length > 0 ? (
        <Alert variant="danger">
          {errors.map((message) => <div key={message}>{message}</div>)}
        </Alert>
      ) : null}

      {/* Failures only: a successful commit re-renders the author as a linked row, which
          says the same thing in the place the curator already reads it. */}
      {result && !result.ok ? (
        <Alert variant="danger">
          <div>{result.message}</div>
          {result.createdPersonCurie ? (
            <div>
              {/* The person exists even though the rest failed. Saying so is what stops a
                  curator re-running the create and minting a second AGRKB id for the same
                  human -- the draft has already pinned itself to this curie. */}
              <strong><PersonLink curie={result.createdPersonCurie} /> was created</strong>
              {' '}and will not be created again; committing again retries only what failed.
            </div>
          ) : null}
        </Alert>
      ) : null}
    </div>
  );
};

export default BiblioPersonAuthorRow;
