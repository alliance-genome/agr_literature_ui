// Pure logic behind the biblio Person panel (author -> person reconciliation).
//
// Everything here is free of React and of the api client so it can be tested
// directly: seeding drafts from author data, building the staged institution
// objects, validating a draft against what POST /person/ will actually accept,
// and turning a draft into its payloads.

// Ports the name normalization person_editor.cgi applies before looking a name up
// in two_aka_hash.json: trim, drop commas and periods, underscores become spaces,
// unaccent, lowercase. Keeping the same rule here means the v1 by_name matcher and
// the eventual aka_hash matcher agree on what counts as the same name.
//
// NFD decomposition covers the accents that actually appear in author lists
// (ü é ñ ö à). It does not decompose ø, ł or đ -- Text::Unaccent does. Those fall
// through as themselves rather than matching their unaccented form.
export const normalizeNameForMatch = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[,.]/g, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

/**
 * The string to send to GET /person/by_name for an author's possible matches.
 *
 * Surname only: by_name is an ILIKE '%q%' over display_name and person_name's
 * first/middle/last, so a surname is the widest net that still means something.
 * Narrowing it here would drop exactly the aka cases the real matcher exists to
 * find.
 */
export const matchQueryForAuthor = (author) => {
  if (!author) return '';
  if (author.last_name) return normalizeNameForMatch(author.last_name);
  const name = (author.name === null || author.name === undefined) ? '' : String(author.name);
  if (!name.trim()) return '';
  // "Doe, Ann J" puts the surname first; split before normalizing, which strips commas.
  if (name.includes(',')) return normalizeNameForMatch(name.split(',')[0]);
  const words = normalizeNameForMatch(name).split(' ').filter(Boolean);
  return words.length ? words[words.length - 1] : '';
};

/**
 * The staged institution objects for a reference: one per distinct affiliation
 * string across every author, numbered from 1.
 *
 * These are page scratch, never database rows. An author's draft refers to one by
 * its number for its current institution and another for an old one, exactly as
 * person_editor.cgi's inst_choice / old_inst_choice do. Affiliation strings repeat
 * heavily across a paper's authors, so parsing a place once and referencing it
 * from a dozen authors is the whole point.
 *
 * `institution` keeps the whole raw line, and parseAffiliation additionally fills
 * whatever address fields it can read off it. The parse only adds -- nothing it
 * fails to place is dropped, so a curator who disagrees with it edits rather than
 * retypes.
 */
// Countries as they actually appear at the end of affiliation strings in this corpus,
// including the abbreviations. Deliberately a list rather than a pattern: "USA" and
// "Japan" look nothing alike, and anything clever enough to match both would also
// match half the institution names.
const COUNTRIES = new Set([
  'usa', 'u.s.a', 'us', 'united states', 'united states of america',
  'uk', 'u.k', 'united kingdom', 'england', 'scotland', 'wales', 'northern ireland',
  'canada', 'japan', 'china', 'germany', 'france', 'italy', 'spain', 'portugal',
  'australia', 'new zealand', 'netherlands', 'the netherlands', 'belgium', 'switzerland',
  'austria', 'sweden', 'denmark', 'norway', 'finland', 'iceland', 'ireland',
  'israel', 'india', 'south korea', 'korea', 'republic of korea', 'taiwan', 'singapore',
  'brazil', 'mexico', 'argentina', 'chile', 'russia', 'poland', 'czech republic',
  'hungary', 'greece', 'turkey', 'south africa', 'egypt', 'thailand',
]);

// Needed so a bare two-letter segment is only read as a state when it really is one;
// otherwise any two-letter abbreviation in an address would become a state.
const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN',
  'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV',
  'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN',
  'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
]);

const US_STATE_ZIP = /^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/;
const US_ZIP = /^\d{5}(?:-\d{4})?$/;
const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/;

/**
 * Best-effort address fields read off a raw affiliation string.
 *
 * Affiliations are comma-separated and end with the broadest part, so this works
 * from the right: country, then postal/state, then city. It fills only what it can
 * identify and leaves the rest blank -- a wrong prefill is worse than an empty one,
 * because a curator has to notice it before they can fix it.
 *
 * `institution` is deliberately NOT returned: the caller keeps the whole raw line
 * there, so nothing this parser fails to place is lost.
 */
