import { buildEntries } from './buildEntries';
import {
  VALIDATION_FILTER_KEYS,
  validationSortRank,
  validationState,
} from './groupTets';

export const INNER_COLUMN_TYPES = Object.freeze({
  VALIDATION: 'validation',
  SOURCES: 'sources',
  CONF_SCORE: 'confScore',
  CONF_LEVEL: 'confLevel',
  NOTE: 'note',
});

export const CONF_SCORE_FILTER_KEYS = ['has score', 'missing score'];
export const NOTE_FILTER_KEYS = ['has note', 'empty'];

function visibleEntries(tets, sourceFilterModel) {
  return buildEntries(tets, sourceFilterModel);
}

function nonEmptyString(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter(nonEmptyString)));
}

function visibleSourceLabels(entries) {
  const labels = entries.map((entry) => entry.sourceLabel);
  if (labels.length === 0) return ['empty'];
  return labels;
}

function visibleConfidenceScores(entries) {
  return entries
    .flatMap((entry) => entry.tets.map((tet) => tet.confidence_score))
    .filter((value) => value !== null && value !== undefined && value !== '')
    .map(Number)
    .filter((value) => Number.isFinite(value));
}

function visibleConfidenceLevels(entries) {
  const levels = uniqueValues(
    entries.flatMap((entry) => entry.tets.map((tet) => tet.confidence_level))
  );
  if (levels.length === 0) return ['empty'];
  return levels;
}

function visibleNotes(entries) {
  return uniqueValues(
    entries.flatMap((entry) => entry.tets.map((tet) => tet.note))
  );
}

function compareNullableNumbers(a, b) {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  return a - b;
}

function compareNullableStrings(a, b) {
  return String(a || '').localeCompare(String(b || ''));
}

export function innerColumnFilterValues(kind, tets, sourceFilterModel) {
  const entries = visibleEntries(tets, sourceFilterModel);

  switch (kind) {
    case INNER_COLUMN_TYPES.VALIDATION:
      return [validationState(tets)];
    case INNER_COLUMN_TYPES.SOURCES:
      return uniqueValues(visibleSourceLabels(entries));
    case INNER_COLUMN_TYPES.CONF_SCORE:
      return [
        visibleConfidenceScores(entries).length > 0
          ? 'has score'
          : 'missing score',
      ];
    case INNER_COLUMN_TYPES.CONF_LEVEL:
      return uniqueValues(visibleConfidenceLevels(entries));
    case INNER_COLUMN_TYPES.NOTE:
      return [visibleNotes(entries).length > 0 ? 'has note' : 'empty'];
    default:
      return [];
  }
}

export function innerColumnPassesFilter(
  kind,
  tets,
  model,
  sourceFilterModel
) {
  if (model === null) return true;
  if (!Array.isArray(model) || model.length === 0) return false;

  const values = innerColumnFilterValues(kind, tets, sourceFilterModel);
  return model.some((value) => values.includes(value));
}

export function innerColumnSortMeta(kind, tets, sourceFilterModel) {
  const entries = visibleEntries(tets, sourceFilterModel);

  switch (kind) {
    case INNER_COLUMN_TYPES.VALIDATION: {
      const state = validationState(tets);
      return {
        rank: validationSortRank(tets),
        text: state,
      };
    }
    case INNER_COLUMN_TYPES.SOURCES: {
      const labels = visibleSourceLabels(entries);
      return {
        rank: labels.includes('empty') ? 0 : 1,
        count: labels[0] === 'empty' ? 0 : labels.length,
        text: labels.join(' | ').toLowerCase(),
      };
    }
    case INNER_COLUMN_TYPES.CONF_SCORE: {
      const scores = visibleConfidenceScores(entries);
      if (scores.length === 0) {
        return {
          rank: 0,
          count: 0,
          numeric: null,
          text: '',
        };
      }
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      return {
        rank: 1,
        count: scores.length,
        numeric: min,
        text: `${min}:${max}:${scores.length}`,
      };
    }
    case INNER_COLUMN_TYPES.CONF_LEVEL: {
      const levels = visibleConfidenceLevels(entries);
      return {
        rank: levels.includes('empty') ? 0 : 1,
        count: levels[0] === 'empty' ? 0 : levels.length,
        text: levels.join(' | ').toLowerCase(),
      };
    }
    case INNER_COLUMN_TYPES.NOTE: {
      const notes = visibleNotes(entries);
      return {
        rank: notes.length === 0 ? 0 : 1,
        count: notes.length,
        text: notes.join(' | ').toLowerCase(),
      };
    }
    default:
      return {
        rank: 0,
        count: 0,
        numeric: null,
        text: '',
      };
  }
}

export function compareInnerColumnValues(
  kind,
  valueA,
  valueB,
  sourceFilterModel
) {
  const a = innerColumnSortMeta(kind, valueA, sourceFilterModel);
  const b = innerColumnSortMeta(kind, valueB, sourceFilterModel);

  const rankCmp = compareNullableNumbers(a.rank, b.rank);
  if (rankCmp !== 0) return rankCmp;

  const numericCmp = compareNullableNumbers(a.numeric, b.numeric);
  if (numericCmp !== 0) return numericCmp;

  const countCmp = compareNullableNumbers(a.count, b.count);
  if (countCmp !== 0) return countCmp;

  return compareNullableStrings(a.text, b.text);
}

export const INNER_COLUMN_FILTER_DEFAULTS = Object.freeze({
  [INNER_COLUMN_TYPES.VALIDATION]: VALIDATION_FILTER_KEYS,
  [INNER_COLUMN_TYPES.CONF_SCORE]: CONF_SCORE_FILTER_KEYS,
  [INNER_COLUMN_TYPES.NOTE]: NOTE_FILTER_KEYS,
});
