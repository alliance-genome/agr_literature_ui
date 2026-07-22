// Advanced Topic query builder model + compiler (SCRUM-6228).
//
// The builder keeps a UI-friendly tree in Redux (state.search.advancedTopicQuery)
// and compiles it, at search time, into the API contract shape consumed by the
// backend's build_tet_advanced_query (see agr_literature_service search_crud.py):
//
//   internal node : { operator: 'AND'|'OR', children: [node|leaf, ...] }
//   leaf (API)    : { type: 'tet', negate: bool, match: { <short>: [values], ... } }
//
// UI leaves carry an editable `fields` array instead of a `match` object so a
// curator can add/remove sub-facet rows without worrying about object keys; the
// compiler folds that array into the `match` object and prunes empties.

// Entity type is a small controlled vocabulary of ATP curies (there is no search
// aggregation for it), so its dropdown options are static. Mirrors the list used
// by the TET create form (TopicEntityCreate.js) so search values match the curies
// actually stored on tags — a free-text name like "gene" would never match.
export const ENTITY_TYPE_OPTIONS = [
  { value: 'ATP:0000005', label: 'gene (ATP:0000005)' },
  { value: 'ATP:0000006', label: 'allele (ATP:0000006)' },
  { value: 'ATP:0000110', label: 'transgenic allele (ATP:0000110)' },
  { value: 'ATP:0000285', label: 'classical allele (ATP:0000285)' },
  { value: 'ATP:0000123', label: 'species (ATP:0000123)' },
  { value: 'ATP:0000027', label: 'strain (ATP:0000027)' },
  { value: 'ATP:0000025', label: 'genotype (ATP:0000025)' },
  { value: 'ATP:0000026', label: 'fish (ATP:0000026)' },
  { value: 'ATP:0000013', label: 'transgenic construct (ATP:0000013)' },
  { value: 'ATP:0000093', label: 'sequence targeting reagent (ATP:0000093)' },
];

// "Has data" is the human-facing view of a tag's boolean `negated` attribute: a
// positive tag (negated=false) asserts the topic HAS data; a negated tag
// (negated=true) asserts NO data. Static Yes/No options so a curator can require, on
// the same tag, e.g. "Topic = disease model AND Source method = acknowledge_form AND
// Has data = yes". BACKEND CONTRACT (build_tet_advanced_query): map the `has_data`
// match key to a term on topic_entity_tags.negated, inverted — "yes" => negated=false,
// "no" => negated=true (it is a boolean field, so there is no .keyword sub-field).
export const HAS_DATA_OPTIONS = [
  { value: 'yes', label: 'yes (has data)' },
  { value: 'no', label: 'no (no data)' },
];

// Professional-biocurator validation of a (usually predicted) tag. A controlled
// vocabulary computed by the backend (calculate_validation_value_for_tag): a
// predicted tag is "validated right"/"validated wrong" when a professional
// biocurator's tag agrees/disagrees with it, "validation conflict" when biocurator
// tags disagree among themselves, "validated right (self)" when the tag itself was
// made by a professional biocurator, and "not validated" when no biocurator tag
// bears on it. Static options (not facet buckets) so the dropdown reads with these
// human labels instead of raw tokens. BACKEND CONTRACT (build_tet_advanced_query):
// the `validation_by_professional_biocurator` match key maps to a term on
// topic_entity_tags.validation_by_professional_biocurator.keyword.
export const VALIDATION_BY_PROFESSIONAL_BIOCURATOR_OPTIONS = [
  { value: 'validated_right', label: 'validated right' },
  { value: 'validated_wrong', label: 'validated wrong' },
  { value: 'validated_right_self', label: 'validated right (self)' },
  { value: 'validation_conflict', label: 'validation conflict' },
  { value: 'not_validated', label: 'not validated' },
];

