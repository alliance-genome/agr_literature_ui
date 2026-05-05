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
import ValidationCell, {
  professionalBiocuratorTopicTets,
} from './cellRenderers/ValidationCell';
import SourcesCell from './cellRenderers/SourcesCell';
import ConfScoreCell from './cellRenderers/ConfScoreCell';
import ConfLevelCell from './cellRenderers/ConfLevelCell';
import NoteCell from './cellRenderers/NoteCell';
import IdPrefixFilter from './filters/IdPrefixFilter';
import TetGridToolbar from './toolbar/TetGridToolbar';
import { api } from '../../api';
import {
  getCuratorSourceId,
  setTopicEntitySourceId,
} from '../../actions/biblioActions';
import './TetValidationGrid.css';

export default function TetValidationGrid({ referenceIds, topics, mod }) {
  const dispatch = useDispatch();
  const cognitoMod = useSelector((s) => s.isLogged.cognitoMod);
  const testerMod = useSelector((s) => s.isLogged.testerMod);
  const accessLevel = testerMod !== 'No' ? testerMod : cognitoMod;
  const accessToken = useSelector((s) => s.isLogged.accessToken);
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

  const onGridReady = useCallback((params) => setGridApi(params.api), []);

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
  // Pinned IDs/Title columns are intentionally excluded.
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

  const columnDefs = useMemo(() => {
    const idsCol = {
      headerName: 'IDs',
      field: '__ids',
      pinned: 'left',
      width: 200,
      autoHeight: true,
      wrapText: true,
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
    const topicGroups = topicColumns
      .filter((t) => !hiddenTopicCuries.has(t.curie))
      .map((t, idx) => {
        const leftmostClass =
          idx === 0 ? '' : 'tetv-topic-group-leftmost';
        const children = [
          {
            headerName: 'Validation',
            colId: `${t.curie}__val`,
            field: `__topic_${t.curie}`,
            width: 110,
            minWidth: 96,
            autoHeight: true,
            sortable: false,
            filter: false,
            cellRenderer: ValidationCell,
            cellClass: leftmostClass,
            headerClass: 'tetv-topic-subheader',
            cellRendererParams: { topicCurie: t.curie, refetchRow },
          },
          {
            headerName: 'Sources',
            colId: t.curie,
            field: `__topic_${t.curie}`,
            width: 220,
            autoHeight: true,
            sortable: false,
            filter: false,
            cellRenderer: SourcesCell,
            headerClass: 'tetv-topic-subheader',
            cellRendererParams: {
              topicCurie: t.curie,
              sourceFilterModel,
            },
          },
        ];
        if (displayOptions.showScore) {
          children.push({
            headerName: 'conf sc',
            colId: `${t.curie}__cs`,
            field: `__topic_${t.curie}`,
            width: 70,
            minWidth: 60,
            autoHeight: true,
            sortable: false,
            filter: false,
            cellRenderer: ConfScoreCell,
            headerClass: 'tetv-topic-subheader',
            cellRendererParams: { sourceFilterModel },
          });
        }
        if (displayOptions.showLevel) {
          children.push({
            headerName: 'conf lvl',
            colId: `${t.curie}__cl`,
            field: `__topic_${t.curie}`,
            width: 86,
            minWidth: 70,
            autoHeight: true,
            sortable: false,
            filter: false,
            cellRenderer: ConfLevelCell,
            headerClass: 'tetv-topic-subheader',
            cellRendererParams: { sourceFilterModel },
          });
        }
        children.push({
          headerName: 'note',
          colId: `${t.curie}__note`,
          field: `__topic_${t.curie}`,
          width: displayOptions.inlineNote ? 240 : 60,
          minWidth: 48,
          autoHeight: true,
          sortable: false,
          filter: false,
          cellRenderer: NoteCell,
          headerClass: 'tetv-topic-subheader',
          cellRendererParams: {
            displayOptions,
            sourceFilterModel,
          },
        });
        return {
          headerName: t.name || t.curie,
          groupId: `tg-${t.curie}`,
          marryChildren: true,
          headerClass: 'tetv-topic-group-header',
          children,
        };
      });

    return [idsCol, titleCol, ...topicGroups];
  }, [
    topicColumns,
    hiddenTopicCuries,
    displayOptions,
    refetchRow,
    sourceFilterModel,
    allIdPrefixes,
    selectedIdPrefixes,
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
            onGridReady={onGridReady}
            onBodyScroll={onBodyScroll}
            onFilterChanged={() => {
              const m = gridApi?.getFilterModel?.();
              const next = m?.['__ids'];
              setSelectedIdPrefixes(
                next === undefined ? null : next
              );
            }}
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
