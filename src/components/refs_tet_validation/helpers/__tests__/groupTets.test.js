import {
  sourceLabel,
  groupTetsByTopicAndSource,
  cellSortRank,
  cellPredicate,
  validationState,
} from '../groupTets';

describe('sourceLabel', () => {
  test('uses secondary_data_provider when present', () => {
    expect(
      sourceLabel({
        source_method: 'textpresso',
        secondary_data_provider_abbreviation: 'WB',
      })
    ).toBe('textpresso / WB');
  });
  test('falls back to data_provider when secondary missing', () => {
    expect(
      sourceLabel({ source_method: 'manual', data_provider: 'Alliance' })
    ).toBe('manual / Alliance');
  });
  test('handles missing fields', () => {
    expect(sourceLabel({})).toBe('unknown');
  });
});

describe('groupTetsByTopicAndSource', () => {
  const tets = [
    {
      topic_entity_tag_id: 1,
      topic: 'ATP:001',
      negated: false,
      topic_entity_tag_source: {
        source_method: 'textpresso',
        secondary_data_provider_abbreviation: 'WB',
      },
    },
    {
      topic_entity_tag_id: 2,
      topic: 'ATP:001',
      negated: true,
      topic_entity_tag_source: {
        source_method: 'manual',
        secondary_data_provider_abbreviation: 'WB',
      },
    },
    {
      topic_entity_tag_id: 3,
      topic: 'ATP:002',
      negated: false,
      topic_entity_tag_source: {
        source_method: 'textpresso',
        secondary_data_provider_abbreviation: 'WB',
      },
    },
  ];
  test('groups by topic curie then by source label', () => {
    const grouped = groupTetsByTopicAndSource(tets);
    expect([...grouped.keys()].sort()).toEqual(['ATP:001', 'ATP:002']);
    const t1 = grouped.get('ATP:001');
    expect([...t1.keys()].sort()).toEqual(['manual / WB', 'textpresso / WB']);
    expect(t1.get('textpresso / WB')).toHaveLength(1);
    expect(t1.get('textpresso / WB')[0].topic_entity_tag_id).toBe(1);
  });
  test('preserves duplicate TETs within the same source group', () => {
    const dup = [
      {
        topic_entity_tag_id: 10,
        topic: 'ATP:001',
        negated: false,
        topic_entity_tag_source: {
          source_method: 'textpresso',
          secondary_data_provider_abbreviation: 'WB',
        },
      },
      {
        topic_entity_tag_id: 11,
        topic: 'ATP:001',
        negated: false,
        topic_entity_tag_source: {
          source_method: 'textpresso',
          secondary_data_provider_abbreviation: 'WB',
        },
      },
    ];
    const grouped = groupTetsByTopicAndSource(dup);
    expect(grouped.get('ATP:001').get('textpresso / WB')).toHaveLength(2);
  });
});

describe('cellSortRank', () => {
  test('returns 2 when any TET is positive', () => {
    expect(cellSortRank([{ negated: false }, { negated: true }])).toBe(2);
  });
  test('returns 1 when only negated TETs', () => {
    expect(cellSortRank([{ negated: true }])).toBe(1);
  });
  test('returns 0 for empty cell', () => {
    expect(cellSortRank([])).toBe(0);
    expect(cellSortRank(undefined)).toBe(0);
  });
});

describe('cellPredicate', () => {
  const uid = 'curator-uid';
  const tets = [
    { negated: false, note: null, created_by: 'pipeline-uid' },
    { negated: true, note: 'looks wrong', created_by: 'pipeline-uid' },
  ];
  test('empty model passes everything', () => {
    expect(cellPredicate(tets, uid, [])).toBe(true);
    expect(cellPredicate([], uid, [])).toBe(true);
  });
  test('"empty" matches only empty cells', () => {
    expect(cellPredicate([], uid, ['empty'])).toBe(true);
    expect(cellPredicate(tets, uid, ['empty'])).toBe(false);
  });
  test('"has any tag" matches non-empty', () => {
    expect(cellPredicate(tets, uid, ['has any tag'])).toBe(true);
    expect(cellPredicate([], uid, ['has any tag'])).toBe(false);
  });
  test('"has Y" matches when any negated=false', () => {
    expect(cellPredicate(tets, uid, ['has Y'])).toBe(true);
    expect(cellPredicate([{ negated: true }], uid, ['has Y'])).toBe(false);
  });
  test('"has N" matches when any negated=true', () => {
    expect(cellPredicate(tets, uid, ['has N'])).toBe(true);
    expect(cellPredicate([{ negated: false }], uid, ['has N'])).toBe(false);
  });
  test('"has note" matches when any non-null note', () => {
    expect(cellPredicate(tets, uid, ['has note'])).toBe(true);
    expect(cellPredicate([{ note: null }], uid, ['has note'])).toBe(false);
  });
  test('"my validation present" (raw fallback) matches when any TET created_by current uid', () => {
    expect(cellPredicate(tets, uid, ['my validation present'])).toBe(false);
    expect(
      cellPredicate(
        [...tets, { created_by: uid }],
        uid,
        ['my validation present']
      )
    ).toBe(true);
  });
  test('prefers server filter_flags (incl. my_validation_present) over raw tets', () => {
    // The cell value carries a server filterFlags object -> it is authoritative,
    // even where it disagrees with the raw tets. my_validation_present is now
    // server-provided (compared against the user's internal users.id).
    const cell = {
      tets: [{ negated: false, note: null, created_by: 'someone-else' }],
      filterFlags: {
        has_any: true,
        has_y: false,
        has_n: true,
        has_note: true,
        my_validation_present: true,
      },
    };
    expect(cellPredicate(cell, uid, ['my validation present'])).toBe(true);
    expect(cellPredicate(cell, uid, ['has N'])).toBe(true);
    expect(cellPredicate(cell, uid, ['has Y'])).toBe(false);
    expect(cellPredicate(cell, uid, ['has note'])).toBe(true);
  });
  test('server my_validation_present=false wins over a raw-tet uid match', () => {
    const cell = {
      tets: [{ created_by: uid }],
      filterFlags: {
        has_any: true,
        has_y: false,
        has_n: false,
        has_note: false,
        my_validation_present: false,
      },
    };
    expect(cellPredicate(cell, uid, ['my validation present'])).toBe(false);
  });
  test('multiple selections combine with OR', () => {
    expect(cellPredicate([{ negated: false }], uid, ['has N', 'has Y'])).toBe(
      true
    );
    expect(cellPredicate([{ negated: true }], uid, ['has N', 'has Y'])).toBe(
      true
    );
    expect(cellPredicate([], uid, ['has N', 'has Y'])).toBe(false);
  });
});

describe('validationState', () => {
  test('treats professional_curator topic validations as validated', () => {
    expect(
      validationState([
        {
          negated: false,
          entity: null,
          topic_entity_tag_source: {
            validation_type: 'professional_curator',
          },
        },
      ])
    ).toBe('positive');
  });
});
