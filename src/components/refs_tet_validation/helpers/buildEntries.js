import { sourceLabel } from './groupTets';

/**
 * Build a flat list of "entries" (mini-rows) for a (reference, topic) cell.
 * Every entry corresponds to one mini-row that all per-topic sub-columns
 * (Sources, Conf Sc, Conf Lvl, Note) iterate over in lockstep, so rows align
 * vertically across columns inside the same AgGrid row.
 *
 * Topic-only TETs (no entity) → one entry per TET.
 * Entity TETs from the same source/negated bucket → one collapsed entry with
 * the full TET array (count = N, used for "{N}E" badges and aggregates).
 */
export function buildEntries(tets, sourceFilterModel) {
  const bySource = new Map();
  for (const t of tets || []) {
    const lab = sourceLabel(t.topic_entity_tag_source);
    if (
      sourceFilterModel &&
      Array.isArray(sourceFilterModel) &&
      !sourceFilterModel.includes(lab)
    ) {
      continue;
    }
    if (!bySource.has(lab)) bySource.set(lab, []);
    bySource.get(lab).push(t);
  }

  const entries = [];
  for (const [label, items] of bySource) {
    const topicOnly = items.filter((t) => !t.entity);
    const entityPositive = items.filter((t) => t.entity && !t.negated);
    const entityNegative = items.filter((t) => t.entity && t.negated);

    for (const t of topicOnly) {
      entries.push({
        key: `t-${t.topic_entity_tag_id}`,
        kind: 'topic',
        sourceLabel: label,
        tets: [t],
      });
    }
    if (entityPositive.length > 0) {
      entries.push({
        key: `ep-${label}`,
        kind: 'entity-pos',
        sourceLabel: label,
        tets: entityPositive,
      });
    }
    if (entityNegative.length > 0) {
      entries.push({
        key: `en-${label}`,
        kind: 'entity-neg',
        sourceLabel: label,
        tets: entityNegative,
      });
    }
  }
  return entries;
}
