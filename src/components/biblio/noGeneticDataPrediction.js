// SCRUM-6670. FB's "no genetic data" prediction, shown on the WF editor's Manual
// Indexing row. The FB classifier writes a "genetic data" (ATP:0000402) topic
// entity tag for every paper: negated when it predicts "no genetic data",
// non-negated with confidence level NEG when it predicts "has genetic data". The
// score is always the model's probability of "no genetic data". This used to be a
// manual_indexing_tag row; those were backfilled into the same tags.
export const GENETIC_DATA_TOPIC = 'ATP:0000402';
export const CLASSIFIER_SOURCE_METHOD = 'abc_document_classifier';
export const MANUAL_INDEXING_TBD = 'ATP:0000359';
export const MANUAL_INDEXING_WONT_INDEX = 'ATP:0000343';
// The display-only TBD is shown, as before, for a "no genetic data" prediction of
// at least this confidence that nobody has validated (SCRUM-6203's threshold).
export const TBD_THRESHOLD = 0.5;

// The reference's classifier ATP:0000402 tags for one MOD (SCRUM-6618 column filters).
export const predictionTagsUrl = (referenceCurie, mod) => {
  const columnFilters = {
    topic: [GENETIC_DATA_TOPIC],
    'tag_source.source_method': [CLASSIFIER_SOURCE_METHOD],
    secondary_data_provider: [mod],
  };
  return `/topic_entity_tag/by_reference/${encodeURIComponent(referenceCurie)}`
    + `?page=1&page_size=25&column_filters=${encodeURIComponent(JSON.stringify(columnFilters))}`;
};

// The newest prediction, if a paper was classified more than once.
export const pickPrediction = (tags) => {
  const list = Array.isArray(tags) ? tags.filter(Boolean) : [];
  if (list.length === 0) return null;
  return list.reduce((latest, tag) =>
    (String(tag.date_created || '') > String(latest.date_created || '') ? tag : latest));
};

export const isValidated = (status) => typeof status === 'string' && status.startsWith('validated');

// Row fields for the Manual Indexing row; blanks when there is no prediction.
export const predictionFields = (tag) => {
  if (!tag) {
    return {
      predicted_curation_tag: '',
      predicted_confidence_score: null,
      predicted_confidence_level: '',
      validation_by_biocurator: null,
      prediction_tet_id: null,
      prediction_negated: null,
      prediction_species: null,
    };
  }
  return {
    predicted_curation_tag: tag.negated ? 'no genetic data' : 'genetic data',
    predicted_confidence_score: tag.confidence_score ?? null,
    predicted_confidence_level: tag.confidence_level || '',
    validation_by_biocurator: tag.validation_by_professional_biocurator || 'not_validated',
    prediction_tet_id: tag.topic_entity_tag_id ?? null,
    prediction_negated: !!tag.negated,
    prediction_species: tag.species || null,
  };
};

// Whether the display-only TBD status applies to this prediction.
export const showsTbd = (fields) => fields.prediction_negated === true
  && Number(fields.predicted_confidence_score) >= TBD_THRESHOLD
  && !isValidated(fields.validation_by_biocurator);

// What a curator's tick (agrees) or cross (disagrees) means. The curator's
// topic-level validation tag says whether the paper has genetic data
// (negated = no genetic data), and the manual indexing status follows it: no
// genetic data -> won't manually index, genetic data -> TBD, as before.
export const curatorDecision = (predictionNegated, agrees) => {
  const noGeneticData = agrees ? predictionNegated : !predictionNegated;
  return {
    negated: noGeneticData,
    workflowTagId: noGeneticData ? MANUAL_INDEXING_WONT_INDEX : MANUAL_INDEXING_TBD,
  };
};

export const validationPayload = (referenceCurie, mod, fields, agrees) => ({
  reference_curie: referenceCurie,
  topic: GENETIC_DATA_TOPIC,
  mod_abbreviation: mod,
  negated: curatorDecision(fields.prediction_negated, agrees).negated,
  // Same species as the prediction, so the two tags are comparable for validation
  species: fields.prediction_species,
});
