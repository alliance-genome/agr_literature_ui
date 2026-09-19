// Presentational half of the Person screen.
//
// Owns no working state: BiblioPerson.js holds the drafts and staged institutions so
// they survive anything that moves this component in the tree. The section layout IS
// held here, because it is presentation rather than work in progress -- the same place
// PersonDisplay and LaboratoryDisplay keep theirs.
import React, { useEffect, useRef, useState } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

import BiblioPersonInstitutionStaging from './BiblioPersonInstitutionStaging';
import BiblioPersonAuthorRow from './BiblioPersonAuthorRow';
import BiblioPersonStubs from './BiblioPersonStubs';
import SectionLayoutModal from '../settings/SectionLayoutModal';
import {
  SECTION_DEFS,
  DEFAULT_LAYOUT,
  BIBLIO_PERSON_LAYOUT_COMPONENT_NAME,
  layoutToCssGrid,
  defaultHiddenSections,
} from './biblioPersonSections';
import '../sectionGrid.css';
import './biblioPerson.css';

// Placeholder states for the author-to-person workflow tag. ABC has no such tag yet
// (person_editor.cgi marks a paper author_person-complete at the end of a batch; there
// is no equivalent here), so these are hard-coded rather than read from a vocabulary.
// When the tag exists these become vocabulary terms and the select is enabled -- the
// values are lowercase to match how ABC's existing workflow vocabulary stores them
// ("needed", "complete").
const WORKFLOW_STATUS_PLACEHOLDER = [
  { value: 'needed', label: 'Needed' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
];

// The status a freshly opened screen starts from. Once the tag exists this becomes the
// reference's stored value, and "changed" means differing from that instead.
export const WORKFLOW_STATUS_DEFAULT = 'needed';

const WORKFLOW_NOT_WIRED = 'Choosing a status stages it; nothing is saved until you '
  + 'press the button — and the status half of that is not wired yet, because the '
  + 'author_person workflow tag does not exist in ABC.';

const statusLabel = (value) => {
  const found = WORKFLOW_STATUS_PLACEHOLDER.find((option) => option.value === value);
  return found ? found.label : value;
};

const BiblioPersonPanel = ({
  referenceCurie, title, crossReferences, mainFiles, loadingFileNames, onDownloadFile,
  authors, stubs, staged, drafts, matches, matchState, personDetails,
  errorsByAuthor, results, showAll, matchesOpen, committing, commitSummary, blockedReason,
  plannedCount, unlinking, workflowStatus, onWorkflowStatusChange,
  onStagedChange, onAddInstitution, onDraftChange, onToggleShowAll, onToggleMatches,
  onCommit, onBack, onRemoveLink, availableAuthors, linkingStub, onLinkStub,
  removingStub, onRemoveStub,
}) => {
  const invalidCount = Object.values(errorsByAuthor).filter((e) => e.length > 0).length;
  const statusChanged = workflowStatus !== WORKFLOW_STATUS_DEFAULT;

  const cognitoMod = useSelector((state) => state.isLogged.cognitoMod);
  const testerMod = useSelector((state) => state.isLogged.testerMod);
  const effectiveMod = testerMod !== 'No' ? testerMod : cognitoMod;

  // ---- layout / visibility state (restored from saved prefs) ----
  const [activeLayout, setActiveLayout] = useState(null);
  const [hiddenSections, setHiddenSections] = useState(() => defaultHiddenSections(effectiveMod));
  // Once the user or a loaded setting decides visibility, stop letting the MOD default
  // override it.
  const visibilityDecidedRef = useRef(false);

  useEffect(() => {
    if (visibilityDecidedRef.current) return;
    setHiddenSections(defaultHiddenSections(effectiveMod));
  }, [effectiveMod]);

  const applyPrefs = (prefs) => {
    if (!prefs) return;
    if (Array.isArray(prefs.layout)) setActiveLayout(prefs.layout);
    if (Array.isArray(prefs.hidden)) {
      setHiddenSections(new Set(prefs.hidden));
      visibilityDecidedRef.current = true;
    }
    // showTimestamps / showCurator are deliberately ignored: this screen has no
    // per-field metadata to toggle, so a layout saved elsewhere carrying them applies
    // its arrangement here and drops the rest.
  };

  const toggleSection = (id) => {
    visibilityDecidedRef.current = true;
    setHiddenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ---- one bucket per section, keyed by the ids in SECTION_DEFS ----
  const sectionRows = {};

  // Which paper this is. Reconciling authors means judging whether a candidate person
  // plausibly wrote THIS work, so the title, its identifiers and the PDF itself belong
  // on the screen rather than a tab away.
  //
  // All three rows always render, "Not Available" and all: a missing title or a
  // reference with no PDF is worth knowing about, and a row that simply vanishes leaves
  // the curator unsure whether it is absent or still loading.
  //
  // Only these three rows -- the curie line, the status, Commit, Back and the settings
  // gear are in the fixed header below, not in this section.
  sectionRows.reference = (
    <div className="biblio-person-section">
      <Row>
        <Col sm="12">
          <span className="biblio-person-reflabel">title:</span>
          {title || <span className="biblio-person-muted">Not Available</span>}
        </Col>
      </Row>

      <Row>
        <Col sm="12">
          <span className="biblio-person-reflabel">cross references:</span>
          {crossReferences.length === 0
            ? <span className="biblio-person-muted">Not Available</span>
            : crossReferences.map((xref, index) => {
              // Same source the display tab uses: the descriptor url, falling back to
              // the first page's url.
              const url = xref.url
                || (Array.isArray(xref.pages) && xref.pages.length > 0 ? xref.pages[0].url : '');
              return (
                <span key={xref.curie || index}>
                  {index > 0 ? ' | ' : ''}
                  {xref.is_obsolete ? <span style={{ color: '#a00' }}>obsolete </span> : null}
                  {url
                    ? <a href={url} rel="noreferrer noopener" target="_blank">{xref.curie}</a>
                    : xref.curie}
                </span>
              );
            })}
        </Col>
      </Row>

      <Row>
        <Col sm="12">
          <span className="biblio-person-reflabel">main pdfs:</span>
          {/* file_class 'main' only -- the paper itself, not supplements, figures or
              the additional-files tarball. */}
          {mainFiles.length === 0
            ? <span className="biblio-person-muted">Not Available</span>
            : mainFiles.map((file, index) => (
              <span key={file.id}>
                {index > 0 ? ' | ' : ''}
                {file.allowed ? (
                  <>
                    <button type="button" className="biblio-person-toggle"
                      onClick={() => onDownloadFile(file.id, file.filename)}>
                      {file.filename}
                    </button>
                    {loadingFileNames && loadingFileNames.has(file.filename)
                      ? <Spinner animation="border" size="sm" /> : null}
                  </>
                ) : (
                  <span title="You do not have permission to download this file">
                    {file.filename}
                    {file.mods.length > 0 ? ` (${file.mods.join(', ')})` : ''}
                  </span>
                )}
              </span>
            ))}
        </Col>
      </Row>
    </div>
  );

  sectionRows.unmatched = (
    <BiblioPersonStubs
      stubs={stubs}
      availableAuthors={availableAuthors}
      linkingStub={linkingStub}
      removingStub={removingStub}
      onLinkStub={onLinkStub}
      onRemoveStub={onRemoveStub}
      disabled={committing}
    />
  );

  sectionRows.authors = (
    <div className="biblio-person-section">
      <Row>
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
    </div>
  );

  sectionRows.institutions = (
    <BiblioPersonInstitutionStaging
      staged={staged}
      disabled={committing}
      onChange={onStagedChange}
      onAdd={onAddInstitution}
    />
  );

  // ---- arrange the sections per the active layout, dropping hidden ones ----
  const grid = layoutToCssGrid(activeLayout);
  const wideLayout = !!(grid && grid.multiColumn);
  const knownIds = SECTION_DEFS.map((s) => s.id);
  const orderedIds = (
    grid ? [...grid.order, ...knownIds.filter((id) => !grid.order.includes(id))] : knownIds
  ).filter((id) => !hiddenSections.has(id));

  const sectionsRender = grid ? (
    <div
      className={`section-grid${wideLayout ? ' section-grid--wide' : ''}`}
      style={{ '--section-col-floor': `${grid.colFloor}px` }}
    >
      {orderedIds.map((id) => (
        <div
          key={id}
          className="section-grid__item"
          style={grid.styles[id] || { gridColumn: '1 / -1' }}
        >
          {sectionRows[id]}
        </div>
      ))}
    </div>
  ) : (
    orderedIds.map((id) => <React.Fragment key={id}>{sectionRows[id]}</React.Fragment>)
  );

  return (
    <div className="biblio-person">
      {/* Fixed above the arrangeable sections, and absent from SECTION_DEFS on purpose:
          a curator must never be able to hide or reorder the button that writes. */}
      <Row className="biblio-person-header">
        <Col sm="12" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <strong style={{ flex: 1, whiteSpace: 'nowrap' }}>Author → person · {referenceCurie}</strong>
          {/* Enabled, and not misleading for being so: this dropdown never writes on its
              own in the finished design either -- it stages the intended status, the way
              every other dropdown and checkbox on this screen stages something. The
              button is what writes, and it is the status half of the button that is not
              wired yet. */}
          <span title={WORKFLOW_NOT_WIRED} style={{ whiteSpace: 'nowrap' }}>
            <span className="biblio-person-muted">Workflow status (not wired up) </span>
            <Form.Control
              as="select"
              size="sm"
              value={workflowStatus}
              disabled={committing}
              onChange={(e) => onWorkflowStatusChange(e.target.value)}
              aria-label="author to person workflow status"
              // The editor's own convention for a staged-but-unsaved value: purple
              // until it is written, plain once it matches what is stored. Says the
              // same thing a "(not saved yet)" note did, without the words.
              className={statusChanged ? 'updated' : ''}
              style={{ width: 'auto', display: 'inline-block' }}
            >
              {WORKFLOW_STATUS_PLACEHOLDER.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Form.Control>
          </span>

          {/* One button that names exactly what it is about to do, rather than a button
              per status: four statuses times commit-or-not is a matrix, and it leaves
              "commit nothing but set the status" with nowhere to live. */}
          <Button
            variant="primary"
            disabled={committing || (plannedCount === 0 && !statusChanged)
              || invalidCount > 0 || !!blockedReason}
            title={blockedReason || (invalidCount > 0 ? 'Fix the problems marked below first' : '')}
            onClick={onCommit}
          >
            {committing
              ? <><Spinner animation="border" size="sm" /> Committing…</>
              : (
                <>
                  <FontAwesomeIcon icon={faCheck} />{' '}
                  {[
                    plannedCount > 0 ? `Commit ${plannedCount}` : '',
                    statusChanged ? `${plannedCount > 0 ? 'set' : 'Set'} ${statusLabel(workflowStatus)}` : '',
                  ].filter(Boolean).join(' · ') || 'Commit'}
                </>
              )}
          </Button>
          <Button variant="outline-secondary" disabled={committing} onClick={onBack}>
            <FontAwesomeIcon icon={faTimes} /> Back to editor
          </Button>

          {/* No onToggleTimestamps / onToggleCurator: this screen has no per-field
              metadata, and the modal hides that group when neither is supplied. */}
          <SectionLayoutModal
            sectionDefs={SECTION_DEFS}
            defaultLayout={DEFAULT_LAYOUT}
            componentName={BIBLIO_PERSON_LAYOUT_COMPONENT_NAME}
            pageLabel="Person"
            onApplyPrefs={applyPrefs}
            current={{ layout: activeLayout, hidden: Array.from(hiddenSections) }}
            onToggleSection={toggleSection}
          />
        </Col>
      </Row>

      {/* Outside the grid with the header: both alerts report on the commit the header's
          button just ran, so they belong beside it rather than wherever the curator has
          dragged a section to. */}
      {blockedReason ? <Alert variant="warning">{blockedReason}</Alert> : null}

      {commitSummary ? (
        <Alert variant={commitSummary.failed > 0 || commitSummary.statusUnsaved ? 'warning' : 'success'}>
          {commitSummary.total > 0 ? (
            <>
              {commitSummary.applied} of {commitSummary.total} applied
              {commitSummary.failed > 0
                ? `, ${commitSummary.failed} left as-is — see the messages below. Committing again retries only what failed.`
                : '.'}
            </>
          ) : null}
          {/* Said out loud rather than left to the tooltip: the button offered to set a
              status, so it owes the curator a plain statement that it did not. */}
          {commitSummary.statusUnsaved ? (
            <div>
              Status was <strong>not</strong> saved — the author_person workflow tag does
              not exist in ABC yet.
            </div>
          ) : null}
        </Alert>
      ) : null}

      {sectionsRender}
    </div>
  );
};

export default BiblioPersonPanel;
