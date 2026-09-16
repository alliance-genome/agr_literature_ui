import {
  normalizeNameForMatch,
  matchQueryForAuthor,
  stagedInstitutionsFromAuthors,
  draftFromAuthor,
  validateDraft,
  buildPersonPayload,
  buildCommitPlan,
  appendStagedInstitution,
} from './authorPersonDraft';

describe('normalizeNameForMatch', () => {
  // Ports person_editor.cgi's key normalization so v1 matching and the eventual
  // aka_hash matcher agree on what "the same name" means.
  test('lowercases, strips commas and periods, and turns underscores into spaces', () => {
    expect(normalizeNameForMatch('Doe, A.J.')).toBe('doe aj');
    expect(normalizeNameForMatch('van_Dyke')).toBe('van dyke');
  });

  test('strips accents so Müller and Muller match', () => {
    expect(normalizeNameForMatch('Müller')).toBe('muller');
    expect(normalizeNameForMatch('Peña')).toBe('pena');
    expect(normalizeNameForMatch('Öztürk')).toBe('ozturk');
  });

  test('collapses runs of whitespace and trims the ends', () => {
    expect(normalizeNameForMatch('  Ann   Doe  ')).toBe('ann doe');
  });

  test('returns an empty string for null, undefined and blank input', () => {
    expect(normalizeNameForMatch(null)).toBe('');
    expect(normalizeNameForMatch(undefined)).toBe('');
    expect(normalizeNameForMatch('   ')).toBe('');
  });
});

describe('matchQueryForAuthor', () => {
  test('uses last_name when the author has one', () => {
    expect(matchQueryForAuthor({ last_name: 'Doe', first_name: 'Ann' })).toBe('doe');
  });

  test('falls back to the final word of name when last_name is absent', () => {
    // Authors imported from PubMed often carry only `name`.
    expect(matchQueryForAuthor({ name: 'Ann J Doe' })).toBe('doe');
  });

  test('reads the surname before the comma when name is "Last, First"', () => {
    expect(matchQueryForAuthor({ name: 'Doe, Ann J' })).toBe('doe');
  });

  test('returns an empty string when there is nothing to search on', () => {
    expect(matchQueryForAuthor({})).toBe('');
    expect(matchQueryForAuthor(null)).toBe('');
  });
});

describe('stagedInstitutionsFromAuthors', () => {
  const authors = [
    { author_id: 1, affiliations: ['Caltech, Pasadena, CA', 'HHMI'] },
    { author_id: 2, affiliations: ['Caltech, Pasadena, CA'] },
    { author_id: 3, affiliations: ['MRC LMB, Cambridge'] },
  ];

  test('emits one numbered object per distinct affiliation across all authors', () => {
    const staged = stagedInstitutionsFromAuthors(authors);
    expect(staged.map((s) => s.number)).toEqual([1, 2, 3]);
    expect(staged.map((s) => s.raw)).toEqual([
      'Caltech, Pasadena, CA', 'HHMI', 'MRC LMB, Cambridge',
    ]);
  });

  test('seeds only the institution field from the raw string, leaving the rest blank', () => {
    // person_editor.cgi shows the affiliation for reference and lets the curator fill
    // the address; no parsing heuristic to second-guess.
    const [first] = stagedInstitutionsFromAuthors(authors);
    expect(first.institution).toBe('Caltech, Pasadena, CA');
    expect(first.street).toBe('');
    expect(first.city).toBe('');
    expect(first.country).toBe('');
    expect(first.webpage).toBe('');
    expect(first.comment).toBe('');
    expect(first.lab).toBe(null);
  });

  test('treats affiliations differing only in surrounding whitespace as one', () => {
    const staged = stagedInstitutionsFromAuthors([
      { author_id: 1, affiliations: ['Caltech'] },
      { author_id: 2, affiliations: ['  Caltech  '] },
    ]);
    expect(staged).toHaveLength(1);
  });

  test('ignores blank affiliations, missing arrays and null authors', () => {
    expect(stagedInstitutionsFromAuthors([
      { author_id: 1, affiliations: ['', '   ', null] },
      { author_id: 2 },
      null,
    ])).toEqual([]);
    expect(stagedInstitutionsFromAuthors(null)).toEqual([]);
  });

  test('numbers stay stable as later affiliations are added', () => {
    // The numbers are how each author's form refers to a staged object, so the
    // first affiliation must keep number 1 however many follow it.
    const staged = stagedInstitutionsFromAuthors(authors);
    const more = stagedInstitutionsFromAuthors([...authors, { author_id: 4, affiliations: ['EMBL'] }]);
    expect(more.slice(0, 3).map((s) => s.number)).toEqual(staged.map((s) => s.number));
    expect(more[3]).toMatchObject({ number: 4, raw: 'EMBL' });
  });
});

