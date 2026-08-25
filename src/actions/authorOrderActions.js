// Thunks that EXECUTE an author plan built by src/utils/authorOrdering.js.
//
// The phases are separated by await barriers because the calls are order-dependent:
// the deletes have to free the orders the flatten hands out, and the flatten needs the
// real author_ids the creates come back with.
//
// Counter contract: the caller sets biblioUpdating once (see authorPlanCallCount) and the
// biblio reducer decrements it by one per UPDATE_BUTTON_BIBLIO action, so every code path
// here must report exactly once per API call, success or failure. A miscount leaves
// BiblioEditor's spinner up forever.

import { api } from '../api';
import { resolveFlattenOrdering, mergeAuthorPlanCallCount } from '../utils/authorOrdering';

// The 500ms delay mirrors updateButtonBiblio/mergeButtonApiDispatch so the reference refetch
// that these dispatches trigger keeps its existing timing relative to the DB triggers.
const REPORT_DELAY_MS = 500;

const reporter = (dispatch, type, extraPayload = {}) => (responseMessage) => {
  setTimeout(() => {
    dispatch({
      type,
      payload: { responseMessage, index: null, value: null, field: null, subField: null, ...extraPayload },
    });
  }, REPORT_DELAY_MS);
};

// The message must end up a string. Both consumers render it straight into JSX
// (BiblioEditor's and Merge's update alerts) and BiblioEditor also calls .includes() on it, so a
// non-string detail would throw "Objects are not valid as a React child" and take the alert down
// with it -- swallowing the very error it was meant to show. FastAPI's own HTTPExceptions send a
// string, but a request-validation 422 sends a list of {loc, msg, type}, so collapse that the way
// updateButtonBiblio already does for the forApiArray path.
const errorMessage = (subPath, error) => {
  const detail = error.response?.data?.detail;
  if (typeof detail === 'string' && detail !== '') { return detail; }
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (first && typeof first.msg === 'string') {
      const where = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : '';
      return 'error: ' + subPath + ' : ' + first.msg + (where ? ': ' + where : '');
    }
  }
  if (detail) { return 'error: ' + subPath + ' : ' + JSON.stringify(detail); }
  return 'error: ' + subPath + ' : ' + error.message;
};

// Every call reports exactly once, success or failure, so the caller's updating counter
// always returns to zero and the spinner clears.
const caller = (report) => async (subPath, method, data) => {
  try {
    const res = await api.request({ url: '/' + subPath, method, data });
    report('update success');
    return { ok: true, data: res.data };
  } catch (error) {
    console.error('author order action error:', error);
    report(errorMessage(subPath, error));
    return { ok: false, data: null };
  }
};

export const updateBiblioAuthors = (referenceCurie, plan) => async (dispatch) => {
  const report = reporter(dispatch, 'UPDATE_BUTTON_BIBLIO');
  const call = caller(report);

  // 1. deletes first: they free the orders the flatten wants to hand out
  const deleteResults = await Promise.all(plan.deletes.map(
    (entry) => call('author/' + entry.author_id, 'DELETE', null)
      .then((result) => ({ ...result, author_id: entry.author_id })),
  ));
  const deletedIds = deleteResults.filter((result) => result.ok).map((result) => result.author_id);

  // 2. metadata patches carry no author_order, so they are order-safe and can run together
  await Promise.all(plan.patches.map((entry) => call('author/' + entry.author_id, 'PATCH', entry.payload)));

  // 3. creates land on provisional orders above everything, so they cannot collide
  const createResults = await Promise.all(plan.creates.map((entry) => call('author/', 'POST', entry.payload)));
  const createdIds = createResults.map((result) => (result.ok ? (result.data?.author_id ?? null) : null));

  // 4. one authoritative flatten, now that every new author has a real id.
  //
  // Two states, not three, and deliberately shaped differently from mergeAuthors below --
  // do not copy one onto the other, the counters are what break. authorPlanCallCount counts
  // the flatten as (needsFlatten ? 1 : 0), with no finalSequence-length term: finalSequence
  // is built optimistically and can only shrink at resolve time (a successful delete drops
  // out, a create that returned no id drops out), never grow. So needsFlatten alone decides
  // whether the call was counted, and once counted it must be reported exactly once --
  // by making the call when the resolved ordering has rows, or by reporting without a call
  // when it resolved empty. mergeAuthorPlanCallCount does carry a finalOrdering-length term,
  // which is why the merge thunk needs a third state.
  if (plan.needsFlatten) {
    const ordering = resolveFlattenOrdering(plan.finalSequence, { deletedIds, createdIds });
    if (ordering.length > 0) {
      await call('author/reorder', 'POST', { reference_curie: referenceCurie, ordering });
    } else {
      // nothing left to renumber, but the caller already counted this call
      report('update success');
    }
  }
};

