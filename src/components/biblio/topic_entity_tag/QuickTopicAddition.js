import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { api } from "../../../api";
import { getCuratorSourceId, fetchTopicEntityTags, setAllTopics } from '../../../actions/biblioActions';
import TopicFilter from '../../AgGrid/TopicFilter';
import { AgGridReact } from 'ag-grid-react';
import { handleGridCopy } from '../../../utils/gridCopyHandler';
import AgGridTablePreferenceControls from '../../settings/AgGridTablePreferenceControls';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { Spinner, Form, Modal, Button, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { defaultSpeciesCurieForMod, speciesName } from '../../refs_tet_validation/helpers/speciesUtils';
import { getTaxonData } from './TaxonUtils';
import { setQuickTopicStagedCount } from './quickTopicStaged';
import { topicDefaultTaxonCurie } from './topicDefaultSpecies';
import {
  NOVELTY_UNSPECIFIED,
  DEFAULT_NEW_NOVELTY,
  ASSESSMENT_COLUMNS,
  COLUMN_BY_KEY,
  computeCellState,
  applyChecked,
  applyUnchecked,
  conflictsWithValidated,
  stagedTagsFor,
} from './quickTopicAssessment';

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

// Default row order: predicted topics first (for fast triage), then alphabetical.
const defaultTopicOrder = (a, b) => {
  if (a.has_prediction !== b.has_prediction) { return a.has_prediction ? -1 : 1; }
  return a.topic_name.localeCompare(b.topic_name);
};

// Re-apply a saved row order (a list of topic curies). Topics not in the saved
// list (e.g. added to the ontology later) follow in default order.
const orderRows = (rows, order) => {
  if (!Array.isArray(order) || order.length === 0) { return rows; }
  const pos = new Map(order.map((curie, i) => [curie, i]));
  return [...rows].sort((a, b) => {
    const ai = pos.has(a.topic_curie) ? pos.get(a.topic_curie) : Infinity;
    const bi = pos.has(b.topic_curie) ? pos.get(b.topic_curie) : Infinity;
    if (ai !== bi) { return ai - bi; }
    return defaultTopicOrder(a, b);
  });
};

const QuickTopicAddition = () => {
  const dispatch = useDispatch();
  const referenceJsonLive = useSelector(state => state.biblio.referenceJsonLive);
  const referenceCurie = referenceJsonLive["curie"];
  const cognitoMod = useSelector(state => state.isLogged.cognitoMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);
  const accessLevel = testerMod !== 'No' ? testerMod : cognitoMod;
  const modToTaxon = useSelector(state => state.biblio.modToTaxon);
  const curieToNameTaxon = useSelector(state => state.biblio.curieToNameTaxon);
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const email = useSelector(state => state.isLogged.email);

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

  const [isGridReady, setIsGridReady] = useState(false);
  // Active row order (topic curies): from a manual drag or a loaded preference.
  // Re-applied when the topic list refetches (e.g. after Submit).
  const savedRowOrderRef = useRef(null);
  // The last applied preference payload, so the column/filter layout can be
  // re-applied when the grid remounts (it unmounts behind the loading spinner).
  const lastSettingsRef = useRef(null);
  const topicRowsRef = useRef(topicRows);
  topicRowsRef.current = topicRows;

  // Apply the grid-level part of a preference payload (column layout + filters).
  // ORDERING IS LOAD-BEARING: applySettingsToGrid restores the Definition/
  // Synonyms toggles first and defers this call (setTimeout 0) until the
  // columnDefs rebuild has flushed, because applyColumnState({applyOrder:true})
  // pushes any column absent from the saved state to the far right — a saved
  // state captured with Synonyms hidden would otherwise detach a re-shown
  // Synonyms column from its position.
  const applyGridLayout = useCallback((payload) => {
    const api = gridApiRef.current;
    if (!api || !payload) { return; }
    const { columnState, filterModel } = payload;
    if (Array.isArray(columnState) && columnState.length > 0) {
      api.applyColumnState({ state: columnState, applyOrder: true });
    }
    if (api.setFilterModel) {
      // Preferences saved before topic_name switched to TopicFilter hold a text
      // filter model on that column. AG Grid derives "filter active" from the
      // model being non-null (regardless of doesFilterPass), so restoring the
      // stale object would show a filter icon that filters nothing, suppress
      // the managed row-drag handles, and re-persist itself on the next save.
      // Drop any topic_name model that isn't the TopicFilter's array shape.
      const safeFilterModel = filterModel && Object.fromEntries(
        Object.entries(filterModel).filter(([colId, m]) => colId !== 'topic_name' || Array.isArray(m))
      );
      api.setFilterModel(safeFilterModel && Object.keys(safeFilterModel).length > 0 ? safeFilterModel : null);
    }
    api.onFilterChanged?.();
  }, []);

  const onGridReady = useCallback((params) => {
    gridApiRef.current = params.api;
    setIsGridReady(true);
    if (lastSettingsRef.current) { applyGridLayout(lastSettingsRef.current); }
  }, [applyGridLayout]);
  // Auto-height cells can retain AG Grid's initial estimated height until an
  // interaction such as filtering forces a second measurement. Recalculate
  // once the first set of cells has rendered so row height is stable from the
  // outset instead of suddenly becoming more compact when a filter is used.
  const onFirstDataRendered = useCallback((params) => {
    setTimeout(() => params.api.resetRowHeights(), 0);
  }, []);
  const onSelectionChanged = useCallback(() => {
    setSelectedCount(gridApiRef.current?.getSelectedRows().length || 0);
  }, []);

  // After a managed row drag, mirror the grid's new row order back into
  // topicRows so everything that iterates it (staged summary, submit modal)
  // follows the curator's order. getRowId keeps selection/staged cell state
  // attached to the right rows across the state update.
  const getRowId = useCallback((params) => params.data.topic_curie, []);
  const onRowDragEnd = useCallback(() => {
    const api = gridApiRef.current;
    if (!api) { return; }
    const reordered = [];
    api.forEachNode((node) => { reordered.push(node.data); });
    setTopicRows(reordered);
    // Keep the manual order across topic refetches this session; it is only
    // persisted when the curator saves it to a preference setting.
    savedRowOrderRef.current = reordered.map((r) => r.topic_curie);
  }, []);

  // ----- Table preference settings (same person-settings backend as the TET
  // ----- table): the payload adds rowOrder + the definition/synonyms toggles
  // ----- on top of the usual column layout and filters.
  const getSafeCurrentState = useCallback(() => {
    const api = gridApiRef.current;
    const columnState = api?.getColumnState ? api.getColumnState() : [];
    const filterModel = api?.getFilterModel ? api.getFilterModel() : {};
    return {
      columnState: Array.isArray(columnState) ? columnState : [],
      filterModel: filterModel || {},
      rowOrder: topicRowsRef.current.map((r) => r.topic_curie),
      quickView: { showDefinition, showSynonyms },
    };
  }, [showDefinition, showSynonyms]);

  const applySettingsToGrid = useCallback(async (payload) => {
    if (!payload) { return; }
    lastSettingsRef.current = payload;
    if (payload.quickView) {
      setShowDefinition(payload.quickView.showDefinition ?? true);
      setShowSynonyms(payload.quickView.showSynonyms ?? true);
    }
    savedRowOrderRef.current =
      (Array.isArray(payload.rowOrder) && payload.rowOrder.length > 0) ? payload.rowOrder : null;
    if (savedRowOrderRef.current) {
      setTopicRows((prev) => orderRows(prev, savedRowOrderRef.current));
    } else {
      // A setting without a saved row order (e.g. the seeded default, which can
      // be captured before the topic list loads) means the DEFAULT order —
      // otherwise Reset would leave a dragged order in place.
      setTopicRows((prev) => [...prev].sort(defaultTopicOrder));
    }
    // Let a possible columnDefs rebuild (definition/synonyms toggle) settle
    // before applying column state to the new defs.
    await new Promise((resolve) => setTimeout(resolve, 0));
    applyGridLayout(payload);
  }, [applyGridLayout]);

  const onPreferencesAfterLoad = useCallback((prefsApi, { existing, picked }) => {
    const list = existing || [];
    if (list.length > 0) {
      const setting = picked || list.find((s) => s.default_setting) || null;
      if (setting?.json_settings) {
        prefsApi.setSelectedSettingId(setting.person_setting_id);
        applySettingsToGrid(setting.json_settings);
      }
      return;
    }
    // First use: seed a default preset from the current (default) layout.
    prefsApi.seed({
      name: accessLevel ? `${accessLevel} Default` : 'Default',
      payload: { ...getSafeCurrentState(), meta: { accessLevel } },
      isDefault: true,
    }).then((created) => {
      if (created?.person_setting_id) { prefsApi.setSelectedSettingId(created.person_setting_id); }
    }).catch(() => {});
  }, [accessLevel, applySettingsToGrid, getSafeCurrentState]);

  // Live prefsApi from the preference controls, so Reset can read the current
  // settings list (including saves made after load).
  const prefsApiRef = useRef(null);
  const onPrefsApiChange = useCallback((prefsApi) => { prefsApiRef.current = prefsApi; }, []);

  // Reset the table to the curator's DEFAULT SETTING when one exists (that is
  // what "my normal view" means to a curator); otherwise fall back to the
  // built-in defaults: predicted-first row order, the columnDefs' column
  // layout, and no sort/filters. Saved preference settings are untouched.
  const resetTableLayout = useCallback(() => {
    const prefsApi = prefsApiRef.current;
    const defaultSetting = (prefsApi?.settings || []).find((s) => s.default_setting);
    if (defaultSetting?.json_settings) {
      prefsApi.setSelectedSettingId(defaultSetting.person_setting_id);
      applySettingsToGrid(defaultSetting.json_settings);
      return;
    }
    savedRowOrderRef.current = null;
    lastSettingsRef.current = null;
    const api = gridApiRef.current;
    api?.resetColumnState?.();
    api?.setFilterModel?.(null);
    api?.onFilterChanged?.();
    setTopicRows((prev) => [...prev].sort(defaultTopicOrder));
  }, [applySettingsToGrid]);

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

  // Species chosen for a topic's tag: the per-row override, else the topic's
  // hard-coded (MOD, topic) default (SCRUM-6168), else the MOD-wide default.
  const speciesForRow = useCallback((topicCurie) => {
    const curie = speciesSelectionRef.current[topicCurie]
      || topicDefaultTaxonCurie(accessLevel, topicCurie)
      || defaultSpeciesCurie;
    return curie ? { curie, name: speciesName(curieToNameTaxon, curie) } : null;
  }, [accessLevel, defaultSpeciesCurie, curieToNameTaxon]);

  // Same per-topic default for the species cell, resolved through a ref like
  // the other cell inputs so columnDefs stay stable.
  const topicDefaultRef = useRef(null);
  topicDefaultRef.current = (topicCurie) => topicDefaultTaxonCurie(accessLevel, topicCurie);

  // A different paper must never inherit staged assessments or per-row species
  // overrides from the previous one. Today the component unmounts during a
  // reference switch (Biblio swaps in LoadingElement while fetching), so this
  // is a defensive reset for the day that stops being true (PR #644 review).
  useEffect(() => {
    setStaged({});
    speciesSelectionRef.current = {};
  }, [referenceCurie]);

  // Auto-dismiss informational notifications (staged-N, submit confirmations)
  // so they don't sit under the toolbar shifting the grid down; warnings and
  // errors stay until the curator closes them.
  useEffect(() => {
    if (!notification || notification.variant === 'warning' || notification.variant === 'danger') {
      return undefined;
    }
    const t = setTimeout(() => setNotification(null), 6000);
    return () => clearTimeout(t);
  }, [notification]);

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
        .sort(defaultTopicOrder);
      // Re-apply the active custom order (manual drag or loaded preference), if any.
      setTopicRows(orderRows(rows, savedRowOrderRef.current));
      // Feed the shared Topic filter vocabulary (redux biblio.allTopics), the
      // same way the WF editor and the TET table do for their grids — the
      // TopicFilter popup reads it (SCRUM-6400).
      dispatch(setAllTopics([...new Set(rows.map((r) => r.topic_name).filter(Boolean))]));

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
  }, [referenceCurie, accessLevel, dispatch]);

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
  // recorded and is a no-op; a click contradicting a validated opposite-polarity
  // assessment is refused with an explanation (Submit cannot retract the
  // recorded tag, so staging it would write a contradiction); a staged ✓
  // toggles back off with its implications; anything else stages a ✓ with the
  // cross-check rules applied.
  const onCellRef = useRef();
  onCellRef.current = (colKey, rowData) => {
    const state = computeCellState(stagedRef.current, rowData, colKey);
    if (state === 'validated') { return; }
    if (state !== 'checked' && conflictsWithValidated(rowData, colKey)) {
      setNotification({
        variant: 'warning',
        message: `"${rowData.topic_name}" already has a biocurator-validated `
          + `${colKey === 'no_data' ? 'positive' : 'No Data'} assessment. `
          + `Staging "${COLUMN_BY_KEY[colKey].header}" would contradict it — `
          + 'retract the existing tag in the Topic Entity editor first.',
      });
      return;
    }
    setStaged((prev) => {
      const cur = { ...(prev[rowData.topic_curie] || {}) };
      if (state === 'checked') {
        applyUnchecked(cur, colKey);
      } else {
        applyChecked(cur, colKey, rowData.assessment_states || {});
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
    // Partition before the state update (the updater must stay pure): drop
    // rows already recorded by a biocurator, and rows where the bulk column
    // would contradict a validated opposite-polarity assessment — the same
    // guard as the single-cell click path (PR #644 review, finding 1).
    const eligible = rows.filter((r) => (r.assessment_states || {})[bulkCol] !== 'validated');
    const conflicted = eligible.filter((r) => conflictsWithValidated(r, bulkCol));
    const toStage = eligible.filter((r) => !conflictsWithValidated(r, bulkCol));
    const skippedConflicts = conflicted.length;
    const stagedCount = toStage.length;
    setStaged((prev) => {
      const next = { ...prev };
      toStage.forEach((r) => {
        const cur = { ...(next[r.topic_curie] || {}) };
        applyChecked(cur, bulkCol, r.assessment_states || {});
        next[r.topic_curie] = cur;
      });
      return next;
    });
    gridApiRef.current?.deselectAll();
    setNotification({
      variant: skippedConflicts > 0 ? 'warning' : 'info',
      message: `Staged "${COLUMN_BY_KEY[bulkCol].header}" for ${stagedCount} topic(s).`
        + (skippedConflicts > 0
          ? ` Skipped ${skippedConflicts} topic(s) whose biocurator-validated assessment it would contradict.`
          : '')
        + ' Review and click Submit to save.',
    });
  };

  const stagedTagsForRow = useCallback((row) => stagedTagsFor(staged, row), [staged]);

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

  // Publish the staged count so the Biblio tab-switch radios can warn before
  // discarding unsubmitted work; clear it when leaving the tab.
  useEffect(() => {
    setQuickTopicStagedCount(stagedTagCount);
    return () => setQuickTopicStagedCount(0);
  }, [stagedTagCount]);

  const clearStaged = () => setStaged({});

  const closeSubmit = () => setSubmitState(null);

  // Submit the staged edits directly — no confirmation step and no note field
  // (curators add notes in the TET editor). Shows a progress/result modal only.
  const submitStaged = async () => {
    if (!sourceId) {
      setNotification({ variant: 'danger', message: 'Curator source not resolved yet — please retry in a moment.' });
      return;
    }
    const items = stagedSummary;
    if (items.length === 0) {
      setNotification({ variant: 'warning', message: 'No staged changes to submit. Click the assessment cells first.' });
      return;
    }
    const total = items.reduce((n, x) => n + x.tags.length, 0);
    // The modal renders progress + errors only; the work list stays in this
    // local (not in state, which would pin the pre-submit rows until close).
    setSubmitState({ status: 'submitting', progress: { done: 0, total }, errors: [] });
    const errors = [];
    let done = 0;
    for (const { row, tags } of items) {
      const species = speciesForRow(row.topic_curie);
      for (const t of tags) {
        try {
          await createTag({ kind: t.kind, topicCurie: row.topic_curie, novelty: t.novelty, note: null, species });
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
    if (errors.length < total) {
      // At least one tag was created (and the backend may have revalidated
      // existing predictions), so the redux-cached TET list is stale — force a
      // refetch so the TET editor tab shows the new state without a reload.
      dispatch(fetchTopicEntityTags(referenceCurie, true));
    }
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
        headerName: '',
        colId: 'rowDrag',
        // Keep a dedicated gutter for row reordering. AG Grid hides the handle
        // while sorted/filtered, but the column remains so topic text does not
        // jump horizontally when the handle disappears.
        rowDrag: true,
        width: 42,
        minWidth: 42,
        maxWidth: 42,
        pinned: 'left',
        sortable: false,
        filter: false,
        resizable: false,
        suppressMovable: true,
        cellStyle: { padding: 0, justifyContent: 'center' },
      },
      {
        headerName: 'Topic for curation',
        field: 'topic_name',
        flex: 2,
        minWidth: 200,
        sortable: true,
        // Same Select-topic multi-select filter as the WF editor's curation
        // table (SCRUM-6400). Its array model rides through the existing
        // table-preference save/restore (getFilterModel/setFilterModel), so a
        // curator's topic selection persists with their saved setting.
        filter: TopicFilter,
        wrapText: true,
        autoHeight: true,
        cellStyle: { textAlign: 'left', whiteSpace: 'normal', lineHeight: '1.2em', paddingTop: 4, paddingBottom: 4 },
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
        cellStyle: { display: 'flex', alignItems: 'center', paddingTop: 3, paddingBottom: 3 },
        cellRenderer: (params) => {
          const opts = speciesOptionsRef.current;
          if (!opts.length) {
            return <span style={{ color: '#98a2b3', fontSize: 12 }}>—</span>;
          }
          const topic = params.data.topic_curie;
          const current = speciesSelectionRef.current[topic]
            || topicDefaultRef.current(topic)
            || defaultSpeciesCurieRef.current
            || opts[0].curie;
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
        cellStyle: { textAlign: 'left', whiteSpace: 'normal', lineHeight: '1.2em', paddingTop: 4, paddingBottom: 4 },
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
        cellStyle: { textAlign: 'left', whiteSpace: 'normal', lineHeight: '1.2em', paddingTop: 4, paddingBottom: 4 },
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
          <span style={{ color: '#475467', fontSize: 13 }}>
            Predicted topics highlighted · {predictionsCount} prediction{predictionsCount === 1 ? '' : 's'}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={resetTableLayout}
            title="Reset the table to your default setting (or the built-in layout when you have none)"
          >
            Reset layout
          </Button>
          <AgGridTablePreferenceControls
            accessToken={accessToken}
            email={email}
            componentName="quick_topic_addition"
            accessLevel={accessLevel}
            isReady={isGridReady && !loading}
            getSafeCurrentState={getSafeCurrentState}
            applySettingsToGrid={applySettingsToGrid}
            onAfterLoad={onPreferencesAfterLoad}
            onPrefsApiChange={onPrefsApiChange}
            title="Manage Quick Topic Table Preferences"
            showNotification={(message, variant) => (
              setNotification({ message, variant: variant === 'error' ? 'danger' : variant })
            )}
          />
        </div>
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
          <Button variant="success" onClick={submitStaged} disabled={stagedTagCount === 0 || isSubmitting}>
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
          className="ag-theme-quartz quick-topic-grid"
          onCopy={handleGridCopy}
          style={{ width: '100%', height: 600 }}
        >
          <AgGridReact
            rowData={topicRows}
            columnDefs={columnDefs}
            // The grid unmounts behind the loading spinner; clear the ref so
            // nothing calls into a destroyed API before the remount's
            // onGridReady replaces it (PR #644 review).
            onGridPreDestroyed={() => { gridApiRef.current = null; }}
            rowHeight={44}
            rowSelection="multiple"
            showDisabledCheckboxes={true}
            suppressRowClickSelection={true}
            rowDragManaged={true}
            animateRows={true}
            getRowId={getRowId}
            onRowDragEnd={onRowDragEnd}
            onGridReady={onGridReady}
            onFirstDataRendered={onFirstDataRendered}
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
          {submitState?.status === 'submitting' && (
            <p style={{ margin: 0, color: '#555' }}>
              <Spinner animation="border" size="sm" /> Submitting {submitState.progress.done} / {submitState.progress.total}…
            </p>
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
          {submitState?.status === 'submitting' && (<Button variant="secondary" disabled>Submitting…</Button>)}
          {submitState?.status === 'done' && (<Button variant="success" onClick={closeSubmit}>Close</Button>)}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default QuickTopicAddition;