describe('draftFromAuthor', () => {
  test('seeds the name fields from the author', () => {
    const d = draftFromAuthor({ author_id: 7, first_name: 'Ann', last_name: 'Doe' });
    expect(d.authorId).toBe(7);
    expect(d.fields.first_name).toBe('Ann');
    expect(d.fields.last_name).toBe('Doe');
    expect(d.fields.middle_name).toBe('');
  });

  test('prefers the author name for display_name', () => {
    const d = draftFromAuthor({ author_id: 1, name: 'Ann J Doe', first_name: 'Ann', last_name: 'Doe' });
    expect(d.fields.display_name).toBe('Ann J Doe');
  });

  test('composes display_name from first and last when the author has no name', () => {
    // Same composition BiblioEditor already uses when it fills in a missing name.
    const d = draftFromAuthor({ author_id: 1, first_name: 'Ann', last_name: 'Doe' });
    expect(d.fields.display_name).toBe('Ann Doe');
  });

  test('keeps the bare orcid id in the field, without the prefix', () => {
    // The curator edits the id; the ORCID: prefix is re-applied when the payload
    // is built, so a round trip cannot end up with ORCID:ORCID:...
    expect(draftFromAuthor({ author_id: 1, orcid: 'ORCID:0000-0002-1825-0097' }).fields.orcid)
      .toBe('0000-0002-1825-0097');
    expect(draftFromAuthor({ author_id: 1, orcid: null }).fields.orcid).toBe('');
  });

  test('starts in mode none with nothing selected or chosen', () => {
    const d = draftFromAuthor({ author_id: 1, last_name: 'Doe' });
    expect(d.mode).toBe('none');
    expect(d.selectedPerson).toBe(null);
    expect(d.instChoice).toBe(null);
    expect(d.oldInstChoice).toBe(null);
    expect(d.createdPersonCurie).toBe(null);
  });

  test('records an existing person link so the panel can show it as already done', () => {
    const d = draftFromAuthor({ author_id: 1, last_name: 'Doe', person_curie: 'AGRKB:101000000000012' });
    expect(d.existingPersonCurie).toBe('AGRKB:101000000000012');
    expect(d.isLinked).toBe(true);
  });

  test('counts an author linked when only person_id is present', () => {
    // The reference endpoint serialises AuthorModel with jsonable_encoder, and the
    // model has a person_id column but no person_curie property -- only the author
    // endpoint computes that. Keying off the curie alone made every link vanish on
    // reload and the author look unreconciled.
    const d = draftFromAuthor({ author_id: 1, last_name: 'Doe', person_id: 4471 });
    expect(d.isLinked).toBe(true);
    expect(d.existingPersonId).toBe(4471);
    expect(d.existingPersonCurie).toBe(null);
  });

  test('is not linked when neither person_id nor person_curie is present', () => {
    const d = draftFromAuthor({ author_id: 1, last_name: 'Doe' });
    expect(d.isLinked).toBe(false);
    expect(d.existingPersonId).toBe(null);
  });
});