// key      : short TET sub-facet name -> topic_entity_tags.<key>.keyword on the backend
// label    : display label in the field dropdown
// facetKey : aggregation key in state.search.searchFacets whose buckets seed the
//            value dropdown; null => free-text input (comma-separated for multiple)
// options  : static value dropdown (overrides facetKey/free-text) for controlled vocabs
// range    : confidence score, edited as a [min, max] pair
export const TET_FIELD_DEFS = [
  { key: 'topic', label: 'Topic', facetKey: 'topics' },
  { key: 'entity_type', label: 'Entity type', facetKey: null, options: ENTITY_TYPE_OPTIONS },
  { key: 'source_method', label: 'Source method', facetKey: 'source_methods' },
  { key: 'source_evidence_assertion', label: 'Source evidence assertion', facetKey: 'source_evidence_assertions' },
  { key: 'confidence_level', label: 'Confidence level', facetKey: 'confidence_levels' },
  { key: 'data_novelty', label: 'Data novelty', facetKey: 'data_novelty' },
  {
    key: 'validation_by_professional_biocurator',
    label: 'Validation (biocurator)',
    facetKey: null,
    options: VALIDATION_BY_PROFESSIONAL_BIOCURATOR_OPTIONS,
  },
  { key: 'has_data', label: 'Has data', facetKey: null, options: HAS_DATA_OPTIONS },
  { key: 'species', label: 'Species', facetKey: null },
  { key: 'confidence_score', label: 'Confidence score', range: true },
];

export const FIELD_DEF_BY_KEY = TET_FIELD_DEFS.reduce((acc, def) => {
  acc[def.key] = def;
  return acc;
}, {});

export const isRangeField = (key) => !!(FIELD_DEF_BY_KEY[key] && FIELD_DEF_BY_KEY[key].range);

// Factory helpers — every new node is a fresh object so React state updates stay immutable.
// A field row now carries a `values` array of { value, label } chips (multiple
// values on one field = OR); `label` is display-only, the compiler reads `value`.
// Range fields keep min/max. (Legacy rows with a scalar `value` still compile.)
// A new field row starts empty, except "Has data": adding it pre-selects
// "yes (has data)" so an explicit Has-data field is a ready-to-use control (a
// curator can switch it to "no"). The tree-wide "exclude no-data" default already
// covers the common positive-only case without any field — see EXCLUDE_NO_DATA_DEFAULT
// and compileAdvancedQuery (SCRUM-6228).
export const createFieldRow = (field = 'topic') => ({
  field,
  values: field === 'has_data'
    ? [{ value: HAS_DATA_OPTIONS[0].value, label: HAS_DATA_OPTIONS[0].label }]
    : [],
  min: 0,
  max: 1,
});
export const createLeaf = () => ({ type: 'tet', negate: false, fields: [createFieldRow()] });
export const createGroup = () => ({ operator: 'OR', children: [createLeaf()] });
// The Tag-card UI keeps a FLAT tree: leaves (one per Tag) directly under the root,
// combined with the top-level operator. The compiler still supports nested groups,
// so older/nested saved trees round-trip; normalizeToFlatTree collapses them for
// display when the flat builder loads one.
//
// excludeNoData mirrors the facet search's default "exclude negative": when on
// (the default), every positive tag condition is compiled with has_data = yes so
// results only include tags that have data. It is surfaced as a single toggle
// (not a per-Tag field) and shown in the query preview; unchecking it, or adding an
// explicit Has data field to a Tag, overrides it (SCRUM-6228).
export const EXCLUDE_NO_DATA_DEFAULT = true;
export const createEmptyTree = () => ({
  operator: 'AND',
  excludeNoData: EXCLUDE_NO_DATA_DEFAULT,
  children: [createLeaf()],
});

export const isLeaf = (node) => !!node && node.type === 'tet';

