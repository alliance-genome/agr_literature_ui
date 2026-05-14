export function sourceLabel(source) {
  const method = source?.source_method || 'unknown';
  const sec = source?.secondary_data_provider_abbreviation;
  const dp = source?.data_provider;
  if (sec) return `${method} - ${sec}`;
  if (dp) return `${method} - ${dp}`;
  return method;
}

// Normalize an ATP/ECO curie to canonical uppercase form so case differences
// between ES bucket keys, TET DB rows, and the ATP cache don't cause silent
// mismatches. (Existing TopicEntityTable.js does the same via bucket.key.toUpperCase().)
export function normalizeCurie(curie) {
  if (!curie) return curie;
  return String(curie).toUpperCase();
}

export function groupTetsByTopicAndSource(tets) {
  const byTopic = new Map();
  for (const tet of tets || []) {
    const topicKey = normalizeCurie(tet.topic);
    const label = sourceLabel(tet.topic_entity_tag_source);
    if (!byTopic.has(topicKey)) byTopic.set(topicKey, new Map());
    const bySource = byTopic.get(topicKey);
    if (!bySource.has(label)) bySource.set(label, []);
    bySource.get(label).push(tet);
  }
  return byTopic;
}

const CURATOR_VALIDATION_TYPES = new Set([
  'professional_biocurator',
  'professional_curator',
]);

/** True for any TET whose source is a professional-biocurator source —
 *  regardless of entity. Useful to hide curator-submitted rows from the
 *  Sources column, since they already surface in the Validation column. */
export function isCuratorSourceTet(tet) {
  return (
    !!tet &&
    CURATOR_VALIDATION_TYPES.has(
      tet?.topic_entity_tag_source?.validation_type
    )
  );
}

export function isCuratorValidationTet(tet) {
  return (
    !!tet &&
    !tet.entity &&
    CURATOR_VALIDATION_TYPES.has(
      tet.topic_entity_tag_source?.validation_type
    )
  );
}

export function cellSortRank(tets) {
  const arr = tets || [];
  if (arr.length === 0) return 0;
  if (arr.some((t) => t.negated === false)) return 2;
  return 1;
}

/** Validation state of a (reference, topic) cell, considering only
 *  professional-biocurator topic-level TETs.
 *  Returns one of: 'unvalidated' | 'positive' | 'negative' | 'conflict'. */
export function validationState(tets) {
  const validations = (tets || []).filter(isCuratorValidationTet);
  if (validations.length === 0) return 'unvalidated';
  const hasPos = validations.some((t) => !t.negated);
  const hasNeg = validations.some((t) => t.negated);
  if (hasPos && hasNeg) return 'conflict';
  return hasPos ? 'positive' : 'negative';
}

export const VALIDATION_FILTER_KEYS = [
  'unvalidated',
  'positive',
  'negative',
  'conflict',
];

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
  const arr = tets || [];
  return model.some((key) => {
    switch (key) {
      case 'empty':
        return arr.length === 0;
      case 'has any tag':
        return arr.length > 0;
      case 'has Y':
        return arr.some((t) => t.negated === false);
      case 'has N':
        return arr.some((t) => t.negated === true);
      case 'has note':
        return arr.some((t) => t.note != null && t.note !== '');
      case 'my validation present':
        return arr.some((t) => t.created_by === currentUid);
      default:
        return false;
    }
  });
}
