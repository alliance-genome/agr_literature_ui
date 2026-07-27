import { sourceLabel, isCuratorSourceTet } from './groupTets';

/** Curated evidence-assertion curie → short human-readable label. This is the
 *  FIRST choice in evidenceAssertionLabel: for the codes listed here the grid
 *  keeps these stable, deliberately short titles (e.g. "manual", "automated")
 *  regardless of the longer ontology phrase the backend may resolve. The map is
 *  intentionally incomplete — codes absent from it fall through to the backend's
 *  source_evidence_assertion_name, then to the raw curie. Add a code here only
 *  when you want a curated short label to override the ontology name. */
const EVIDENCE_ASSERTION_NAMES = {
  'ECO:0006155': 'manual',
  'ECO:0007669': 'automated',
  'ECO:0008004': 'machine learning',
  'ECO:0008021': 'string matching',
  'ECO:0008025': 'neural network method',
  'ATP:0000035': 'author',
  'ATP:0000036': 'professional biocurator',
};

export function evidenceAssertionName(curie) {
  if (!curie) return 'unspecified evidence';
  const key = String(curie).toUpperCase();
  return EVIDENCE_ASSERTION_NAMES[key] || curie;
}

/** Resolve an evidence-assertion panel label. Precedence, chosen so the grid's
 *  established short titles stay stable while still labelling codes the offline
 *  map does not cover:
 *    1. the curated offline label (keeps manual/automated/... short and fixed);
 *    2. the ontology name the backend resolved from the persistent store
 *       (source_evidence_assertion_name) for any code missing from the map;
 *    3. the raw curie as a last resort.
 *  `entries` are the mini-rows grouped under a single evidence curie. These
 *  resolved ontology names can be long, so callers must clip/ellipsize the
 *  title and surface the full text via the cell tooltip. */
export function evidenceAssertionLabel(entries, curie) {
  const mapped = curie ? EVIDENCE_ASSERTION_NAMES[String(curie).toUpperCase()] : null;
  if (mapped) return mapped;
  for (const e of entries || []) {
    const name =
      e?.source_evidence_assertion_name ||
      e?.tets?.[0]?.topic_entity_tag_source?.source_evidence_assertion_name;
    if (name) return name;
  }
  return evidenceAssertionName(curie);
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