// Merge moves reference 2's authors onto reference 1. A PATCH can reparent an author but cannot
// change its author_order, so an incoming author arrives still holding its old order and collides
// on uq_author_ref_order if reference 1 already has an author there. The API guards that case and
// returns a 422 now, but a 422 still fails the transfer, so the collision is worth avoiding
// outright. Hence park-then-reparent: reference 1's keepers move above every order in either
// reference first, freeing the low range.
export const mergeAuthors = (ref1Curie, plan) => async (dispatch) => {
  // mergeType: 'mergeData' is what makes mergeReducer decrement mergeTransferringCount
  const report = reporter(dispatch, 'MERGE_BUTTON_API_DISPATCH', { mergeType: 'mergeData' });
  const call = caller(report);

  // 1. deletes first: they free the orders the final flatten wants to hand out
  const deleteResults = await Promise.all(plan.deletes.map(
    (entry) => call('author/' + entry.author_id, 'DELETE', null),
  ));

  // Unlike the editor, merge stops here on a failure. Parking the keepers while a discarded
  // author still holds a low order would make the final flatten collide with an author the
  // payload does not name. Nothing has been parked yet, so aborting strands nobody.
  if (deleteResults.some((result) => !result.ok)) {
    const remaining = mergeAuthorPlanCallCount(plan) - plan.deletes.length;
    for (let i = 0; i < remaining; i++) {
      report('error: author merge aborted after a failed author delete');
    }
    return;
  }

  // 2. park reference 1's keepers above everything in either reference
  if (plan.parkOrdering) {
    await call('author/reorder', 'POST', { reference_curie: ref1Curie, ordering: plan.parkOrdering });
  }

  // 3. reparent reference 2's transfers into the freed low range; the payload deliberately
  //    carries no author_order, which PATCH rejects with a 422
  const reparentResults = await Promise.all(plan.reparents.map(
    (entry) => call('author/' + entry.author_id, 'PATCH', entry.payload)
      .then((result) => ({ ...result, author_id: entry.author_id })),
  ));
  const failedTransfers = new Set(
    reparentResults.filter((result) => !result.ok).map((result) => result.author_id),
  );

  // A transfer whose PATCH failed still belongs to reference 2, and naming a foreign author in
  // a reorder payload 422s the whole flatten -- which would leave the keepers stuck at their
  // parked orders with no further call to bring them back. Drop the failures and renumber the
  // survivors contiguously instead: the keepers come home, and the failed transfer stays on
  // reference 2 where a re-run of the merge can pick it up.
  const ordering = plan.finalOrdering
    .filter((entry) => !failedTransfers.has(entry.author_id))
    .map((entry, index) => ({ author_id: entry.author_id, author_order: index + 1 }));

  // 4. one authoritative flatten back to 1..N. Three states, against updateBiblioAuthors' two,
  //    because mergeAuthorPlanCallCount gates the flatten on (needsFlatten && finalOrdering
  //    .length > 0) rather than needsFlatten alone -- so this condition must be the identical
  //    expression, evaluated on the same plan object. Do not simplify either side toward the
  //    editor's shape; they are asymmetric on purpose and a mismatch mis-counts the merge
  //    spinner, which gates the destructive Complete Merge step (Merge.js:408, 464-473).
  //    - gate false: skipped AND deliberately NOT reported, since the count excluded it.
  //    - gate true, resolved ordering non-empty: the call, which reports itself.
  //    - gate true, resolved ordering empty (every transfer failed and there are no keepers):
  //      no call is possible, but the count included one, so report without calling.
  if (plan.needsFlatten && plan.finalOrdering.length > 0) {
    if (ordering.length > 0) {
      await call('author/reorder', 'POST', { reference_curie: ref1Curie, ordering });
    } else {
      // nothing left to renumber, but the caller already counted this call
      report('update success');
    }
  }
};

// The reorder screen's save. One call, so there is no plan to build and no ordering barrier to
// respect -- buildAuthorSavePlan is for the editor's mixed create/patch/delete submits and is not
// involved here.
//
// Written out rather than reusing caller() above because the screen needs the failure message
// back: it stays open on failure with the arrangement intact, so bouncing the curator to the
// editor would lose their work. Reports exactly once either way, honouring the counter contract
// at the top of this file.
export const saveAuthorReorder = (referenceCurie, ordering) => async (dispatch) => {
  const report = reporter(dispatch, 'UPDATE_BUTTON_BIBLIO');
  try {
    await api.request({
      url: '/author/reorder',
      method: 'POST',
      data: { reference_curie: referenceCurie, ordering },
    });
    // 'update success' is what makes the biblio reducer set getReferenceCurieFlag, so the editor
    // returns showing freshly loaded orders rather than the optimistic local ones.
    report('update success');
    return { ok: true, message: '' };
  } catch (error) {
    console.error('author reorder save error:', error);
    const message = errorMessage('author/reorder', error);
    report(message);
    return { ok: false, message };
  }
};
