import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { api } from "../../../api";
import { getCuratorSourceId } from '../../../actions/biblioActions';
import { AgGridReact } from 'ag-grid-react';
import { handleGridCopy } from '../../../utils/gridCopyHandler';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { Spinner, Form, Modal, Button, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { defaultSpeciesCurieForMod, speciesName } from '../../refs_tet_validation/helpers/speciesUtils';
import { getTaxonData } from './TaxonUtils';

// Whole Paper topic is handled separately in the workflow editor; exclude it here.
const WHOLE_PAPER_TOPIC = "ATP:0000002";

// Curator display prefs (show definition/synonyms) persist across sessions so a
// curator who has learned the Alliance names can hide the helper columns for
// good (SCRUM-6168).
const PREFS_KEY = 'quickTopicAddition.prefs';
const loadPrefs = () => {
  try { return JSON.parse(window.localStorage.getItem(PREFS_KEY)) || {}; }
  catch { return {}; }
};

// Data-novelty ATP terms, matching the TET editor (getDataNoveltyAtpArray).
const NOVELTY_UNSPECIFIED = 'ATP:0000335';
const DEFAULT_NEW_NOVELTY = 'ATP:0000321';

// The five assessment columns of the quick-add grid (SCRUM-6113). Each column is
// a clickable box (blank / ? / ✓). Checking a column stages a biocurator tag:
// positives carry the column's data novelty, "No Data" is a negated tag. The
// grid state is server-computed (tet_info_assessment_states) and the curator's
// clicks stage local overrides that are only written on Submit.
const ASSESSMENT_COLUMNS = [
  { key: 'has_data', header: 'Has data', kind: 'has', novelty: NOVELTY_UNSPECIFIED, negated: false },
  { key: 'new_data', header: 'New data', kind: 'new', novelty: 'ATP:0000321', negated: false },
  { key: 'new_to_db', header: 'New to DB', kind: 'new', novelty: 'ATP:0000228', negated: false },
  { key: 'new_to_field', header: 'New to Field', kind: 'new', novelty: 'ATP:0000229', negated: false },
  { key: 'no_data', header: 'No Data', kind: 'no', novelty: null, negated: true },
];
const COLUMN_BY_KEY = Object.fromEntries(ASSESSMENT_COLUMNS.map((c) => [c.key, c]));
const POSITIVE_COLUMNS = ['has_data', 'new_data', 'new_to_db', 'new_to_field'];
const NEW_COLUMNS = ['new_data', 'new_to_db', 'new_to_field'];

// Effective display state of one column for a row: the curator's staged override
// wins, otherwise the server-computed state. Only a biocurator tag ('validated')
// or a staged click ('checked') renders as a ✓; a prediction/author tag is '?'.
const computeCellState = (stagedMap, rowData, colKey) => {
  const override = stagedMap?.[rowData.topic_curie]?.[colKey];
  if (override === 'checked') { return 'checked'; }
  if (override === 'cleared') { return 'blank'; }
  const backend = (rowData.assessment_states || {})[colKey];
  if (backend === 'validated') { return 'validated'; }
  if (backend === 'unvalidated') { return 'unvalidated'; }
  return 'blank';
};

// Stage a column as checked in one row's override map, applying the cross-check
// rules: "No Data" and the positive columns are mutually exclusive, and any
// New* column implies "Has data". New to DB and New to Field may coexist.
const applyChecked = (cur, colKey) => {
  cur[colKey] = 'checked';
  if (colKey === 'no_data') {
    POSITIVE_COLUMNS.forEach((c) => { cur[c] = 'cleared'; });
  } else {
    cur.no_data = 'cleared';
    if (colKey !== 'has_data') { cur.has_data = 'checked'; }
  }
  return cur;
};

const QuickTopicAddition = () => {
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const referenceCurie = referenceJsonLive["curie"];
  const cognitoMod = useSelector(state => state.isLogged.cognitoMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);
  const accessLevel = testerMod !== 'No' ? testerMod : cognitoMod;
  const uid = useSelector(state => state.isLogged.uid);
  const userEmail = useSelector(state => state.isLogged.email);
  const modToTaxon = useSelector(state => state.biblio.modToTaxon);
  const curieToNameTaxon = useSelector(state => state.biblio.curieToNameTaxon);

  const [topicRows, setTopicRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const initialPrefs = useMemo(() => loadPrefs(), []);
  const [showDefinition, setShowDefinition] = useState(initialPrefs.showDefinition ?? true);
  const [showSynonyms, setShowSynonyms] = useState(initialPrefs.showSynonyms ?? true);
  const [sourceId, setSourceId] = useState(null);
  // Distinct species [{curie, name}] for this MOD, from the ml_model table.
  const [modSpecies, setModSpecies] = useState([]);
  // Default species derived from the MOD's ml_model rows — the production
  // model's species when it has one, else the most common ml_model species
  // (e.g. FB -> Drosophilidae rather than the canonical D. melanogaster). Null
  // when the MOD has no ml_model species at all.
  const [mlDefaultSpeciesCurie, setMlDefaultSpeciesCurie] = useState(null);
  // Canonical MOD->taxon mapping + names from /mod/taxons/all (same source the
  // TET UI uses), so the default species matches the TET editor even when the
  // redux modToTaxon isn't populated in this view.
  const [taxonData, setTaxonData] = useState({ curieToName: {}, modToTaxon: {} });

  // Filter toolbar state.
  const [withPredictions, setWithPredictions] = useState(false);
  const [onlyUntagged, setOnlyUntagged] = useState(false);
  // topic_curie set of definitions expanded past the 2-line clamp.
  const [expandedDefs, setExpandedDefs] = useState(() => new Set());

  // Staged, not-yet-submitted column edits. Shape:
  //   { [topic_curie]: { [colKey]: 'checked' | 'cleared' } }
  // Nothing hits the DB until the curator clicks Submit.
  const [staged, setStaged] = useState({});
  const [notification, setNotification] = useState(null);

  // Bulk control: tick topics, choose a column, stage it for all ticked rows.
  const gridApiRef = useRef(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [bulkCol, setBulkCol] = useState('has_data');

  // Deferred-submit review modal.
  //   null | { note, items:[{row, tags:[{kind,novelty,label}]}],
  //            status:'editing'|'submitting'|'done', progress, errors }
  const [submitState, setSubmitState] = useState(null);

  const onGridReady = useCallback((params) => { gridApiRef.current = params.api; }, []);
  const onSelectionChanged = useCallback(() => {
    setSelectedCount(gridApiRef.current?.getSelectedRows().length || 0);
  }, []);

  // External (toggle) filters, layered on top of AG Grid's own column filters
  // and the quick-filter text box.
  const isExternalFilterPresent = useCallback(
    () => withPredictions || onlyUntagged,
    [withPredictions, onlyUntagged]
  );
  const doesExternalFilterPass = useCallback((node) => {
    if (withPredictions && !node.data.has_prediction) { return false; }
    if (onlyUntagged && node.data.has_prediction) { return false; }
    return true;
  }, [withPredictions, onlyUntagged]);

  // Re-run the external filter when a toggle changes.
  useEffect(() => {
    gridApiRef.current?.onFilterChanged();
  }, [withPredictions, onlyUntagged]);

  const predictionsCount = useMemo(
    () => topicRows.filter(r => r.has_prediction).length,
    [topicRows]
  );

  // Highlight predicted rows so curators can spot them at a glance.
  const getRowStyle = useCallback((params) => (
    params.data?.has_prediction ? { background: '#eff6ff' } : undefined
  ), []);

  const toggleDefExpanded = useCallback((curie) => {
    setExpandedDefs((prev) => {
      const next = new Set(prev);
      if (next.has(curie)) { next.delete(curie); } else { next.add(curie); }
      return next;
    });
    // Definition text changed; re-render that cell and recompute autoHeight rows.
    setTimeout(() => {
      gridApiRef.current?.refreshCells({ force: true, columns: ['topic_definition'] });
      gridApiRef.current?.resetRowHeights();
    }, 0);
  }, []);

  // Resolve a taxon curie to a name: prefer the /mod/taxons names, then redux.
  const nameForTaxon = useCallback((curie) => (
    taxonData.curieToName[curie] || speciesName(curieToNameTaxon, curie)
  ), [taxonData, curieToNameTaxon]);

  // Species options for this MOD: the ml_model species (which include the extra
  // WB nematodes / XB species), else the MOD's canonical taxa from
  // /mod/taxons/all, else the single-taxon MOD default.
  const speciesOptions = useMemo(() => {
    if (modSpecies.length > 0) { return modSpecies; }
    const canonical = taxonData.modToTaxon[accessLevel] || [];
    if (canonical.length > 0) {
      return canonical.map((curie) => ({ curie, name: nameForTaxon(curie) }));
    }
    const c = defaultSpeciesCurieForMod(modToTaxon, accessLevel);
    return c ? [{ curie: c, name: nameForTaxon(c) }] : [];
  }, [modSpecies, taxonData, accessLevel, modToTaxon, nameForTaxon]);

  // Default selected species: the MOD's first canonical taxon from
  // /mod/taxons/all (matches the TET editor: FB -> D. melanogaster,
  // WB -> C. elegans, XB -> X. laevis), then fallbacks.
  const defaultSpeciesCurie = useMemo(() => (
    // The production ml_model's species wins (e.g. FB -> Drosophilidae); other
    // MODs fall back to the canonical /mod/taxons/all taxon (matches the TET
    // editor: WB -> C. elegans, XB -> X. laevis).
    mlDefaultSpeciesCurie
    || (taxonData.modToTaxon[accessLevel]?.[0])
    || defaultSpeciesCurieForMod(modToTaxon, accessLevel)
    || (modSpecies.length === 1 ? modSpecies[0].curie : null)
    || (speciesOptions[0]?.curie ?? null)
  ), [mlDefaultSpeciesCurie, taxonData, accessLevel, modToTaxon, modSpecies, speciesOptions]);

  // Refs so the AG Grid species dropdown reads current options/default without
  // rebuilding columnDefs (which would reset column state); cells are refreshed
  // explicitly when these change.
  const speciesOptionsRef = useRef(speciesOptions);
  speciesOptionsRef.current = speciesOptions;
  const defaultSpeciesCurieRef = useRef(defaultSpeciesCurie);
  defaultSpeciesCurieRef.current = defaultSpeciesCurie;
  // topic_curie -> chosen taxon curie (per-row override of the default).
  const speciesSelectionRef = useRef({});

  // Species chosen for a topic's tag: the per-row override, else the default.
  const speciesForRow = useCallback((topicCurie) => {
    const curie = speciesSelectionRef.current[topicCurie] || defaultSpeciesCurie;
    return curie ? { curie, name: speciesName(curieToNameTaxon, curie) } : null;
  }, [defaultSpeciesCurie, curieToNameTaxon]);

  const fetchTopics = useCallback(async () => {
    if (!referenceCurie || !accessLevel) { return; }
    setLoading(true);
    const url =
      `/curation_status/aggregated_curation_status_and_tet_info/${referenceCurie}/${accessLevel}`;
    try {
      const result = await api.get(url);
      const rows = result.data
        .filter(info => info.topic_curie !== WHOLE_PAPER_TOPIC)
        .map(info => {
          const source = Array.isArray(info.tet_info_topic_source)
            ? info.tet_info_topic_source.join(', ')
            : info.tet_info_topic_source;
          const predictions = Array.isArray(info.tet_info_source_predictions)
            ? info.tet_info_source_predictions : [];
          return {
            topic_name: info.topic_name,
            topic_curie: info.topic_curie,
            // Definition / synonyms are enriched below via /ontology/term_details.
            topic_definition: '',
            topic_synonyms: '',
            // Server-computed per-column state (validated / unvalidated / null),
            // driving the five clickable assessment columns.
            assessment_states: info.tet_info_assessment_states || {},
            topic_source: source,
            source_predictions: predictions,
            // A computed pipeline prediction exists for this topic on this paper.
            has_prediction: predictions.length > 0,
          };
        })
        // Predicted topics first (for fast triage), then alphabetical.
        .sort((a, b) => {
          if (a.has_prediction !== b.has_prediction) { return a.has_prediction ? -1 : 1; }
          return a.topic_name.localeCompare(b.topic_name);
        });
      setTopicRows(rows);

      // Enrich with definition/synonyms in one bulk lookup (SCRUM-6168). This is
      // best-effort: if it fails, the topic list still renders without them.
      const curies = rows.map(r => r.topic_curie).filter(Boolean);
      if (curies.length > 0) {
        try {
          const detailsRes = await api.post('/ontology/term_details', { curies });
          const details = detailsRes.data || {};
          setTopicRows(prev => prev.map(r => {
            const d = details[r.topic_curie];
            if (!d) { return r; }
            return {
              ...r,
              topic_definition: d.definition || '',
              topic_synonyms: Array.isArray(d.synonyms) ? d.synonyms.join(', ') : (d.synonyms || ''),
            };
          }));
        } catch (detailErr) {
          console.warn('Could not load topic definitions/synonyms:', detailErr);
        }
      }
    } catch (error) {
      console.error('Error fetching topics for quick topic addition:', error);
      setTopicRows([]);
    } finally {
      setLoading(false);
    }
  }, [referenceCurie, accessLevel]);

  useEffect(() => { fetchTopics(); }, [fetchTopics]);

  // Persist display prefs whenever they change.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({ showDefinition, showSynonyms })
      );
    } catch { /* ignore quota / disabled storage */ }
  }, [showDefinition, showSynonyms]);

  useEffect(() => {
    if (!accessLevel) { return; }
    let cancelled = false;
    getCuratorSourceId(accessLevel).then((id) => {
      if (!cancelled) { setSourceId(id ?? null); }
    });
    return () => { cancelled = true; };
  }, [accessLevel]);

  // Load the MOD's distinct species from the ml_model table for the per-row
  // species dropdown. Best-effort: on failure we fall back to the MOD default.
  useEffect(() => {
    if (!accessLevel) { return undefined; }
    let cancelled = false;
    api.get(`/ml_model/all?mod_abbreviation=${accessLevel}`)
      .then((res) => {
        if (cancelled) { return; }
        const seen = new Map();
        const prodCounts = new Map();
        const allCounts = new Map();
        (res.data || []).forEach((m) => {
          if (!m.species) { return; }
          if (!seen.has(m.species)) {
            seen.set(m.species, m.species_name || speciesName(curieToNameTaxon, m.species));
          }
          allCounts.set(m.species, (allCounts.get(m.species) || 0) + 1);
          if (m.production) {
            prodCounts.set(m.species, (prodCounts.get(m.species) || 0) + 1);
          }
        });
        setModSpecies([...seen].map(([curie, name]) => ({ curie, name })));
        // Default species from the ml_model table: prefer the production
        // model(s) species, but many MODs' production models carry no species
        // (e.g. FB's topic classifiers are NULL), so fall back to the most
        // common ml_model species overall (FB -> Drosophilidae). Ties -> most
        // frequent; further ties are arbitrary but stable.
        const topOf = (counts) => {
          let curie = null;
          let best = 0;
          counts.forEach((n, c) => { if (n > best) { best = n; curie = c; } });
          return curie;
        };
        setMlDefaultSpeciesCurie(topOf(prodCounts) || topOf(allCounts) || null);
      })
      .catch(() => { if (!cancelled) { setModSpecies([]); setMlDefaultSpeciesCurie(null); } });
    return () => { cancelled = true; };
  }, [accessLevel, curieToNameTaxon]);

  // Canonical MOD->taxon mapping + names (same source as the TET UI), so the
  // default species matches the TET editor regardless of redux state.
  useEffect(() => {
    let cancelled = false;
    getTaxonData()
      .then((d) => { if (!cancelled && d) { setTaxonData(d); } })
      .catch(() => { /* keep defaults; falls back to ml_model / redux */ });
    return () => { cancelled = true; };
  }, []);

  // Re-render the species dropdown cells once options / default resolve.
  useEffect(() => {
    gridApiRef.current?.refreshCells({ force: true, columns: ['rowSpecies'] });
  }, [speciesOptions, defaultSpeciesCurie]);

  // Re-render the assessment cells whenever the staged edits change.
  useEffect(() => {
    gridApiRef.current?.refreshCells({
      force: true,
      columns: ASSESSMENT_COLUMNS.map((c) => `col_${c.key}`),
    });
  }, [staged]);

  // Create one biocurator topic tag. Mirrors the payload the validation and bulk
  // modals send (force_insertion, server-resolved source, no entity).
  const createTag = useCallback(async ({ kind, topicCurie, novelty, note, species }) => {
    const negated = kind === 'no';
    const data_novelty = kind === 'new' ? (novelty || DEFAULT_NEW_NOVELTY) : NOVELTY_UNSPECIFIED;
    const payload = {
      reference_curie: referenceCurie,
      topic: topicCurie,
      negated,
      topic_entity_tag_source_id: sourceId,
      force_insertion: true,
      entity: null,
      entity_type: null,
      species: species?.curie || null,
      data_novelty,
      confidence_score: null,
      confidence_level: null,
      note: note?.trim() || null,
    };
    await api.post('/topic_entity_tag/', payload);
  }, [referenceCurie, sourceId]);

  // Refs so AG Grid cell renderers read current values without rebuilding
  // columnDefs (which would reset column sort/width state).
  const expandedDefsRef = useRef(expandedDefs);
  expandedDefsRef.current = expandedDefs;
  const stagedRef = useRef(staged);
  stagedRef.current = staged;

  // Toggle one assessment cell for a row. A biocurator-validated cell is already
  // recorded and is a no-op; a staged ✓ toggles back off; anything else stages a
  // ✓ with the cross-check rules applied.
  const onCellRef = useRef();
  onCellRef.current = (colKey, rowData) => {
    const state = computeCellState(stagedRef.current, rowData, colKey);
    if (state === 'validated') { return; }
    setStaged((prev) => {
      const cur = { ...(prev[rowData.topic_curie] || {}) };
      if (state === 'checked') {
        delete cur[colKey];
      } else {
        applyChecked(cur, colKey);
      }
      const next = { ...prev };
      if (Object.keys(cur).length === 0) { delete next[rowData.topic_curie]; }
      else { next[rowData.topic_curie] = cur; }
      return next;
    });
  };

  // Stage the chosen column for every ticked topic (bulk control).
  const applyBulk = () => {
    const rows = gridApiRef.current?.getSelectedRows() || [];
    if (rows.length === 0) {
      setNotification({ variant: 'warning', message: 'No topics ticked. Tick the topics you want to assess first.' });
      return;
    }
    setStaged((prev) => {
      const next = { ...prev };
      rows.forEach((r) => {
        // Already recorded by a biocurator — nothing to stage.
        if ((r.assessment_states || {})[bulkCol] === 'validated') { return; }
        const cur = { ...(next[r.topic_curie] || {}) };
        applyChecked(cur, bulkCol);
        next[r.topic_curie] = cur;
      });
      return next;
    });
    gridApiRef.current?.deselectAll();
    setNotification({
      variant: 'info',
      message: `Staged "${COLUMN_BY_KEY[bulkCol].header}" for ${rows.length} topic(s). Review and click Submit to save.`,
    });
  };

  // The biocurator tags a row's staged edits would create on Submit. Skips any
  // column already validated by a biocurator (no duplicate), and drops the bare
  // "Has data" tag when a more specific New* column is also set for the row.
  const stagedTagsForRow = useCallback((row) => {
    const s = staged[row.topic_curie];
    if (!s) { return []; }
    const backend = row.assessment_states || {};
    const checked = (c) => {
      const o = s[c];
      if (o === 'checked') { return true; }
      if (o === 'cleared') { return false; }
      return backend[c] === 'validated';
    };
    const newCol = (c) => checked(c) && backend[c] !== 'validated';
    const tags = [];
    if (checked('no_data') && backend.no_data !== 'validated') {
      tags.push({ kind: 'no', novelty: null, label: 'No Data' });
    }
    NEW_COLUMNS.forEach((c) => {
      if (newCol(c)) { tags.push({ kind: 'new', novelty: COLUMN_BY_KEY[c].novelty, label: COLUMN_BY_KEY[c].header }); }
    });
    const anyNewEffective = NEW_COLUMNS.some((c) => checked(c));
    if (newCol('has_data') && !anyNewEffective) {
      tags.push({ kind: 'has', novelty: NOVELTY_UNSPECIFIED, label: 'Has data' });
    }
    return tags;
  }, [staged]);

  // Topics with at least one staged tag to create.
  const stagedSummary = useMemo(() => (
    topicRows
      .map((row) => ({ row, tags: stagedTagsForRow(row) }))
      .filter((x) => x.tags.length > 0)
  ), [topicRows, stagedTagsForRow]);

  const stagedTagCount = useMemo(
    () => stagedSummary.reduce((n, x) => n + x.tags.length, 0),
    [stagedSummary]
  );

  const clearStaged = () => setStaged({});

  const openSubmit = () => {
    if (!sourceId) {
      setNotification({ variant: 'danger', message: 'Curator source not resolved yet — please retry in a moment.' });
      return;
    }
    if (stagedSummary.length === 0) {
      setNotification({ variant: 'warning', message: 'No staged changes to submit. Click the assessment cells first.' });
      return;
    }
    setSubmitState({
      note: '',
      items: stagedSummary,
      status: 'editing',
      progress: { done: 0, total: stagedTagCount },
      errors: [],
    });
  };
  const closeSubmit = () => setSubmitState(null);

  const runSubmit = async () => {
    if (!submitState) { return; }
    const { items, note } = submitState;
    const total = items.reduce((n, x) => n + x.tags.length, 0);
    setSubmitState((s) => ({ ...s, status: 'submitting', progress: { done: 0, total }, errors: [] }));
    const errors = [];
    let done = 0;
    for (const { row, tags } of items) {
      const species = speciesForRow(row.topic_curie);
      for (const t of tags) {
        try {
          await createTag({ kind: t.kind, topicCurie: row.topic_curie, novelty: t.novelty, note, species });
        } catch (e) {
          const status = e?.response?.status;
          const detail = e?.response?.data?.detail || e?.message || 'unknown error';
          errors.push({
            topic: row.topic_name,
            label: t.label,
            msg: `HTTP ${status || '?'} ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`,
          });
        }
        const nextDone = done + 1;
        done = nextDone;
        setSubmitState((s) => (s ? { ...s, progress: { done: nextDone, total } } : s));
      }
    }
    setSubmitState((s) => (s ? { ...s, status: 'done', errors } : s));
    setStaged({});
    fetchTopics();
  };

  const isSubmitting = submitState?.status === 'submitting';

  // One assessment cell: blank / ? / staged-✓ / validated-✓, clickable.
  const renderAssessmentCell = (colKey, rowData) => {
    const state = computeCellState(stagedRef.current, rowData, colKey);
    let box;
    let title;
    if (state === 'validated') {
      box = <span style={{ color: '#12b76a', fontWeight: 'bold' }}><FontAwesomeIcon icon={faCheck} /></span>;
      title = 'Recorded by a biocurator';
    } else if (state === 'checked') {
      box = <span style={{ color: '#1570ef', fontWeight: 'bold' }}><FontAwesomeIcon icon={faCheck} /></span>;
      title = 'Staged — will be submitted';
    } else if (state === 'unvalidated') {
      box = <span style={{ color: '#b54708', fontWeight: 700 }}>?</span>;
      title = 'Predicted / author tag — click to confirm';
    } else {
      box = <span style={{ color: '#d0d5dd' }}>&#9744;</span>;
      title = 'Click to assess';
    }
    return (
      <button
        type="button"
        onClick={() => onCellRef.current(colKey, rowData)}
        title={title}
        style={{
          border: 'none', background: 'transparent', cursor: state === 'validated' ? 'default' : 'pointer',
          padding: 0, width: '100%', height: '100%', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 14, lineHeight: '18px',
        }}
      >
        {box}
      </button>
    );
  };

  const columnDefs = useMemo(() => {
    const cols = [
      {
        headerName: '',
        colId: 'select',
        checkboxSelection: true,
        headerCheckboxSelection: true,
        headerCheckboxSelectionFilteredOnly: true,
        width: 50,
        pinned: 'left',
        sortable: false,
        filter: false,
        resizable: false,
      },
      {
        headerName: 'Topic for curation',
        field: 'topic_name',
        flex: 2,
        minWidth: 200,
        sortable: true,
        filter: true,
        wrapText: true,
        autoHeight: true,
        cellStyle: { textAlign: 'left', whiteSpace: 'normal', lineHeight: '1.3em', paddingTop: 8, paddingBottom: 8 },
        cellRenderer: (params) => (
          <div style={{ fontWeight: 600 }}>{params.data.topic_name}</div>
        ),
      },
      {
        // Species for the tags this row would create. Options come from the MOD's
        // ml_model species (with the MOD default as fallback); the choice flows
        // into createTag. Reads options/default from refs so loading them doesn't
        // rebuild columnDefs (the cells are refreshed explicitly instead).
        headerName: 'Species',
        colId: 'rowSpecies',
        width: 200,
        sortable: false,
        filter: false,
        cellStyle: { display: 'flex', alignItems: 'center', paddingTop: 6, paddingBottom: 6 },
        cellRenderer: (params) => {
          const opts = speciesOptionsRef.current;
          if (!opts.length) {
            return <span style={{ color: '#98a2b3', fontSize: 12 }}>—</span>;
          }
          const topic = params.data.topic_curie;
          const current = speciesSelectionRef.current[topic] || defaultSpeciesCurieRef.current || opts[0].curie;
          return (
            <select
              // key on the resolved value so the uncontrolled default re-applies
              // when the ml_model default arrives after the first render.
              key={current}
              defaultValue={current}
              title="Species for this topic's tag"
              onChange={(e) => { speciesSelectionRef.current[topic] = e.target.value; }}
              style={{ width: '100%', fontSize: 12, padding: '2px 4px', border: '1px solid #d0d5dd', borderRadius: 4 }}
            >
              {opts.map((o) => (<option key={o.curie} value={o.curie}>{o.name}</option>))}
            </select>
          );
        },
      },
      {
        // The five clickable assessment columns. Each cell cycles blank -> ✓ and
        // enforces the cross-check rules; the choices are only written on Submit.
        headerName: 'Topic data',
        headerClass: 'wft-bold-header',
        children: ASSESSMENT_COLUMNS.map((c) => ({
          headerName: c.header,
          colId: `col_${c.key}`,
          width: 118,
          sortable: false,
          filter: false,
          cellStyle: { padding: 0 },
          cellRenderer: (params) => renderAssessmentCell(c.key, params.data),
        })),
      },
    ];
    if (showDefinition) {
      cols.push({
        headerName: 'Definition',
        field: 'topic_definition',
        flex: 3,
        minWidth: 220,
        sortable: false,
        filter: true,
        wrapText: true,
        autoHeight: true,
        cellStyle: { textAlign: 'left', whiteSpace: 'normal', lineHeight: '1.3em', paddingTop: 8, paddingBottom: 8 },
        cellRenderer: (params) => {
          const text = params.value || '';
          if (!text) { return ''; }
          const expanded = expandedDefsRef.current?.has(params.data.topic_curie);
          const clampStyle = expanded ? {} : {
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          };
          // Only offer more/less when the text is long enough to be clamped.
          const isLong = text.length > 120;
          return (
            <div>
              <div style={clampStyle}>{text}</div>
              {isLong && (
                <button
                  type="button"
                  onClick={() => toggleDefExpanded(params.data.topic_curie)}
                  style={{
                    border: 'none', background: 'transparent', padding: 0, marginTop: 2,
                    color: '#1570ef', cursor: 'pointer', fontSize: 12,
                  }}
                >
                  {expanded ? 'less' : 'more'}
                </button>
              )}
            </div>
          );
        },
      });
    }
    if (showSynonyms) {
      cols.push({
        headerName: 'Synonyms',
        field: 'topic_synonyms',
        flex: 2,
        minWidth: 180,
        sortable: false,
        filter: true,
        wrapText: true,
        autoHeight: true,
        cellStyle: { textAlign: 'left', whiteSpace: 'normal', lineHeight: '1.3em', paddingTop: 8, paddingBottom: 8 },
        cellRenderer: (params) => {
          const syns = String(params.value || '')
            .split(',').map(s => s.trim()).filter(Boolean);
          if (syns.length === 0) { return ''; }
          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '2px 0' }}>
              {syns.map((s, i) => (
                <span
                  key={i}
                  style={{
                    padding: '1px 8px', fontSize: 11, color: '#344054',
                    background: '#f2f4f7', border: '1px solid #e4e7ec', borderRadius: 10,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          );
        },
      });
    }
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDefinition, showSynonyms, toggleDefExpanded]);

  if (!referenceCurie) {
    return (<div style={{ padding: '20px' }}>No AGR Reference Curie found.</div>);
  }

  return (
    <div style={{ padding: '10px 20px' }}>
      <h4 style={{ textAlign: 'center' }}>Quick Topic Addition</h4>
      <div style={{ display: 'flex', gap: '20px', margin: '10px 0', alignItems: 'center', flexWrap: 'wrap' }}>
        <Form.Check
          type="checkbox"
          id="quick-topic-show-definition"
          label="Show definition"
          checked={showDefinition}
          onChange={(e) => setShowDefinition(e.target.checked)}
        />
        <Form.Check
          type="checkbox"
          id="quick-topic-show-synonyms"
          label="Show synonyms"
          checked={showSynonyms}
          onChange={(e) => setShowSynonyms(e.target.checked)}
        />
        {predictionsCount > 0 && (
          <span style={{ marginLeft: 'auto', color: '#475467', fontSize: 13 }}>
            Predicted topics highlighted · {predictionsCount} prediction{predictionsCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', margin: '10px 0', alignItems: 'center', flexWrap: 'wrap' }}>
        <span>Ticked topics:</span>
        <Form.Control
          as="select"
          style={{ width: 'auto' }}
          value={bulkCol}
          onChange={(e) => setBulkCol(e.target.value)}
        >
          {ASSESSMENT_COLUMNS.map((c) => (
            <option key={c.key} value={c.key}>{c.header}</option>
          ))}
        </Form.Control>
        <Button variant="outline-primary" onClick={applyBulk} disabled={selectedCount === 0}>
          Apply to ticked{selectedCount > 0 ? ` (${selectedCount})` : ''}
        </Button>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
          {stagedTagCount > 0 && (
            <Button variant="link" size="sm" onClick={clearStaged} style={{ textDecoration: 'none' }}>
              Clear staged
            </Button>
          )}
          <Button variant="success" onClick={openSubmit} disabled={stagedTagCount === 0}>
            Submit{stagedTagCount > 0 ? ` (${stagedTagCount})` : ''}
          </Button>
          <span style={{ fontSize: 13, color: '#475467' }}>Rows:</span>
          <Button
            variant={(!withPredictions && !onlyUntagged) ? 'primary' : 'outline-secondary'}
            size="sm"
            onClick={() => { setWithPredictions(false); setOnlyUntagged(false); }}
            title="Show all topics (both with and without a prediction)"
          >
            All
          </Button>
          <Button
            variant={withPredictions ? 'primary' : 'outline-secondary'}
            size="sm"
            onClick={() => { setWithPredictions(true); setOnlyUntagged(false); }}
            title="Show only topics with a computed prediction"
          >
            With predictions
          </Button>
          <Button
            variant={onlyUntagged ? 'primary' : 'outline-secondary'}
            size="sm"
            onClick={() => { setOnlyUntagged(true); setWithPredictions(false); }}
            title="Show only topics without a computed prediction"
          >
            No predictions
          </Button>
        </div>
      </div>

      {notification && (
        <Alert variant={notification.variant} dismissible onClose={() => setNotification(null)}>
          {notification.message}
        </Alert>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px' }}><Spinner animation="border" /></div>
      ) : (
        <div
          className="ag-theme-quartz"
          onCopy={handleGridCopy}
          style={{ width: '100%', height: 600 }}
        >
          <AgGridReact
            rowData={topicRows}
            columnDefs={columnDefs}
            rowSelection="multiple"
            showDisabledCheckboxes={true}
            suppressRowClickSelection={true}
            onGridReady={onGridReady}
            onSelectionChanged={onSelectionChanged}
            enableCellTextSelection={true}
            ensureDomOrder={true}
            suppressColumnVirtualisation={true}
            domLayout="normal"
            isExternalFilterPresent={isExternalFilterPresent}
            doesExternalFilterPass={doesExternalFilterPass}
            getRowStyle={getRowStyle}
            getRowClass={() => 'ag-row-striped-light'}
            popupParent={document.body}
          />
        </div>
      )}

      <Modal
        show={!!submitState}
        onHide={isSubmitting ? undefined : closeSubmit}
        centered
        backdrop={isSubmitting ? 'static' : true}
        size="lg"
      >
        <Modal.Header closeButton={!isSubmitting}>
          <Modal.Title>
            Submit {submitState?.progress.total} assessment{submitState?.progress.total === 1 ? '' : 's'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {submitState && (submitState.status === 'editing' || submitState.status === 'submitting') && (
            <>
              <p style={{ marginBottom: 12 }}>
                This will create the following biocurator topic tag{submitState.progress.total === 1 ? '' : 's'},
                attributed to <strong>{userEmail || uid || '(unknown user)'}</strong>.
              </p>

              <ul style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 12 }}>
                {submitState.items.map(({ row, tags }) => (
                  <li key={row.topic_curie}>
                    <strong>{row.topic_name}</strong>: {tags.map((t) => t.label).join(', ')}
                  </li>
                ))}
              </ul>

              <Form.Group className="mb-3">
                <Form.Label>Note (optional, applied to all)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Optional note for these tags…"
                  value={submitState.note}
                  onChange={(e) => setSubmitState((s) => ({ ...s, note: e.target.value }))}
                  disabled={isSubmitting}
                />
              </Form.Group>

              {isSubmitting && (
                <p style={{ marginTop: 12, color: '#555' }}>
                  <Spinner animation="border" size="sm" /> Submitting {submitState.progress.done} / {submitState.progress.total}…
                </p>
              )}
            </>
          )}
          {submitState?.status === 'done' && (
            <>
              <p style={{ color: submitState.errors.length ? '#b03a2e' : '#1e7d3a', fontWeight: 600 }}>
                Created {submitState.progress.total - submitState.errors.length} of {submitState.progress.total} tag{submitState.progress.total === 1 ? '' : 's'}.
              </p>
              {submitState.errors.length > 0 && (
                <ul style={{ color: '#b03a2e', maxHeight: 200, overflowY: 'auto' }}>
                  {submitState.errors.map((er, i) => (<li key={i}>{er.topic} ({er.label}): {er.msg}</li>))}
                </ul>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          {submitState?.status === 'editing' && (
            <>
              <Button variant="secondary" onClick={closeSubmit}>Cancel</Button>
              <Button variant="success" onClick={runSubmit}>
                Submit {submitState.progress.total} assessment{submitState.progress.total === 1 ? '' : 's'}
              </Button>
            </>
          )}
          {submitState?.status === 'submitting' && (<Button variant="secondary" disabled>Submitting…</Button>)}
          {submitState?.status === 'done' && (<Button variant="success" onClick={closeSubmit}>Close</Button>)}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default QuickTopicAddition;