export const parseAffiliation = (raw) => {
  const result = { street: '', city: '', state: '', postal_code: '', country: '' };
  if (raw === null || raw === undefined) return result;

  // PubMed affiliations routinely end with "Electronic address: someone@place.edu".
  let text = String(raw).split(/electronic address\s*:/i)[0];

  const segments = text
    .split(',')
    .map((part) => part.trim().replace(/\.$/, '').trim())
    .filter((part) => part && !part.includes('@'));

  if (segments.length === 0) return result;

  const last = () => segments[segments.length - 1];

  if (COUNTRIES.has(last().toLowerCase())) {
    result.country = segments.pop();
  }

  if (segments.length > 0) {
    const tail = last();
    const stateZip = tail.match(US_STATE_ZIP);
    if (stateZip) {
      result.state = stateZip[1];
      result.postal_code = stateZip[2];
      segments.pop();
    } else if (US_ZIP.test(tail) || UK_POSTCODE.test(tail.toUpperCase())) {
      result.postal_code = tail;
      segments.pop();
    } else if (US_STATES.has(tail)) {
      result.state = tail;
      segments.pop();
    }
  }

  // Only when something is left to be the place itself. "Caltech, USA" leaves one
  // segment, and that segment is the place, not the city it sits in.
  if (segments.length >= 2) {
    result.city = segments.pop();
  }

  // Whatever is left are the address lines, in the order they were written --
  // "Division of Biology, Caltech" is an address, and reordering or splitting it
  // further would only lose the sense of it.
  result.street = segments.join(', ');

  return result;
};

const blankStagedInstitution = (number, raw = '') => ({
  number,
  raw,
  // The whole line, not the leftovers: the parser below fills the address fields but
  // takes nothing away, so anything it could not place is still here to be edited.
  institution: raw,
  // Supplies street, city, state, postal_code and country -- every address field.
  ...parseAffiliation(raw),
  // Lab is an existing laboratory picked with LabCuriePicker, not free text:
  // laboratory_person links two independently-created objects by curie.
  lab: null,
  labLabel: '',
  webpage: '',
  comment: '',
});

/**
 * Stage one more institution, blank, numbered past every number already in use.
 *
 * Not every person's institution appears in the paper's affiliations -- a curator
 * who knows where someone actually is needs somewhere to put it. Numbering past the
 * highest in use rather than by array length matters because the numbers are how an
 * author's draft refers to an institution: reusing one would silently repoint an
 * existing choice at a different place.
 */
export const appendStagedInstitution = (staged) => {
  const list = Array.isArray(staged) ? staged : [];
  const highest = list.reduce((max, inst) => Math.max(max, (inst && inst.number) || 0), 0);
  return [...list, blankStagedInstitution(highest + 1)];
};

export const stagedInstitutionsFromAuthors = (authors) => {
  if (!Array.isArray(authors)) return [];
  const seen = new Set();
  const staged = [];
  for (const author of authors) {
    if (!author || !Array.isArray(author.affiliations)) continue;
    for (const affiliation of author.affiliations) {
      if (affiliation === null || affiliation === undefined) continue;
      const raw = String(affiliation).trim();
      if (!raw || seen.has(raw)) continue;
      seen.add(raw);
      staged.push(blankStagedInstitution(staged.length + 1, raw));
    }
  }
  return staged;
};

// The author's name as a display_name. BiblioEditor composes a missing author name
// from first + last the same way (see its authors field handler), so a person
// created here is named what the editor would have called the author.
const displayNameForAuthor = (author) => {
  const name = (author.name || '').trim();
  if (name) return name;
  return [author.first_name, author.last_name]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(' ');
};

/**
 * A fresh working draft for one author.
 *
 * `fields` are seeded from the author but are only suggestions -- every one is
 * editable, and the curator overrides any of them freely.
 *
 * `createdPersonCurie` matters only after a partially failed commit: once the
 * person exists, the draft pins to its curie so a retry links the person it
 * already made instead of creating a second one. Person curies come from MATI,
 * whose counter does not roll back, so a duplicate create permanently burns an id.
 */
