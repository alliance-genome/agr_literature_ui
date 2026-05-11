import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { Spinner } from 'react-bootstrap';

import { useReferenceTets } from './hooks/useReferenceTets';
import {
  groupTetsByTopicAndSource,
  sourceLabel,
  normalizeCurie,
} from './helpers/groupTets';
import IdsCell from './cellRenderers/IdsCell';
import TitleCell from './cellRenderers/TitleCell';
import HeaderWithHelp from './cellRenderers/HeaderWithHelp';
import HeaderGroupWithHelp from './cellRenderers/HeaderGroupWithHelp';
import ValidationCell, {
  professionalBiocuratorTopicTets,
} from './cellRenderers/ValidationCell';
import TagsCell from './cellRenderers/TagsCell';
import SourcesCell from './cellRenderers/SourcesCell';
import ConfScoreCell from './cellRenderers/ConfScoreCell';
import ConfLevelCell from './cellRenderers/ConfLevelCell';
import NoteCell from './cellRenderers/NoteCell';
import IdPrefixFilter from './filters/IdPrefixFilter';
import InnerValueFilter from './filters/InnerValueFilter';
import TetGridToolbar from './toolbar/TetGridToolbar';
import { api } from '../../api';
import {
  getCuratorSourceId,
  setTopicEntitySourceId,
} from '../../actions/biblioActions';
import {
  compareInnerColumnValues,
  innerColumnFilterValues,
  INNER_COLUMN_FILTER_DEFAULTS,
  INNER_COLUMN_TYPES,
} from './helpers/innerColumnUtils';
import './TetValidationGrid.css';

const INNER_COLUMN_FILTER_LABELS = {
  [INNER_COLUMN_TYPES.VALIDATION]: 'Validation status',
  [INNER_COLUMN_TYPES.TAG]: 'Tag',
  [INNER_COLUMN_TYPES.SOURCES]: 'Sources',
  [INNER_COLUMN_TYPES.CONF_SCORE]: 'Confidence score',
  [INNER_COLUMN_TYPES.CONF_LEVEL]: 'Confidence level',
  [INNER_COLUMN_TYPES.NOTE]: 'Note',
};

function modelsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function changedFilterColumns(previousModel, nextModel) {
  const ids = new Set([
    ...Object.keys(previousModel || {}),
    ...Object.keys(nextModel || {}),
  ]);
  return [...ids].filter(
    (colId) => !modelsEqual(previousModel?.[colId], nextModel?.[colId])
  );
}

function changedSortColumns(previousModel, nextModel) {
  const prevByColId = Object.fromEntries(
    (previousModel || []).map((item) => [item.colId, item.sort || null])
  );
  const nextByColId = Object.fromEntries(
    (nextModel || []).map((item) => [item.colId, item.sort || null])
  );
  const ids = new Set([
    ...Object.keys(prevByColId),
    ...Object.keys(nextByColId),
  ]);
  return [...ids].filter((colId) => prevByColId[colId] !== nextByColId[colId]);
}

function sortFilterValues(values) {
  return [...values].sort((a, b) => {
    if (a === 'empty' && b !== 'empty') return -1;
    if (a !== 'empty' && b === 'empty') return 1;
    return String(a).localeCompare(String(b));
  });
}

const ID_COLUMN_MIN_WIDTH = 200;
const ID_COLUMN_CHAR_WIDTH = 8.5;
const ID_COLUMN_PADDING = 42;

const prefixOf = (curie) =>
  curie ? String(curie).split(':')[0].toUpperCase() : null;

function selectedPrefixAllows(selectedPrefixes, curie) {
  if (selectedPrefixes === null || selectedPrefixes === undefined) return true;
  if (!Array.isArray(selectedPrefixes)) return true;
  return selectedPrefixes.includes(prefixOf(curie));
}

function estimateIdsColumnWidth(rows, selectedPrefixes) {
  const visibleIds = [];

  for (const row of rows || []) {
    if (row.curie && selectedPrefixAllows(selectedPrefixes, row.curie)) {
      visibleIds.push(row.curie);
    }
    for (const xref of row.biblio?.cross_references || []) {
      if (xref?.curie && selectedPrefixAllows(selectedPrefixes, xref.curie)) {
        visibleIds.push(xref.curie);
      }
    }
  }

  const longestIdLength = Math.max(
    0,
    ...visibleIds.map((id) => String(id).length)
  );

  return Math.max(
    ID_COLUMN_MIN_WIDTH,
    Math.ceil(longestIdLength * ID_COLUMN_CHAR_WIDTH + ID_COLUMN_PADDING)
  );
}