describe('validateDraft', () => {
  const staged = stagedInstitutionsFromAuthors([
    { author_id: 1, affiliations: ['Caltech', 'HHMI'] },
  ]);
  const createDraft = (over = {}) => ({
    ...draftFromAuthor({ author_id: 1, name: 'Ann Doe', first_name: 'Ann', last_name: 'Doe' }),
    mode: 'create',
    instChoice: 1,
    ...over,
  });

  test('a fully filled create draft has no errors', () => {
    expect(validateDraft(createDraft(), staged)).toEqual([]);
  });

  test('requires a last name', () => {
    // person_editor.cgi refuses the same thing ("No lastname chosen for AID"), and
    // PersonNameSchemaCreate rejects a blank last_name with a 422.
    const d = createDraft();
    d.fields = { ...d.fields, last_name: '  ' };
    expect(validateDraft(d, staged)).toEqual([expect.stringMatching(/last name/i)]);
  });

  test('requires a display name', () => {
    const d = createDraft();
    d.fields = { ...d.fields, display_name: '' };
    expect(validateDraft(d, staged)).toEqual([expect.stringMatching(/display name/i)]);
  });

  test('requires at least one institution choice, current or old', () => {
    expect(validateDraft(createDraft({ instChoice: null }), staged))
      .toEqual([expect.stringMatching(/institution/i)]);
    expect(validateDraft(createDraft({ instChoice: null, oldInstChoice: 2 }), staged))
      .toEqual([]);
  });

  test('rejects the same institution as both current and old', () => {
    // Both dropdowns draw from the same staged list, so this is now a click away.
    // For a person being created it is self-contradictory, and it would post two
    // person_institution rows with the same name, one of them already retired.
    expect(validateDraft(createDraft({ instChoice: 1, oldInstChoice: 1 }), staged))
      .toEqual([expect.stringMatching(/same institution|current and old/i)]);
  });

  test('allows different institutions as current and old', () => {
    expect(validateDraft(createDraft({ instChoice: 1, oldInstChoice: 2 }), staged)).toEqual([]);
  });

  test('rejects an orcid containing a colon, which would make an invalid curie', () => {
    // PersonCrossReferenceSchemaCreate demands exactly one colon, and the payload
    // already supplies the ORCID: prefix.
    const d = createDraft();
    d.fields = { ...d.fields, orcid: 'ORCID:0000-0002' };
    expect(validateDraft(d, staged)).toEqual([expect.stringMatching(/orcid/i)]);
  });

  test('rejects a chosen institution whose name has been blanked out', () => {
    const blanked = staged.map((s) => (s.number === 1 ? { ...s, institution: '  ' } : s));
    expect(validateDraft(createDraft(), blanked))
      .toEqual([expect.stringMatching(/institution/i)]);
  });

  test('rejects an institution choice that names no staged object', () => {
    expect(validateDraft(createDraft({ instChoice: 99 }), staged))
      .toEqual([expect.stringMatching(/institution/i)]);
  });

  test('link and none drafts are never invalid', () => {
    // Linking an existing person is a PATCH; none of the create rules apply.
    expect(validateDraft({ ...createDraft(), mode: 'link', instChoice: null }, staged)).toEqual([]);
    expect(validateDraft(draftFromAuthor({ author_id: 1 }), staged)).toEqual([]);
  });

  test('reports every problem at once rather than stopping at the first', () => {
    const d = createDraft({ instChoice: null });
    d.fields = { ...d.fields, last_name: '', display_name: '' };
    expect(validateDraft(d, staged)).toHaveLength(3);
  });
});

describe('buildPersonPayload', () => {
  const NOW = '2026-09-15T12:00:00.000Z';
  const staged = [
    {
      ...stagedInstitutionsFromAuthors([{ author_id: 1, affiliations: ['Caltech'] }])[0],
      institution: 'Caltech',
      street: '1200 E California Blvd',
      city: 'Pasadena',
      state: 'CA',
      postal_code: '91125',
      country: 'USA',
      webpage: 'https://caltech.edu',
      comment: 'seen on the 2019 paper',
    },
    { ...stagedInstitutionsFromAuthors([{ author_id: 1, affiliations: ['MRC LMB'] }])[0], number: 2, institution: 'MRC LMB' },
  ];
  const draft = () => ({
    ...draftFromAuthor({
      author_id: 1, name: 'Ann J Doe', first_name: 'Ann', last_name: 'Doe',
      orcid: 'ORCID:0000-0002-1825-0097',
    }),
    mode: 'create',
    instChoice: 1,
  });

  test('sends the display name and a primary name row', () => {
    const p = buildPersonPayload(draft(), staged, NOW);
    expect(p.display_name).toBe('Ann J Doe');
    expect(p.names).toEqual([
      { first_name: 'Ann', middle_name: null, last_name: 'Doe', is_primary: true },
    ]);
  });

  test('re-applies the ORCID prefix to the bare id', () => {
    expect(buildPersonPayload(draft(), staged, NOW).cross_references)
      .toEqual([{ curie: 'ORCID:0000-0002-1825-0097' }]);
  });

  test('omits cross_references entirely when there is no orcid', () => {
    const d = draft();
    d.fields = { ...d.fields, orcid: '' };
    expect(buildPersonPayload(d, staged, NOW)).not.toHaveProperty('cross_references');
  });

  test('takes the address, webpage and comment from the current institution', () => {
    const p = buildPersonPayload(draft(), staged, NOW);
    expect(p.street_address).toBe('1200 E California Blvd');
    expect(p.city).toBe('Pasadena');
    expect(p.state).toBe('CA');
    expect(p.postal_code).toBe('91125');
    expect(p.country).toBe('USA');
    expect(p.webpage).toEqual(['https://caltech.edu']);
    expect(p.notes).toEqual([{ note: 'seen on the 2019 paper' }]);
  });

  test('marks old institutions with date_made_old_institution and leaves the current one unmarked', () => {
    const p = buildPersonPayload({ ...draft(), instChoice: 1, oldInstChoice: 2 }, staged, NOW);
    expect(p.institutions).toEqual([
      { institution: 'Caltech' },
      { institution: 'MRC LMB', date_made_old_institution: NOW },
    ]);
  });

  test('an old-only draft sends no address, since the address follows the current institution', () => {
    const p = buildPersonPayload({ ...draft(), instChoice: null, oldInstChoice: 1 }, staged, NOW);
    expect(p.institutions).toEqual([{ institution: 'Caltech', date_made_old_institution: NOW }]);
    expect(p).not.toHaveProperty('city');
    expect(p).not.toHaveProperty('street_address');
  });

  test('includes an email only when one was entered', () => {
    const d = draft();
    expect(buildPersonPayload(d, staged, NOW)).not.toHaveProperty('emails');
    d.fields = { ...d.fields, email: 'ann@caltech.edu' };
    expect(buildPersonPayload(d, staged, NOW).emails).toEqual([{ email_address: 'ann@caltech.edu' }]);
  });

  test('never sends active_status or privacy, leaving the server defaults alone', () => {
    const p = buildPersonPayload(draft(), staged, NOW);
    expect(p).not.toHaveProperty('active_status');
    expect(p).not.toHaveProperty('privacy');
  });
});