export const draftFromAuthor = (author, stagedInstitutions) => {
  const a = author || {};

  // The paper already says where this author is, so pre-select the matching staged
  // institution rather than making the curator re-pick what was extracted for them.
  // Trimmed on both sides, because stagedInstitutionsFromAuthors trims when it
  // deduplicates and an untrimmed lookup would miss its own entry.
  //
  // Only the first affiliation, and only the current slot: one institution can be
  // current, and nothing in an affiliation list says which places someone has left.
  const firstAffiliation = (Array.isArray(a.affiliations) ? a.affiliations : [])
    .map((value) => (value === null || value === undefined ? '' : String(value).trim()))
    .find(Boolean) || '';
  const matched = firstAffiliation
    ? (Array.isArray(stagedInstitutions) ? stagedInstitutions : [])
      .find((inst) => inst && String(inst.raw).trim() === firstAffiliation)
    : null;
  // Store the bare id; buildPersonPayload re-applies the ORCID: prefix, so editing
  // and rebuilding cannot produce ORCID:ORCID:...
  const orcid = typeof a.orcid === 'string'
    ? a.orcid.replace(/^ORCID:/i, '').trim()
    : '';
  return {
    authorId: a.author_id,
    mode: 'none',
    selectedPerson: null,
    // person_id is the reliable signal, not person_curie. The reference endpoint
    // serialises AuthorModel through jsonable_encoder and the model has a person_id
    // column but no person_curie property -- only author_crud.show() computes the
    // curie. Keying off the curie alone made every link disappear on reload, so the
    // author looked unreconciled and its suggestions came back.
    existingPersonId: (a.person_id === null || a.person_id === undefined) ? null : a.person_id,
    existingPersonCurie: a.person_curie || null,
    isLinked: !!(a.person_id || a.person_curie),
    fields: {
      display_name: displayNameForAuthor(a),
      first_name: (a.first_name || '').trim(),
      middle_name: '',
      last_name: (a.last_name || '').trim(),
      orcid,
      email: '',
    },
    instChoice: matched ? matched.number : null,
    oldInstChoice: null,
    createdPersonCurie: null,
  };
};

const stagedByNumber = (staged, number) =>
  (Array.isArray(staged) ? staged : []).find((s) => s && s.number === number) || null;

/**
 * Everything wrong with a create draft, as curator-facing messages.
 *
 * These duplicate server-side rules on purpose. A person curie comes from MATI,
 * an external counter that does not roll back with the transaction, so every
 * POST /person/ that 422s permanently wastes an AGRKB id -- and a twelve-author
 * batch can waste twelve. Catching locally what the server would reject keeps
 * the commit from spending ids to discover what we already know.
 *
 * Only create drafts can be invalid: linking an existing person is a PATCH with a
 * curie, and an untouched draft is simply skipped.
 */
export const validateDraft = (draft, stagedInstitutions) => {
  if (!draft || draft.mode !== 'create') return [];
  const errors = [];
  const fields = draft.fields || {};

  if (!(fields.display_name || '').trim()) {
    errors.push('Display name is required.');
  }
  // PersonNameSchemaCreate rejects a blank last_name; person_editor.cgi refuses the
  // same thing before creating anyone.
  if (!(fields.last_name || '').trim()) {
    errors.push('Last name is required.');
  }
  // The payload supplies the ORCID: prefix, so the id itself must not contain a
  // colon -- PersonCrossReferenceSchemaCreate demands exactly one.
  if ((fields.orcid || '').includes(':')) {
    errors.push('ORCID must be the bare id, without an "ORCID:" prefix.');
  }

  // The same place as both current and old is self-contradictory for a person being
  // created, and would post two person_institution rows with the same name, one of
  // them already retired. (A person who left and later returned is a real case, but
  // that is an edit to an existing person, not a create.)
  if (draft.instChoice !== null && draft.instChoice !== undefined
      && draft.instChoice === draft.oldInstChoice) {
    errors.push('The same institution cannot be both current and old.');
  }

  // Institutions are optional: PersonSchemaPost makes them so, and plenty of authors
  // give no affiliation a curator would vouch for. person_editor.cgi required one;
  // that was its convention, not a constraint ABC shares. A chosen one still has to
  // be usable, so the checks below apply only to what was actually picked.
  const chosen = [draft.instChoice, draft.oldInstChoice].filter(
    (n) => n !== null && n !== undefined,
  );
  for (const number of chosen) {
    const staged = stagedByNumber(stagedInstitutions, number);
    if (!staged) {
      errors.push(`Institution ${number} is no longer on the page.`);
    } else if (!(staged.institution || '').trim()) {
      errors.push(`Institution ${number} has no name.`);
    }
  }
  return errors;
};

