// Stateful host for the Person screen (author -> person reconciliation).
//
// Reached at /Biblio/?action=person&referenceCurie=..., so it is linkable from
// anywhere. It is a first-class action rather than a modal over the editor because
// it is always full-page -- there is no windowed mode to toggle back to.
//
// Like BiblioAuthorReorder, the working state never touches referenceJsonLive:
// writing there would set referenceJsonHasChange and make the reference look dirty
// inside a screen that is not editing it. Leaving is just an unmount.
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';

import Container from 'react-bootstrap/Container';

import BiblioPersonPanel, { WORKFLOW_STATUS_DEFAULT } from './BiblioPersonPanel';
import { api } from '../../api';
import { orderedAuthors } from '../../utils/authorOrdering';
import { mainFilesForCurator } from '../../utils/mainReferenceFiles';
import {
  stagedInstitutionsFromAuthors, appendStagedInstitution, draftFromAuthor,
  matchQueryForAuthor, validateDraft, buildCommitPlan,
} from '../../utils/authorPersonDraft';
import {
  executeCommitPlan, unlinkAuthorPerson, linkAuthorToPerson, deleteAuthorRow,
} from '../../actions/authorPersonActions';
import {
  biblioQueryReferenceCurie, fetchReferenceFiles, downloadReferencefile,
} from '../../actions/biblioActions';

// Matches are fetched for every author as the page opens. Three at a time keeps a
// fifty-author reference from opening fifty sockets at once while still finishing
// a normal paper's authors in about the time it takes to read the staging area.
const MATCH_CONCURRENCY = 3;