describe('buildCommitPlan', () => {
  const NOW = '2026-09-15T12:00:00.000Z';
  const staged = [{
    ...stagedInstitutionsFromAuthors([{ author_id: 1, affiliations: ['Caltech'] }])[0],
    lab: 'WB:WBPerson1234', labLabel: 'PS — Sternberg',
  }];
  const base = (over) => ({
    ...draftFromAuthor({ author_id: 41, name: 'Ann Doe', first_name: 'Ann', last_name: 'Doe' }),
    ...over,
  });

  test('skips untouched drafts entirely', () => {
    expect(buildCommitPlan([base()], staged, NOW)).toEqual([]);
  });

  test('a link draft is a single author patch', () => {
    const plan = buildCommitPlan(
      [base({ mode: 'link', selectedPerson: { curie: 'AGRKB:101000000000012' } })], staged, NOW,
    );
    expect(plan).toHaveLength(1);
    expect(plan[0].personCurie).toBe('AGRKB:101000000000012');
    expect(plan[0].steps.map((s) => s.kind)).toEqual(['linkAuthor']);
    expect(plan[0].steps[0].author_id).toBe(41);
  });

  test('a create draft creates the person, links the lab, then patches the author', () => {
    // laboratory_person cannot be nested in PersonSchemaPost, so the lab link is a
    // separate call that can only run once the person exists.
    const plan = buildCommitPlan([base({ mode: 'create', instChoice: 1 })], staged, NOW);
    expect(plan[0].steps.map((s) => s.kind)).toEqual(['createPerson', 'linkLab', 'linkAuthor']);
    expect(plan[0].personCurie).toBe(null);
    expect(plan[0].steps[1].laboratory_curie).toBe('WB:WBPerson1234');
  });

  test('omits the lab step when the chosen institution has no lab', () => {
    const noLab = [{ ...staged[0], lab: null }];
    const plan = buildCommitPlan([base({ mode: 'create', instChoice: 1 })], noLab, NOW);
    expect(plan[0].steps.map((s) => s.kind)).toEqual(['createPerson', 'linkAuthor']);
  });

  test('a retry after the person was already created does not create a second one', () => {
    // The decisive rule: MATI's counter does not roll back, so re-running the
    // create after a failed lab link or author patch would burn another AGRKB id
    // and leave a duplicate person behind.
    const plan = buildCommitPlan(
      [base({ mode: 'create', instChoice: 1, createdPersonCurie: 'AGRKB:101000000000441' })],
      staged, NOW,
    );
    expect(plan[0].steps.map((s) => s.kind)).toEqual(['linkLab', 'linkAuthor']);
    expect(plan[0].personCurie).toBe('AGRKB:101000000000441');
  });

  test('carries the built person payload on the create step', () => {
    const plan = buildCommitPlan([base({ mode: 'create', instChoice: 1 })], staged, NOW);
    expect(plan[0].steps[0].payload.display_name).toBe('Ann Doe');
    expect(plan[0].steps[0].payload.institutions).toEqual([{ institution: 'Caltech' }]);
  });

  test('plans each author separately and keeps them in order', () => {
    const plan = buildCommitPlan([
      base({ authorId: 41, mode: 'create', instChoice: 1 }),
      base({ authorId: 42 }),
      base({ authorId: 43, mode: 'link', selectedPerson: { curie: 'AGRKB:101000000000012' } }),
    ], staged, NOW);
    expect(plan.map((p) => p.authorId)).toEqual([41, 43]);
  });

  test('handles no drafts at all', () => {
    expect(buildCommitPlan([], staged, NOW)).toEqual([]);
    expect(buildCommitPlan(null, staged, NOW)).toEqual([]);
  });
});