const trimmed = (value) => (value === null || value === undefined ? '' : String(value).trim());

/**
 * The POST /person/ body for a create draft.
 *
 * One request builds the whole person: PersonSchemaPost nests emails,
 * institutions, cross_references, names and notes. Labs are the exception --
 * laboratory_person is an association between two independently-created objects,
 * so it cannot be nested and is posted separately once the person exists.
 *
 * The address, webpage and comment come from the CURRENT staged institution: they
 * describe where the person is, so an old-only draft supplies none of them.
 * `now` is injected so the old-institution timestamp is testable.
 */
export const buildPersonPayload = (draft, stagedInstitutions, now = new Date().toISOString()) => {
  const fields = (draft && draft.fields) || {};
  const payload = { display_name: trimmed(fields.display_name) };

  payload.names = [{
    first_name: trimmed(fields.first_name) || null,
    middle_name: trimmed(fields.middle_name) || null,
    last_name: trimmed(fields.last_name),
    is_primary: true,
  }];

  const orcid = trimmed(fields.orcid);
  if (orcid) payload.cross_references = [{ curie: `ORCID:${orcid}` }];

  const email = trimmed(fields.email);
  if (email) payload.emails = [{ email_address: email }];

  const current = stagedByNumber(stagedInstitutions, draft && draft.instChoice);
  const institutions = [];
  if (current) institutions.push({ institution: trimmed(current.institution) });
  const old = stagedByNumber(stagedInstitutions, draft && draft.oldInstChoice);
  if (old) {
    institutions.push({
      institution: trimmed(old.institution),
      date_made_old_institution: now,
    });
  }
  if (institutions.length) payload.institutions = institutions;

  // Address, webpage and comment describe the place the person is now, so they are
  // only meaningful alongside a current institution.
  if (current) {
    // ABC stores one scalar street_address where person_editor.cgi has four street
    // rows; the staged object keeps them as one field and it maps straight across.
    if (trimmed(current.street)) payload.street_address = trimmed(current.street);
    if (trimmed(current.city)) payload.city = trimmed(current.city);
    if (trimmed(current.state)) payload.state = trimmed(current.state);
    if (trimmed(current.postal_code)) payload.postal_code = trimmed(current.postal_code);
    if (trimmed(current.country)) payload.country = trimmed(current.country);
    if (trimmed(current.webpage)) payload.webpage = [trimmed(current.webpage)];
    if (trimmed(current.comment)) payload.notes = [{ note: trimmed(current.comment) }];
  }

  // active_status and privacy are deliberately absent: the server defaults
  // ("active" / "hide_email") are what a newly created person should have, and
  // sending them would make this panel an authority on policy it does not own.
  return payload;
};

// The author-person curation workflow (SCRUM-6487). The process is the parent term;
// a reference is in it when it holds one of the four states, and only then may this
// screen change any author or reference-person link (SCRUM-6827).
export const AUTHOR_PERSON_PROCESS_ATP = 'ATP:0000375';
export const AUTHOR_PERSON_DONE = 'ATP:0000378';
export const AUTHOR_PERSON_IN_PROGRESS = 'ATP:0000377';
export const AUTHOR_PERSON_BLOCKED = 'ATP:0000376';
export const AUTHOR_PERSON_STATUSES = [
  { atp: 'ATP:0000109', label: 'Needed' },
  { atp: AUTHOR_PERSON_IN_PROGRESS, label: 'In progress' },
  { atp: AUTHOR_PERSON_BLOCKED, label: 'Blocked' },
  // "complete" in ATP; curators call it Done.
  { atp: AUTHOR_PERSON_DONE, label: 'Done' },
];

/** A draft whose author is linked now and is not staged to be unlinked. */
export const keepsExistingLink = (draft) => !!(draft && draft.isLinked && !draft.pendingUnlink);

