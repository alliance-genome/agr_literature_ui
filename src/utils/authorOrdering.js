// Pure helpers that turn author UI state into a plan of API calls.
//
// The API rejects author_order on PATCH /author/{id} (422) and exposes
// POST /author/reorder instead, which renumbers a reference's authors in a single
// deferred-constraint UPDATE. These builders decide WHAT to call; the thunks in
// src/actions/authorOrderActions.js decide WHEN, since the calls are order-dependent.

// module-private: buildPayload is the only consumer, and a second exported field list is
// exactly the drift risk the design note rejected.
const AUTHOR_METADATA_FIELDS = [
  'name', 'first_name', 'last_name', 'orcid', 'first_author', 'corresponding_author', 'affiliations',
];

// Authors sorted by author_order, with array holes, nulls and person-only stubs removed.
// Plan builders must never build an array indexed by author_order - 1 and iterate it: orders
// can have gaps and array iterators visit holes as undefined. BiblioEditor's *rendering* path
// (BiblioEditor.js:1177-1182) is the deliberate exception -- getStoreAuthorIndexFromDomIndex
// maps a DOM index back to a store index by assuming position === author_order - 1, so that
// array has to stay positional. It guards the resulting holes explicitly where it iterates.
export const orderedAuthors = (authors) =>
  (authors || [])
    .filter((a) => a && a.author_order !== null && a.author_order !== undefined)
    .slice()
    .sort((a, b) => a.author_order - b.author_order);

export const maxAuthorOrder = (...lists) =>
  lists.flat().reduce((max, a) => {
    const order = a && a.author_order;
    return typeof order === 'number' && order > max ? order : max;
  }, 0);

// Returns null for anything that is not a string, which buildPayload turns into "omit the
// field". The code this replaced did authorDict['orcid'].toUpperCase() and threw a TypeError
// on, say, the {curie: ...} shape the reducer still carries commented-out handling for
// (biblioReducer.js:730-733). String(orcid) would instead send 'ORCID:[OBJECT OBJECT]', which
// the API's prefix-only validator accepts -- garbage reaching the database silently. Skipping
// plus a console.error is loud enough to diagnose without being a thrown exception: the only
// caller runs inside BiblioEditor's render path (BiblioEditor.js:500), where a throw would
// take down the whole editor tree over one bad field.
export const normalizeOrcid = (orcid) => {
  if (typeof orcid !== 'string') {
    console.error('normalizeOrcid: expected a string orcid, got', typeof orcid, orcid);
    return null;
  }
  const value = orcid.toUpperCase();
  if (value === '') { return ''; }
  return value.match(/^ORCID:(.*)$/) ? value : 'ORCID:' + value;
};

// orcid is omitted entirely when null, matching the pre-existing editor behavior, and
// likewise when normalizeOrcid rejects a non-string value.
const buildPayload = (authorDict, referenceCurie) => {
  const payload = { reference_curie: referenceCurie };
  for (const field of AUTHOR_METADATA_FIELDS) {
    if (!(field in authorDict)) { continue; }
    if (field === 'orcid') {
      if (authorDict.orcid !== null) {
        const orcid = normalizeOrcid(authorDict.orcid);
        if (orcid !== null) { payload.orcid = orcid; }
      }
    } else {
      payload[field] = authorDict[field];
    }
  }
  return payload;
};

