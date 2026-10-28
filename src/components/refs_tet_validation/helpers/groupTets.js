export function sourceLabel(source) {
  const method = source?.source_method || 'unknown';
  const sec = source?.secondary_data_provider_abbreviation;
  const dp = source?.data_provider;
  if (sec) return `${method} / ${sec}`;
  if (dp) return `${method} / ${dp}`;
  return method;
}

// Normalize an ATP/ECO curie to canonical uppercase form so case differences
// between ES bucket keys, TET DB rows, and the ATP cache don't cause silent
// mismatches. (Existing TopicEntityTable.js does the same via bucket.key.toUpperCase().)
export function normalizeCurie(curie) {
  if (!curie) return curie;
  return String(curie).toUpperCase();
}

function asTets(value) {
  if (Array.isArray(value)) return value;
  return value?.tets || [];
}

export function groupTetsByTopicAndSource(tets) {
  const byTopic = new Map();
  for (const tet of asTets(tets)) {
    const topicKey = normalizeCurie(tet.topic);
    const label = sourceLabel(tet.tag_source);
    if (!byTopic.has(topicKey)) byTopic.set(topicKey, new Map());
    const bySource = byTopic.get(topicKey);
    if (!bySource.has(label)) bySource.set(label, []);
    bySource.get(label).push(tet);
  }
  return byTopic;
}

/** The only curator validation_type. The old 'professional_curator' spelling
 *  never matched what validation edges key on and is normalised away by the
 *  SCRUM-6518 migration, which ships ahead of this code. Named to match the
 *  API's CURATOR_VALIDATION_TYPE in tag_source_crud.py. */
const CURATOR_VALIDATION_TYPE = 'professional_biocurator';

/** True for any TET whose source is a professional-biocurator source —
 *  regardless of entity. Useful to hide curator-submitted rows from the
 *  Sources column, since they already surface in the Validation column. */
export function isCuratorSourceTet(tet) {
  return (
    !!tet &&
    tet?.tag_source?.validation_type === CURATOR_VALIDATION_TYPE
  );
}

export function isCuratorValidationTet(tet) {
  return (
    !!tet &&
    !tet.entity &&
    tet.tag_source?.validation_type === CURATOR_VALIDATION_TYPE
  );
}

/** The data context the assess buttons submit (the API's
 *  CURATOR_VALIDATION_DATA_CONTEXT). It has no descendants in ATP. */
const EXPERIMENTALLY_STUDIED_DATA_CONTEXT = 'ATP:0000325';

/** True for a positive *mixed* topic + entity tag from a professional
 *  biocurator, e.g. gene expression + gene fgf8a (SCRUM-6784). Such a tag
 *  already says the paper has data for its topic, so it counts as its MOD's
 *  Y in the "Data assessment by biocurator" column. These are the conditions
 *  under which the API's TET validation rules would mark the topic-level tag
 *  the assess buttons create (no entity, root data novelty, experimentally
 *  studied data) as validated right by this tag:
 *    - positive only: no data for one gene says nothing about the topic;
 *    - data context experimentally studied, or unset (makes no claim);
 *      mentioned, marker or background data do not count;
 *    - entity, data novelty and species need no check, the button's tag
 *      having no entity and the novelty root.
 *  Pure entity tags (topic == entity_type, e.g. gene / gene) are left out. */
export function isCuratorMixedPositiveTet(tet) {
  return (
    !!tet &&
    !!tet.entity &&
    !!tet.entity_type &&
    normalizeCurie(tet.entity_type) !== normalizeCurie(tet.topic) &&
    tet.negated === false &&
    (tet.data_context == null ||
      normalizeCurie(tet.data_context) === EXPERIMENTALLY_STUDIED_DATA_CONTEXT) &&
    tet.tag_source?.validation_type === CURATOR_VALIDATION_TYPE
  );
}

/** The cell's tets that count as a curator Y through a mixed tag. Read from
 *  the raw tets even when the server aggregated the cell: the aggregate holds
 *  topic-level tags only, and an assessment never changes mixed tags, so the
 *  raw tets can't be stale for them. */
export function curatorMixedPositiveTets(value) {
  return asTets(value).filter(isCuratorMixedPositiveTet);
}

/** MOD abbreviations (uppercased) that already have a professional-biocurator
 *  assessment in a cell: a topic-level tag, or a positive mixed tag
 *  (SCRUM-6784). Every curator source is per MOD (the ABC
 *  source's secondary_data_provider is the curator's MOD), so this is what lets
 *  a curator still assess a topic another MOD has already assessed (SCRUM-6256).
 *
 *  Reads both the raw tets and the server `validation.by_curator` source labels
 *  (`method / MOD`): after a validation the grid swaps in only the recomputed
 *  server aggregate, leaving the raw tets stale, so the aggregate is what shows
 *  the curator's own new assessment. */
export function curatorAssessedMods(value) {
  const mods = new Set();
  for (const t of asTets(value)) {
    if (!isCuratorValidationTet(t) && !isCuratorMixedPositiveTet(t)) continue;
    const mod = modOfTet(t);
    if (mod) mods.add(mod);
  }
  const sv = cellServerValidation(value);
  for (const group of sv?.by_curator || []) {
    for (const s of group?.sources || []) {
      const mod = modFromSourceLabel(s?.label);
      if (mod) mods.add(mod);
    }
  }
  return mods;
}

/** The MOD (uppercased) a tet's source belongs to, or null. */
export function modOfTet(tet) {
  const mod =
    tet?.tag_source?.secondary_data_provider_abbreviation ||
    tet?.tag_source?.data_provider;
  return mod ? String(mod).toUpperCase() : null;
}

