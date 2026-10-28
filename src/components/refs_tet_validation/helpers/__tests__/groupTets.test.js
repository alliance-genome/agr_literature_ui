import {
  sourceLabel,
  groupTetsByTopicAndSource,
  cellSortRank,
  cellPredicate,
  validationState,
  curatorAssessedMods,
  isAssessedByMod,
  isCuratorMixedPositiveTet,
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
      tag_source: {
        source_method: 'textpresso',
        secondary_data_provider_abbreviation: 'WB',
      },
    },
    {
      topic_entity_tag_id: 2,
      topic: 'ATP:001',
      negated: true,
      tag_source: {
        source_method: 'manual',
        secondary_data_provider_abbreviation: 'WB',
      },
    },
    {
      topic_entity_tag_id: 3,
      topic: 'ATP:002',
      negated: false,
      tag_source: {
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
        tag_source: {
          source_method: 'textpresso',
          secondary_data_provider_abbreviation: 'WB',
        },
      },
      {
        topic_entity_tag_id: 11,
        topic: 'ATP:001',
        negated: false,
        tag_source: {
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
  test('treats professional_biocurator topic validations as validated', () => {
    expect(
      validationState([
        {
          negated: false,
          entity: null,
          tag_source: {
            validation_type: 'professional_biocurator',
          },
        },
      ])
    ).toBe('positive');
  });

  test('ignores the retired professional_curator spelling', () => {
    expect(
      validationState([
        {
          negated: false,
          entity: null,
          tag_source: {
            validation_type: 'professional_curator',
          },
        },
      ])
    ).toBe('unvalidated');
  });
});

describe('per-MOD curator assessment (SCRUM-6256)', () => {
  const curatorTet = (mod, extra = {}) => ({
    topic: 'ATP:0001',
    entity: null,
    negated: false,
    tag_source: {
      source_method: 'abc_literature_system',
      validation_type: 'professional_biocurator',
      secondary_data_provider_abbreviation: mod,
    },
    ...extra,
  });

  test('collects the MODs of curator topic-level tets', () => {
    const tets = [
      curatorTet('WB'),
      curatorTet('ZFIN', { negated: true }),
      // entity-level and non-curator tags are not assessments
      curatorTet('SGD', { entity: 'WB:Gene1' }),
      { topic: 'ATP:0001', tag_source: { source_method: 'textpresso',
        secondary_data_provider_abbreviation: 'FB' } },
    ];
    expect([...curatorAssessedMods(tets)].sort()).toEqual(['WB', 'ZFIN']);
  });

  test('reads MODs from the server by_curator source labels', () => {
    // After a validation only the aggregate is refreshed; raw tets are stale.
    const value = {
      tets: [],
      validation: {
        state: 'positive',
        by_curator: [{
          name: 'curator_a',
          negated: false,
          sources: [{ method: 'abc_literature_system',
            label: 'abc_literature_system / MGI' }],
        }],
      },
    };
    expect([...curatorAssessedMods(value)]).toEqual(['MGI']);
    expect(isAssessedByMod(value, 'mgi')).toBe(true);
    expect(isAssessedByMod(value, 'WB')).toBe(false);
  });

  test('another MOD\'s assessment does not count as the curator\'s MOD', () => {
    expect(isAssessedByMod([curatorTet('ZFIN')], 'WB')).toBe(false);
    expect(isAssessedByMod([curatorTet('WB')], 'WB')).toBe(true);
  });

  test('without a MOD, any curator assessment counts', () => {
    expect(isAssessedByMod([curatorTet('ZFIN')], null)).toBe(true);
    expect(isAssessedByMod([], null)).toBe(false);
  });
});

describe('positive mixed curator tags count as a Y (SCRUM-6784)', () => {
  // gene expression + gene, from a ZFIN curator
  const mixedTet = (extra = {}) => ({
    topic: 'ATP:0000010',
    entity_type: 'ATP:0000005',
    entity: 'ZFIN:ZDB-GENE-990415-72',
    negated: false,
    data_context: 'ATP:0000325',
    tag_source: {
      source_method: 'abc_literature_system',
      validation_type: 'professional_biocurator',
      secondary_data_provider_abbreviation: 'ZFIN',
    },
    ...extra,
  });
  const otherModTopicY = {
    state: 'positive',
    positives: 1,
    negatives: 0,
    by_curator: [{
      name: 'curator_wb',
      negated: false,
      sources: [{ method: 'abc_literature_system',
        label: 'abc_literature_system / WB' }],
    }],
  };

  test('a positive mixed experimentally-studied curator tag qualifies', () => {
    expect(isCuratorMixedPositiveTet(mixedTet())).toBe(true);
    // unset data context makes no claim and does not block
    expect(isCuratorMixedPositiveTet(mixedTet({ data_context: null }))).toBe(true);
  });

  test('negative, pure-entity, other-context and non-curator tags do not', () => {
    expect(isCuratorMixedPositiveTet(mixedTet({ negated: true }))).toBe(false);
    expect(isCuratorMixedPositiveTet(mixedTet({ negated: null }))).toBe(false);
    expect(isCuratorMixedPositiveTet(
      mixedTet({ topic: 'ATP:0000005' }))).toBe(false);
    expect(isCuratorMixedPositiveTet(
      mixedTet({ data_context: 'ATP:0000324' }))).toBe(false);
    expect(isCuratorMixedPositiveTet(mixedTet({
      tag_source: { source_method: 'textpresso',
        secondary_data_provider_abbreviation: 'ZFIN' },
    }))).toBe(false);
  });

  test('raw path: a mixed tag alone makes the cell positive', () => {
    expect(validationState([mixedTet()])).toBe('positive');
    expect(validationState([mixedTet({ negated: true })])).toBe('unvalidated');
  });

  test('server path: mixed tags are added to the topic-level aggregate', () => {
    // the aggregate holds no topic-level assessment for this topic
    expect(validationState({ tets: [mixedTet()], validation: null }))
      .toBe('positive');
    const topicN = { ...otherModTopicY, state: 'negative', positives: 0,
      negatives: 1 };
    expect(validationState({ tets: [mixedTet()], validation: topicN }))
      .toBe('conflict');
    expect(validationState({ tets: [], validation: null }))
      .toBe('unvalidated');
  });

  test('counts for the tag\'s own MOD only', () => {
    const value = { tets: [mixedTet()], validation: otherModTopicY };
    expect([...curatorAssessedMods(value)].sort()).toEqual(['WB', 'ZFIN']);
    expect(isAssessedByMod(value, 'ZFIN')).toBe(true);
    expect(isAssessedByMod({ tets: [mixedTet()], validation: null }, 'WB'))
      .toBe(false);
  });

  test('a pure entity tag does not count for its MOD', () => {
    const pure = mixedTet({ topic: 'ATP:0000005' });
    expect(isAssessedByMod({ tets: [pure], validation: null }, 'ZFIN'))
      .toBe(false);
  });
});
