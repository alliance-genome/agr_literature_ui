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

// key      : short TET sub-facet name -> topic_entity_tags.<key>.keyword on the backend
// label    : display label in the field dropdown
// facetKey : aggregation key in state.search.searchFacets whose buckets seed the
//            value dropdown; null => free-text input (comma-separated for multiple)
// range    : confidence score, edited as a [min, max] pair
export const TET_FIELD_DEFS = [
  { key: 'topic', label: 'Topic', facetKey: 'topics' },
  { key: 'entity_type', label: 'Entity type', facetKey: null },
  { key: 'entity', label: 'Entity', facetKey: null },
  { key: 'source_method', label: 'Source method', facetKey: 'source_methods' },
  { key: 'source_evidence_assertion', label: 'Source evidence assertion', facetKey: 'source_evidence_assertions' },
  { key: 'confidence_level', label: 'Confidence level', facetKey: 'confidence_levels' },
  { key: 'data_novelty', label: 'Data novelty', facetKey: 'data_novelty' },
  { key: 'species', label: 'Species', facetKey: null },
  { key: 'confidence_score', label: 'Confidence score', range: true },
];

export const FIELD_DEF_BY_KEY = TET_FIELD_DEFS.reduce((acc, def) => {
  acc[def.key] = def;
  return acc;
}, {});

export const isRangeField = (key) => !!(FIELD_DEF_BY_KEY[key] && FIELD_DEF_BY_KEY[key].range);

// Factory helpers — every new node is a fresh object so React state updates stay immutable.
export const createFieldRow = (field = 'topic') => ({ field, value: '', min: 0, max: 1 });
export const createLeaf = () => ({ type: 'tet', negate: false, fields: [createFieldRow()] });
export const createGroup = () => ({ operator: 'OR', children: [createLeaf()] });
export const createEmptyTree = () => ({ operator: 'AND', children: [createGroup()] });

export const isLeaf = (node) => !!node && node.type === 'tet';

// Split a free-text value into a trimmed, de-duplicated, non-empty list.
const splitValues = (value) => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
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
    const values = splitValues(row.value);
    if (values.length === 0) return;
    // Merge when the same sub-facet appears in more than one row (values OR within a field).
    match[row.field] = (match[row.field] || []).concat(values);
  });
  return Object.keys(match).length > 0 ? match : null;
};

// Compile the UI tree into the API contract shape. Empty leaves/groups collapse
// away; a node with a single effective child returns that child directly;
// returns null when the whole tree is empty (caller then omits tet_advanced_query).
export const compileAdvancedQuery = (node) => {
  if (!node) return null;
  if (isLeaf(node)) {
    const match = compileLeafMatch(node);
    if (!match) return null;
    return { type: 'tet', negate: !!node.negate, match };
  }
  const children = (node.children || [])
    .map(compileAdvancedQuery)
    .filter(Boolean);
  if (children.length === 0) return null;
  if (children.length === 1) return children[0];
  return { operator: String(node.operator || 'AND').toUpperCase() === 'OR' ? 'OR' : 'AND', children };
};

// True when the tree would produce no query (used to decide whether a search is runnable).
export const isAdvancedQueryEmpty = (node) => compileAdvancedQuery(node) === null;

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