/** The MOD (uppercased) in a server source label (`method / MOD`), or null. */
export function modFromSourceLabel(label) {
  const s = String(label || '');
  const sep = s.lastIndexOf(' / ');
  return sep >= 0 ? s.slice(sep + 3).toUpperCase() : null;
}

/** True when `mod` already has a professional-biocurator assessment in the
 *  cell (see curatorAssessedMods). With no MOD to compare against, falls back to "any curator
 *  assessed it", the behaviour before assessments were per MOD. */
export function isAssessedByMod(value, mod) {
  if (!mod) return validationState(value) !== 'unvalidated';
  return curatorAssessedMods(value).has(String(mod).toUpperCase());
}

export function cellSortRank(tets) {
  const arr = asTets(tets);
  if (arr.length === 0) return 0;
  if (arr.some((t) => t.negated === false)) return 2;
  return 1;
}

/** Server-aggregated validation carried on a cell value object, or `undefined`
 *  when the value is a bare tets array / the row was not server-aggregated (older
 *  backend or per-reference fallback) and the state must be derived from raw
 *  tets. A value of `null` means the server DID aggregate the row but found no
 *  curator validation for this topic (=> 'unvalidated'). */
function cellServerValidation(value) {
  if (!value || Array.isArray(value)) return undefined;
  return value.validation;
}

/** Validation state of a (reference, topic) cell, considering
 *  professional-biocurator topic-level TETs and positive mixed TETs.
 *  Returns one of: 'unvalidated' | 'positive' | 'negative' | 'conflict'.
 *  Prefers the server aggregate (value.validation.state) for the topic-level
 *  part when present so the grid sorts/filters without re-deriving from raw
 *  tags; falls back to deriving from raw tets when the value carries no
 *  aggregate. The aggregate holds topic-level tags only, so mixed tags are
 *  always read from the raw tets. */
export function validationState(tets) {
  // Positive mixed curator tags count as a Y on either path (SCRUM-6784).
  const hasMixedPos = curatorMixedPositiveTets(tets).length > 0;
  let hasPos;
  let hasNeg;
  const sv = cellServerValidation(tets);
  if (sv !== undefined) {
    const state = sv && sv.state ? sv.state : 'unvalidated';
    if (!hasMixedPos) return state;
    hasPos = true;
    hasNeg = state === 'negative' || state === 'conflict';
  } else {
    const validations = asTets(tets).filter(isCuratorValidationTet);
    hasPos = hasMixedPos || validations.some((t) => !t.negated);
    hasNeg = validations.some((t) => t.negated);
  }
  if (hasPos && hasNeg) return 'conflict';
  if (hasPos) return 'positive';
  return hasNeg ? 'negative' : 'unvalidated';
}

export const VALIDATION_FILTER_KEYS = [
  'unvalidated',
  'positive',
  'negative',
  'conflict',
];

/** Display labels for the validation states above. The keys are the server's
 *  aggregate `validation.state` values and are also what gets persisted in
 *  saved AgGrid filter models, so they must not change — only the UI wording
 *  does. Y / N mirror the "Data" column pills and the `has_data` advanced-search
 *  facet, so a biocurator assessment reads the same way everywhere (SCRUM-6330). */
export const VALIDATION_STATE_LABELS = Object.freeze({
  unvalidated: 'unassessed',
  positive: 'Y',
  negative: 'N',
  conflict: 'conflict',
});

/** Human label for a validation state, falling back to the raw key so an
 *  unrecognized server state still renders something. */
export function validationStateLabel(state) {
  return VALIDATION_STATE_LABELS[state] || state;
}

/** Stable numeric ordering for AgGrid sort: unvalidated < conflict <
 *  negative < positive. Curators can flip via shift-click for descending. */
export function validationSortRank(tets) {
  const s = validationState(tets);
  return { unvalidated: 0, conflict: 1, negative: 2, positive: 3 }[s] || 0;
}

export const TOPIC_CELL_FILTER_KEYS = [
  'has any tag',
  'has Y',
  'has N',
  'has note',
  'my validation present',
  'empty',
];

export function cellPredicate(tets, currentUid, model) {
  if (!Array.isArray(model) || model.length === 0) return true;
  const arr = asTets(tets);
  // Prefer the server-aggregated per-cell flags (has_any/has_y/has_n/has_note/
  // my_validation_present) when present so filtering doesn't scan raw tags.
  // `null`/`undefined` => no server aggregate, derive from raw tets. The server
  // computes my_validation_present by comparing each tag's created_by against
  // the authenticated user's internal users.id -- the comparison the client
  // cannot do reliably, since its uid is an Okta subject id and the serialized
  // created_by is a display name. The raw-tets fallback keeps the older-backend
  // path working.
  const flags =
    tets && !Array.isArray(tets) ? tets.filterFlags : undefined;
  const server = flags != null;
  return model.some((key) => {
    switch (key) {
      case 'empty':
        return server ? !flags.has_any : arr.length === 0;
      case 'has any tag':
        return server ? !!flags.has_any : arr.length > 0;
      case 'has Y':
        return server ? !!flags.has_y : arr.some((t) => t.negated === false);
      case 'has N':
        return server ? !!flags.has_n : arr.some((t) => t.negated === true);
      case 'has note':
        return server
          ? !!flags.has_note
          : arr.some((t) => t.note != null && t.note !== '');
      case 'my validation present':
        return server
          ? !!flags.my_validation_present
          : arr.some((t) => t.created_by === currentUid);
      default:
        return false;
    }
  });
}
