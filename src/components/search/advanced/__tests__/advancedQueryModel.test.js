import {
  compileAdvancedQuery,
  isAdvancedQueryEmpty,
  createEmptyTree,
  flattenAdvancedForGrid,
  normalizeToFlatTree,
  describeCompiledQuery,
  isLeaf,
  ENTITY_TYPE_OPTIONS,
  VALIDATION_BY_PROFESSIONAL_BIOCURATOR_OPTIONS,
  FIELD_DEF_BY_KEY,
} from '../advancedQueryModel';

// Build a UI leaf from a compact {field: value|[min,max]} map for terse tests.
const leaf = (fieldMap, negate = false) => ({
  type: 'tet',
  negate,
  fields: Object.entries(fieldMap).map(([field, value]) =>
    field === 'confidence_score'
      ? { field, value: '', min: value[0], max: value[1] }
      : { field, value }
  ),
});

describe('compileAdvancedQuery', () => {
  test('single leaf -> API leaf with array-valued match', () => {
    expect(compileAdvancedQuery(leaf({ topic: 'ATP:0000018' }))).toEqual({
      type: 'tet',
      negate: false,
      match: { topic: ['ATP:0000018'] },
    });
  });

  test('comma-separated value becomes multiple OR values on the field', () => {
    expect(compileAdvancedQuery(leaf({ topic: 'ATP:1, ATP:2' })).match).toEqual({
      topic: ['ATP:1', 'ATP:2'],
    });
  });

  test('AND group of two leaves', () => {
    const tree = { operator: 'AND', children: [leaf({ topic: 'ATP:1' }), leaf({ entity_type: 'ATP:2' })] };
    const out = compileAdvancedQuery(tree);
    expect(out.operator).toBe('AND');
    expect(out.children).toHaveLength(2);
  });

  test('OR group of two leaves', () => {
    const tree = { operator: 'OR', children: [leaf({ source_method: 'ACKnowledge form' }), leaf({ source_method: 'ABC classifier' })] };
    const out = compileAdvancedQuery(tree);
    expect(out.operator).toBe('OR');
    expect(out.children).toHaveLength(2);
  });

  test('ticket example: AND of an OR-group and an Allele leaf', () => {
    const tree = {
      operator: 'AND',
      children: [
        {
          operator: 'OR',
          children: [
            leaf({ topic: 'ATP:0000018', source_method: 'ACKnowledge form', confidence_level: 'POS' }),
            leaf({ topic: 'ATP:0000018', source_method: 'ABC classifier', confidence_level: 'POS' }),
          ],
        },
        leaf({ topic: 'ATP:0000012', entity_type: 'ATP:0000110', entity: 'WB:WBGene00000001' }),
      ],
    };
    const out = compileAdvancedQuery(tree);
    expect(out.operator).toBe('AND');
    expect(out.children).toHaveLength(2);
    expect(out.children[0].operator).toBe('OR');
    expect(out.children[0].children).toHaveLength(2);
    expect(out.children[1].match).toEqual({
      topic: ['ATP:0000012'],
      entity_type: ['ATP:0000110'],
      entity: ['WB:WBGene00000001'],
    });
  });

  test('deeply nested groups (sub-groups) compile recursively', () => {
    const tree = {
      operator: 'AND',
      children: [
        leaf({ topic: 'ATP:0000012' }),
        {
          operator: 'OR',
          children: [
            leaf({ source_method: 'ACKnowledge form' }),
            {
              operator: 'AND',
              children: [
                leaf({ source_method: 'ABC classifier' }),
                leaf({ confidence_level: 'POS' }),
              ],
            },
          ],
        },
      ],
    };
    const out = compileAdvancedQuery(tree);
    expect(out.operator).toBe('AND');
    expect(out.children).toHaveLength(2);
    const orGroup = out.children[1];
    expect(orGroup.operator).toBe('OR');
    // The nested AND sub-group is preserved as its own bool node.
    const innerAnd = orGroup.children.find((c) => c.operator === 'AND');
    expect(innerAnd).toBeTruthy();
    expect(innerAnd.children).toHaveLength(2);
  });

  test('negate leaf is preserved', () => {
    expect(compileAdvancedQuery(leaf({ confidence_level: 'NEG' }, true))).toEqual({
      type: 'tet',
      negate: true,
      match: { confidence_level: ['NEG'] },
    });
  });

  test('confidence_score compiles to a [min, max] range', () => {
    expect(compileAdvancedQuery(leaf({ confidence_score: [0.5, 1] })).match).toEqual({
      confidence_score: [0.5, 1],
    });
  });

  test('single-child group collapses to the child', () => {
    const tree = { operator: 'AND', children: [leaf({ topic: 'ATP:1' })] };
    expect(compileAdvancedQuery(tree)).toEqual(compileAdvancedQuery(leaf({ topic: 'ATP:1' })));
  });

  test('empty leaves/groups collapse away', () => {
    const tree = {
      operator: 'AND',
      children: [
        leaf({ topic: 'ATP:1' }),
        leaf({ topic: '' }),
        { operator: 'OR', children: [leaf({ entity: '  ' })] },
      ],
    };
    expect(compileAdvancedQuery(tree)).toEqual(compileAdvancedQuery(leaf({ topic: 'ATP:1' })));
  });

  test('a freshly seeded default tree is not runnable (only the default Has data = yes)', () => {
    // New Tags default to Has data = yes (SCRUM-6228), so the seed compiles to a
    // has_data-only leaf — but that alone is not a runnable query.
    expect(compileAdvancedQuery(createEmptyTree())).toEqual({
      type: 'tet',
      negate: false,
      match: { has_data: ['yes'] },
    });
    expect(isAdvancedQueryEmpty(createEmptyTree())).toBe(true);
    expect(compileAdvancedQuery(null)).toBeNull();
  });

  test('a seeded Tag becomes runnable once a Topic value is added', () => {
    const seeded = createEmptyTree();
    seeded.children[0].fields[0].values = [{ value: 'ATP:0000018', label: 'disease model' }];
    expect(isAdvancedQueryEmpty(seeded)).toBe(false);
    expect(compileAdvancedQuery(seeded)).toEqual({
      type: 'tet',
      negate: false,
      match: { topic: ['ATP:0000018'], has_data: ['yes'] },
    });
  });
});