/**
 * Whether every author will have a person once Commit has run: linked and staying so,
 * or staged to be linked or created. This is what selects Done automatically.
 *
 * True for a paper with no authors at all. Sort grants "needed" without looking at
 * authors, so a zero-author paper has to be closable the same way.
 */
export const allAuthorsConnected = (drafts) => (Array.isArray(drafts) ? drafts : []).every((draft) => (
  keepsExistingLink(draft)
  || (draft && draft.mode === 'link' && !!(draft.selectedPerson && draft.selectedPerson.curie))
  || (draft && draft.mode === 'create')
));

/**
 * The status the dropdown offers for what is staged, before any pick by the curator.
 * Worked out from the commit plan each time rather than tracked as changes happen,
 * so undoing everything always lands back on the stored status. The rules, agreed
 * with curators:
 *
 *   - Nothing staged: the stored status. Without a curator action it never changes.
 *   - A link or create staged (a "not an author" person assigned to an author is a
 *     link) and every author will have a person: Done, from any status, Blocked
 *     included. A replacement on a paper that was already fully linked counts.
 *   - Otherwise Blocked stays Blocked -- whoever set it had a reason.
 *   - A link or create staged, but not every author will have a person: In progress.
 *   - Only removals staged: In progress if the stored status is Done, else unchanged.
 *   - Removing a "not an author" person never affects the status: it only takes away
 *     something that should not have been there.
 *
 * A status the curator picks by hand overrides all of this (see BiblioPerson).
 */
export const suggestWorkflowStatus = (plan, drafts, storedStatus) => {
  const kinds = new Set((Array.isArray(plan) ? plan : []).map((p) => p.kind));
  const connects = kinds.has('link') || kinds.has('create');
  const removes = kinds.has('unlink');
  if (!connects && !removes) return storedStatus;
  if (connects && allAuthorsConnected(drafts)) return AUTHOR_PERSON_DONE;
  if (storedStatus === AUTHOR_PERSON_BLOCKED) return storedStatus;
  if (connects) return AUTHOR_PERSON_IN_PROGRESS;
  return storedStatus === AUTHOR_PERSON_DONE ? AUTHOR_PERSON_IN_PROGRESS : storedStatus;
};

/**
 * Whether a draft is staged to drop its link and then link the very same person again.
 * That is no change at all, so it is treated as one: the screen restores the link,
 * and the plan skips it rather than send an unlink and a relink.
 */
export const relinksSamePerson = (draft) => !!(draft && draft.isLinked && draft.pendingUnlink
  && draft.mode === 'link' && draft.existingPersonCurie && draft.selectedPerson
  && draft.selectedPerson.curie === draft.existingPersonCurie);

/**
 * authorId -> errors for every author that would end up on the same person as another
 * author of this paper. uq_author_ref_person allows a person once per reference, so
 * the API would refuse all but the first of them -- a half-applied commit, and Done
 * skipped -- after the curator had already been shown Done. Caught here instead, as
 * draft errors, which disable Commit until one of them is changed.
 *
 * A person counts for an author if the author keeps a link to them or is staged to
 * link to them. A staged unlink frees its person for another author: unlinks run
 * before links (see buildCommitPlan), so moving a person between authors still works.
 */
export const duplicatePersonErrors = (authors, drafts) => {
  const holders = new Map();
  for (const author of (Array.isArray(authors) ? authors : [])) {
    const draft = drafts && drafts[author.author_id];
    if (!draft) continue;
    let curie = null;
    if (keepsExistingLink(draft)) curie = draft.existingPersonCurie || null;
    else if (draft.mode === 'link' && draft.selectedPerson) curie = draft.selectedPerson.curie || null;
    if (!curie) continue;
    if (!holders.has(curie)) holders.set(curie, []);
    holders.get(curie).push(author);
  }
  const label = (author) => `${author.author_order}. ${author.name
    || [author.first_name, author.last_name].filter(Boolean).join(' ') || '(unnamed)'}`;
  const errors = {};
  for (const [curie, held] of holders) {
    if (held.length < 2) continue;
    for (const author of held) {
      const others = held.filter((a) => a !== author).map(label).join(', ');
      errors[author.author_id] = [
        `${curie} is also on author ${others} — a person can be linked to only one author of a paper.`,
      ];
    }
  }
  return errors;
};

