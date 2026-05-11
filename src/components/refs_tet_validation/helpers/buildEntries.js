import { sourceLabel, isCuratorSourceTet } from './groupTets';

/** Common evidence-assertion curies → human-readable label. Mirrors the
 *  hardcoded mapping in the search backend's add_curie_to_name_values. */
const EVIDENCE_ASSERTION_NAMES = {
  'ECO:0006155': 'manual',
  'ECO:0007669': 'automated',
  'ECO:0008004': 'machine learning',
  'ECO:0008021': 'string matching',
  'ATP:0000035': 'author',
  'ATP:0000036': 'professional biocurator',
};

export function evidenceAssertionName(curie) {
  if (!curie) return 'unspecified evidence';
  const key = String(curie).toUpperCase();
  return EVIDENCE_ASSERTION_NAMES[key] || curie;
}

/** Group a buildEntries output by source.source_evidence_assertion so cells
 *  can render one panel per evidence type (manual / automated / etc.).
 *  Returns an ordered Map(evidenceCurie → entries[]). */
export function groupEntriesByEvidence(entries) {
  const m = new Map();
  for (const e of entries || []) {
    const key =
      e.tets?.[0]?.topic_entity_tag_source?.source_evidence_assertion || '';
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(e);
  }
  return m;
}

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
    // Curator-submitted tags are surfaced in the Validation column;
    // exclude them from the Sources column to avoid duplication.
    if (isCuratorSourceTet(t)) continue;
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