// finalSequence lists EVERY author in intended display order, including the ones being
// deleted. The thunk drops the deletes that succeeded; keeping the ones that failed is what
// stops the reorder payload from 422ing on the "include every ordered author" rule, and it
// leaves the list visually unchanged when a delete fails.
export const buildAuthorSavePlan = (authors, referenceCurie) => {
  const sorted = orderedAuthors(authors);
  const provisionalBase = maxAuthorOrder(sorted);
  const deletes = [];
  const patches = [];
  const creates = [];
  const finalSequence = [];

  for (const authorDict of sorted) {
    const isNew = authorDict.author_id === 'new';
    const removing = authorDict.deleteMe === true;

    if (removing) {
      // a never-saved author that was added then deleted simply vanishes
      if (!isNew) {
        deletes.push({ author_id: authorDict.author_id });
        finalSequence.push({ kind: 'deleting', author_id: authorDict.author_id });
      }
      continue;
    }

    if (isNew) {
      const createIndex = creates.length;
      creates.push({
        payload: {
          ...buildPayload(authorDict, referenceCurie),
          // above every live order (deleted rows included) so the create cannot 409
          author_order: provisionalBase + 1 + createIndex,
        },
      });
      finalSequence.push({ kind: 'created', createIndex });
      continue;
    }

    if (authorDict.needsChange) {
      patches.push({ author_id: authorDict.author_id, payload: buildPayload(authorDict, referenceCurie) });
    }
    finalSequence.push({
      kind: 'existing', author_id: authorDict.author_id, author_order: authorDict.author_order,
    });
  }

  const survivors = finalSequence.filter((entry) => entry.kind === 'existing');
  // creates.length > 0 must force a flatten: a create lands on a provisional order above
  // everything, so only the flatten brings it down to its intended position.
  // deletes.length > 0 deliberately does NOT force one. A deletion can only remove orders, and
  // survivors is sorted ascending, so if every survivor already sits at i + 1 the survivors
  // occupy exactly 1..S and every deleted order is > S -- removing them leaves a contiguous
  // 1..S with nothing to renumber. A deletion that does open a gap necessarily leaves some
  // survivor above its index, which the contiguity clause below already catches.
  const needsFlatten = creates.length > 0
    || survivors.some((entry, i) => entry.author_order !== i + 1);

  return { deletes, patches, creates, finalSequence, needsFlatten };
};

export const resolveFlattenOrdering = (finalSequence, { deletedIds = [], createdIds = [] } = {}) => {
  const deleted = new Set(deletedIds);
  const ordering = [];
  for (const entry of finalSequence) {
    let authorId = null;
    if (entry.kind === 'existing') {
      authorId = entry.author_id;
    } else if (entry.kind === 'deleting') {
      authorId = deleted.has(entry.author_id) ? null : entry.author_id;
    } else if (entry.kind === 'created') {
      authorId = createdIds[entry.createIndex];
    }
    if (authorId === null || authorId === undefined) { continue; }
    ordering.push({ author_id: authorId, author_order: ordering.length + 1 });
  }
  return ordering;
};

export const authorPlanCallCount = (plan) =>
  plan.deletes.length + plan.patches.length + plan.creates.length + (plan.needsFlatten ? 1 : 0);

// --- Merge screen ---------------------------------------------------------------------------

// Merge semantics: reference 1 survives. `swap` means "this author belongs on the other
// side": for reference 1's authors it means discard, for reference 2's it means transfer in.
export const mergeAuthorSwap = (authorDict, pmidKeepReference) => {
  let swap = false;
  if (authorDict.toggle) { swap = !swap; }
  if (pmidKeepReference === 2) { swap = !swap; }
  return swap;
};

