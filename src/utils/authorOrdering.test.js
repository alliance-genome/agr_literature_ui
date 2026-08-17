import {
  orderedAuthors,
  maxAuthorOrder,
  normalizeOrcid,
  buildAuthorSavePlan,
  resolveFlattenOrdering,
  authorPlanCallCount,
  mergeAuthorSwap,
  buildMergeAuthorPlan,
  mergeAuthorPlanCallCount,
} from './authorOrdering';

describe('orderedAuthors', () => {
  test('sorts by author_order and drops holes, nulls and person-only stubs', () => {
    const sparse = [];
    sparse[2] = { author_id: 3, author_order: 3 };
    sparse[0] = { author_id: 1, author_order: 1 };
    // sparse[1] is a hole -> must not appear
    const stubbed = [...sparse, { author_id: 9, author_order: null }];
    expect(orderedAuthors(stubbed).map((a) => a.author_id)).toEqual([1, 3]);
  });

  test('handles null and undefined input', () => {
    expect(orderedAuthors(null)).toEqual([]);
    expect(orderedAuthors(undefined)).toEqual([]);
  });
});

describe('maxAuthorOrder', () => {
  test('returns the highest order across lists, 0 when empty', () => {
    expect(maxAuthorOrder([{ author_order: 2 }, { author_order: 7 }])).toBe(7);
    expect(maxAuthorOrder([{ author_order: 2 }], [{ author_order: 9 }])).toBe(9);
    expect(maxAuthorOrder([])).toBe(0);
    expect(maxAuthorOrder([{ author_order: null }])).toBe(0);
  });
});

describe('normalizeOrcid', () => {
  test('uppercases and prefixes, leaves an existing prefix alone', () => {
    expect(normalizeOrcid('0000-0001')).toBe('ORCID:0000-0001');
    expect(normalizeOrcid('orcid:0000-0001')).toBe('ORCID:0000-0001');
    expect(normalizeOrcid('')).toBe('');
  });

  test('rejects a non-string instead of stringifying it into garbage', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // String({...}) would yield 'ORCID:[OBJECT OBJECT]', which the API's prefix-only
    // validator accepts -- bad data reaching the database quietly
    expect(normalizeOrcid({ curie: 'ORCID:0000-0001' })).toBeNull();
    expect(normalizeOrcid(undefined)).toBeNull();
    expect(normalizeOrcid(12345)).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
    consoleErrorSpy.mockRestore();
  });
});

