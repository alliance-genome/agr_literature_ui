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

import BiblioPersonPanel from './BiblioPersonPanel';
import { api } from '../../api';
import { orderedAuthors } from '../../utils/authorOrdering';
import {
  stagedInstitutionsFromAuthors, appendStagedInstitution, draftFromAuthor,
  matchQueryForAuthor, validateDraft, buildCommitPlan,
} from '../../utils/authorPersonDraft';
import { executeCommitPlan, unlinkAuthorPerson } from '../../actions/authorPersonActions';
import { biblioQueryReferenceCurie } from '../../actions/biblioActions';

// Matches are fetched for every author as the page opens. Three at a time keeps a
// fifty-author reference from opening fifty sockets at once while still finishing
// a normal paper's authors in about the time it takes to read the staging area.
const MATCH_CONCURRENCY = 3;

const BiblioPerson = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const referenceCurie = useSelector((state) => state.biblio.referenceCurie);
  const referenceJsonLive = useSelector((state) => state.biblio.referenceJsonLive);

  // Seeded once from the reference as it stood when the screen opened. A refetch
  // mid-edit must not wipe a half-filled staging area, so these are not recomputed.
  const [authors] = useState(() => orderedAuthors(referenceJsonLive.authors));
  const [staged, setStaged] = useState(() => stagedInstitutionsFromAuthors(authors));
  const [drafts, setDrafts] = useState(() => {
    const seeded = {};
    for (const author of authors) seeded[author.author_id] = draftFromAuthor(author);
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

  // People attached to this reference without an author_order. link_person absorbs
  // one of these into an author rather than erroring, so the curator should know
  // they are there before committing.
  const stubs = Array.isArray(referenceJsonLive.author_person_without_author_order)
    ? referenceJsonLive.author_person_without_author_order
    : [];

  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

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
      .filter((d) => d && d.isLinked && !d.existingPersonCurie && d.existingPersonId);
    if (unresolved.length === 0) return;
    for (const draft of unresolved) {
      api.get('/person/' + draft.existingPersonId)
        .then((res) => {
          if (!mounted.current || !res.data || !res.data.curie) return;
          setPersonDetails((d) => ({ ...d, [res.data.curie]: res.data }));
          setDrafts((prev) => ({
            ...prev,
            [draft.authorId]: {
              ...prev[draft.authorId],
              existingPersonCurie: res.data.curie,
              existingPersonName: res.data.display_name || '',
            },
          }));
        })
        .catch((error) => console.error('linked person resolve error:', error));
    }
  }, [drafts]);

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

  const onCommit = async () => {
    const plans = buildCommitPlan(authors.map((a) => drafts[a.author_id]), staged);
    if (plans.length === 0) return;
    setCommitting(true);
    // Results are keyed by author and only the planned authors are re-run, so the
    // messages from an earlier commit stay put rather than vanishing and being
    // re-earned each time a later author is added.
    setCommitSummary(null);

    const collected = await executeCommitPlan(plans, (result) => {
      if (!mounted.current) return;
      setResults((prev) => ({ ...prev, [result.authorId]: result }));
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
        if (result.ok) pinned.committedPersonCurie = result.personCurie;
        return { ...prev, [result.authorId]: pinned };
      });
    });

    if (!mounted.current) return;
    const applied = collected.filter((r) => r.ok).length;
    setCommitSummary({ total: collected.length, applied, failed: collected.length - applied });
    setCommitting(false);
    // Refetch so the editor and the "already linked" badges here reflect the new
    // author.person_id values rather than the state the screen opened with.
    if (applied > 0 && referenceCurie !== '') {
      dispatch(biblioQueryReferenceCurie(referenceCurie));
    }
  };

  const onBack = () => {
    history.push('/Biblio/?action=editor&referenceCurie=' + referenceCurie);
  };

  return (
    <Container fluid>
      <BiblioPersonPanel
        referenceCurie={referenceCurie}
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
        unlinking={unlinking}
        blockedReason=""
        onStagedChange={onStagedChange}
        onAddInstitution={onAddInstitution}
        onDraftChange={onDraftChange}
        onToggleShowAll={onToggleShowAll}
        onToggleMatches={onToggleMatches}
        onRemoveLink={onRemoveLink}
        onCommit={onCommit}
        onBack={onBack}
      />
    </Container>
  );
};

export default BiblioPerson;
