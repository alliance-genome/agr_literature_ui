// Pure assessment-staging logic for the Quick Topic Addition grid
// (SCRUM-6113). Kept dependency-free in its own module so the cross-check
// rules — the part of the feature that decides what gets WRITTEN on Submit —
// are directly unit-testable without mounting the AG Grid component.

// Data-novelty ATP terms, matching the TET editor (getDataNoveltyAtpArray).
export const NOVELTY_UNSPECIFIED = 'ATP:0000335';
export const DEFAULT_NEW_NOVELTY = 'ATP:0000321';

// The five assessment columns of the quick-add grid (SCRUM-6113). Each column is
// a clickable box (blank / ? / ✓). Checking a column stages a biocurator tag:
// positives carry the column's data novelty, "No Data" is a negated tag. The
// grid state is server-computed (tet_info_assessment_states) and the curator's
// clicks stage local overrides that are only written on Submit.
export const ASSESSMENT_COLUMNS = [
  { key: 'has_data', header: 'Has data', kind: 'has', novelty: NOVELTY_UNSPECIFIED, negated: false },
  { key: 'new_data', header: 'New data', kind: 'new', novelty: 'ATP:0000321', negated: false },
  { key: 'new_to_db', header: 'New to DB', kind: 'new', novelty: 'ATP:0000228', negated: false },
  { key: 'new_to_field', header: 'New to Field', kind: 'new', novelty: 'ATP:0000229', negated: false },
  { key: 'no_data', header: 'No Data', kind: 'no', novelty: null, negated: true },
];
export const COLUMN_BY_KEY = Object.fromEntries(ASSESSMENT_COLUMNS.map((c) => [c.key, c]));
export const POSITIVE_COLUMNS = ['has_data', 'new_data', 'new_to_db', 'new_to_field'];
export const NEW_COLUMNS = ['new_data', 'new_to_db', 'new_to_field'];

// Effective display state of one column for a row: the curator's staged override
// wins, otherwise the server-computed state. Only a biocurator tag ('validated')
// or a staged click ('checked'/'implied') renders as a ✓; a prediction/author
// tag is '?'. 'implied' is a has_data check that exists only because a New*
// column is checked (New* implies Has data) — it displays identically but is
// dropped automatically when the last implying New* is un-checked, so undoing a
// New* click never leaves a Has-data tag the curator did not place (PR #644
// review, finding 2).
export const computeCellState = (stagedMap, rowData, colKey) => {
  const override = stagedMap?.[rowData.topic_curie]?.[colKey];
  if (override === 'checked' || override === 'implied') { return 'checked'; }
  if (override === 'cleared') { return 'blank'; }
  const backend = (rowData.assessment_states || {})[colKey];
  if (backend === 'validated') { return 'validated'; }
  if (backend === 'unvalidated') { return 'unvalidated'; }
  return 'blank';
};

// Stage a column as checked in one row's override map, applying the cross-check
// rules: "No Data" and the positive columns are mutually exclusive, and any
// New* column implies "Has data" (recorded as 'implied' unless the curator
// checked it explicitly). New to DB and New to Field may coexist.
// `backend` is the row's server assessment_states: a column a biocurator has
// already validated is never overridden to 'cleared' — the recorded ✓ keeps
// showing, since Submit only creates tags and cannot retract the existing one
// (PR #644 review, finding 1). Callers guard against staging a column whose
// OPPOSITE polarity is validated before calling this.
export const applyChecked = (cur, colKey, backend = {}) => {
  const clear = (c) => { if (backend[c] !== 'validated') { cur[c] = 'cleared'; } };
  cur[colKey] = 'checked';
  if (colKey === 'no_data') {
    POSITIVE_COLUMNS.forEach(clear);
  } else {
    clear('no_data');
    if (colKey !== 'has_data' && cur.has_data !== 'checked') { cur.has_data = 'implied'; }
  }
  return cur;
};

// Un-stage a checked column, undoing the implications applyChecked added:
// un-checking the last effective New* also drops an 'implied' Has data (but
// never an explicit one); un-checking Has data cascades to the New* checks that
// imply it. When nothing remains checked, leftover 'cleared' markers are
// dropped too, so the row returns exactly to its server state.
export const applyUnchecked = (cur, colKey) => {
  delete cur[colKey];
  if (colKey === 'has_data') {
    NEW_COLUMNS.forEach((c) => { delete cur[c]; });
  }
  const anyNew = NEW_COLUMNS.some((c) => cur[c] === 'checked');
  if (!anyNew && cur.has_data === 'implied') { delete cur.has_data; }
  const anyChecked = Object.values(cur).some((v) => v === 'checked' || v === 'implied');
  if (!anyChecked) { Object.keys(cur).forEach((k) => delete cur[k]); }
  return cur;
};

// True when staging `colKey` on this row would contradict an assessment a
// biocurator has already validated on the opposite polarity — a No Data click
// against a validated positive, or a positive click against a validated No
// Data. Submit only creates tags (nothing is retracted), so allowing the click
// would write contradictory assertions while visually hiding the recorded one.
export const conflictsWithValidated = (rowData, colKey) => {
  const backend = rowData.assessment_states || {};
  if (colKey === 'no_data') {
    return POSITIVE_COLUMNS.some((c) => backend[c] === 'validated');
  }
  return backend.no_data === 'validated';
};

// The biocurator tags a row's staged edits would create on Submit. Skips any
// column already validated by a biocurator (no duplicate), and drops the bare
// "Has data" tag when a more specific New* column is also set for the row.
export const stagedTagsFor = (stagedMap, row) => {
  const s = stagedMap[row.topic_curie];
  if (!s) { return []; }
  const backend = row.assessment_states || {};
  const checked = (c) => {
    const o = s[c];
    if (o === 'checked' || o === 'implied') { return true; }
    if (o === 'cleared') { return false; }
    return backend[c] === 'validated';
  };
  const newCol = (c) => checked(c) && backend[c] !== 'validated';
  const tags = [];
  if (checked('no_data') && backend.no_data !== 'validated') {
    tags.push({ kind: 'no', novelty: null, label: 'No Data' });
  }
  NEW_COLUMNS.forEach((c) => {
    if (newCol(c)) { tags.push({ kind: 'new', novelty: COLUMN_BY_KEY[c].novelty, label: COLUMN_BY_KEY[c].header }); }
  });
  const anyNewEffective = NEW_COLUMNS.some((c) => checked(c));
  if (newCol('has_data') && !anyNewEffective) {
    tags.push({ kind: 'has', novelty: NOVELTY_UNSPECIFIED, label: 'Has data' });
  }
  return tags;
};
