import { api } from '../api';
import { executeCommitPlan, unlinkAuthorPerson } from './authorPersonActions';

jest.mock('../api', () => ({ api: { post: jest.fn(), patch: jest.fn() } }));

const createPlan = (authorId = 41, over = {}) => ({
  authorId,
  personCurie: null,
  steps: [
    { kind: 'createPerson', payload: { display_name: 'Ann Doe' } },
    { kind: 'linkAuthor', author_id: authorId },
  ],
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { console.error.mockRestore(); });

describe('executeCommitPlan', () => {
  test('creates the person, then patches the author with the minted curie', async () => {
    api.post.mockResolvedValue({ data: { curie: 'AGRKB:441' } });
    api.patch.mockResolvedValue({ data: {} });

    const [result] = await executeCommitPlan([createPlan()]);

    expect(api.post).toHaveBeenCalledWith('/person/', { display_name: 'Ann Doe' });
    expect(api.patch).toHaveBeenCalledWith('/author/41', { person_curie: 'AGRKB:441' });
    expect(result).toMatchObject({ ok: true, personCurie: 'AGRKB:441', createdPersonCurie: 'AGRKB:441' });
  });

  test('patches with person_curie, never person_id', async () => {
    // author_crud pops person_curie and resolves it itself; it never accepts
    // person_id from a payload, so sending one would silently link nothing.
    api.post.mockResolvedValue({ data: { curie: 'AGRKB:441' } });
    api.patch.mockResolvedValue({ data: {} });
    await executeCommitPlan([createPlan()]);
    expect(Object.keys(api.patch.mock.calls[0][1])).toEqual(['person_curie']);
  });

  test('reports the created curie even when a later step fails', async () => {
    // The whole partial-failure contract: the person exists, so the caller must pin
    // the draft to it. MATI's counter does not roll back, so a retry that re-created
    // the person would burn a second AGRKB id and leave a duplicate behind.
    api.post.mockResolvedValue({ data: { curie: 'AGRKB:441' } });
    api.patch.mockRejectedValue({
      response: { data: { detail: 'Person is already author #2 on this reference; unlink there first' } },
      message: 'Request failed',
    });

    const [result] = await executeCommitPlan([createPlan()]);

    expect(result.ok).toBe(false);
    expect(result.createdPersonCurie).toBe('AGRKB:441');
    expect(result.failedStep).toBe('linkAuthor');
    expect(result.message).toContain('already author #2');
  });

  test('a retry plan with no create step links the person already minted', async () => {
    api.patch.mockResolvedValue({ data: {} });
    const retry = {
      authorId: 41,
      personCurie: 'AGRKB:441',
      steps: [{ kind: 'linkAuthor', author_id: 41 }],
    };

    const [result] = await executeCommitPlan([retry]);

    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).toHaveBeenCalledWith('/author/41', { person_curie: 'AGRKB:441' });
    // Nothing was created this run, so there is no new curie to pin.
    expect(result.createdPersonCurie).toBe(null);
    expect(result.ok).toBe(true);
  });

  test('links the lab with both curies before patching the author', async () => {
    api.post.mockImplementation((url) => (url === '/person/'
      ? Promise.resolve({ data: { curie: 'AGRKB:441' } })
      : Promise.resolve({ data: {} })));
    api.patch.mockResolvedValue({ data: {} });

    await executeCommitPlan([createPlan(41, {
      steps: [
        { kind: 'createPerson', payload: { display_name: 'Ann Doe' } },
        { kind: 'linkLab', laboratory_curie: 'WB:WBPerson1234' },
        { kind: 'linkAuthor', author_id: 41 },
      ],
    })]);

    expect(api.post).toHaveBeenNthCalledWith(2, '/laboratory_person/', {
      laboratory_curie: 'WB:WBPerson1234', person_curie: 'AGRKB:441',
    });
  });

  test("one author's failure does not stop the others", async () => {
    // A twelve-author batch that hits a 409 on one author must still land the rest.
    api.post
      .mockResolvedValueOnce({ data: { curie: 'AGRKB:441' } })
      .mockResolvedValueOnce({ data: { curie: 'AGRKB:442' } });
    api.patch
      .mockRejectedValueOnce({ response: { data: { detail: 'nope' } }, message: 'x' })
      .mockResolvedValueOnce({ data: {} });

    const results = await executeCommitPlan([createPlan(41), createPlan(42)]);

    expect(results.map((r) => r.ok)).toEqual([false, true]);
    expect(results[1].personCurie).toBe('AGRKB:442');
  });

  test('stops an author at its first failure rather than running later steps', async () => {
    api.post.mockRejectedValue({ response: { data: { detail: 'bad payload' } }, message: 'x' });

    const [result] = await executeCommitPlan([createPlan()]);

    expect(api.patch).not.toHaveBeenCalled();
    expect(result.failedStep).toBe('createPerson');
    expect(result.createdPersonCurie).toBe(null);
  });

  test('treats a create that returns no curie as a failure instead of patching undefined', async () => {
    api.post.mockResolvedValue({ data: {} });

    const [result] = await executeCommitPlan([createPlan()]);

    expect(api.patch).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/no curie/i);
  });

  test('reports each author as it lands so the panel can show progress', async () => {
    api.post.mockResolvedValue({ data: { curie: 'AGRKB:441' } });
    api.patch.mockResolvedValue({ data: {} });
    const seen = [];

    await executeCommitPlan([createPlan(41), createPlan(42)], (r) => seen.push(r.authorId));

    expect(seen).toEqual([41, 42]);
  });

  test('reports the lab it linked, so a later commit does not link it twice', async () => {
    // laboratory_person has no unique constraint, so the caller has to pin what was
    // linked; the executor is the only thing that knows it succeeded.
    api.post.mockImplementation((url) => (url === '/person/'
      ? Promise.resolve({ data: { curie: 'AGRKB:441' } })
      : Promise.resolve({ data: {} })));
    api.patch.mockResolvedValue({ data: {} });

    const [result] = await executeCommitPlan([createPlan(41, {
      steps: [
        { kind: 'createPerson', payload: { display_name: 'Ann Doe' } },
        { kind: 'linkLab', laboratory_curie: 'WB:WBPerson1234' },
        { kind: 'linkAuthor', author_id: 41 },
      ],
    })]);

    expect(result.labLinkedCurie).toBe('WB:WBPerson1234');
  });

  test('reports no lab when the plan had no lab step', async () => {
    api.post.mockResolvedValue({ data: { curie: 'AGRKB:441' } });
    api.patch.mockResolvedValue({ data: {} });
    const [result] = await executeCommitPlan([createPlan()]);
    expect(result.labLinkedCurie).toBe(null);
  });

  test('does not report a lab whose link call failed', async () => {
    api.post.mockImplementation((url) => (url === '/person/'
      ? Promise.resolve({ data: { curie: 'AGRKB:441' } })
      : Promise.reject({ response: { data: { detail: 'no such lab' } }, message: 'x' })));

    const [result] = await executeCommitPlan([createPlan(41, {
      steps: [
        { kind: 'createPerson', payload: { display_name: 'Ann Doe' } },
        { kind: 'linkLab', laboratory_curie: 'WB:WBPerson1234' },
        { kind: 'linkAuthor', author_id: 41 },
      ],
    })]);

    expect(result.labLinkedCurie).toBe(null);
    expect(result.createdPersonCurie).toBe('AGRKB:441');
  });

  test('handles an empty or missing plan', async () => {
    expect(await executeCommitPlan([])).toEqual([]);
    expect(await executeCommitPlan(null)).toEqual([]);
  });
});

describe('unlinkAuthorPerson', () => {
  test('patches an explicit null person_curie, which is what the API reads as unlink', async () => {
    // An absent key means "leave the link alone"; only an explicit null unlinks, so the
    // property being sent at all is the whole behaviour.
    api.patch.mockResolvedValue({ data: {} });

    const result = await unlinkAuthorPerson(4412);

    expect(api.patch).toHaveBeenCalledWith('/author/4412', { person_curie: null });
    expect(result.ok).toBe(true);
  });

  test('reports the API message when unlinking is refused', async () => {
    api.patch.mockRejectedValue({
      response: { data: { detail: 'Cannot unlink the person from a person-only row (no author_order); delete the author row instead' } },
      message: 'Request failed',
    });

    const result = await unlinkAuthorPerson(9001);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('person-only');
  });
});
