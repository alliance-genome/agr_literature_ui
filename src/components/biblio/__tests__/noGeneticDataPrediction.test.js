import {
  predictionTagsUrl,
  pickPrediction,
  predictionFields,
  showsTbd,
  isValidated,
  curatorDecision,
  validationPayload,
  MANUAL_INDEXING_TBD,
  MANUAL_INDEXING_WONT_INDEX,
} from '../noGeneticDataPrediction';

// SCRUM-6670: FB's "no genetic data" prediction is a classifier "genetic data"
// (ATP:0000402) topic entity tag, negated for "no genetic data" and non-negated
// with level NEG for "has genetic data".
const noGeneticData = {
  topic_entity_tag_id: 11, topic: 'ATP:0000402', negated: true, confidence_score: 0.91,
  confidence_level: 'HIGH', species: 'NCBITaxon:7214',
  validation_by_professional_biocurator: 'not_validated', date_created: '2026-11-06T04:01:47',
};
const hasGeneticData = {
  ...noGeneticData, topic_entity_tag_id: 12, negated: false, confidence_score: 0.12, confidence_level: 'NEG',
};

describe('predictionTagsUrl', () => {
  test('asks for the classifier ATP:0000402 tags of the MOD', () => {
    const url = predictionTagsUrl('AGRKB:101000001310261', 'FB');
    expect(url.startsWith('/topic_entity_tag/by_reference/AGRKB%3A101000001310261?')).toBe(true);
    const filters = JSON.parse(decodeURIComponent(url.split('column_filters=')[1]));
    expect(filters).toEqual({
      topic: ['ATP:0000402'],
      'tag_source.source_method': ['abc_document_classifier'],
      secondary_data_provider: ['FB'],
    });
  });
});

describe('pickPrediction', () => {
  test('takes the newest tag', () => {
    const older = { ...hasGeneticData, date_created: '2026-01-01T00:00:00' };
    expect(pickPrediction([older, noGeneticData])).toBe(noGeneticData);
  });

  test('is null without tags', () => {
    expect(pickPrediction([])).toBeNull();
    expect(pickPrediction(null)).toBeNull();
  });
});

describe('predictionFields', () => {
  test('a negated tag is a "no genetic data" prediction', () => {
    expect(predictionFields(noGeneticData)).toMatchObject({
      predicted_curation_tag: 'no genetic data',
      predicted_confidence_score: 0.91,
      predicted_confidence_level: 'HIGH',
      validation_by_biocurator: 'not_validated',
      prediction_tet_id: 11,
      prediction_negated: true,
      prediction_species: 'NCBITaxon:7214',
    });
  });

  test('a non-negated NEG tag is a "genetic data" prediction', () => {
    expect(predictionFields(hasGeneticData)).toMatchObject({
      predicted_curation_tag: 'genetic data',
      predicted_confidence_level: 'NEG',
      prediction_negated: false,
    });
  });

  test('blank without a prediction', () => {
    expect(predictionFields(null)).toMatchObject({
      predicted_curation_tag: '', prediction_tet_id: null, prediction_negated: null,
    });
  });
});

describe('showsTbd', () => {
  test('only for an unvalidated "no genetic data" prediction of 0.5 or more', () => {
    expect(showsTbd(predictionFields(noGeneticData))).toBe(true);
    expect(showsTbd(predictionFields({ ...noGeneticData, confidence_score: 0.5 }))).toBe(true);
    expect(showsTbd(predictionFields({ ...noGeneticData, confidence_score: 0.49 }))).toBe(false);
    expect(showsTbd(predictionFields(hasGeneticData))).toBe(false);
    expect(showsTbd(predictionFields({
      ...noGeneticData, validation_by_professional_biocurator: 'validated_right',
    }))).toBe(false);
    expect(showsTbd(predictionFields(null))).toBe(false);
  });
});

describe('isValidated', () => {
  test('any validated_* value', () => {
    expect(isValidated('validated_right')).toBe(true);
    expect(isValidated('validated_wrong')).toBe(true);
    expect(isValidated('not_validated')).toBe(false);
    expect(isValidated(null)).toBe(false);
  });
});

describe('curatorDecision', () => {
  test('agreeing with "no genetic data" means won\'t manually index', () => {
    expect(curatorDecision(true, true)).toEqual({ negated: true, workflowTagId: MANUAL_INDEXING_WONT_INDEX });
  });

  test('disagreeing with "no genetic data" means the paper has genetic data', () => {
    expect(curatorDecision(true, false)).toEqual({ negated: false, workflowTagId: MANUAL_INDEXING_TBD });
  });

  test('agreeing with "genetic data" keeps it for manual indexing', () => {
    expect(curatorDecision(false, true)).toEqual({ negated: false, workflowTagId: MANUAL_INDEXING_TBD });
  });

  test('disagreeing with "genetic data" means no genetic data', () => {
    expect(curatorDecision(false, false)).toEqual({ negated: true, workflowTagId: MANUAL_INDEXING_WONT_INDEX });
  });
});

describe('validationPayload', () => {
  test('a topic-level ATP:0000402 tag with the prediction\'s species', () => {
    const fields = predictionFields(noGeneticData);
    expect(validationPayload('AGRKB:1', 'FB', fields, false)).toEqual({
      reference_curie: 'AGRKB:1',
      topic: 'ATP:0000402',
      mod_abbreviation: 'FB',
      negated: false,
      species: 'NCBITaxon:7214',
    });
  });
});
