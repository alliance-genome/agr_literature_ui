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
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import { faQuestionCircle } from '@fortawesome/free-regular-svg-icons';

import BiblioPersonInstitutionStaging from './BiblioPersonInstitutionStaging';
import BiblioPersonAuthorRow from './BiblioPersonAuthorRow';
import BiblioPersonStubs from './BiblioPersonStubs';
import SectionLayoutModal from '../settings/SectionLayoutModal';
import { metaLabelFor } from '../../utils/recordMeta';
import {
  SECTION_DEFS,
  DEFAULT_LAYOUT,
  BIBLIO_PERSON_LAYOUT_COMPONENT_NAME,
  layoutToCssGrid,
  defaultHiddenSections,
} from './biblioPersonSections';
import '../sectionGrid.css';
import './biblioPerson.css';

import { AUTHOR_PERSON_STATUSES, AUTHOR_PERSON_DONE } from '../../utils/authorPersonDraft';

// The rules suggestWorkflowStatus applies, in curator terms.
const STATUS_HELP = (
  <Popover id="biblio-person-status-help" style={{ maxWidth: '30rem' }}>
    <Popover.Title as="h3">How the workflow status is set</Popover.Title>
    <Popover.Content>
      <p style={{ marginBottom: '0.4rem' }}>
        Connections and the status are changed only on this page, and only when you press
        Commit. The dropdown shows the status Commit will set, chosen from your changes:
      </p>
      <ul style={{ paddingLeft: '1.1rem', marginBottom: '0.4rem' }}>
        <li>No changes: the status stays as it is.</li>
        <li>You connect authors (link, create, or assign a person who is not an author) and every
          author will have a person: <strong>Done</strong>, from any status, including Blocked.</li>
        <li>You connect authors but some will still have no person: <strong>In progress</strong>,
          unless the paper is <strong>Blocked</strong>, which stays Blocked.</li>
        <li>You only remove connections: <strong>In progress</strong> if the paper was Done,
          otherwise the status stays as it is.</li>
        <li>Removing a person who is not an author never changes the status.</li>
      </ul>
      <p style={{ marginBottom: '0.4rem' }}>
        You can pick any status yourself before Commit; your choice is kept whatever else you change.
        To set a status without changing any connections, just pick it and Commit.
      </p>
      <p style={{ marginBottom: 0 }}>
        Done is not set if any change fails, and you are told why. Nothing can be changed here
        unless the paper already has an author-person workflow status for your MOD.
      </p>
    </Popover.Content>
  </Popover>
);

const STATUS_TITLE = 'Choosing a status stages it; it is written when you press the button, '
  + 'after the author changes. Done is chosen for you once every author will be linked.';

const statusLabel = (atp) => {
  const found = AUTHOR_PERSON_STATUSES.find((option) => option.atp === atp);
  return found ? found.label : atp;
};

// Why nothing on the screen can be changed, or null when it can.
const lockedReason = (statusLoad, editable, mod) => {
  if (statusLoad === 'loading') return 'Checking this reference\'s author-person curation status…';
  if (statusLoad === 'error') {
    return 'Could not read this reference\'s author-person curation status, so links cannot be '
      + 'changed. Reload the page to try again.';
  }
  if (editable) return null;
  return `This reference is not in author-person curation${mod && mod !== 'No' ? ` for ${mod}` : ''}, `
    + 'so its author and person links can be viewed but not changed. Author-person curation '
    + 'is requested when the reference is sorted into the corpus.';
};

