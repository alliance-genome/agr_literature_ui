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
      e.source_evidence_assertion ||
      e.tets?.[0]?.topic_entity_tag_source?.source_evidence_assertion ||
      '';
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(e);
  }
  return m;
}

export function cellTets(value) {
  if (Array.isArray(value)) return value;
  return value?.tets || [];
}

/** Every mini-row is keyed on entry.key (React reconciliation across the
 *  lockstep per-topic columns). buildEntries always sets key, but server-
 *  supplied entries are passed through verbatim and an older/partial backend
 *  could omit it, which would render sibling rows with key={undefined}. Derive a
 *  stable fallback from the entry's own fields (kind + source + tag id), falling
 *  back to the cell-local index only as a last resort. */
function entryKey(entry, idx) {
  if (entry.key != null) return entry.key;
  const label = entry.sourceLabel || entry.source_label || '';
  const id = entry.topic_entity_tag_id != null ? entry.topic_entity_tag_id : idx;
  return `${entry.kind || 'entry'}-${label}-${id}`;
}

export function cellEntries(value, sourceFilterModel) {
  const prebuilt = Array.isArray(value?.entries) ? value.entries : null;
  if (prebuilt) {
    // Guarantee a key on every server entry before any cell renders it.
    const keyed = prebuilt.map((entry, idx) =>
      entry.key != null ? entry : { ...entry, key: entryKey(entry, idx) }
    );
    if (!Array.isArray(sourceFilterModel)) return keyed;
    return keyed.filter((entry) =>
      sourceFilterModel.includes(entry.sourceLabel || entry.source_label)
    );
  }
  return buildEntries(cellTets(value), sourceFilterModel);
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
