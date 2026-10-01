import {
  columnFiltersFromModel,
  dbColumnForColId,
  toTableRow,
} from '../useTetInfiniteData';

describe('TET infinite data mappers (SCRUM-6618)', () => {
  test('display colIds map to their DB columns', () => {
    expect(dbColumnForColId('topic_name')).toBe('topic');
    expect(dbColumnForColId('entity_type_name')).toBe('entity_type');
    expect(dbColumnForColId('species_name')).toBe('species');
    expect(dbColumnForColId('entity_name')).toBe('entity');
    expect(dbColumnForColId('display_tag_name')).toBe('display_tag');
    expect(dbColumnForColId('tag_source.secondary_data_provider_abbreviation'))
      .toBe('secondary_data_provider');
    // raw columns pass through, including tag_source.* ones
    expect(dbColumnForColId('confidence_level')).toBe('confidence_level');
    expect(dbColumnForColId('tag_source.source_method')).toBe('tag_source.source_method');
  });

  test('MultiFilter array models become values filters on the DB column', () => {
    expect(columnFiltersFromModel({ topic_name: ['ATP:0000005', 'ATP:0000122'] }))
      .toEqual({ topic: { values: ['ATP:0000005', 'ATP:0000122'] } });
    // empty selection is no filter
    expect(columnFiltersFromModel({ topic_name: [] })).toEqual({});
  });

  test('text filter models become contains filters', () => {
    expect(columnFiltersFromModel({
      note: { filterType: 'text', type: 'contains', filter: 'dog' },
    })).toEqual({ note: { contains: 'dog' } });
  });

  test('number filter models become range filters', () => {
    expect(columnFiltersFromModel({
      confidence_score: { filterType: 'number', type: 'inRange', filter: 0.5, filterTo: 0.9 },
    })).toEqual({ confidence_score: { range: [0.5, 0.9] } });
    expect(columnFiltersFromModel({
      confidence_score: { filterType: 'number', type: 'greaterThan', filter: 0.5 },
    })).toEqual({ confidence_score: { range: [0.5, null] } });
    expect(columnFiltersFromModel({
      confidence_score: { filterType: 'number', type: 'equals', filter: 0.9 },
    })).toEqual({ confidence_score: { values: [0.9] } });
  });

  test('several active filters are combined; null/empty models dropped', () => {
    expect(columnFiltersFromModel({
      topic_name: ['ATP:0000005'],
      note: { filterType: 'text', type: 'contains', filter: 'x' },
      entity_name: null,
      created_by: { filterType: 'text', type: 'contains', filter: '' },
    })).toEqual({
      topic: { values: ['ATP:0000005'] },
      note: { contains: 'x' },
    });
  });

  test('toTableRow applies the validation display transforms', () => {
    expect(toTableRow({ validation_by_author: 'validated_right' }).validation_by_author).toBe('agree');
    expect(toTableRow({ validation_by_author: 'validated_wrong' }).validation_by_author).toBe('disagree');
    expect(toTableRow({ validation_by_author: 'not_validated' }).validation_by_author).toBe('no entry');
    expect(toTableRow({ validation_by_author: 'validated_right_self' }).validation_by_author).toBe('');
    expect(toTableRow({ validation_by_professional_biocurator: 'validated_right_self' })
      .validation_by_professional_biocurator).toBe('');
    expect(toTableRow({ negated: true })).toMatchObject({ no_data: 'no data', has_data: 'N' });
    expect(toTableRow({ negated: false })).toMatchObject({ no_data: '', has_data: 'Y' });
  });
});
