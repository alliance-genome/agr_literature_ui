// Executes the commit plan built by src/utils/authorPersonDraft.js.
//
// Runs authors one at a time, and each author's steps in order, because the steps
// are dependent: the lab link and the author patch both need the curie that
// POST /person/ mints. Authors are independent of each other, so one author's
// failure never stops the rest -- a twelve-author batch that hits a 409 on author
// seven still lands the other eleven.
//
// The result of every author carries `createdPersonCurie` whenever this run
// actually created a person, EVEN IF a later step then failed. The caller must
// write that back onto the draft: person curies come from MATI, whose counter does
// not roll back, so re-running the create on a retry would burn a second AGRKB id
// and leave a duplicate person behind.

import { api } from '../api';
import { apiErrorMessage } from '../utils/apiErrorMessage';

// What the curator is told went wrong, per step, so a failure names the thing that
// did not happen rather than the endpoint that returned it.
const STEP_LABEL = {
  createPerson: 'create person',
  linkLab: 'link laboratory',
  linkAuthor: 'link author to person',
};

/**
 * Run one author's steps. Stops at the first failure and reports which step it was.
 * `personCurie` starts as the plan's (set for a link, or for a retry after the
 * person was already created) and is filled in by a createPerson step.
 */
const runPlan = async (plan) => {
  let personCurie = plan.personCurie || null;
  let createdPersonCurie = null;
  // Reported so the caller can pin it: laboratory_person has no unique constraint on
  // (laboratory_id, person_id), so a second POST of the same pair silently adds a
  // duplicate row, and only this function knows the first one landed.
  let labLinkedCurie = null;

  for (const step of plan.steps) {
    try {
      if (step.kind === 'createPerson') {
        const res = await api.post('/person/', step.payload);
        personCurie = res.data && res.data.curie;
        if (!personCurie) {
          // A 201 with no curie would otherwise send `undefined` into the next
          // call's URL and read as a confusing 404 two steps later.
          throw new Error('person was created but the response carried no curie');
        }
        createdPersonCurie = personCurie;
      } else if (step.kind === 'linkLab') {
        await api.post('/laboratory_person/', {
          laboratory_curie: step.laboratory_curie,
          person_curie: personCurie,
        });
        labLinkedCurie = step.laboratory_curie;
      } else if (step.kind === 'linkAuthor') {
        // person_curie, never person_id: author_crud pops the curie and resolves it
        // itself, and never accepts person_id from a payload.
        await api.patch('/author/' + step.author_id, { person_curie: personCurie });
      }
    } catch (error) {
      console.error('author person commit error:', error);
      return {
        authorId: plan.authorId,
        ok: false,
        personCurie,
        createdPersonCurie,
        labLinkedCurie,
        failedStep: step.kind,
        message: `${STEP_LABEL[step.kind] || step.kind}: ${apiErrorMessage(step.kind, error)}`,
      };
    }
  }

  return {
    authorId: plan.authorId,
    ok: true,
    personCurie,
    createdPersonCurie,
    labLinkedCurie,
    failedStep: null,
    message: '',
  };
};

/**
 * Execute a whole commit plan, reporting each author's result as it lands so the
 * panel can show progress rather than freezing until the last call returns.
 *
 * @param {Array} plans        from buildCommitPlan
 * @param {Function} onResult  called with each author's result as it completes
 * @returns {Promise<Array>}   every result, in plan order
 */
export const executeCommitPlan = async (plans, onResult) => {
  const results = [];
  for (const plan of plans || []) {
    const result = await runPlan(plan);
    results.push(result);
    if (typeof onResult === 'function') onResult(result);
  }
  return results;
};

/**
 * Clear an author's person link.
 *
 * `person_curie: null` must be sent explicitly. The API builds its patch with
 * model_dump(exclude_unset=True) and treats an absent key as "leave the link alone",
 * so omitting the property is a no-op -- sending the null IS the operation.
 *
 * Refused for person-only rows (author_order IS NULL), which have nothing left to
 * satisfy ck_author_person_or_order; those are removed by deleting the row.
 */
export const unlinkAuthorPerson = async (authorId) => {
  try {
    await api.patch('/author/' + authorId, { person_curie: null });
    return { ok: true, message: '' };
  } catch (error) {
    console.error('author person unlink error:', error);
    return { ok: false, message: apiErrorMessage('author/' + authorId, error) };
  }
};

/**
 * Link one author to one person.
 *
 * The same PATCH the commit plan's linkAuthor step makes, exposed on its own for the
 * person-only list, where a curator resolves one stub at a time rather than staging a
 * batch. link_person absorbs the person-only row into the chosen author, so this one
 * call both makes the link and clears the stub.
 */
export const linkAuthorToPerson = async (authorId, personCurie) => {
  try {
    await api.patch('/author/' + authorId, { person_curie: personCurie });
    return { ok: true, message: '' };
  } catch (error) {
    console.error('author person link error:', error);
    return { ok: false, message: apiErrorMessage('author/' + authorId, error) };
  }
};