/**
 * The ordered calls a commit has to make, one entry per author that is actually
 * doing something, plus one per staged stub removal. Untouched drafts produce nothing.
 *
 * Every change on the screen is staged, removals included, so the order matters:
 * uq_author_ref_person allows a person once per paper, and moving a person from one
 * author to another only works if the old link is gone first. So: every staged
 * unlink (replaced or not), then stub removals, then links and creates. Each
 * plan carries `kind` (unlink | removeStub | link | create) so the caller knows what a
 * result means for the screen.
 *
 * A create is up to three calls -- POST /person/, POST /laboratory_person/, PATCH
 * /author/{id} -- because a lab link is an association and cannot ride along in
 * the person payload.
 *
 * The rule that matters most is the retry: once `createdPersonCurie` is set, the
 * create step is gone for good and the remaining steps use the curie already
 * minted. MATI's counter does not roll back, so re-creating after a failed lab
 * link or author patch would both burn a second AGRKB id and leave a duplicate
 * person behind. `personCurie` is null only when this run is the one that mints it.
 */
export const buildCommitPlan = (
  drafts, stagedInstitutions, now = new Date().toISOString(), stubIdsToRemove = [],
) => {
  const unlinks = [];
  const plans = [];
  for (const draft of (Array.isArray(drafts) ? drafts : [])) {
    if (!draft || relinksSamePerson(draft)) continue;
    // Every staged unlink is sent on its own and first, even when a replacement
    // follows. A replacement PATCH alone would leave the old person on the author until
    // it ran, so a swap (1: P->Q, 2: Q->P) or a chain (1: P->Q, 2: Q->R) would have each
    // link refused by uq_author_ref_person while another author still held its person.
    if (draft.pendingUnlink && draft.isLinked) {
      unlinks.push({
        kind: 'unlink',
        authorId: draft.authorId,
        personCurie: null,
        steps: [{ kind: 'unlinkAuthor', author_id: draft.authorId }],
      });
    }
    if (draft.mode !== 'link' && draft.mode !== 'create') continue;

    if (draft.mode === 'link') {
      const curie = (draft.selectedPerson && draft.selectedPerson.curie) || null;
      // Already linked to exactly this person by an earlier commit, so there is
      // nothing to do. Pointing the draft at someone else clears the match and the
      // link is planned again -- replacing a link is still allowed.
      if (curie && curie === draft.committedPersonCurie) continue;
      plans.push({
        kind: 'link',
        authorId: draft.authorId,
        personCurie: curie,
        steps: [{ kind: 'linkAuthor', author_id: draft.authorId }],
      });
      continue;
    }

    const alreadyCreated = draft.createdPersonCurie || null;
    // Created AND linked by an earlier commit. Without this, committing again after
    // adding one more author re-sends every author already done.
    if (alreadyCreated && alreadyCreated === draft.committedPersonCurie) continue;

    const steps = [];
    if (!alreadyCreated) {
      steps.push({ kind: 'createPerson', payload: buildPersonPayload(draft, stagedInstitutions, now) });
    }
    const current = stagedByNumber(stagedInstitutions, draft.instChoice);
    // laboratory_person has no unique constraint on (laboratory_id, person_id) and its
    // crud does not dedupe, so re-posting the same pair silently adds a duplicate row.
    // Pinning the lab already linked is what keeps a retry from doing that.
    if (current && current.lab && current.lab !== draft.labLinkedCurie) {
      steps.push({ kind: 'linkLab', laboratory_curie: current.lab });
    }
    steps.push({ kind: 'linkAuthor', author_id: draft.authorId });
    plans.push({ kind: 'create', authorId: draft.authorId, personCurie: alreadyCreated, steps });
  }
  // A person-only row is removed by deleting it: with no author_order, clearing its
  // person would leave ck_author_person_or_order unsatisfiable.
  const stubRemovals = (Array.isArray(stubIdsToRemove) ? stubIdsToRemove : []).map((stubId) => ({
    kind: 'removeStub',
    authorId: stubId,
    personCurie: null,
    steps: [{ kind: 'deleteAuthorRow', author_id: stubId }],
  }));
  return [...unlinks, ...stubRemovals, ...plans];
};