describe('appendStagedInstitution', () => {
  const seeded = stagedInstitutionsFromAuthors([{ author_id: 1, affiliations: ['Caltech'] }]);

  test('adds a blank entry numbered after the existing ones', () => {
    // Not every person's institution appears in this paper's affiliations, so the
    // curator has to be able to stage a place the extraction never saw.
    const next = appendStagedInstitution(seeded);
    expect(next).toHaveLength(2);
    expect(next[1]).toMatchObject({ number: 2, institution: '', raw: '', lab: null });
  });

  test('leaves the existing entries untouched', () => {
    const next = appendStagedInstitution(seeded);
    expect(next[0]).toEqual(seeded[0]);
  });

  test('numbers past the highest in use rather than by array length', () => {
    // Numbers are how an author's draft refers to an institution, so reusing one
    // would silently repoint a choice at a different place.
    const gapped = [{ ...seeded[0], number: 5 }];
    expect(appendStagedInstitution(gapped)[1].number).toBe(6);
  });

  test('starts at 1 when nothing is staged yet', () => {
    expect(appendStagedInstitution([])[0].number).toBe(1);
    expect(appendStagedInstitution(null)[0].number).toBe(1);
  });
});

describe('buildCommitPlan — not redoing work already committed', () => {
  const NOW = '2026-09-16T12:00:00.000Z';
  const staged = [{
    ...stagedInstitutionsFromAuthors([{ author_id: 1, affiliations: ['Caltech'] }])[0],
    lab: 'WB:WBPerson1234', labLabel: 'PS',
  }];
  const base = (over) => ({
    ...draftFromAuthor({ author_id: 41, name: 'Ann Doe', first_name: 'Ann', last_name: 'Doe' }),
    ...over,
  });

  test('skips a link whose person is already the committed one', () => {
    // Committing again after adding a fourth author must not re-send the three
    // already done.
    expect(buildCommitPlan([base({
      mode: 'link',
      selectedPerson: { curie: 'AGRKB:12' },
      committedPersonCurie: 'AGRKB:12',
    })], staged, NOW)).toEqual([]);
  });

  test('re-plans a link the curator has pointed at a different person', () => {
    // Replacing an existing link is exactly what should still go through.
    const plan = buildCommitPlan([base({
      mode: 'link',
      selectedPerson: { curie: 'AGRKB:99' },
      committedPersonCurie: 'AGRKB:12',
    })], staged, NOW);
    expect(plan).toHaveLength(1);
    expect(plan[0].personCurie).toBe('AGRKB:99');
  });

  test('skips a create whose person was already created and linked', () => {
    expect(buildCommitPlan([base({
      mode: 'create',
      instChoice: 1,
      createdPersonCurie: 'AGRKB:441',
      committedPersonCurie: 'AGRKB:441',
    })], staged, NOW)).toEqual([]);
  });

  test('still plans a create whose person exists but was never linked', () => {
    // Partial failure: the person was minted, the link failed. The create step is
    // gone but the rest must still run.
    const plan = buildCommitPlan([base({
      mode: 'create', instChoice: 1, createdPersonCurie: 'AGRKB:441',
    })], staged, NOW);
    expect(plan[0].steps.map((s) => s.kind)).toEqual(['linkLab', 'linkAuthor']);
  });

  test('omits the lab step when that lab is already linked to this person', () => {
    // laboratory_person has no unique constraint, so a second POST of the same pair
    // silently creates a duplicate row.
    const plan = buildCommitPlan([base({
      mode: 'create',
      instChoice: 1,
      createdPersonCurie: 'AGRKB:441',
      labLinkedCurie: 'WB:WBPerson1234',
    })], staged, NOW);
    expect(plan[0].steps.map((s) => s.kind)).toEqual(['linkAuthor']);
  });

  test('plans the lab step again when the chosen institution now names a different lab', () => {
    const plan = buildCommitPlan([base({
      mode: 'create',
      instChoice: 1,
      createdPersonCurie: 'AGRKB:441',
      labLinkedCurie: 'WB:WBPersonOTHER',
    })], staged, NOW);
    expect(plan[0].steps.map((s) => s.kind)).toEqual(['linkLab', 'linkAuthor']);
  });
});