// Collect every leaf in a (possibly nested) tree into a flat { operator, children:[leaf] }
// so the Tag-card builder can display a legacy/nested saved query without crashing.
// Best-effort: intermediate group operators are dropped (the flat UI can't show them).
export const normalizeToFlatTree = (tree) => {
  if (!tree) return createEmptyTree();
  const leaves = [];
  const walk = (n) => {
    if (!n) return;
    if (isLeaf(n)) { leaves.push(n); return; }
    (n.children || []).forEach(walk);
  };
  walk(tree);
  return {
    operator: String(tree.operator || 'AND').toUpperCase() === 'OR' ? 'OR' : 'AND',
    // Preserve an explicit excludeNoData; default it on for trees that predate the flag.
    excludeNoData: tree.excludeNoData !== false,
    children: leaves.length > 0 ? leaves : [createLeaf()],
  };
};

// Split a free-text value into a trimmed, de-duplicated, non-empty list.
const splitValues = (value) => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

// Pull the string values out of a field row, accepting both the current chip
// shape (`values: [{ value, label } | string]`) and the legacy scalar `value`
// (comma-separated). Trimmed, de-duplicated, non-empty.
const rowValues = (row) => {
  if (Array.isArray(row.values)) {
    return splitValues(row.values.map((v) => (v && typeof v === 'object' ? v.value : v)));
  }
  return splitValues(row.value);
};

// Fold a UI leaf's `fields` array into an API `match` object. Returns null when
// no field contributes a value (so the leaf is dropped by the caller).
const compileLeafMatch = (leaf) => {
  const match = {};
  (leaf.fields || []).forEach((row) => {
    if (!row || !row.field) return;
    if (isRangeField(row.field)) {
      const min = Number(row.min);
      const max = Number(row.max);
      if (Number.isFinite(min) && Number.isFinite(max)) {
        match.confidence_score = [min, max];
      }
      return;
    }
    const values = rowValues(row);
    if (values.length === 0) return;
    // Merge when the same sub-facet appears in more than one row (values OR within a field).
    match[row.field] = (match[row.field] || []).concat(values);
  });
  return Object.keys(match).length > 0 ? match : null;
};

// Compile the UI tree into the API contract shape. Empty leaves/groups collapse
// away; a node with a single effective child returns that child directly;
// returns null when the whole tree is empty (caller then omits tet_advanced_query).
//
// When the tree's excludeNoData flag is on, each positive (non-excluded) leaf that
// does not already pin has_data gets has_data = yes injected, so results only match
// tags that have data — the same default the facet search applies as "exclude
// negative". The flag lives on the tree root; `exclude` propagates it to leaves.
// Injection is skipped for excluded (negated) leaves and for any leaf that already
// carries an explicit Has data field, so those override the default (SCRUM-6228).
export const compileAdvancedQuery = (node, exclude) => {
  if (!node) return null;
  const excludeNoData = exclude === undefined ? node.excludeNoData === true : exclude;
  if (isLeaf(node)) {
    const match = compileLeafMatch(node);
    if (!match) return null;
    if (excludeNoData && !node.negate && !('has_data' in match)) {
      match.has_data = ['yes'];
    }
    return { type: 'tet', negate: !!node.negate, match };
  }
  const children = (node.children || [])
    .map((child) => compileAdvancedQuery(child, excludeNoData))
    .filter(Boolean);
  if (children.length === 0) return null;
  if (children.length === 1) return children[0];
  return { operator: String(node.operator || 'AND').toUpperCase() === 'OR' ? 'OR' : 'AND', children };
};

// True when the tree would produce no query (used to decide whether a search is
// runnable). The excludeNoData default never makes an otherwise-empty tree runnable:
// has_data is only injected into leaves that already have a value.
export const isAdvancedQueryEmpty = (node) => compileAdvancedQuery(node) === null;

// Build a (field, value) -> display-name lookup from a UI tree's chips, so a
// preview reads "topic = \"disease model\"" rather than showing the raw curie.
// Falls back to the raw value for anything not carrying a label (SCRUM-6228).
export const buildValueLabeler = (tree) => {
  const map = {};
  const walk = (n) => {
    if (!n) return;
    if (isLeaf(n)) {
      (n.fields || []).forEach((f) =>
        (Array.isArray(f.values) ? f.values : []).forEach((v) => {
          if (v && typeof v === 'object') map[`${f.field}::${v.value}`] = v.label;
        }));
    }
    (n.children || []).forEach(walk);
  };
  walk(tree);
  return (field, value) => map[`${field}::${value}`] || value;
};