const BiblioPerson = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const referenceCurie = useSelector((state) => state.biblio.referenceCurie);
  const referenceJsonLive = useSelector((state) => state.biblio.referenceJsonLive);
  const referenceFiles = useSelector((state) => state.biblio.referenceFiles);
  const loadingFileNames = useSelector((state) => state.biblio.loadingFileNames);
  const accessToken = useSelector((state) => state.isLogged.accessToken);
  const cognitoMod = useSelector((state) => state.isLogged.cognitoMod);
  const testerMod = useSelector((state) => state.isLogged.testerMod);
  const accessLevel = (testerMod !== 'No') ? testerMod : cognitoMod;

  // Seeded once from the reference as it stood when the screen opened. A refetch
  // mid-edit must not wipe a half-filled staging area, so these are not recomputed.
  const [authors] = useState(() => orderedAuthors(referenceJsonLive.authors));
  const [staged, setStaged] = useState(() => stagedInstitutionsFromAuthors(authors));
  const [drafts, setDrafts] = useState(() => {
    // Seeded against the same staged list, so every author starts on the institution
    // its own affiliation produced rather than on "(none)".
    const seededStaged = stagedInstitutionsFromAuthors(authors);
    const seeded = {};
    for (const author of authors) seeded[author.author_id] = draftFromAuthor(author, seededStaged);
    return seeded;
  });

  const [matches, setMatches] = useState({});
  const [matchState, setMatchState] = useState({});
  const [personDetails, setPersonDetails] = useState({});
  const [showAll, setShowAll] = useState({});
  // Possible people are a count until asked for: a dozen authors each listing eight
  // candidates is most of the page, and usually none of them are the person wanted.
  const [matchesOpen, setMatchesOpen] = useState({});
  const [results, setResults] = useState({});
  const [committing, setCommitting] = useState(false);
  const [commitSummary, setCommitSummary] = useState(null);
  const [unlinking, setUnlinking] = useState({});
  // Staged like everything else on this screen -- choosing it writes nothing. The
  // commit button is what would apply it, once the author_person tag exists.
  const [workflowStatus, setWorkflowStatus] = useState(WORKFLOW_STATUS_DEFAULT);

  // People attached to this reference without an author_order. Seeded once and then
  // owned here, because a stub leaves the list the moment it is resolved.
  //
  // person_curie is null on these rows for the same reason it is null on the authors:
  // the reference endpoint serialises AuthorModel through jsonable_encoder and the
  // model has no person_curie property. Verified against dev4002. So they arrive as a
  // bare person_id and the curie is resolved below.
  const [stubs, setStubs] = useState(() => (
    Array.isArray(referenceJsonLive.author_person_without_author_order)
      ? referenceJsonLive.author_person_without_author_order
        .filter((row) => row && row.person_id)
        .map((row) => ({
          author_id: row.author_id,
          person_id: row.person_id,
          curie: row.person_curie || null,
          name: '',
          resolveFailed: false,
          error: '',
        }))
      : []
  ));
  const [linkingStub, setLinkingStub] = useState(null);
  const [removingStub, setRemovingStub] = useState(null);

  // Set true on mount as well as cleared on unmount. Clearing only would be correct
  // today but is a landmine: StrictMode's simulated unmount/remount would leave this
  // false on a live component, and with resolveAttempted already populated no person
  // would ever resolve and nothing would say why.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // person_ids a resolve has already been attempted for, successfully or not.
  //
  // Both resolve effects below read the same state they write, so without this each
  // resolution re-runs the effect and re-fires a request for every id still
  // outstanding -- N + (N-1) + ... requests for one page open. Worse, an id that can
  // never resolve (404, or a payload with no curie) stays outstanding forever, so
  // from then on ANY change to drafts re-fires the whole batch, including every
  // keystroke in an author's name field. Recording the attempt rather than the
  // success is what stops that: a failed resolve is not retried, it just stays
  // unresolved -- and both rows label that terminal state rather than leaving an
  // ellipsis implying a request still in flight.
  const resolveAttempted = useRef(new Set());

  // RowDisplayReferencefiles fetches these on the display tab; this screen never
  // renders it, so nothing would populate referenceFiles without asking here.
  useEffect(() => {
    if (referenceCurie !== '') dispatch(fetchReferenceFiles(referenceCurie));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referenceCurie]);

  // Possible people for every author, surname only. Narrowing the query here would
  // drop exactly the aka cases a real matcher exists to find, so the list is wide
  // and the row caps what it shows.
  useEffect(() => {
    let cancelled = false;
    // An author who already has a person needs no suggestions -- the screen shows the
    // link instead of the list, so searching for candidates would be work nobody sees.
    const queue = authors
      .filter((author) => !(author.person_id || author.person_curie))
      .map((author) => ({ author, query: matchQueryForAuthor(author) }));
    setMatchState(Object.fromEntries(queue.map(({ author }) => [author.author_id, 'loading'])));

    const worker = async () => {
      while (queue.length > 0) {
        const { author, query } = queue.shift();
        if (cancelled) return;
        if (!query) {
          if (!cancelled && mounted.current) {
            setMatches((m) => ({ ...m, [author.author_id]: [] }));
            setMatchState((s) => ({ ...s, [author.author_id]: 'done' }));
          }
          continue;
        }
        try {
          const res = await api.get('/person/by_name?name=' + encodeURIComponent(query));
          if (cancelled || !mounted.current) return;
          const found = Array.isArray(res.data) ? res.data.filter((p) => p && p.curie) : [];
          setMatches((m) => ({ ...m, [author.author_id]: found }));
          setMatchState((s) => ({ ...s, [author.author_id]: 'done' }));
          // by_name returns whole person records, so the compare panel already has
          // what it needs and never has to fetch a person the curator can see.
          setPersonDetails((d) => {
            const next = { ...d };
            for (const person of found) next[person.curie] = person;
            return next;
          });
        } catch (error) {
          console.error('person match error:', error);
          if (cancelled || !mounted.current) return;
          setMatches((m) => ({ ...m, [author.author_id]: [] }));
          setMatchState((s) => ({ ...s, [author.author_id]: 'error' }));
        }
      }
    };

    Promise.all(Array.from({ length: MATCH_CONCURRENCY }, worker));
    return () => { cancelled = true; };
  }, [authors]);

  const onDraftChange = useCallback((authorId, patch) => {
    setDrafts((prev) => ({ ...prev, [authorId]: { ...prev[authorId], ...patch } }));
  }, []);

  const onStagedChange = useCallback((number, patch) => {
    setStaged((prev) => prev.map((inst) => (inst.number === number ? { ...inst, ...patch } : inst)));
  }, []);

  const onToggleShowAll = useCallback((authorId) => {
    setShowAll((prev) => ({ ...prev, [authorId]: !prev[authorId] }));
  }, []);

  // Also what "confirm selection" and "change" call: confirming is just closing the
  // panel on a selection that is already made, so one toggle serves all three.
  const onToggleMatches = useCallback((authorId) => {
    setMatchesOpen((prev) => ({ ...prev, [authorId]: !prev[authorId] }));
  }, []);

  const onAddInstitution = useCallback(() => {
    setStaged((prev) => appendStagedInstitution(prev));
  }, []);

  // Removing a link writes immediately rather than staging, because everything staged
  // is gated on the author being unlinked: until the link is actually gone there is
  // nothing to suggest and nothing to create, so there is no batch for it to join.
  const onRemoveLink = useCallback(async (authorId) => {
    setUnlinking((prev) => ({ ...prev, [authorId]: true }));
    const result = await unlinkAuthorPerson(authorId);
    if (!mounted.current) return;
    setUnlinking((prev) => ({ ...prev, [authorId]: false }));
    if (!result.ok) {
      setResults((prev) => ({
        ...prev,
        [authorId]: { authorId, ok: false, message: result.message, createdPersonCurie: null },
      }));
      return;
    }
    // Drop every trace of the old link, including the commit pins: the author is
    // unreconciled again, so a fresh link or create must be plannable.
    setDrafts((prev) => ({
      ...prev,
      [authorId]: {
        ...prev[authorId],
        isLinked: false,
        existingPersonId: null,
        existingPersonCurie: null,
        existingPersonName: '',
        mode: 'none',
        selectedPerson: null,
        committedPersonCurie: null,
        createdPersonCurie: null,
        labLinkedCurie: null,
      },
    }));
    setResults((prev) => {
      const next = { ...prev };
      delete next[authorId];
      return next;
    });
    // Suggestions were never fetched for a linked author, so fetch them now that it
    // is unlinked -- otherwise the row offers an empty list.
    const author = authors.find((a) => a.author_id === authorId);
    const query = author ? matchQueryForAuthor(author) : '';
    if (!query) {
      setMatches((m) => ({ ...m, [authorId]: [] }));
      setMatchState((s) => ({ ...s, [authorId]: 'done' }));
      return;
    }
    setMatchState((s) => ({ ...s, [authorId]: 'loading' }));
    try {
      const res = await api.get('/person/by_name?name=' + encodeURIComponent(query));
      if (!mounted.current) return;
      const found = Array.isArray(res.data) ? res.data.filter((p) => p && p.curie) : [];
      setMatches((m) => ({ ...m, [authorId]: found }));
      setMatchState((s) => ({ ...s, [authorId]: 'done' }));
      setPersonDetails((d) => {
        const next = { ...d };
        for (const person of found) next[person.curie] = person;
        return next;
      });
    } catch (error) {
      console.error('person match error:', error);
      if (!mounted.current) return;
      setMatches((m) => ({ ...m, [authorId]: [] }));
      setMatchState((s) => ({ ...s, [authorId]: 'error' }));
    }
  }, [authors]);

  // Authors that arrived already linked carry only person_id (see draftFromAuthor), so
  // resolve each one to a curie and display name. /person/{curie_or_person_id} takes
  // either, so the id is enough. Without this the screen knows an author is linked but
  // cannot say to whom or offer a link to the record.
  useEffect(() => {
    const unresolved = Object.values(drafts)
      .filter((d) => d && d.isLinked && !d.existingPersonCurie && d.existingPersonId)
      .filter((d) => !resolveAttempted.current.has(d.existingPersonId));
    if (unresolved.length === 0) return;
    for (const draft of unresolved) {
      resolveAttempted.current.add(draft.existingPersonId);
      // Nothing retries this, so a failure is terminal and has to be recorded rather
      // than only logged -- otherwise the row sits on "…" forever, claiming a request
      // that will never land.
      const markFailed = () => {
        if (!mounted.current) return;
        setDrafts((prev) => ({
          ...prev,
          [draft.authorId]: { ...prev[draft.authorId], resolveFailed: true },
        }));
      };
      api.get('/person/' + draft.existingPersonId)
        .then((res) => {
          if (!mounted.current) return;
          if (!res.data || !res.data.curie) { markFailed(); return; }
          setPersonDetails((d) => ({ ...d, [res.data.curie]: res.data }));
          setDrafts((prev) => ({
            ...prev,
            [draft.authorId]: {
              ...prev[draft.authorId],
              existingPersonCurie: res.data.curie,
              existingPersonName: res.data.display_name || '',
              resolveFailed: false,
            },
          }));
        })
        .catch((error) => {
          console.error('linked person resolve error:', error);
          markFailed();
        });
    }
  }, [drafts]);

  // Stubs arrive as a bare person_id, so resolve each to a curie and name. Without
  // this the list can only say "person 5824", which names nobody.
  useEffect(() => {
    const unresolved = stubs
      .filter((stub) => !stub.curie && stub.person_id)
      .filter((stub) => !resolveAttempted.current.has(stub.person_id));
    if (unresolved.length === 0) return;
    for (const stub of unresolved) {
      resolveAttempted.current.add(stub.person_id);
      const markFailed = () => {
        if (!mounted.current) return;
        setStubs((prev) => prev.map((row) => (row.author_id === stub.author_id
          ? { ...row, resolveFailed: true } : row)));
      };
      api.get('/person/' + stub.person_id)
        .then((res) => {
          if (!mounted.current) return;
          if (!res.data || !res.data.curie) { markFailed(); return; }
          setStubs((prev) => prev.map((row) => (row.author_id === stub.author_id
            ? {
              ...row,
              curie: res.data.curie,
              name: res.data.display_name || '',
              resolveFailed: false,
            }
            : row)));
        })
        .catch((error) => {
          console.error('stub person resolve error:', error);
          markFailed();
        });
    }
  }, [stubs]);

  // Writes immediately: the stub vanishes on success and the author it resolves to
  // leaves the candidate list, so there is nothing for a staged version to batch with.
  const onLinkStub = useCallback(async (stub, authorId) => {
    if (!stub.curie) return;
    setLinkingStub(stub.author_id);
    const result = await linkAuthorToPerson(authorId, stub.curie);
    if (!mounted.current) return;
    setLinkingStub(null);
    if (!result.ok) {
      setStubs((prev) => prev.map((row) => (row.author_id === stub.author_id
        ? { ...row, error: result.message } : row)));
      return;
    }
    // link_person absorbed the stub row into the author, so it is gone server-side too.
    setStubs((prev) => prev.filter((row) => row.author_id !== stub.author_id));
    // The author now has a person, which both shows its linked row and takes it out of
    // every remaining stub's dropdown.
    setDrafts((prev) => ({
      ...prev,
      [authorId]: {
        ...prev[authorId],
        isLinked: true,
        existingPersonId: stub.person_id,
        existingPersonCurie: stub.curie,
        existingPersonName: stub.name || '',
        mode: 'none',
        selectedPerson: null,
      },
    }));
  }, []);

  // The person does not belong on this reference at all. DELETE, not unlink: a
  // person-only row has no author_order, so clearing its person_id would leave
  // ck_author_person_or_order unsatisfiable and the API refuses it.
  const onRemoveStub = useCallback(async (stub) => {
    setRemovingStub(stub.author_id);
    const result = await deleteAuthorRow(stub.author_id);
    if (!mounted.current) return;
    setRemovingStub(null);
    if (!result.ok) {
      setStubs((prev) => prev.map((row) => (row.author_id === stub.author_id
        ? { ...row, error: result.message } : row)));
      return;
    }
    setStubs((prev) => prev.filter((row) => row.author_id !== stub.author_id));
  }, []);

  // A person picked from the typeahead rather than the match list is not in
  // personDetails yet, so fetch it -- the compare panel is useless without it.
  useEffect(() => {
    const wanted = Object.values(drafts)
      .filter((d) => d && d.mode === 'link' && d.selectedPerson)
      .map((d) => d.selectedPerson.curie)
      .filter((curie) => curie && !personDetails[curie]);
    if (wanted.length === 0) return;
    for (const curie of new Set(wanted)) {
      api.get('/person/' + curie)
        .then((res) => {
          if (!mounted.current || !res.data) return;
          setPersonDetails((d) => ({ ...d, [curie]: res.data }));
        })
        .catch((error) => console.error('person detail fetch error:', error));
    }
  }, [drafts, personDetails]);

  const errorsByAuthor = {};
  for (const author of authors) {
    errorsByAuthor[author.author_id] = validateDraft(drafts[author.author_id], staged);
  }

  // From the plan itself rather than counting drafts in link/create mode, so the
  // button promises exactly what the commit will do. Counting modes said "Commit 4"
  // when three of those four were already committed and would be skipped.
  const plannedCount = buildCommitPlan(authors.map((a) => drafts[a.author_id]), staged).length;

  // Only authors with no person can take one of these stubs. uq_author_ref_person
  // allows a person one author per reference, so offering a linked author would only
  // earn a 409.
  const availableAuthors = authors.filter((author) => {
    const draft = drafts[author.author_id];
    return draft && !draft.isLinked;
  });

  const onCommit = async () => {
    const plans = buildCommitPlan(authors.map((a) => drafts[a.author_id]), staged);
    const statusChanged = workflowStatus !== WORKFLOW_STATUS_DEFAULT;
    if (plans.length === 0 && !statusChanged) return;
    if (plans.length === 0) {
      // Status-only press. Nothing to send, and nowhere to send the status to yet.
      setCommitSummary({ total: 0, applied: 0, failed: 0, statusUnsaved: true });
      return;
    }
    setCommitting(true);
    // Results are keyed by author and only the planned authors are re-run, so the
    // messages from an earlier commit stay put rather than vanishing and being
    // re-earned each time a later author is added.
    setCommitSummary(null);

    const collected = await executeCommitPlan(plans, (result) => {
      if (!mounted.current) return;
      // Only failures are kept. A success now shows as the author's linked row, so a
      // green banner repeating it would just be the same news twice.
      setResults((prev) => {
        const next = { ...prev };
        if (result.ok) delete next[result.authorId];
        else next[result.authorId] = result;
        return next;
      });
      // Pin whatever this run actually achieved, even when a later step failed, so a
      // second commit redoes none of it:
      //   createdPersonCurie -- MATI's counter does not roll back, so re-creating
      //     would burn another AGRKB id and leave a duplicate person.
      //   labLinkedCurie -- laboratory_person has no unique constraint, so re-posting
      //     the same pair silently adds a duplicate row.
      //   committedPersonCurie -- set only on full success; it is what lets an
      //     untouched author be skipped entirely next time.
      setDrafts((prev) => {
        const draft = prev[result.authorId];
        if (!draft) return prev;
        const pinned = { ...draft };
        if (result.createdPersonCurie) pinned.createdPersonCurie = result.createdPersonCurie;
        if (result.labLinkedCurie) pinned.labLinkedCurie = result.labLinkedCurie;
        if (result.ok) {
          pinned.committedPersonCurie = result.personCurie;
          // A committed author IS a linked author, so it renders as one -- the same
          // row a freshly loaded page shows for a pre-existing link, remove button
          // and all. Leaving it in its editing state with a success banner beside it
          // would mean two different presentations of the identical fact.
          pinned.isLinked = true;
          pinned.existingPersonCurie = result.personCurie;
          pinned.existingPersonName =
            (draft.selectedPerson && draft.selectedPerson.name) || draft.fields.display_name || '';
        }
        return { ...prev, [result.authorId]: pinned };
      });
    });

    if (!mounted.current) return;
    const applied = collected.filter((r) => r.ok).length;
    setCommitSummary({
      total: collected.length,
      applied,
      failed: collected.length - applied,
      statusUnsaved: statusChanged,
    });
    setCommitting(false);
    // Refetch so the editor and the "already linked" badges here reflect the new
    // author.person_id values rather than the state the screen opened with.
    if (applied > 0 && referenceCurie !== '') {
      dispatch(biblioQueryReferenceCurie(referenceCurie));
    }
  };

  // Main files only, with the display tab's own access rule -- see mainReferenceFiles,
  // where it lives so the two copies cannot drift again without a test failing.
  const mainFiles = mainFilesForCurator(referenceFiles, {
    accessLevel,
    openAccess: referenceJsonLive.copyright_license_open_access === true,
  });

  const onDownloadFile = (fileId, filename) => {
    dispatch(downloadReferencefile(fileId, filename, accessToken));
  };

  const onBack = () => {
    history.push('/Biblio/?action=editor&referenceCurie=' + referenceCurie);
  };

  return (
    <Container fluid>
      <BiblioPersonPanel
        referenceCurie={referenceCurie}
        title={referenceJsonLive.title || ''}
        crossReferences={referenceJsonLive.cross_references || []}
        mainFiles={mainFiles}
        loadingFileNames={loadingFileNames}
        onDownloadFile={onDownloadFile}
        authors={authors}
        stubs={stubs}
        staged={staged}
        drafts={drafts}
        matches={matches}
        matchState={matchState}
        personDetails={personDetails}
        errorsByAuthor={errorsByAuthor}
        results={results}
        showAll={showAll}
        matchesOpen={matchesOpen}
        committing={committing}
        commitSummary={commitSummary}
        plannedCount={plannedCount}
        workflowStatus={workflowStatus}
        onWorkflowStatusChange={setWorkflowStatus}
        unlinking={unlinking}
        blockedReason=""
        onStagedChange={onStagedChange}
        onAddInstitution={onAddInstitution}
        onDraftChange={onDraftChange}
        onToggleShowAll={onToggleShowAll}
        onToggleMatches={onToggleMatches}
        onRemoveLink={onRemoveLink}
        availableAuthors={availableAuthors}
        linkingStub={linkingStub}
        removingStub={removingStub}
        onLinkStub={onLinkStub}
        onRemoveStub={onRemoveStub}
        onCommit={onCommit}
        onBack={onBack}
      />
    </Container>
  );
};

export default BiblioPerson;