const BiblioPersonPanel = ({
  referenceCurie, title, crossReferences, mainFiles, loadingFileNames, onDownloadFile,
  authors, stubs, staged, drafts, matches, matchState, personDetails,
  errorsByAuthor, results, showAll, matchesOpen, committing, commitSummary, blockedReason,
  plannedCount, mod, statusLoad, editable, storedStatus, workflowStatus, statusChanged,
  autoStatus, onWorkflowStatusChange,
  onStagedChange, onAddInstitution, onDraftChange, onToggleShowAll, onToggleMatches,
  onCommit, onBack, onToggleUnlink, availableAuthors, stubAssignments, stubRemovals,
  onAssignStub, onToggleStubRemoval,
}) => {
  const invalidCount = Object.values(errorsByAuthor).filter((e) => e.length > 0).length;
  const locked = lockedReason(statusLoad, editable, mod);
  // Every control that stages a change, not just the button: a curator must not be
  // able to build up a page of edits that can never be committed.
  const inputsDisabled = committing || !editable;

  const cognitoMod = useSelector((state) => state.isLogged.cognitoMod);
  const testerMod = useSelector((state) => state.isLogged.testerMod);
  const effectiveMod = testerMod !== 'No' ? testerMod : cognitoMod;

  // ---- layout / visibility state (restored from saved prefs) ----
  const [activeLayout, setActiveLayout] = useState(null);
  const [hiddenSections, setHiddenSections] = useState(() => defaultHiddenSections(effectiveMod));
  // Who last touched each author row and when, same two toggles the person and
  // laboratory screens carry. Default on, as they do.
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showCurator, setShowCurator] = useState(true);
  const metaLabel = metaLabelFor({ showCurator, showTimestamps });
  // The slot only reserves room for what is actually being shown. Derived here beside
  // the label so the two can never disagree about which halves are on.
  // With neither toggle on there is no slot at all -- not a narrow empty one. The
  // author row happened to get this right by testing the label, but the stub row
  // rendered its column unconditionally and kept 8.5rem of empty space on every row.
  const showMeta = showCurator || showTimestamps;
  const metaSlotClass = `biblio-person-slot-meta ${
    showCurator && showTimestamps ? 'biblio-person-slot-meta-both'
      : showCurator ? 'biblio-person-slot-meta-curator'
        : 'biblio-person-slot-meta-time'}`;
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
    if (typeof prefs.showTimestamps === 'boolean') setShowTimestamps(prefs.showTimestamps);
    if (typeof prefs.showCurator === 'boolean') setShowCurator(prefs.showCurator);
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

  // Everything the header points at -- the per-author error marks and the per-author
  // commit results -- lives inside the Authors section, which is now hideable. Hide it
  // with an invalid draft and Commit is disabled by marks that render nowhere, with no
  // clue that unhiding is the way out. Both messages say so.
  const authorsHidden = hiddenSections.has('authors');
  const hiddenHint = authorsHidden ? ' — the Authors section is hidden' : '';

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
      assignments={stubAssignments}
      removals={stubRemovals}
      onAssign={onAssignStub}
      onToggleRemoval={onToggleStubRemoval}
      disabled={inputsDisabled}
      metaLabel={metaLabel}
      metaSlotClass={metaSlotClass}
      showMeta={showMeta}
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
          disabled={inputsDisabled}
          matchesOpen={!!matchesOpen[author.author_id]}
          showAllMatches={!!showAll[author.author_id]}
          onToggleMatches={() => onToggleMatches(author.author_id)}
          onToggleUnlink={() => onToggleUnlink(author.author_id)}
          onToggleShowAll={() => onToggleShowAll(author.author_id)}
          onChange={(patch) => onDraftChange(author.author_id, patch)}
          metaLabel={metaLabel}
          metaSlotClass={metaSlotClass}
          showMeta={showMeta}
        />
      ))}
    </div>
  );

  sectionRows.institutions = (
    <BiblioPersonInstitutionStaging
      staged={staged}
      disabled={inputsDisabled}
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
          <strong style={{ flex: 1, whiteSpace: 'nowrap' }}>Author → Person · {referenceCurie}</strong>
          {/* Stages the status like every other control here stages something; the
              button writes it, after the author changes. Disabled outright when the
              reference has no author-person status: the transition API cannot start a
              workflow from nothing, and that is also what locks the rest of the page. */}
          <span title={locked || STATUS_TITLE} style={{ whiteSpace: 'nowrap' }}>
            <span className="biblio-person-muted">Workflow status </span>
            {/* Click-to-open like the search-bar and query-builder ?s, with the same
                outline icon, so every ? in the app behaves alike. A native <button> so
                it is keyboard operable. */}
            <OverlayTrigger trigger="click" placement="bottom-start" rootClose overlay={STATUS_HELP}>
              <button
                type="button"
                aria-label="How the workflow status is set"
                aria-haspopup="dialog"
                style={{
                  display: 'inline-flex', alignItems: 'center', border: 'none', padding: 0,
                  background: 'none', color: 'inherit', lineHeight: 1, cursor: 'pointer',
                  verticalAlign: 'middle', marginRight: '0.3rem',
                }}
              >
                {/* Sized to the 0.8rem label beside it, not the 20px the header ?s use:
                    at 20px it towered over the small text. Grey like the label. */}
                <FontAwesomeIcon icon={faQuestionCircle} style={{ width: '0.95rem', height: '0.95rem', color: '#666' }} />
              </button>
            </OverlayTrigger>
            <Form.Control
              as="select"
              size="sm"
              value={workflowStatus || ''}
              disabled={inputsDisabled}
              onChange={(e) => onWorkflowStatusChange(e.target.value)}
              aria-label="author to person workflow status"
              // The editor's own convention for a staged-but-unsaved value: purple
              // until it is written, plain once it matches what is stored. Says the
              // same thing a "(not saved yet)" note did, without the words.
              className={statusChanged ? 'updated' : ''}
              style={{ width: 'auto', display: 'inline-block' }}
            >
              {workflowStatus ? null : <option value="">(none)</option>}
              {AUTHOR_PERSON_STATUSES.map((option) => (
                <option key={option.atp} value={option.atp}>
                  {option.label}
                  {option.atp === workflowStatus && autoStatus
                    ? (option.atp === AUTHOR_PERSON_DONE ? ' (all authors linked)' : ' (from your changes)')
                    : ''}
                </option>
              ))}
              {/* A stored state outside the four would otherwise render as the first
                  option and be silently "changed" by the next commit. */}
              {workflowStatus && !AUTHOR_PERSON_STATUSES.some((o) => o.atp === workflowStatus)
                ? <option value={workflowStatus}>{workflowStatus}</option> : null}
            </Form.Control>
          </span>

          {/* One button that names exactly what it is about to do, rather than a button
              per status: four statuses times commit-or-not is a matrix, and it leaves
              "commit nothing but set the status" with nowhere to live. */}
          {/* Title on the wrapper, not the button. A disabled control swallows pointer
              events, so a title on it renders no tooltip in Firefox or Safari -- which
              is precisely the state this message exists for. ReorderAuthorsButton in
              BiblioEditor already wraps for this reason. */}
          <span title={locked || blockedReason
            || (invalidCount > 0 ? `Fix the problems marked below first${hiddenHint}` : '')}>
          <Button
            variant="primary"
            disabled={inputsDisabled || (plannedCount === 0 && !statusChanged)
              || invalidCount > 0 || !!blockedReason}
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
          </span>
          <Button variant="outline-secondary" disabled={committing} onClick={onBack}>
            <FontAwesomeIcon icon={faTimes} /> Back to editor
          </Button>

          <SectionLayoutModal
            sectionDefs={SECTION_DEFS}
            defaultLayout={DEFAULT_LAYOUT}
            componentName={BIBLIO_PERSON_LAYOUT_COMPONENT_NAME}
            // Names the surface, not the record. "Person" alone rendered "Changes
            // apply to the person", which on a screen whose whole job is editing person
            // records reads as an edit to a record rather than to the layout.
            pageLabel="Person screen"
            onApplyPrefs={applyPrefs}
            current={{
              layout: activeLayout,
              hidden: Array.from(hiddenSections),
              showTimestamps,
              showCurator,
            }}
            defaultHidden={defaultHiddenSections(effectiveMod)}
            onToggleSection={toggleSection}
            onToggleTimestamps={setShowTimestamps}
            onToggleCurator={setShowCurator}
          />
        </Col>
      </Row>

      {/* Outside the grid with the header: both alerts report on the commit the header's
          button just ran, so they belong beside it rather than wherever the curator has
          dragged a section to. */}
      {blockedReason ? <Alert variant="warning">{blockedReason}</Alert> : null}

      {/* Said on the page, not only in tooltips: every control below is greyed out, and
          a curator who opened this to fix a link needs to know why at a glance. */}
      {locked ? (
        <Alert variant={statusLoad === 'error' ? 'danger' : 'secondary'}>{locked}</Alert>
      ) : null}

      {/* The only blocked state with nothing else on screen to explain it. When Authors
          is visible its per-author errors are right there in red; hidden, the button
          just greys out while still reading "Commit 3". */}
      {invalidCount > 0 && authorsHidden ? (
        <Alert variant="danger">
          Commit is blocked by {invalidCount === 1 ? 'a problem' : `${invalidCount} problems`} in
          the Authors section, which is hidden. Show it from the settings gear to see
          {invalidCount === 1 ? ' it' : ' them'}.
        </Alert>
      ) : null}

      {commitSummary ? (
        <Alert variant={commitSummary.failed > 0
          || (commitSummary.status && commitSummary.status.state !== 'saved') ? 'warning' : 'success'}>
          {commitSummary.total > 0 ? (
            <>
              {commitSummary.applied} of {commitSummary.total} applied
              {commitSummary.failed > 0
                ? `, ${commitSummary.failed} left as-is — see the messages below${hiddenHint}. `
                  + 'Committing again retries only what failed.'
                : '.'}
            </>
          ) : null}
          {/* Said out loud rather than left to the tooltip: the button offered to set a
              status, so it owes the curator a plain statement of whether it did. */}
          {commitSummary.lostLinks > 0 ? (
            <div>
              {commitSummary.lostLinks === 1 ? 'One author' : `${commitSummary.lostLinks} authors`} lost
              their previous link but did not get the new one, so{' '}
              {commitSummary.lostLinks === 1 ? 'it has' : 'they have'} no person now.
            </div>
          ) : null}
          {commitSummary.status && commitSummary.status.state === 'saved' ? (
            <div>Workflow status set to {statusLabel(commitSummary.status.atp)}.</div>
          ) : null}
          {commitSummary.status && commitSummary.status.state === 'skipped' ? (
            <div>
              Workflow status was <strong>not</strong> set to {statusLabel(commitSummary.status.atp)}:
              not every change above went through, so not every author has the person you
              chose. It is still {storedStatus ? statusLabel(storedStatus) : 'unchanged'}; fix
              what failed and commit again.
            </div>
          ) : null}
          {commitSummary.status && commitSummary.status.state === 'failed' ? (
            <div>
              Workflow status was <strong>not</strong> set
              to {statusLabel(commitSummary.status.atp)}: {commitSummary.status.message}
            </div>
          ) : null}
        </Alert>
      ) : null}

      {sectionsRender}
    </div>
  );
};

export default BiblioPersonPanel;