describe('field-row chip shape (multi-value OR, SCRUM-6228)', () => {
  // The Tag-card UI stores values as [{ value, label }] chips; multiple chips on a
  // field OR. Legacy scalar `value` rows must still compile.
  const chipLeaf = (fieldMap, negate = false) => ({
    type: 'tet',
    negate,
    fields: Object.entries(fieldMap).map(([field, chips]) => ({
      field,
      values: chips.map((c) => ({ value: c, label: `${c}-name` })),
    })),
  });

  test('multiple chips on one field compile to an OR value list', () => {
    const out = compileAdvancedQuery(chipLeaf({ source_method: ['acknowledge_form', 'abc_document_classifier'] }));
    expect(out.match).toEqual({
      source_method: ['acknowledge_form', 'abc_document_classifier'],
    });
  });

  test('distinct chip fields AND on the same tag', () => {
    const out = compileAdvancedQuery(chipLeaf({ topic: ['ATP:1'], entity_type: ['ATP:2'] }));
    expect(out.match).toEqual({ topic: ['ATP:1'], entity_type: ['ATP:2'] });
  });

  test('empty chip list drops the field (and an all-empty leaf compiles to null)', () => {
    expect(compileAdvancedQuery(chipLeaf({ topic: [] }))).toBeNull();
  });
});

describe('entity_type controlled vocabulary (SCRUM-6228)', () => {
  test('entity_type field uses the static ATP-curie option list', () => {
    expect(FIELD_DEF_BY_KEY.entity_type.options).toBe(ENTITY_TYPE_OPTIONS);
    expect(ENTITY_TYPE_OPTIONS.length).toBeGreaterThan(0);
    // Values are ATP curies (what tags store), not display names.
    expect(ENTITY_TYPE_OPTIONS.every((o) => /^ATP:\d+$/.test(o.value))).toBe(true);
    expect(ENTITY_TYPE_OPTIONS.find((o) => o.value === 'ATP:0000005').label).toMatch(/gene/);
  });
});

describe('validation_by_professional_biocurator controlled vocabulary (SCRUM-6228)', () => {
  test('field uses the static validation option list', () => {
    expect(FIELD_DEF_BY_KEY.validation_by_professional_biocurator.options)
      .toBe(VALIDATION_BY_PROFESSIONAL_BIOCURATOR_OPTIONS);
    // Values are the raw tokens stored on tags (map to the .keyword field), labels are human-readable.
    const values = VALIDATION_BY_PROFESSIONAL_BIOCURATOR_OPTIONS.map((o) => o.value);
    expect(values).toEqual([
      'validated_right',
      'validated_wrong',
      'validated_right_self',
      'validation_conflict',
      'not_validated',
    ]);
    expect(VALIDATION_BY_PROFESSIONAL_BIOCURATOR_OPTIONS.find((o) => o.value === 'validated_right').label)
      .toBe('validated right');
  });

  test('include-right-or-unreviewed compiles to an OR value list (curator use case)', () => {
    const out = compileAdvancedQuery({
      type: 'tet',
      negate: false,
      fields: [
        { field: 'topic', values: [{ value: 'ATP:0000110', label: 'transgene' }] },
        {
          field: 'validation_by_professional_biocurator',
          values: [
            { value: 'validated_right', label: 'validated right' },
            { value: 'not_validated', label: 'not validated' },
          ],
        },
      ],
    });
    expect(out.match).toEqual({
      topic: ['ATP:0000110'],
      validation_by_professional_biocurator: ['validated_right', 'not_validated'],
    });
  });
});

