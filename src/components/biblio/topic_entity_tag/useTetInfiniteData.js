// Infinite-row-model data layer for the Biblio TET table (SCRUM-6618).
//
// The table used to fetch every tag for the reference (capped at 8,000) and
// let AG Grid paginate the display client-side — multi-MB responses on
// large-scale papers (50k+ tags). This hook feeds AG Grid's Infinite Row
// Model instead: each block is one GET /topic_entity_tag/by_reference page,
// with sorting and filtering delegated to the server, so the browser only
// ever holds the blocks the curator has scrolled through.
//
// Server contract (SCRUM-6618):
//   page / page_size            — offset pagination (page is 1-based)
//   count_only=true             — total row count for the current filters
//   sort_by / desc_sort         — single-column sort; topic/entity_type/
//                                 species/display_tag/entity sort by resolved
//                                 NAME server-side (get_sorted_column_values)
//   column_filters              — JSON {column: {values|contains|range}},
//                                 ANDed across columns
//   column_only=<col>           — distinct values of a column (dropdowns)

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../api';

// colId (what the grid shows) -> DB column (what the server sorts/filters by).
// The *_name fields are display resolutions of curie columns; the server's
// sort is name-aware for exactly those columns.
const COLUMN_BY_COL_ID = {
  topic_name: 'topic',
  entity_type_name: 'entity_type',
  species_name: 'species',
  entity_name: 'entity',
  display_tag_name: 'display_tag',
  data_context_name: 'data_context',
  'tag_source.source_evidence_assertion_name': 'tag_source.source_evidence_assertion',
  'tag_source.secondary_data_provider_abbreviation': 'secondary_data_provider',
};

export const dbColumnForColId = (colId) => COLUMN_BY_COL_ID[colId] || colId;

// Columns the server cannot sort/filter: computed display fields and
// relationship lookups. Their colDefs disable the UI, but saved tet_table
// preferences can replay old sort/filter state onto the grid — sending those
// to the server 404s/422s the block fetch and the table comes up empty, so
// the request builders drop them instead of trusting the grid state.
const UNSORTABLE_COL_IDS = new Set(['no_data', 'has_data', 'ml_model_version']);
const UNFILTERABLE_COL_IDS = new Set([
  'no_data', 'has_data', 'ml_model_version', 'validation_by_author',
]);

// The sort endpoint resolves bare attribute names (TopicEntityTagModel first,
// then TagSourceModel), so a source column sorts as e.g. "source_method" —
// unlike column_filters, whose contract keeps the "tag_source." prefix.
export const sortColumnForColId = (colId) =>
  dbColumnForColId(colId).replace(/^tag_source\./, '');

// The display transforms the table applies to every row (previously a useMemo
// over the redux tag list). Kept here so blocks arrive render-ready.
export const toTableRow = (orig) => {
  const row = { ...orig };
  if ('validation_by_author' in row) {
    if (row.validation_by_author === 'validated_right_self') row.validation_by_author = '';
    else if (row.validation_by_author === 'validated_right') row.validation_by_author = 'agree';
    else if (row.validation_by_author === 'validated_wrong') row.validation_by_author = 'disagree';
    else if (row.validation_by_author === 'not_validated') row.validation_by_author = 'no entry';
  }
  if ('validation_by_professional_biocurator' in row) {
    if (row.validation_by_professional_biocurator === 'validated_right_self') {
      row.validation_by_professional_biocurator = '';
    }
  }
  row.no_data = row.negated === true ? 'no data' : '';
  row.has_data = row.negated === true ? 'N' : 'Y';
  return row;
};

// AG Grid filterModel -> the server's column_filters object.
// - MultiFilter (topic/entity_type/species/entity dropdowns) models are plain
//   arrays of selected curies -> {values: [...]}
// - the built-in text filter -> {contains}
// - the built-in number filter on confidence_score -> {range}
export const columnFiltersFromModel = (filterModel) => {
  const filters = {};
  for (const [colId, model] of Object.entries(filterModel || {})) {
    if (model == null || UNFILTERABLE_COL_IDS.has(colId)) continue;
    const column = dbColumnForColId(colId);
    if (Array.isArray(model)) {
      if (model.length > 0) filters[column] = { values: model };
    } else if (model.filterType === 'number') {
      if (model.type === 'inRange') filters[column] = { range: [model.filter, model.filterTo] };
      else if (model.type === 'greaterThan') filters[column] = { range: [model.filter, null] };
      else if (model.type === 'lessThan') filters[column] = { range: [null, model.filter] };
      else filters[column] = { values: [model.filter] };
    } else if (model.filter != null && model.filter !== '') {
      // text filter: treat every variant as a contains match (the server has
      // no startsWith/equals distinction; contains is the curator use case)
      filters[column] = { contains: String(model.filter) };
    }
  }
  return filters;
};

export const sortParamsFromModel = (sortModel) => {
  const first = (sortModel || []).find((s) => s && !UNSORTABLE_COL_IDS.has(s.colId));
  if (!first) return {};
  return { sort_by: sortColumnForColId(first.colId), desc_sort: first.sort === 'desc' };
};

