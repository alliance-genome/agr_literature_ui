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
 * Only `institution` is seeded, from the raw string. The address is left blank for
 * the curator: the cgi shows the affiliation for reference rather than parsing it,
 * and a comma-split heuristic is wrong often enough on real affiliation strings
 * that curators would stop trusting the prefill.
 */
const blankStagedInstitution = (number, raw = '') => ({
  number,
  raw,
  institution: raw,
  street: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
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
export const draftFromAuthor = (author) => {
  const a = author || {};
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
    instChoice: null,
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

  const chosen = [draft.instChoice, draft.oldInstChoice].filter(
    (n) => n !== null && n !== undefined,
  );
  if (chosen.length === 0) {
    errors.push('Choose a current or old institution.');
  } else {
    for (const number of chosen) {
      const staged = stagedByNumber(stagedInstitutions, number);
      if (!staged) {
        errors.push(`Institution ${number} is no longer on the page.`);
      } else if (!(staged.institution || '').trim()) {
        errors.push(`Institution ${number} has no name.`);
      }
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

/**
 * The ordered calls a commit has to make, one entry per author that is actually
 * doing something. Untouched drafts produce nothing.
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
export const buildCommitPlan = (drafts, stagedInstitutions, now = new Date().toISOString()) => {
  if (!Array.isArray(drafts)) return [];
  const plans = [];
  for (const draft of drafts) {
    if (!draft || (draft.mode !== 'link' && draft.mode !== 'create')) continue;

    if (draft.mode === 'link') {
      const curie = (draft.selectedPerson && draft.selectedPerson.curie) || null;
      // Already linked to exactly this person by an earlier commit, so there is
      // nothing to do. Pointing the draft at someone else clears the match and the
      // link is planned again -- replacing a link is still allowed.
      if (curie && curie === draft.committedPersonCurie) continue;
      plans.push({
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
    plans.push({ authorId: draft.authorId, personCurie: alreadyCreated, steps });
  }
  return plans;
};