describe('buildAuthorSavePlan', () => {
  const curie = 'AGRKB:101';

  test('a metadata-only edit produces one PATCH with no author_order and no flatten', () => {
    const authors = [
      { author_id: 1, author_order: 1, name: 'A One', last_name: 'One', orcid: null, needsChange: true },
      { author_id: 2, author_order: 2, name: 'A Two', orcid: null },
    ];
    const plan = buildAuthorSavePlan(authors, curie);
    expect(plan.deletes).toEqual([]);
    expect(plan.creates).toEqual([]);
    expect(plan.patches).toHaveLength(1);
    expect(plan.patches[0].author_id).toBe(1);
    expect(plan.patches[0].payload).not.toHaveProperty('author_order');
    expect(plan.patches[0].payload.reference_curie).toBe(curie);
    expect(plan.patches[0].payload.last_name).toBe('One');
    expect(plan.needsFlatten).toBe(false);
  });

  test('omits orcid entirely when null, normalizes it when set', () => {
    const authors = [{ author_id: 1, author_order: 1, orcid: null, needsChange: true }];
    expect(buildAuthorSavePlan(authors, curie).patches[0].payload).not.toHaveProperty('orcid');
    const withOrcid = [{ author_id: 1, author_order: 1, orcid: '0000-0002', needsChange: true }];
    expect(buildAuthorSavePlan(withOrcid, curie).patches[0].payload.orcid).toBe('ORCID:0000-0002');
    const empty = [{ author_id: 1, author_order: 1, orcid: '', needsChange: true }];
    expect(buildAuthorSavePlan(empty, curie).patches[0].payload.orcid).toBe('');
  });

  test('omits an orcid that is not a string rather than sending ORCID:[OBJECT OBJECT]', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const authors = [{
      author_id: 1, author_order: 1, orcid: { curie: 'ORCID:0000-0003' }, needsChange: true,
    }];
    expect(buildAuthorSavePlan(authors, curie).patches[0].payload).not.toHaveProperty('orcid');
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  test('deleting the middle author queues the DELETE and requires a flatten', () => {
    const authors = [
      { author_id: 1, author_order: 1 },
      { author_id: 2, author_order: 2, deleteMe: true, needsChange: true },
      { author_id: 3, author_order: 3 },
    ];
    const plan = buildAuthorSavePlan(authors, curie);
    expect(plan.deletes).toEqual([{ author_id: 2 }]);
    expect(plan.patches).toEqual([]);
    expect(plan.needsFlatten).toBe(true);
    expect(plan.finalSequence).toEqual([
      { kind: 'existing', author_id: 1, author_order: 1 },
      { kind: 'deleting', author_id: 2 },
      { kind: 'existing', author_id: 3, author_order: 3 },
    ]);
    expect(authorPlanCallCount(plan)).toBe(2); // 1 delete + 1 flatten
  });

  test('deleting the last author needs no flatten: the survivors are already 1..S', () => {
    // the gate must not fire on deletes per se -- survivors at 1 and 2 stay contiguous once
    // author 3 is gone, so the reorder would be a no-op call that can only fail
    const authors = [
      { author_id: 1, author_order: 1 },
      { author_id: 2, author_order: 2 },
      { author_id: 3, author_order: 3, deleteMe: true },
    ];
    const plan = buildAuthorSavePlan(authors, curie);
    expect(plan.deletes).toEqual([{ author_id: 3 }]);
    expect(plan.needsFlatten).toBe(false);
    expect(authorPlanCallCount(plan)).toBe(1); // the DELETE only
  });

  test('a create still forces a flatten even when the survivors are already contiguous', () => {
    const authors = [
      { author_id: 1, author_order: 1 },
      { author_id: 'new', author_order: 2, name: 'Fresh', orcid: null },
    ];
    // the create lands at a provisional order above everything, so only the flatten
    // brings it down to its intended position
    expect(buildAuthorSavePlan(authors, curie).needsFlatten).toBe(true);
  });

  test('a new author gets a provisional order above every live order, including deleted ones', () => {
    const authors = [
      { author_id: 1, author_order: 1 },
      { author_id: 2, author_order: 2, deleteMe: true },
      { author_id: 'new', author_order: 3, name: 'Fresh', orcid: null },
    ];
    const plan = buildAuthorSavePlan(authors, curie);
    expect(plan.creates).toHaveLength(1);
    expect(plan.creates[0].payload.author_order).toBe(4); // maxLiveOrder(3) + 1 + 0
    expect(plan.creates[0].payload.name).toBe('Fresh');
    expect(plan.finalSequence).toContainEqual({ kind: 'created', createIndex: 0 });
  });

  test('two new authors get distinct provisional orders', () => {
    const authors = [
      { author_id: 1, author_order: 1 },
      { author_id: 'new', author_order: 2, name: 'X', orcid: null },
      { author_id: 'new', author_order: 3, name: 'Y', orcid: null },
    ];
    const orders = buildAuthorSavePlan(authors, curie).creates.map((c) => c.payload.author_order);
    expect(orders).toEqual([4, 5]);
  });

  test('a new author deleted before submit vanishes with no calls', () => {
    const authors = [
      { author_id: 1, author_order: 1 },
      { author_id: 'new', author_order: 2, deleteMe: true, name: 'Oops', orcid: null },
    ];
    const plan = buildAuthorSavePlan(authors, curie);
    expect(plan.creates).toEqual([]);
    expect(plan.deletes).toEqual([]);
    expect(plan.needsFlatten).toBe(false);
  });

  test('a pre-existing gap requires a flatten even with no other change', () => {
    const authors = [{ author_id: 1, author_order: 1 }, { author_id: 3, author_order: 3 }];
    expect(buildAuthorSavePlan(authors, curie).needsFlatten).toBe(true);
  });
});

describe('resolveFlattenOrdering', () => {
  const finalSequence = [
    { kind: 'existing', author_id: 1, author_order: 1 },
    { kind: 'deleting', author_id: 2 },
    { kind: 'existing', author_id: 3, author_order: 3 },
    { kind: 'created', createIndex: 0 },
  ];

  test('drops successfully deleted authors and renumbers contiguously', () => {
    expect(resolveFlattenOrdering(finalSequence, { deletedIds: [2], createdIds: [50] })).toEqual([
      { author_id: 1, author_order: 1 },
      { author_id: 3, author_order: 2 },
      { author_id: 50, author_order: 3 },
    ]);
  });

  test('keeps a failed delete in place so the payload stays complete', () => {
    expect(resolveFlattenOrdering(finalSequence, { deletedIds: [], createdIds: [50] })).toEqual([
      { author_id: 1, author_order: 1 },
      { author_id: 2, author_order: 2 },
      { author_id: 3, author_order: 3 },
      { author_id: 50, author_order: 4 },
    ]);
  });

  test('drops a create that failed to return an id', () => {
    const ordering = resolveFlattenOrdering(finalSequence, { deletedIds: [2], createdIds: [null] });
    expect(ordering).toEqual([
      { author_id: 1, author_order: 1 },
      { author_id: 3, author_order: 2 },
    ]);
  });
});

describe('authorPlanCallCount', () => {
  test('counts every call the thunk will make', () => {
    expect(authorPlanCallCount({
      deletes: [1], patches: [1, 2], creates: [1], needsFlatten: true,
    })).toBe(5);
    expect(authorPlanCallCount({
      deletes: [], patches: [1], creates: [], needsFlatten: false,
    })).toBe(1);
  });
});

describe('mergeAuthorSwap', () => {
  test('toggle and pmidKeepReference === 2 each flip, together they cancel', () => {
    expect(mergeAuthorSwap({ toggle: false }, 1)).toBe(false);
    expect(mergeAuthorSwap({ toggle: true }, 1)).toBe(true);
    expect(mergeAuthorSwap({ toggle: false }, 2)).toBe(true);
    expect(mergeAuthorSwap({ toggle: true }, 2)).toBe(false);
  });
});

describe('buildMergeAuthorPlan', () => {
  // the spec's worked example: R1 has A1 A2 A3, R2 has B1 B2,
  // curator discards A2 and transfers B1. Expected result: A1=1, A3=2, B1=3.
  const ref1Authors = [
    { author_id: 'A1', author_order: 1 },
    { author_id: 'A2', author_order: 2, toggle: true },
    { author_id: 'A3', author_order: 3 },
  ];
  const ref2Authors = [
    { author_id: 'B1', author_order: 1, toggle: true },
    { author_id: 'B2', author_order: 2 },
  ];
  const args = { ref1Authors, ref2Authors, ref1Curie: 'AGRKB:R1', pmidKeepReference: 1 };

  test('deletes the discarded from both references', () => {
    expect(buildMergeAuthorPlan(args).deletes).toEqual([{ author_id: 'A2' }, { author_id: 'B2' }]);
  });

  test('parks the keepers above every order in either reference', () => {
    const plan = buildMergeAuthorPlan(args);
    expect(plan.offset).toBe(3);
    expect(plan.parkOrdering).toEqual([
      { author_id: 'A1', author_order: 4 },
      { author_id: 'A3', author_order: 5 },
    ]);
  });

  test('reparents the transfers with no author_order', () => {
    const plan = buildMergeAuthorPlan(args);
    expect(plan.reparents).toEqual([
      { author_id: 'B1', payload: { reference_curie: 'AGRKB:R1' } },
    ]);
    expect(plan.reparents[0].payload).not.toHaveProperty('author_order');
  });

  test('final ordering is keepers then transfers, contiguous from 1', () => {
    expect(buildMergeAuthorPlan(args).finalOrdering).toEqual([
      { author_id: 'A1', author_order: 1 },
      { author_id: 'A3', author_order: 2 },
      { author_id: 'B1', author_order: 3 },
    ]);
  });

  test('skips parking when there is nothing to transfer', () => {
    const plan = buildMergeAuthorPlan({ ...args, ref2Authors: [{ author_id: 'B2', author_order: 1 }] });
    expect(plan.parkOrdering).toBeNull();
    expect(plan.reparents).toEqual([]);
    expect(plan.finalOrdering).toEqual([
      { author_id: 'A1', author_order: 1 },
      { author_id: 'A3', author_order: 2 },
    ]);
  });

  test('pmidKeepReference 2 discards all of reference 1 and skips parking', () => {
    const plan = buildMergeAuthorPlan({
      ref1Authors: [{ author_id: 'A1', author_order: 1 }, { author_id: 'A2', author_order: 2 }],
      ref2Authors: [{ author_id: 'B1', author_order: 1 }, { author_id: 'B2', author_order: 2 }],
      ref1Curie: 'AGRKB:R1',
      pmidKeepReference: 2,
    });
    expect(plan.deletes).toEqual([{ author_id: 'A1' }, { author_id: 'A2' }]);
    expect(plan.parkOrdering).toBeNull(); // no keepers to park
    expect(plan.reparents.map((r) => r.author_id)).toEqual(['B1', 'B2']);
    expect(plan.finalOrdering).toEqual([
      { author_id: 'B1', author_order: 1 },
      { author_id: 'B2', author_order: 2 },
    ]);
  });

  test('a gapped author list is handled without throwing', () => {
    // orders 1 and 3 with nothing at 2: the old sparse-array loops threw a TypeError here
    const gapped = [{ author_id: 'A1', author_order: 1 }, { author_id: 'A3', author_order: 3 }];
    const plan = buildMergeAuthorPlan({ ...args, ref1Authors: gapped });
    expect(plan.finalOrdering).toEqual([
      { author_id: 'A1', author_order: 1 },
      { author_id: 'A3', author_order: 2 },
      { author_id: 'B1', author_order: 3 },
    ]);
  });

  test('handles empty and null author lists', () => {
    const plan = buildMergeAuthorPlan({
      ref1Authors: null, ref2Authors: [], ref1Curie: 'AGRKB:R1', pmidKeepReference: 1,
    });
    expect(plan).toMatchObject({
      deletes: [], parkOrdering: null, reparents: [], finalOrdering: [], needsFlatten: false,
    });
  });

  test('a merge with no author changes needs no flatten and costs no calls (empty ref2)', () => {
    // reference 2 has no authors and nothing is toggled, so every keeper is already at 1..K.
    // NOTE: this shape alone cannot distinguish the gate from one that also ORs in
    // deletes.length > 0 -- the realistic-ref2 test below is the one that pins that down.
    const plan = buildMergeAuthorPlan({
      ref1Authors: [{ author_id: 'A1', author_order: 1 }, { author_id: 'A2', author_order: 2 }],
      ref2Authors: [],
      ref1Curie: 'AGRKB:R1',
      pmidKeepReference: 1,
    });
    expect(plan.deletes).toEqual([]);
    expect(plan.reparents).toEqual([]);
    expect(plan.parkOrdering).toBeNull();
    // finalOrdering is still populated; only needsFlatten suppresses the call
    expect(plan.finalOrdering).toHaveLength(2);
    expect(plan.needsFlatten).toBe(false);
    expect(mergeAuthorPlanCallCount(plan)).toBe(0);
  });

  test('a merge with no author changes needs no flatten even when reference 2 has authors', () => {
    // The realistic no-toggle merge: reference 2 always has authors, so all of them are
    // discarded. Those deletes land on reference 2 and cannot change reference 1's
    // author_order values, so reference 1 must NOT get a no-op POST /author/reorder -- one
    // that 422s on a concurrent edit would hide the Complete Merge button for good.
    const plan = buildMergeAuthorPlan({
      ref1Authors: [{ author_id: 'A1', author_order: 1 }, { author_id: 'A2', author_order: 2 }],
      ref2Authors: [{ author_id: 'B1', author_order: 1 }, { author_id: 'B2', author_order: 2 }],
      ref1Curie: 'AGRKB:R1',
      pmidKeepReference: 1,
    });
    expect(plan.deletes).toEqual([{ author_id: 'B1' }, { author_id: 'B2' }]);
    expect(plan.reparents).toEqual([]);
    expect(plan.parkOrdering).toBeNull();
    expect(plan.needsFlatten).toBe(false);
    expect(mergeAuthorPlanCallCount(plan)).toBe(plan.deletes.length); // the 2 deletes, no flatten
  });

  test('discarding only reference 2 authors needs no flatten when the keepers are contiguous', () => {
    // A1, A2 keep their orders 1 and 2; only reference 2's B1 is discarded
    const plan = buildMergeAuthorPlan({
      ref1Authors: [{ author_id: 'A1', author_order: 1 }, { author_id: 'A2', author_order: 2 }],
      ref2Authors: [{ author_id: 'B1', author_order: 1 }],
      ref1Curie: 'AGRKB:R1',
      pmidKeepReference: 1,
    });
    expect(plan.deletes).toEqual([{ author_id: 'B1' }]);
    expect(plan.needsFlatten).toBe(false);
    expect(mergeAuthorPlanCallCount(plan)).toBe(1); // the DELETE on reference 2 only
  });

  test('discarding a middle reference 1 keeper forces a flatten', () => {
    // A2 goes, leaving A1 at 1 and A3 at 3: a real gap on reference 1 that must be closed
    const plan = buildMergeAuthorPlan({
      ref1Authors: [
        { author_id: 'A1', author_order: 1 },
        { author_id: 'A2', author_order: 2, toggle: true },
        { author_id: 'A3', author_order: 3 },
      ],
      ref2Authors: [],
      ref1Curie: 'AGRKB:R1',
      pmidKeepReference: 1,
    });
    expect(plan.deletes).toEqual([{ author_id: 'A2' }]);
    expect(plan.needsFlatten).toBe(true);
    expect(plan.finalOrdering).toEqual([
      { author_id: 'A1', author_order: 1 },
      { author_id: 'A3', author_order: 2 },
    ]);
    expect(mergeAuthorPlanCallCount(plan)).toBe(2); // 1 delete + 1 flatten
  });

  test('discarding the last reference 1 keeper needs no flatten', () => {
    // the mirror of the editor's delete-last case: A1 stays at 1, already 1..K
    const plan = buildMergeAuthorPlan({
      ref1Authors: [
        { author_id: 'A1', author_order: 1 },
        { author_id: 'A2', author_order: 2, toggle: true },
      ],
      ref2Authors: [],
      ref1Curie: 'AGRKB:R1',
      pmidKeepReference: 1,
    });
    expect(plan.deletes).toEqual([{ author_id: 'A2' }]);
    expect(plan.needsFlatten).toBe(false);
    expect(mergeAuthorPlanCallCount(plan)).toBe(1);
  });

  test('a gap among the keepers forces a flatten on its own', () => {
    const plan = buildMergeAuthorPlan({
      ref1Authors: [{ author_id: 'A1', author_order: 1 }, { author_id: 'A3', author_order: 3 }],
      ref2Authors: [],
      ref1Curie: 'AGRKB:R1',
      pmidKeepReference: 1,
    });
    expect(plan.needsFlatten).toBe(true);
    expect(mergeAuthorPlanCallCount(plan)).toBe(1);
  });

  test('transfers force a flatten so failed reparents cannot strand parked keepers', () => {
    const plan = buildMergeAuthorPlan({
      ref1Authors: [{ author_id: 'A1', author_order: 1 }],
      ref2Authors: [{ author_id: 'B1', author_order: 1, toggle: true }],
      ref1Curie: 'AGRKB:R1',
      pmidKeepReference: 1,
    });
    expect(plan.deletes).toEqual([]);
    expect(plan.parkOrdering).toEqual([{ author_id: 'A1', author_order: 2 }]);
    expect(plan.needsFlatten).toBe(true);
    expect(mergeAuthorPlanCallCount(plan)).toBe(3); // park + reparent + flatten
  });
});

describe('mergeAuthorPlanCallCount', () => {
  test('counts deletes, the park, the reparents and the flatten', () => {
    expect(mergeAuthorPlanCallCount({
      deletes: [1, 2], parkOrdering: [1], reparents: [1], finalOrdering: [1, 2, 3], needsFlatten: true,
    })).toBe(5);
    expect(mergeAuthorPlanCallCount({
      deletes: [], parkOrdering: null, reparents: [], finalOrdering: [], needsFlatten: false,
    })).toBe(0);
  });

  test('does not count the flatten when needsFlatten is false', () => {
    expect(mergeAuthorPlanCallCount({
      deletes: [], parkOrdering: null, reparents: [], finalOrdering: [1, 2], needsFlatten: false,
    })).toBe(0);
  });
});