export default function TetValidationGrid({ referenceIds, topics, mod }) {
  const dispatch = useDispatch();
  const cognitoMod = useSelector((s) => s.isLogged.cognitoMod);
  const testerMod = useSelector((s) => s.isLogged.testerMod);
  const accessLevel = testerMod !== 'No' ? testerMod : cognitoMod;
  const accessToken = useSelector((s) => s.isLogged.accessToken);
  const [curationStatusOptions, setCurationStatusOptions] = useState([]);
  const [curationTagOptions, setCurationTagOptions] = useState([]);

  // Controlled vocabularies for the optional "Also update curation status"
  // section in the validation modal. Fetched once on mount; mirrors the
  // existing per-paper TET workflow (BiblioWorkflow.js).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statusRes, tagRes1, tagRes2] = await Promise.all([
          api.get('/ontology/search_descendants/ATP:0000230/true/false/true'),
          api.get('/ontology/search_descendants/ATP:0000208/false/true/true'),
          api.get('/ontology/search_descendants/ATP:0000227/false/true/true'),
        ]);
        if (cancelled) return;
        setCurationStatusOptions(
          (statusRes.data || []).map((e) => ({ curie: e.curie, name: e.name }))
        );
        setCurationTagOptions(
          [...(tagRes1.data || []), ...(tagRes2.data || [])].map((e) => ({
            curie: e.curie,
            name: e.name,
          }))
        );
      } catch (e) {
        // Non-fatal — the curation section will just show empty drop-downs.
        // eslint-disable-next-line no-console
        console.warn(
          '[TetValidationGrid] failed to load curation vocabularies',
          e?.response?.status,
          e?.message
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const topicEntitySourceId = useSelector(
    (s) => s.biblio.topicEntitySourceId
  );
  const effectiveMod = mod || accessLevel;

  const { rows, unresolved, loading, refetchRow } = useReferenceTets(
    referenceIds
  );

  // Ensure curator source id is loaded so the validation strip can submit
  useEffect(() => {
    if (effectiveMod && accessToken && !topicEntitySourceId) {
      (async () => {
        const id = await getCuratorSourceId(effectiveMod, accessToken);
        dispatch(setTopicEntitySourceId(id));
      })();
    }
  }, [effectiveMod, accessToken, topicEntitySourceId, dispatch]);

  const [topicNameMap, setTopicNameMap] = useState({});

  // Resolve missing topic names
  useEffect(() => {
    const seen = new Set([
      ...(topics || []).map((t) => normalizeCurie(t.curie)),
      ...rows.flatMap((r) =>
        (r.tets || []).map((t) => normalizeCurie(t.topic))
      ),
    ]);
    const missing = [...seen].filter((c) => c && !topicNameMap[c]);
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(
      missing.map(async (curie) => {
        try {
          // CURIE goes in path unencoded (matches existing UI convention)
          const r = await api.get(
            `/ontology/map_curie_to_name/atpterm/${curie}`
          );
          return [curie, r.data || curie];
        } catch {
          return [curie, curie];
        }
      })
    ).then((entries) => {
      if (cancelled) return;
      setTopicNameMap((prev) => ({
        ...prev,
        ...Object.fromEntries(entries),
      }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics, rows]);

  // Data-driven topic curies (whatever actually appears in the loaded TETs)
  const dataDrivenTopicCuries = useMemo(() => {
    const present = new Set();
    for (const r of rows)
      for (const t of r.tets || []) present.add(normalizeCurie(t.topic));
    return [...present];
  }, [rows]);

  // Final topic column set: ALWAYS includes both the requested topics (if any)
  // and the topics actually present in the data. Data-driven topics not in the
  // requested set are hidden by default (see initialHiddenForData below) so the
  // search-driven "show only selected topics" UX is preserved, but the user can
  // toggle them on via the toolbar's topic visibility filter.
  const topicColumns = useMemo(() => {
    const requested = (topics || []).map((t) => {
      const curie = normalizeCurie(t.curie);
      return { curie, name: t.name || topicNameMap[curie] || curie };
    });
    const fromData = dataDrivenTopicCuries.map((curie) => ({
      curie,
      name: topicNameMap[curie] || curie,
    }));
    const seen = new Set();
    return [...requested, ...fromData]
      .filter((t) => {
        if (!t.curie || seen.has(t.curie)) return false;
        seen.add(t.curie);
        return true;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [topics, dataDrivenTopicCuries, topicNameMap]);

  const allSources = useMemo(() => {
    const s = new Set();
    for (const r of rows)
      for (const t of r.tets || []) s.add(sourceLabel(t.topic_entity_tag_source));
    return [...s].sort();
  }, [rows]);

  // Distinct curie prefixes across all loaded references — fed to IdPrefixFilter.
  const allIdPrefixes = useMemo(() => {
    const s = new Set();
    for (const r of rows) {
      if (r.curie) {
        const p = String(r.curie).split(':')[0];
        if (p) s.add(p.toUpperCase());
      }
      const xrefs = r.biblio?.cross_references || [];
      for (const x of xrefs) {
        if (x?.curie) {
          const p = String(x.curie).split(':')[0];
          if (p) s.add(p.toUpperCase());
        }
      }
    }
    return [...s].sort();
  }, [rows]);

  const [displayOptions, setDisplayOptions] = useState({
    inlineNote: false,
    showLevel: false,
    showScore: false,
  });
  const [hiddenTopicCuries, setHiddenTopicCuries] = useState(new Set());
  const [sourceFilterModel, setSourceFilterModel] = useState(null);
  // Mirrors the IdPrefixFilter's column model so IdsCell can hide the
  // corresponding curie/xref lines inside each cell as well as filtering rows.
  const [selectedIdPrefixes, setSelectedIdPrefixes] = useState(null);
  const userTouchedHiddenRef = useRef(false);

  // Sticky top horizontal scrollbar that mirrors AgGrid's horizontal scroll.
  // It only spans the scrollable center area — the pinned-left IDs/Title
  // columns are excluded via a left margin equal to their combined width.
  // We DOM-move it into .ag-root just after .ag-header so it visually sits
  // between the header and the body rows. Sticky offset is the header height.
  const [gridApi, setGridApi] = useState(null);
  const [scrollContentWidth, setScrollContentWidth] = useState(0);
  const [pinnedLeftWidth, setPinnedLeftWidth] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const topScrollRef = useRef(null);
  const isSyncingRef = useRef(false);
  const innerStateSyncRef = useRef(false);
  const prevFilterModelRef = useRef({});
  const prevSortModelRef = useRef([]);
  const prevAllowedInnerColIdsRef = useRef(new Set());

  const onGridReady = useCallback((params) => {
    setGridApi(params.api);
    prevFilterModelRef.current = params.api.getFilterModel?.() || {};
    prevSortModelRef.current = params.api.getSortModel?.() || [];
  }, []);

  const updateScrollWidth = useCallback(() => {
    if (!gridApi) return;
    const cols =
      gridApi.getDisplayedCenterColumns?.() ||
      gridApi.getAllDisplayedColumns?.() ||
      [];
    const total = cols.reduce(
      (s, c) => s + (c.getActualWidth?.() || 0),
      0
    );
    setScrollContentWidth(total);
    const leftCols = gridApi.getDisplayedLeftColumns?.() || [];
    const leftTotal = leftCols.reduce(
      (s, c) => s + (c.getActualWidth?.() || 0),
      0
    );
    setPinnedLeftWidth(leftTotal);
  }, [gridApi]);

  useEffect(() => {
    if (!gridApi) return undefined;
    updateScrollWidth();
    const handler = () => updateScrollWidth();
    gridApi.addEventListener('displayedColumnsChanged', handler);
    gridApi.addEventListener('columnResized', handler);
    gridApi.addEventListener('columnVisible', handler);
    return () => {
      gridApi.removeEventListener('displayedColumnsChanged', handler);
      gridApi.removeEventListener('columnResized', handler);
      gridApi.removeEventListener('columnVisible', handler);
    };
  }, [gridApi, updateScrollWidth]);

  // Move the top scrollbar into .ag-root right after .ag-header, and observe
  // header size so the sticky offset always tracks it.
  useEffect(() => {
    if (!gridApi || !topScrollRef.current) return undefined;
    const scrollEl = topScrollRef.current;
    const wrapper = scrollEl.closest('.tetv-grid-wrapper');
    const header = wrapper?.querySelector('.ag-header');
    if (!header) return undefined;
    if (scrollEl.previousElementSibling !== header) {
      header.insertAdjacentElement('afterend', scrollEl);
    }
    const update = () => setHeaderHeight(header.offsetHeight || 0);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(header);
    return () => ro.disconnect();
  }, [gridApi]);

  // Force AgGrid to recompute per-row classes when the visible-topic set
  // changes. AgGrid caches row classes after first render, so toggling a
  // topic on/off otherwise leaves stale row colours from the previous
  // visibility set. Cheap for our row counts (<= a few hundred).
  useEffect(() => {
    if (!gridApi) return;
    gridApi.redrawRows?.();
  }, [gridApi, hiddenTopicCuries, topicColumns]);

  // Auto-size topic sub-columns to fit content (no vertical stacking), then,
  // if the total column width is narrower than the visible center viewport,
  // grow the Sources column(s) to fill the remaining horizontal space.
  // Pinned IDs/Title columns are intentionally excluded. IDs width is computed
  // from the visible curies/xrefs because AgGrid auto-size can still clip
  // pinned, non-wrapping cell content.
  useEffect(() => {
    if (!gridApi || rows.length === 0) return undefined;
    const id = setTimeout(() => {
      const cols = gridApi.getDisplayedCenterColumns?.() || [];
      const colIds = cols.map((c) => c.getColId?.()).filter(Boolean);
      if (colIds.length === 0) return;
      gridApi.autoSizeColumns?.(colIds, false);
      // Wait one frame for the autoSize to apply, then expand to fill.
      requestAnimationFrame(() => {
        const wrapper = topScrollRef.current?.closest('.tetv-grid-wrapper');
        const viewport = wrapper?.querySelector('.ag-center-cols-viewport');
        if (!viewport) return;
        const visibleW = viewport.clientWidth;
        const totalW = cols.reduce(
          (s, c) => s + (c.getActualWidth?.() || 0),
          0
        );
        const extra = visibleW - totalW;
        if (extra <= 0) return;
        // Sources columns have colId === topic curie (no `__suffix`).
        const sourcesCols = cols.filter((c) => {
          const cid = c.getColId?.() || '';
          return cid && !cid.includes('__');
        });
        if (sourcesCols.length === 0) return;
        const perCol = Math.floor(extra / sourcesCols.length);
        const widths = sourcesCols.map((c) => ({
          key: c.getColId(),
          newWidth: c.getActualWidth() + perCol,
        }));
        gridApi.setColumnWidths?.(widths, true);
      });
    }, 150);
    return () => clearTimeout(id);
  }, [
    gridApi,
    rows,
    displayOptions,
    sourceFilterModel,
    hiddenTopicCuries,
  ]);

  const onTopScroll = useCallback(() => {
    if (!topScrollRef.current || isSyncingRef.current) return;
    isSyncingRef.current = true;
    const left = topScrollRef.current.scrollLeft;
    const wrapper = topScrollRef.current.closest('.tetv-grid-wrapper');
    const centerViewport = wrapper?.querySelector('.ag-center-cols-viewport');
    if (centerViewport) centerViewport.scrollLeft = left;
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, []);

  const onBodyScroll = useCallback(
    (e) => {
      if (isSyncingRef.current) return;
      if (e?.direction !== 'horizontal') return;
      if (!topScrollRef.current || !gridApi) return;
      isSyncingRef.current = true;
      const range = gridApi.getHorizontalPixelRange?.();
      if (range) topScrollRef.current.scrollLeft = range.left;
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    },
    [gridApi]
  );

  // When a topics prop is provided, default-hide everything that isn't in it,
  // so the search-page "show only selected topics" UX is preserved. Compare in
  // normalized (uppercase) form because the prop may carry lowercase curies
  // (e.g. atp:0000041 from the search facet) while topicColumns are normalized.
  // - Other topics from the loaded data stay in the toolbar's Topics dropdown
  //   options, just unselected — the curator can flip them on later.
  // - Once the curator toggles a topic in the toolbar we stop overwriting
  //   their choice — UNTIL the facet selection itself changes, at which point
  //   we re-apply the default so the new facet topic(s) become the only
  //   visible columns again.
  const lastTopicsKeyRef = useRef('');
  useEffect(() => {
    const key = JSON.stringify(
      (topics || [])
        .map((t) => normalizeCurie(t.curie))
        .filter(Boolean)
        .sort()
    );
    if (key !== lastTopicsKeyRef.current) {
      lastTopicsKeyRef.current = key;
      userTouchedHiddenRef.current = false;
    }
    if (userTouchedHiddenRef.current) return;
    if (!topics || topics.length === 0) return;
    const requested = new Set(topics.map((t) => normalizeCurie(t.curie)));
    const next = new Set(
      topicColumns
        .map((t) => t.curie)
        .filter((c) => !requested.has(c))
    );
    setHiddenTopicCuries(next);
  }, [topics, topicColumns]);

  const handleSetHiddenTopicCuries = useCallback((next) => {
    userTouchedHiddenRef.current = true;
    setHiddenTopicCuries(next);
  }, []);

  const visibleTopicColumns = useMemo(
    () => topicColumns.filter((t) => !hiddenTopicCuries.has(t.curie)),
    [topicColumns, hiddenTopicCuries]
  );

  const allowedInnerColumns = useMemo(() => {
    const cols = [];
    for (const t of visibleTopicColumns) {
      cols.push({
        colId: `${t.curie}__val`,
        topicCurie: t.curie,
        kind: INNER_COLUMN_TYPES.VALIDATION,
      });
      cols.push({
        colId: t.curie,
        topicCurie: t.curie,
        kind: INNER_COLUMN_TYPES.SOURCES,
      });
      cols.push({
        colId: `${t.curie}__tag`,
        topicCurie: t.curie,
        kind: INNER_COLUMN_TYPES.TAG,
      });
      if (displayOptions.showScore) {
        cols.push({
          colId: `${t.curie}__cs`,
          topicCurie: t.curie,
          kind: INNER_COLUMN_TYPES.CONF_SCORE,
        });
      }
      if (displayOptions.showLevel) {
        cols.push({
          colId: `${t.curie}__cl`,
          topicCurie: t.curie,
          kind: INNER_COLUMN_TYPES.CONF_LEVEL,
        });
      }
      cols.push({
        colId: `${t.curie}__note`,
        topicCurie: t.curie,
        kind: INNER_COLUMN_TYPES.NOTE,
      });
    }
    return cols;
  }, [visibleTopicColumns, displayOptions]);

  const allowedInnerColumnIds = useMemo(
    () => new Set(allowedInnerColumns.map((col) => col.colId)),
    [allowedInnerColumns]
  );

  const innerFilterOptions = useMemo(() => {
    const sources = new Set();
    const confidenceLevels = new Set();

    for (const row of rows) {
      innerColumnFilterValues(
        INNER_COLUMN_TYPES.SOURCES,
        row.tets || [],
        sourceFilterModel
      ).forEach((value) => sources.add(value));
      innerColumnFilterValues(
        INNER_COLUMN_TYPES.CONF_LEVEL,
        row.tets || [],
        sourceFilterModel
      ).forEach((value) => confidenceLevels.add(value));
    }

    return {
      ...INNER_COLUMN_FILTER_DEFAULTS,
      [INNER_COLUMN_TYPES.SOURCES]: sortFilterValues(sources),
      [INNER_COLUMN_TYPES.CONF_LEVEL]: sortFilterValues(confidenceLevels),
    };
  }, [rows, sourceFilterModel]);

  const rowData = useMemo(
    () =>
      rows.map((r) => {
        const grouped = groupTetsByTopicAndSource(r.tets || []);
        const cells = {};
        for (const t of topicColumns) {
          const flat = [];
          const bySrc = grouped.get(t.curie);
          if (bySrc) for (const arr of bySrc.values()) flat.push(...arr);
          cells[`__topic_${t.curie}`] = flat;
        }
        return {
          input: r.input,
          curie: r.curie,
          biblio: r.biblio,
          ...cells,
        };
      }),
    [rows, topicColumns]
  );

  const idsColumnWidth = useMemo(
    () => estimateIdsColumnWidth(rows, selectedIdPrefixes),
    [rows, selectedIdPrefixes]
  );

  useEffect(() => {
    if (!gridApi) return;
    gridApi.setColumnWidths?.(
      [{ key: '__ids', newWidth: idsColumnWidth }],
      true
    );
  }, [gridApi, idsColumnWidth]);

  const syncSingleInnerColumnState = useCallback(
    (preferredInnerColId, apiOverride = null) => {
      const apiInstance = apiOverride || gridApi;
      if (!apiInstance) return;

      const filterModel = apiInstance.getFilterModel?.() || {};
      const sortModel = apiInstance.getSortModel?.() || [];
      const filteredInnerColIds = Object.keys(filterModel).filter((colId) =>
        allowedInnerColumnIds.has(colId)
      );
      const sortedInnerColIds = sortModel
        .filter((item) => item.sort)
        .map((item) => item.colId)
        .filter((colId) => allowedInnerColumnIds.has(colId));

      const activeInnerColIds = new Set([
        ...filteredInnerColIds,
        ...sortedInnerColIds,
      ]);
      if (
        activeInnerColIds.size <= 1 &&
        (!preferredInnerColId || activeInnerColIds.has(preferredInnerColId))
      ) {
        return;
      }

      const chosenInnerColId =
        preferredInnerColId && activeInnerColIds.has(preferredInnerColId)
          ? preferredInnerColId
          : sortedInnerColIds[sortedInnerColIds.length - 1] ||
            filteredInnerColIds[filteredInnerColIds.length - 1] ||
            null;

      const nextFilterModel = { ...filterModel };
      Object.keys(nextFilterModel).forEach((colId) => {
        if (allowedInnerColumnIds.has(colId) && colId !== chosenInnerColId) {
          delete nextFilterModel[colId];
        }
      });

      const nextSortModel = sortModel.filter(
        (item) =>
          !allowedInnerColumnIds.has(item.colId) ||
          item.colId === chosenInnerColId
      );

      const filterChanged = !modelsEqual(filterModel, nextFilterModel);
      const sortChanged = !modelsEqual(sortModel, nextSortModel);
      if (!filterChanged && !sortChanged) return;

      innerStateSyncRef.current = true;
      try {
        if (filterChanged) {
          apiInstance.setFilterModel(
            Object.keys(nextFilterModel).length > 0 ? nextFilterModel : null
          );
        }
        if (sortChanged) {
          apiInstance.setSortModel?.(nextSortModel);
        }
      } finally {
        innerStateSyncRef.current = false;
      }

      prevFilterModelRef.current = apiInstance.getFilterModel?.() || {};
      prevSortModelRef.current = apiInstance.getSortModel?.() || [];
    },
    [gridApi, allowedInnerColumnIds]
  );

  useEffect(() => {
    if (!gridApi) return;

    const previousIds = prevAllowedInnerColIdsRef.current;
    const removedIds = [...previousIds].filter(
      (colId) => !allowedInnerColumnIds.has(colId)
    );
    prevAllowedInnerColIdsRef.current = new Set(allowedInnerColumnIds);

    if (removedIds.length === 0) return;

    const filterModel = gridApi.getFilterModel?.() || {};
    const sortModel = gridApi.getSortModel?.() || [];
    const nextFilterModel = { ...filterModel };
    removedIds.forEach((colId) => delete nextFilterModel[colId]);
    const nextSortModel = sortModel.filter(
      (item) => !removedIds.includes(item.colId)
    );

    const filterChanged = !modelsEqual(filterModel, nextFilterModel);
    const sortChanged = !modelsEqual(sortModel, nextSortModel);
    if (!filterChanged && !sortChanged) return;

    innerStateSyncRef.current = true;
    try {
      if (filterChanged) {
        gridApi.setFilterModel(
          Object.keys(nextFilterModel).length > 0 ? nextFilterModel : null
        );
      }
      if (sortChanged) {
        gridApi.setSortModel?.(nextSortModel);
      }
    } finally {
      innerStateSyncRef.current = false;
    }

    prevFilterModelRef.current = gridApi.getFilterModel?.() || {};
    prevSortModelRef.current = gridApi.getSortModel?.() || [];
  }, [gridApi, allowedInnerColumnIds]);

  const handleFilterChanged = useCallback(
    (event) => {
      const apiInstance = event?.api || gridApi;
      if (!apiInstance) return;

      const currentFilterModel = apiInstance.getFilterModel?.() || {};
      const nextIdsModel = currentFilterModel.__ids;
      setSelectedIdPrefixes(nextIdsModel === undefined ? null : nextIdsModel);

      if (innerStateSyncRef.current) {
        prevFilterModelRef.current = currentFilterModel;
        prevSortModelRef.current = apiInstance.getSortModel?.() || [];
        return;
      }

      const changedInnerColIds = changedFilterColumns(
        prevFilterModelRef.current,
        currentFilterModel
      ).filter((colId) => allowedInnerColumnIds.has(colId));

      const preferredInnerColId =
        changedInnerColIds
          .filter((colId) => currentFilterModel[colId] !== undefined)
          .slice(-1)[0] ||
        changedInnerColIds.slice(-1)[0] ||
        null;

      syncSingleInnerColumnState(preferredInnerColId, apiInstance);
      prevFilterModelRef.current = apiInstance.getFilterModel?.() || {};
      prevSortModelRef.current = apiInstance.getSortModel?.() || [];
    },
    [gridApi, allowedInnerColumnIds, syncSingleInnerColumnState]
  );

  const handleSortChanged = useCallback(
    (event) => {
      const apiInstance = event?.api || gridApi;
      if (!apiInstance) return;

      const currentSortModel = apiInstance.getSortModel?.() || [];
      if (innerStateSyncRef.current) {
        prevFilterModelRef.current = apiInstance.getFilterModel?.() || {};
        prevSortModelRef.current = currentSortModel;
        return;
      }

      const currentSortByColId = Object.fromEntries(
        currentSortModel.map((item) => [item.colId, item.sort || null])
      );
      const changedInnerColIds = changedSortColumns(
        prevSortModelRef.current,
        currentSortModel
      ).filter((colId) => allowedInnerColumnIds.has(colId));

      const preferredInnerColId =
        changedInnerColIds
          .filter((colId) => currentSortByColId[colId])
          .slice(-1)[0] ||
        changedInnerColIds.slice(-1)[0] ||
        null;

      syncSingleInnerColumnState(preferredInnerColId, apiInstance);
      prevFilterModelRef.current = apiInstance.getFilterModel?.() || {};
      prevSortModelRef.current = apiInstance.getSortModel?.() || [];
    },
    [gridApi, allowedInnerColumnIds, syncSingleInnerColumnState]
  );

  const columnDefs = useMemo(() => {
    const idsCol = {
      headerName: 'IDs',
      headerComponent: HeaderWithHelp,
      headerTooltip:
        'Reference identifiers — the canonical AGRKB curie plus every cross-reference (PMID, MOD curies, DOI, …) and the publication year. Click the filter icon in the header to filter by prefix.',
      field: '__ids',
      pinned: 'left',
      width: idsColumnWidth,
      minWidth: ID_COLUMN_MIN_WIDTH,
      autoHeight: true,
      wrapText: false,
      cellRenderer: IdsCell,
      cellRendererParams: { selectedPrefixes: selectedIdPrefixes },
      filter: IdPrefixFilter,
      filterParams: { availablePrefixes: allIdPrefixes },
      valueGetter: (p) => {
        const r = p.data?.biblio || {};
        const xrefs = (r.cross_references || []).map((x) => x.curie).join(' ');
        return `${p.data?.curie || ''} ${xrefs} ${r.date_published || ''}`;
      },
      sortable: true,
      sort: 'desc',
      comparator: (_a, _b, na, nb) => {
        const da = na.data?.biblio?.date_published || '';
        const db = nb.data?.biblio?.date_published || '';
        return da.localeCompare(db);
      },
    };

    const titleCol = {
      headerName: 'Title',
      headerComponent: HeaderWithHelp,
      headerTooltip:
        'Publication title (links to the Biblio page) with journal name and authors.',
      field: '__title',
      pinned: 'left',
      width: 320,
      autoHeight: true,
      wrapText: true,
      cellRenderer: TitleCell,
      filter: 'agTextColumnFilter',
      filterParams: { buttons: ['apply', 'clear'] },
      valueGetter: (p) => {
        const r = p.data?.biblio || {};
        const authors = (r.authors || []).map((a) => a.name).join(' ');
        return `${r.title || ''} ${r.journal || ''} ${authors}`;
      },
      sortable: true,
      comparator: (_a, _b, na, nb) => {
        const ta = (na.data?.biblio?.title || '').toLowerCase();
        const tb = (nb.data?.biblio?.title || '').toLowerCase();
        return ta.localeCompare(tb);
      },
    };

    // For each visible topic, render a column group containing several child
    // columns. Sources is always there; Conf Sc / Conf Lvl follow the toolbar
    // toggles for visibility. The Note column is always present and changes
    // its rendering based on the "Expand notes" toggle.
    const topicGroups = visibleTopicColumns.map((t, idx) => {
        const leftmostClass =
          idx === 0 ? '' : 'tetv-topic-group-leftmost';
        const topicField = `__topic_${t.curie}`;
        const makeInnerColumn = ({
          headerName,
          headerTooltip,
          colId,
          kind,
          width,
          minWidth,
          cellRenderer,
          cellRendererParams = {},
          cellClass = '',
        }) => ({
          headerName,
          headerTooltip,
          headerComponent: HeaderWithHelp,
          colId,
          field: topicField,
          width,
          minWidth,
          autoHeight: true,
          sortable: true,
          filter: InnerValueFilter,
          filterParams: {
            availableValues: innerFilterOptions[kind] || [],
            filterLabel: INNER_COLUMN_FILTER_LABELS[kind],
            innerFieldType: kind,
            sourceFilterModel,
          },
          comparator: (valueA, valueB) =>
            compareInnerColumnValues(
              kind,
              valueA,
              valueB,
              sourceFilterModel
            ),
          cellRenderer,
          cellClass,
          headerClass: 'tetv-topic-subheader',
          cellRendererParams,
        });
        const children = [
          makeInnerColumn({
            headerName: 'Validation by professional biocurator',
            headerTooltip:
              'Validation by professional biocurators. When at least one curator has submitted a topic-level tag, the cell shows the validation status (validated positive / validated negative / validation conflict). Otherwise, ✓ and ✗ buttons let the curator submit one.',
            colId: `${t.curie}__val`,
            kind: INNER_COLUMN_TYPES.VALIDATION,
            width: 90,
            minWidth: 80,
            wrapHeaderText: true,
            autoHeaderHeight: true,
            cellRenderer: ValidationCell,
            cellClass: leftmostClass,
            cellRendererParams: {
              topicCurie: t.curie,
              topicName: t.name || t.curie,
              refetchRow,
              curationStatusOptions,
              curationTagOptions,
            },
          }),
          makeInnerColumn({
            headerName: 'Sources',
            headerTooltip:
              'Source pipelines that produced TET tags for this topic on this reference (e.g. textpresso, manual, abc_entity_extractor). The cell only lists the source labels — the actual Y / N / {N}E breakdown is shown in the adjacent Tag column.',
            colId: t.curie,
            kind: INNER_COLUMN_TYPES.SOURCES,
            width: 180,
            cellRenderer: SourcesCell,
            cellRendererParams: {
              topicCurie: t.curie,
              sourceFilterModel,
            },
          }),
          makeInnerColumn({
            headerName: 'Tag',
            headerTooltip:
              'Per-source TET tag pills for this topic. Y (green) = topic-level positive tag; N (red) = topic-level negated tag; "{N}E" (violet) = an entity-level extraction with N entities (click the badge to see the full list of entities). Each row aligns with the matching source label in the Sources column to its left.',
            colId: `${t.curie}__tag`,
            kind: INNER_COLUMN_TYPES.TAG,
            width: 58,
            minWidth: 52,
            cellRenderer: TagsCell,
            cellRendererParams: {
              topicCurie: t.curie,
              sourceFilterModel,
            },
          }),
        ];
        if (displayOptions.showScore) {
          children.push(makeInnerColumn({
            headerName: 'conf sc',
            headerTooltip:
              'Confidence score (0.00 – 1.00) of the TET tag, when reported by the source pipeline. For entity-level buckets, the cell shows the min – max range across that bucket.',
            colId: `${t.curie}__cs`,
            kind: INNER_COLUMN_TYPES.CONF_SCORE,
            width: 70,
            minWidth: 60,
            cellRenderer: ConfScoreCell,
            cellRendererParams: { sourceFilterModel },
          }));
        }
        if (displayOptions.showLevel) {
          children.push(makeInnerColumn({
            headerName: 'conf lvl',
            headerTooltip:
              'Confidence level label (e.g. high / medium / low) of the TET tag, when reported by the source pipeline. For entity-level buckets, the cell shows the count of distinct levels if they vary.',
            colId: `${t.curie}__cl`,
            kind: INNER_COLUMN_TYPES.CONF_LEVEL,
            width: 86,
            minWidth: 70,
            cellRenderer: ConfLevelCell,
            cellRendererParams: { sourceFilterModel },
          }));
        }
        children.push(makeInnerColumn({
          headerName: 'note',
          headerTooltip:
            'Free-text notes attached to TET tags. Click the 📝 icon for the full note in a modal; toggle "Expand notes" in the toolbar to render note text inline.',
          colId: `${t.curie}__note`,
          kind: INNER_COLUMN_TYPES.NOTE,
          width: displayOptions.inlineNote ? 240 : 60,
          minWidth: 48,
          cellRenderer: NoteCell,
          cellRendererParams: {
            displayOptions,
            sourceFilterModel,
          },
        }));
        return {
          headerName: t.name || t.curie,
          headerGroupComponent: HeaderGroupWithHelp,
          headerTooltip:
            `Topic "${t.name || t.curie}" (${t.curie}) — a topic from the MOD's ATP subset. ` +
            'Sub-columns show the validation status, per-source TET data, a compact tag summary, and (optionally) confidence and notes for this topic on each reference.',
          groupId: `tg-${t.curie}`,
          marryChildren: true,
          headerClass: 'tetv-topic-group-header',
          children,
        };
      });

    return [idsCol, titleCol, ...topicGroups];
  }, [
    visibleTopicColumns,
    displayOptions,
    refetchRow,
    sourceFilterModel,
    allIdPrefixes,
    selectedIdPrefixes,
    idsColumnWidth,
    innerFilterOptions,
    curationStatusOptions,
    curationTagOptions,
  ]);

  return (
    <div
      className="ag-theme-quartz tetv-grid-wrapper"
      style={{ width: '100%' }}
    >
      {unresolved.length > 0 && (
        <div className="tetv-banner-unresolved">
          Could not resolve {unresolved.length} ID(s):{' '}
          {unresolved.join(', ')}
        </div>
      )}
      <TetGridToolbar
        displayOptions={displayOptions}
        setDisplayOptions={setDisplayOptions}
        allTopics={topicColumns}
        hiddenTopicCuries={hiddenTopicCuries}
        setHiddenTopicCuries={handleSetHiddenTopicCuries}
        allSources={allSources}
        sourceFilterModel={sourceFilterModel}
        setSourceFilterModel={setSourceFilterModel}
      />
      {loading ? (
        <div style={{ padding: 16 }}>
          <Spinner animation="border" size="sm" /> Loading…
        </div>
      ) : (
        <>
          <div
            className="tetv-top-scroll"
            ref={topScrollRef}
            onScroll={onTopScroll}
            style={{ marginLeft: pinnedLeftWidth, top: headerHeight }}
          >
            <div
              className="tetv-top-scroll-inner"
              style={{ width: scrollContentWidth }}
            />
          </div>
          <AgGridReact
            rowData={rowData}
            columnDefs={columnDefs}
            domLayout="autoHeight"
            animateRows={false}
            suppressRowClickSelection
            suppressColumnVirtualisation
            reactiveCustomComponents
            enableCellTextSelection
            ensureDomOrder
            enableBrowserTooltips
            onGridReady={onGridReady}
            onBodyScroll={onBodyScroll}
            onFilterChanged={handleFilterChanged}
            onSortChanged={handleSortChanged}
            getRowClass={(p) => {
              if (!p?.data) return '';
              // Only consider topics currently visible. A validation on a
              // hidden topic shouldn't paint the row, because the curator
              // can't see the corresponding "validated …" status anywhere.
              for (const t of topicColumns) {
                if (hiddenTopicCuries.has(t.curie)) continue;
                const tets = p.data[`__topic_${t.curie}`];
                if (
                  professionalBiocuratorTopicTets(tets).length > 0
                ) {
                  return 'tetv-row-validated';
                }
              }
              return '';
            }}
          />
        </>
      )}
    </div>
  );
}
