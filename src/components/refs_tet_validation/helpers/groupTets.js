export function sourceLabel(source) {
  const method = source?.source_method || 'unknown';
  const sec = source?.secondary_data_provider_abbreviation;
  const dp = source?.data_provider;
  if (sec) return `${method} / ${sec}`;
  if (dp) return `${method} / ${dp}`;
  return method;
}

export function groupTetsByTopicAndSource(tets) {
  const byTopic = new Map();
  for (const tet of tets || []) {
    const topicKey = tet.topic;
    const label = sourceLabel(tet.topic_entity_tag_source);
    if (!byTopic.has(topicKey)) byTopic.set(topicKey, new Map());
    const bySource = byTopic.get(topicKey);
    if (!bySource.has(label)) bySource.set(label, []);
    bySource.get(label).push(tet);
  }
  return byTopic;
}

export function cellSortRank(tets) {
  const arr = tets || [];
  if (arr.length === 0) return 0;
  if (arr.some((t) => t.negated === false)) return 2;
  return 1;
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
