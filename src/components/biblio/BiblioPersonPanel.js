// Presentational half of the Person screen.
//
// Owns no state: BiblioPerson.js holds the drafts and staged institutions so they
// survive anything that moves this component in the tree.
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

import BiblioPersonInstitutionStaging from './BiblioPersonInstitutionStaging';
import BiblioPersonAuthorRow from './BiblioPersonAuthorRow';
import './biblioPerson.css';

const BiblioPersonPanel = ({
  referenceCurie, authors, stubs, staged, drafts, matches, matchState, personDetails,
  errorsByAuthor, results, showAll, matchesOpen, committing, commitSummary, blockedReason,
  plannedCount, unlinking,
  onStagedChange, onAddInstitution, onDraftChange, onToggleShowAll, onToggleMatches,
  onCommit, onBack, onRemoveLink,
}) => {
  const invalidCount = Object.values(errorsByAuthor).filter((e) => e.length > 0).length;

  return (
    <div className="biblio-person">
      <Row className="biblio-person-header">
        <Col sm="12" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <strong style={{ flex: 1, whiteSpace: 'nowrap' }}>Author → person · {referenceCurie}</strong>
          <Button
            variant="primary"
            disabled={committing || plannedCount === 0 || invalidCount > 0 || !!blockedReason}
            title={blockedReason || (invalidCount > 0 ? 'Fix the problems marked below first' : '')}
            onClick={onCommit}
          >
            {committing
              ? <><Spinner animation="border" size="sm" /> Committing…</>
              : <><FontAwesomeIcon icon={faCheck} /> Commit {plannedCount || ''}</>}
          </Button>
          <Button variant="outline-secondary" disabled={committing} onClick={onBack}>
            <FontAwesomeIcon icon={faTimes} /> Back to editor
          </Button>
        </Col>
      </Row>

      {blockedReason ? <Alert variant="warning">{blockedReason}</Alert> : null}

      {commitSummary ? (
        <Alert variant={commitSummary.failed > 0 ? 'warning' : 'success'}>
          {commitSummary.applied} of {commitSummary.total} applied
          {commitSummary.failed > 0
            ? `, ${commitSummary.failed} left as-is — see the messages below. Committing again retries only what failed.`
            : '.'}
        </Alert>
      ) : null}

      {stubs.length > 0 ? (
        <Alert variant="info">
          {stubs.length} {stubs.length === 1 ? 'person is' : 'people are'} already attached to this
          reference without being an author:{' '}
          {stubs.map((s) => s.person_curie).filter(Boolean).join(', ')}.
          {' '}Linking an author to one of them absorbs the attachment into that author.
        </Alert>
      ) : null}

      <Row style={{ marginTop: '0.6rem' }}>
        <Col sm="12"><strong>Authors</strong></Col>
      </Row>

      {authors.length === 0 ? (
        <Alert variant="warning">This reference has no authors.</Alert>
      ) : null}

      {authors.map((author) => (
        <BiblioPersonAuthorRow
          key={author.author_id}
          author={author}
          draft={drafts[author.author_id]}
          staged={staged}
          matches={matches[author.author_id] || []}
          matchState={matchState[author.author_id] || 'loading'}
          selectedPersonDetail={
            drafts[author.author_id] && drafts[author.author_id].selectedPerson
              ? personDetails[drafts[author.author_id].selectedPerson.curie] || null
              : null
          }
          errors={errorsByAuthor[author.author_id] || []}
          result={results[author.author_id] || null}
          disabled={committing}
          matchesOpen={!!matchesOpen[author.author_id]}
          showAllMatches={!!showAll[author.author_id]}
          onToggleMatches={() => onToggleMatches(author.author_id)}
          unlinking={!!unlinking[author.author_id]}
          onRemoveLink={() => onRemoveLink(author.author_id)}
          onToggleShowAll={() => onToggleShowAll(author.author_id)}
          onChange={(patch) => onDraftChange(author.author_id, patch)}
        />
      ))}

      {/* Below the authors: the institution numbers are referenced from each author's
          dropdowns, so the authors are what the curator works down and the institutions
          are the reference material they point at. */}
      <BiblioPersonInstitutionStaging
        staged={staged}
        disabled={committing}
        onChange={onStagedChange}
        onAdd={onAddInstitution}
      />
    </div>
  );
};

export default BiblioPersonPanel;
