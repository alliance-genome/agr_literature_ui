import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { Spinner } from 'react-bootstrap';

import { useReferenceTets } from './hooks/useReferenceTets';
import {
  groupTetsByTopicAndSource,
  sourceLabel,
  cellSortRank,
} from './helpers/groupTets';
import ReferenceCell from './cellRenderers/ReferenceCell';
import TopicCell from './cellRenderers/TopicCell';
import TopicCellFilter from './filters/TopicCellFilter';
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

  const [addedTopics, setAddedTopics] = useState([]);
  const [topicNameMap, setTopicNameMap] = useState({});

  // Resolve missing topic names
  useEffect(() => {
    const seen = new Set([
      ...(topics || []).map((t) => t.curie),
      ...addedTopics.map((t) => t.curie),
      ...rows.flatMap((r) => (r.tets || []).map((t) => t.topic)),
    ]);
    const missing = [...seen].filter((c) => c && !topicNameMap[c]);
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(
      missing.map(async (curie) => {
        try {
          const r = await api.get(
            `/ontology/map_curie_to_name/atpterm/${encodeURIComponent(curie)}`
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
  }, [topics, addedTopics, rows]);

  const topicColumns = useMemo(() => {
    let baseList;
    if (topics && topics.length > 0) {
      baseList = topics.map((t) => ({
        curie: t.curie,
        name: t.name || topicNameMap[t.curie] || t.curie,
      }));
    } else {
      const present = new Set();
      for (const r of rows) for (const t of r.tets || []) present.add(t.topic);
      baseList = [...present].map((curie) => ({
        curie,
        name: topicNameMap[curie] || curie,
      }));
    }
    const added = addedTopics.map((t) => ({
      curie: t.curie,
      name: t.name || topicNameMap[t.curie] || t.curie,
    }));
    const seen = new Set();
    return [...baseList, ...added]
      .filter((t) => {
        if (seen.has(t.curie)) return false;
        seen.add(t.curie);
        return true;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [topics, rows, addedTopics, topicNameMap]);

  const allSources = useMemo(() => {
    const s = new Set();
    for (const r of rows)
      for (const t of r.tets || []) s.add(sourceLabel(t.topic_entity_tag_source));
    return [...s].sort();
  }, [rows]);

  const [displayOptions, setDisplayOptions] = useState({
    inlineNote: false,
    showLevel: false,
    showScore: false,
  });
  const [hiddenTopicCuries, setHiddenTopicCuries] = useState(new Set());
  const [sourceFilterModel, setSourceFilterModel] = useState(null);

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
    const refCol = {
      headerName: 'Reference',
      field: '__ref',
      pinned: 'left',
      width: 320,
      cellRenderer: ReferenceCell,
      filter: 'agTextColumnFilter',
      filterParams: { buttons: ['apply', 'clear'] },
      valueGetter: (p) => {
        const r = p.data?.biblio || {};
        const pmid =
          (r.cross_references || []).find((x) =>
            x.curie?.startsWith('PMID:')
          )?.curie || '';
        const authors = (r.authors || []).map((a) => a.name).join(' ');
        return `${r.title || ''} ${p.data?.curie || ''} ${pmid} ${
          r.journal || ''
        } ${authors} ${r.date_published || ''}`;
      },
      sortable: true,
      sort: 'desc',
      comparator: (_a, _b, na, nb) => {
        const da = na.data?.biblio?.date_published || '';
        const db = nb.data?.biblio?.date_published || '';
        return da.localeCompare(db);
      },
    };

    const topicCols = topicColumns
      .filter((t) => !hiddenTopicCuries.has(t.curie))
      .map((t) => ({
        headerName: t.name || t.curie,
        colId: t.curie,
        field: `__topic_${t.curie}`,
        width: 280,
        sortable: true,
        cellRenderer: TopicCell,
        cellRendererParams: {
          topicCurie: t.curie,
          displayOptions,
          refetchRow,
          sourceFilterModel,
        },
        filter: TopicCellFilter,
        comparator: (a, b) => cellSortRank(a) - cellSortRank(b),
      }));

    return [refCol, ...topicCols];
  }, [
    topicColumns,
    hiddenTopicCuries,
    displayOptions,
    refetchRow,
    sourceFilterModel,
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
        setHiddenTopicCuries={setHiddenTopicCuries}
        allSources={allSources}
        sourceFilterModel={sourceFilterModel}
        setSourceFilterModel={setSourceFilterModel}
        mod={effectiveMod}
        onAddTopic={(t) =>
          setAddedTopics((prev) =>
            prev.find((x) => x.curie === t.curie) ? prev : [...prev, t]
          )
        }
      />
      {loading ? (
        <div style={{ padding: 16 }}>
          <Spinner animation="border" size="sm" /> Loading…
        </div>
      ) : (
        <div style={{ height: 'calc(100vh - 320px)', minHeight: 400 }}>
          <AgGridReact
            rowData={rowData}
            columnDefs={columnDefs}
            domLayout="normal"
            animateRows={false}
            suppressRowClickSelection
          />
        </div>
      )}
    </div>
  );
}