// Render a COMPILED query as a readable, SQL-like preview. Built from the compiled
// output (not the UI tree) so what a curator reads matches exactly what is sent to
// the backend. `labelFor(field, value)` supplies display names for curie values;
// it falls back to the raw value. Same-field value lists render as `in (...)` (OR),
// distinct fields on one tag as `AND`, tags/groups per the node operator.
export const describeCompiledQuery = (node, labelFor = (_f, v) => v) => {
  if (!node) return '';
  if (node.type === 'tet') {
    const parts = Object.entries(node.match).map(([field, vals]) => {
      if (field === 'confidence_score') {
        return `confidence_score in [${vals[0]}, ${vals[1]}]`;
      }
      const shown = (vals || []).map((v) => `"${labelFor(field, v)}"`);
      return shown.length === 1
        ? `${field} = ${shown[0]}`
        : `${field} in (${shown.join(', ')})`;
    });
    const body = parts.join(' AND ');
    return node.negate ? `NOT (${body})` : `(${body})`;
  }
  const op = String(node.operator).toUpperCase() === 'OR' ? ' OR ' : ' AND ';
  return `(${node.children.map((c) => describeCompiledQuery(c, labelFor)).join(op)})`;
};

// Grid filter keys for the Topic grid's /topic_entity_tag/by_references endpoint,
// which takes a FLAT filter object (it cannot express an arbitrary AND/OR tree).
const GRID_POSITIVE_KEYS = {
  topic: 'topics',
  confidence_level: 'confidence_levels',
  source_method: 'source_methods',
  source_evidence_assertion: 'source_evidence_assertions',
  data_novelty: 'data_novelty',
  entity_type: 'entity_types',
  entity: 'entities',
};
const GRID_NEGATED_KEYS = {
  confidence_level: 'negated_confidence_levels',
  source_method: 'negated_source_methods',
  source_evidence_assertion: 'negated_source_evidence_assertions',
};

// Best-effort FLAT grid filter from a COMPILED advanced tree (SCRUM-6228). The
// grid's flat filter can't model the builder's boolean tree, and row inclusion is
// already authoritative from the search. So we UNION every leaf's values per
// sub-facet (the grid shows any tag matching any leaf) and never claim single-tag
// semantics. Sub-facets without a grid-filter equivalent (species) are dropped —
// they still constrained the search, just not the grid's tag highlighting.
// Returns undefined when nothing maps (grid then fetches all tags per reference).
export const flattenAdvancedForGrid = (compiled) => {
  if (!compiled) return undefined;
  const out = {};
  const push = (key, values) => {
    const cur = out[key] || [];
    (Array.isArray(values) ? values : [values]).forEach((v) => {
      if (!cur.includes(v)) cur.push(v);
    });
    out[key] = cur;
  };
  let scoreMin = null;
  let scoreMax = null;
  const walk = (node) => {
    if (!node) return;
    if (node.type === 'tet') {
      const keys = node.negate ? GRID_NEGATED_KEYS : GRID_POSITIVE_KEYS;
      Object.entries(node.match || {}).forEach(([field, values]) => {
        if (field === 'confidence_score') {
          if (!node.negate && Array.isArray(values)) {
            scoreMin = scoreMin === null ? values[0] : Math.min(scoreMin, values[0]);
            scoreMax = scoreMax === null ? values[1] : Math.max(scoreMax, values[1]);
          }
          return;
        }
        if (keys[field]) push(keys[field], values);
      });
      return;
    }
    (node.children || []).forEach(walk);
  };
  walk(compiled);
  // Union of leaf ranges; omit when it's the full default range [0, 1].
  if (scoreMin !== null && scoreMax !== null && !(scoreMin === 0 && scoreMax === 1)) {
    out.confidence_score_min = scoreMin;
    out.confidence_score_max = scoreMax;
  }
  return Object.keys(out).length > 0 ? out : undefined;
};