// A transferred author keeps its old author_order (PATCH cannot set one), and the API now
// rejects a reparent that would collide on uq_author_ref_order with a clean 422 (it used to be
// a raw IntegrityError at COMMIT). A 422 still fails the transfer, so avoiding the collision
// beats absorbing it: reference 1's keepers are first parked above every order in either
// reference, leaving the whole low range free for the incoming authors, and a final flatten
// brings everything back to 1..N.
export const buildMergeAuthorPlan = ({ ref1Authors, ref2Authors, ref1Curie, pmidKeepReference,
  ref1PersonOnly = [] }) => {
  const ref1 = orderedAuthors(ref1Authors);
  const ref2 = orderedAuthors(ref2Authors);
  // computed from the pre-delete lists so it stays a safe upper bound even if a delete fails,
  // which also guarantees every transferring author's order is <= offset
  const offset = maxAuthorOrder(ref1, ref2);

  const deletes = [];
  const keepers = [];
  const transfers = [];

  for (const authorDict of ref1) {
    if (mergeAuthorSwap(authorDict, pmidKeepReference)) { deletes.push({ author_id: authorDict.author_id }); }
    else { keepers.push(authorDict); }
  }
  for (const authorDict of ref2) {
    if (mergeAuthorSwap(authorDict, pmidKeepReference)) { transfers.push(authorDict); }
    else { deletes.push({ author_id: authorDict.author_id }); }
  }

  // parking only earns its call when something is actually coming in to collide with
  const parkOrdering = (transfers.length > 0 && keepers.length > 0)
    ? keepers.map((authorDict, i) => ({ author_id: authorDict.author_id, author_order: offset + 1 + i }))
    : null;

  const reparents = transfers.map((authorDict) => ({
    author_id: authorDict.author_id,
    payload: { reference_curie: ref1Curie },
  }));

  // uq_author_ref_person allows a person to be linked to only one author per reference, and a
  // reparent carries the row's person_id along just as it carries author_order. Unlike an order
  // collision -- which the parking step above makes impossible -- this one cannot be engineered
  // away: if the same person really is an author on both references, the transfer can never
  // succeed, and re-running the merge fails identically. Report it so the caller can refuse
  // BEFORE the destructive deletes run, rather than discovering it mid-merge.
  // Person-only rows count too, and they do NOT arrive in ref1Authors: the API splits
  // author_order IS NULL rows into author_person_without_author_order, so they are invisible to
  // orderedAuthors and are never keepers or deletes -- they simply stay on reference 1 holding
  // their person. A transfer of that same person still collides with them, so they have to be
  // part of the conflict set or the guard misses exactly the rows most likely to carry a link.
  const ref1PersonHolders = [...keepers, ...(ref1PersonOnly || []).filter((a) => a)];
  const keepersByPerson = new Map(
    ref1PersonHolders.filter((a) => a.person_id !== null && a.person_id !== undefined)
      .map((a) => [a.person_id, a]),
  );
  const personConflicts = transfers
    .filter((a) => a.person_id !== null && a.person_id !== undefined
      && keepersByPerson.has(a.person_id))
    .map((a) => ({
      person_id: a.person_id,
      keeper: keepersByPerson.get(a.person_id),
      transfer: a,
    }));

  // keepers before transfers, matching the shared counter the merge screen already used
  const finalOrdering = [...keepers, ...transfers].map((authorDict, i) => ({
    author_id: authorDict.author_id, author_order: i + 1,
  }));

  // Same gate as buildAuthorSavePlan: only flatten when something actually moved. Without it a
  // merge with no author toggles at all still POSTed /author/reorder, and any failure there
  // (a concurrent edit adding an author the payload omits, say) hides the Complete Merge button.
  // reparents.length > 0 must force a flatten even when the keepers were already 1..K: if every
  // reparent fails, the keepers are sitting at their parked orders and the flatten is the only
  // call that brings them home. (parkOrdering !== null is subsumed by it -- parking only happens
  // when transfers exist, which is exactly when reparents is non-empty.)
  // deletes.length > 0 deliberately does NOT force one. `deletes` is the union of BOTH
  // references' discarded authors, and deleting rows on reference 2 cannot change reference 1's
  // author_order values at all -- including that term made the gate engage unless reference 2
  // was author-less, i.e. inert on any real merge. A reference-1 deletion that opens a gap is
  // already caught by the keepers clause: keepers is sorted ascending, so if every keeper sits
  // at i + 1 they occupy exactly 1..K and every deleted reference-1 order is > K, leaving a
  // contiguous 1..K once they are gone.
  const needsFlatten = reparents.length > 0
    || keepers.some((authorDict, i) => authorDict.author_order !== i + 1);

  return { deletes, parkOrdering, reparents, finalOrdering, needsFlatten, personConflicts, offset };
};

export const mergeAuthorPlanCallCount = (plan) =>
  plan.deletes.length
  + (plan.parkOrdering ? 1 : 0)
  + plan.reparents.length
  + ((plan.needsFlatten && plan.finalOrdering.length > 0) ? 1 : 0);

// One line per conflict, naming both sides so a curator can act on it without opening either
// reference. Falls back to the author_id when a row carries no name.
export const describeMergePersonConflicts = (personConflicts) =>
  (personConflicts || []).map(({ keeper, transfer }) => {
    const who = transfer.name || keeper.name || `person ${keeper.person_id}`;
    // Name the state, not the toggle action: when pmidKeepReference === 2 the swap sense
    // inverts, so the offending author is transferring precisely because it is UNtoggled and
    // the curator would need to toggle it. "leave it behind" is true either way.
    const where = keeper.author_order === null || keeper.author_order === undefined
      ? 'is already linked to the reference being kept'
      : `is already author ${keeper.author_order} on the reference being kept`;
    return `${who} cannot be transferred: the same person ${where} `
      + `(author ${transfer.author_id} would duplicate author ${keeper.author_id}). `
      + `Set that author to be left behind, or resolve the duplicate person link first.`;
  });
