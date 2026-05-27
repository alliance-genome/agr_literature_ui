import {
  compareInnerColumnValues,
  innerColumnFilterValues,
  innerColumnPassesFilter,
  INNER_COLUMN_TYPES,
} from '../innerColumnUtils';

function tet(overrides = {}) {
  return {
    topic_entity_tag_id: overrides.topic_entity_tag_id || 1,
    topic: 'ATP:0000001',
    negated: false,
    entity: null,
    note: null,
    confidence_score: null,
    confidence_level: null,
    topic_entity_tag_source: {
      source_method: 'manual',
      secondary_data_provider_abbreviation: 'WB',
    },
    ...overrides,
  };
}

describe('innerColumnFilterValues', () => {
  test('returns only visible sources after source filtering', () => {
    const tets = [
      tet({ topic_entity_tag_id: 1 }),
      tet({
        topic_entity_tag_id: 2,
        topic_entity_tag_source: {
          source_method: 'textpresso',
          secondary_data_provider_abbreviation: 'WB',
        },
      }),
    ];

    expect(
      innerColumnFilterValues(
        INNER_COLUMN_TYPES.SOURCES,
        tets,
        ['manual / WB']
      )
    ).toEqual(['manual / WB']);
  });

  test('marks confidence level cells with no visible levels as empty', () => {
    expect(
      innerColumnFilterValues(INNER_COLUMN_TYPES.CONF_LEVEL, [tet()], null)
    ).toEqual(['empty']);
  });

  test('returns tag values for topic and entity badges', () => {
    const tets = [
      tet({ topic_entity_tag_id: 1 }),
      tet({ topic_entity_tag_id: 2, negated: true }),
      tet({ topic_entity_tag_id: 3, entity: 'WB:WBGene00000001' }),
      tet({
        topic_entity_tag_id: 4,
        entity: 'WB:WBGene00000002',
        negated: true,
      }),
    ];

    expect(
      innerColumnFilterValues(INNER_COLUMN_TYPES.TAG, tets, null)
    ).toEqual(['Y', 'N', 'entity', 'entity negated']);
  });
});

describe('innerColumnPassesFilter', () => {
  test('matches note presence against the note filter model', () => {
    const tets = [tet({ note: 'curator note' })];

    expect(
      innerColumnPassesFilter(
        INNER_COLUMN_TYPES.NOTE,
        tets,
        ['has note'],
        null
      )
    ).toBe(true);

    expect(
      innerColumnPassesFilter(
        INNER_COLUMN_TYPES.NOTE,
        tets,
        ['empty'],
        null
      )
    ).toBe(false);
  });
});

describe('compareInnerColumnValues', () => {
  test('sorts confidence score cells by their visible numeric value', () => {
    const lowScore = [tet({ confidence_score: 0.2 })];
    const highScore = [tet({ confidence_score: 0.9 })];

    expect(
      compareInnerColumnValues(
        INNER_COLUMN_TYPES.CONF_SCORE,
        lowScore,
        highScore,
        null
      )
    ).toBeLessThan(0);
  });

  test('sorts validation states in the configured order', () => {
    const unvalidated = [];
    const positive = [
      tet({
        negated: false,
        topic_entity_tag_source: {
          source_method: 'manual',
          secondary_data_provider_abbreviation: 'WB',
          validation_type: 'professional_biocurator',
        },
      }),
    ];

    expect(
      compareInnerColumnValues(
        INNER_COLUMN_TYPES.VALIDATION,
        unvalidated,
        positive,
        null
      )
    ).toBeLessThan(0);
  });
});