/**
 * useTetInfiniteData(referenceCurie)
 *
 * Returns:
 *   makeDatasource(onCount) — builds the IDatasource for AgGridReact
 *   fetchDistinctValues(column) — distinct raw values for a column (dropdowns)
 *   fetchCurieToName() — the reference's curie->name map (dropdown labels)
 *   totalCount — row count of the current (filtered) view, null until known
 *   refreshVersion / refresh() — bump to force the grid to refetch all blocks
 */
const useTetInfiniteData = (referenceCurie) => {
  const [totalCount, setTotalCount] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  // The count request is per filter-set; cache it so scrolling (many blocks,
  // same filters) issues one count, not one per block.
  const countCacheRef = useRef({ key: null, promise: null });

  useEffect(() => {
    countCacheRef.current = { key: null, promise: null };
    setTotalCount(null);
  }, [referenceCurie, refreshVersion]);

  const fetchCount = useCallback((columnFilters) => {
    const key = JSON.stringify(columnFilters || {});
    if (countCacheRef.current.key !== key) {
      const params = new URLSearchParams({ count_only: 'true' });
      if (columnFilters && Object.keys(columnFilters).length > 0) {
        params.set('column_filters', JSON.stringify(columnFilters));
      }
      countCacheRef.current = {
        key,
        promise: api
          .get(`/topic_entity_tag/by_reference/${referenceCurie}?${params.toString()}`)
          .then((res) => (typeof res.data === 'number' ? res.data : null)),
      };
    }
    return countCacheRef.current.promise;
  }, [referenceCurie]);

  // extraColumnFilters: server-side filters from outside the grid's own filter
  // model — e.g. the EntityCountsByMod "show these tags" selection, which the
  // client-side external filter used to handle (tag-id lists).
  const makeDatasource = useCallback((extraColumnFilters) => ({
    getRows: async (params) => {
      const { startRow, endRow, sortModel, filterModel, successCallback, failCallback } = params;
      try {
        const pageSize = endRow - startRow;
        // Infinite-model blocks are fixed-size (cacheBlockSize), so startRow
        // is always a multiple of pageSize and maps exactly to a server page.
        const page = Math.floor(startRow / pageSize) + 1;
        const columnFilters = { ...columnFiltersFromModel(filterModel), ...(extraColumnFilters || {}) };
        const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
        const { sort_by, desc_sort } = sortParamsFromModel(sortModel);
        if (sort_by) {
          query.set('sort_by', sort_by);
          query.set('desc_sort', String(!!desc_sort));
        }
        if (Object.keys(columnFilters).length > 0) {
          query.set('column_filters', JSON.stringify(columnFilters));
        }
        const [rowsRes, count] = await Promise.all([
          api.get(`/topic_entity_tag/by_reference/${referenceCurie}?${query.toString()}`),
          fetchCount(columnFilters),
        ]);
        const rows = (rowsRes.data || []).map(toTableRow);
        const lastRow = typeof count === 'number' ? count : (rows.length < pageSize ? startRow + rows.length : -1);
        setTotalCount(typeof count === 'number' ? count : null);
        successCallback(rows, lastRow);
      } catch (error) {
        console.error('TET infinite datasource getRows failed:', error);
        failCallback();
      }
    },
  }), [referenceCurie, fetchCount]);

  // Fetch EVERY row for the current view (TSV export): pages of 5000 until a
  // short page. With applyFilters=false this is the full unfiltered tag set —
  // exports are no longer capped at the old 8,000-row fetch limit.
  const fetchAllRows = useCallback(async ({
    sortModel, filterModel, extraColumnFilters, applyFilters = true,
  } = {}) => {
    const pageSize = 5000;
    const columnFilters = applyFilters
      ? { ...columnFiltersFromModel(filterModel), ...(extraColumnFilters || {}) }
      : {};
    const { sort_by, desc_sort } = sortParamsFromModel(sortModel);
    const all = [];
    for (let page = 1; ; page += 1) {
      const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (sort_by) {
        query.set('sort_by', sort_by);
        query.set('desc_sort', String(!!desc_sort));
      }
      if (Object.keys(columnFilters).length > 0) {
        query.set('column_filters', JSON.stringify(columnFilters));
      }
      const res = await api.get(`/topic_entity_tag/by_reference/${referenceCurie}?${query.toString()}`);
      const rows = (res.data || []).map(toTableRow);
      all.push(...rows);
      if (rows.length < pageSize) break;
    }
    return all;
  }, [referenceCurie]);

  const fetchDistinctValues = useCallback(async (column) => {
    const res = await api.get(
      `/topic_entity_tag/by_reference/${referenceCurie}?column_only=${encodeURIComponent(column)}`
    );
    return Array.isArray(res.data) ? res.data : [];
  }, [referenceCurie]);

  const fetchCurieToName = useCallback(async () => {
    const res = await api.get(
      `/topic_entity_tag/get_curie_to_name_from_all_tets/?curie_or_reference_id=${encodeURIComponent(referenceCurie)}`
    );
    return res.data || {};
  }, [referenceCurie]);

  const refresh = useCallback(() => setRefreshVersion((v) => v + 1), []);

  return {
    makeDatasource, fetchAllRows, fetchDistinctValues, fetchCurieToName,
    totalCount, refresh, refreshVersion,
  };
};

export default useTetInfiniteData;