describe('normalizeToFlatTree (legacy/nested -> flat Tag cards, SCRUM-6228)', () => {
  test('collapses a nested tree into a flat list of leaves', () => {
    const nested = {
      operator: 'AND',
      children: [
        { operator: 'OR', children: [
          { type: 'tet', negate: false, fields: [{ field: 'topic', value: 'ATP:1' }] },
          { type: 'tet', negate: false, fields: [{ field: 'topic', value: 'ATP:2' }] },
        ] },
        { type: 'tet', negate: true, fields: [{ field: 'confidence_level', value: 'NEG' }] },
      ],
    };
    const flat = normalizeToFlatTree(nested);
    expect(flat.operator).toBe('AND');
    expect(flat.children).toHaveLength(3);
    expect(flat.children.every(isLeaf)).toBe(true);
  });

  test('empty/undefined input yields a seed tree', () => {
    expect(normalizeToFlatTree(undefined).children).toHaveLength(1);
    expect(isAdvancedQueryEmpty(normalizeToFlatTree(undefined))).toBe(true);
  });
});

describe('describeCompiledQuery (preview, SCRUM-6228)', () => {
  const leaf = (fieldMap, negate = false) => ({
    type: 'tet',
    negate,
    fields: Object.entries(fieldMap).map(([field, value]) =>
      field === 'confidence_score'
        ? { field, value: '', min: value[0], max: value[1] }
        : { field, value }
    ),
  });

  test('single value renders with = and applies labelFor', () => {
    const compiled = compileAdvancedQuery(leaf({ topic: 'ATP:0000018' }));
    const label = (f, v) => (v === 'ATP:0000018' ? 'disease model' : v);
    expect(describeCompiledQuery(compiled, label)).toBe('(topic = "disease model")');
  });

  test('multi value renders with in (...) and NOT wraps a negated tag', () => {
    const compiled = compileAdvancedQuery(leaf({ source_method: 'a, b' }, true));
    expect(describeCompiledQuery(compiled)).toBe('NOT (source_method in ("a", "b"))');
  });

  test('AND of two tags joins with the top operator', () => {
    const tree = { operator: 'AND', children: [leaf({ topic: 'ATP:1' }), leaf({ entity_type: 'ATP:2' })] };
    expect(describeCompiledQuery(compileAdvancedQuery(tree)))
      .toBe('((topic = "ATP:1") AND (entity_type = "ATP:2"))');
  });

  test('confidence_score renders as a range', () => {
    const compiled = compileAdvancedQuery(leaf({ confidence_score: [0.5, 1] }));
    expect(describeCompiledQuery(compiled)).toBe('(confidence_score in [0.5, 1])');
  });

  test('null compiled query renders empty', () => {
    expect(describeCompiledQuery(null)).toBe('');
  });
});

describe('flattenAdvancedForGrid (grid integration, SCRUM-6228)', () => {
  test('unions positive sub-facet values across all leaves', () => {
    const tree = {
      operator: 'AND',
      children: [
        {
          operator: 'OR',
          children: [
            leaf({ topic: 'ATP:0000018', source_method: 'ACKnowledge form' }),
            leaf({ topic: 'ATP:0000018', source_method: 'ABC classifier' }),
          ],
        },
        leaf({ topic: 'ATP:0000012', entity_type: 'ATP:0000110', entity: 'WB:WBGene1' }),
      ],
    };
    const flat = flattenAdvancedForGrid(compileAdvancedQuery(tree));
    expect(flat.topics.sort()).toEqual(['ATP:0000012', 'ATP:0000018']);
    expect(flat.source_methods.sort()).toEqual(['ABC classifier', 'ACKnowledge form']);
    expect(flat.entity_types).toEqual(['ATP:0000110']);
    expect(flat.entities).toEqual(['WB:WBGene1']);
  });

  test('negated leaves map to negated_* grid keys', () => {
    const tree = { operator: 'AND', children: [
      leaf({ topic: 'ATP:1' }),
      leaf({ confidence_level: 'NEG' }, true),
    ] };
    const flat = flattenAdvancedForGrid(compileAdvancedQuery(tree));
    expect(flat.topics).toEqual(['ATP:1']);
    expect(flat.negated_confidence_levels).toEqual(['NEG']);
  });

  test('unions confidence_score ranges and omits the default full range', () => {
    const tightened = flattenAdvancedForGrid(compileAdvancedQuery(
      { operator: 'OR', children: [
        leaf({ topic: 'ATP:1', confidence_score: [0.4, 0.9] }),
        leaf({ topic: 'ATP:2', confidence_score: [0.6, 1] }),
      ] }
    ));
    expect(tightened.confidence_score_min).toBe(0.4);
    expect(tightened.confidence_score_max).toBe(1);

    const fullRange = flattenAdvancedForGrid(compileAdvancedQuery(
      leaf({ topic: 'ATP:1', confidence_score: [0, 1] })
    ));
    expect(fullRange.confidence_score_min).toBeUndefined();
    expect(fullRange.confidence_score_max).toBeUndefined();
  });

  test('returns undefined for an empty/null compiled tree', () => {
    expect(flattenAdvancedForGrid(null)).toBeUndefined();
    expect(flattenAdvancedForGrid(compileAdvancedQuery(createEmptyTree()))).toBeUndefined();
  });
});
