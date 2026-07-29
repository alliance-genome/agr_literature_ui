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
import { faCheck, faExclamation, faPlus } from '@fortawesome/free-solid-svg-icons';
import SpeciesPicker from '../../refs_tet_validation/cellRenderers/SpeciesPicker';
import { defaultSpeciesCurieForMod, speciesName } from '../../refs_tet_validation/helpers/speciesUtils';
import { topicDefaultTaxonCurie } from './topicDefaultSpecies';

// Whole Paper topic is handled separately in the workflow editor; exclude it here.
const WHOLE_PAPER_TOPIC = "ATP:0000002";

// Data-novelty ATP terms, matching the TET editor (getDataNoveltyAtpArray).
const NOVELTY_UNSPECIFIED = 'ATP:0000335';
const NEW_NOVELTY_OPTIONS = [
  { curie: 'ATP:0000321', label: 'new data' },
  { curie: 'ATP:0000228', label: 'new to database' },
  { curie: 'ATP:0000229', label: 'new to field' },
];
const DEFAULT_NEW_NOVELTY = NEW_NOVELTY_OPTIONS[0].curie;

// The three assessment columns. `kind` drives the created tag's negated flag and
// data novelty; `computed` names the aggregated-endpoint field used to show the
// existing pipeline result in the cell.
const ASSESSMENTS = [
  { kind: 'has', header: 'Has data', computed: 'has_data' },
  { kind: 'no', header: 'No data', computed: 'no_data' },
  { kind: 'new', header: 'New data', computed: 'new_data' },
];

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
  const [showDefinition, setShowDefinition] = useState(true);
  const [showSynonyms, setShowSynonyms] = useState(true);
  const [sourceId, setSourceId] = useState(null);

  // pending = null | { kind, topicCurie, topicName, novelty, note,
  //                    species: {curie, name} | null, status, errorMessage? }
  const [pending, setPending] = useState(null);
  // When false, clicking a cell creates the tag directly without the popup
  // (the "Don't show this again" option). Session-scoped, resets on remount.
  const [confirmEach, setConfirmEach] = useState(true);
  const [notification, setNotification] = useState(null);

  // Batch flow: tick topics, choose an assessment kind, then "Add topics".
  const gridApiRef = useRef(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [batchKind, setBatchKind] = useState('has');
  // batchPending = null | { kind, novelty, note, species, rows,
  //                         status: 'editing'|'submitting'|'done', progress, errors }
  const [batchPending, setBatchPending] = useState(null);

  const onGridReady = useCallback((params) => { gridApiRef.current = params.api; }, []);
  const onSelectionChanged = useCallback(() => {
    setSelectedCount(gridApiRef.current?.getSelectedRows().length || 0);
  }, []);

  // Default species for a topic: the hard-coded per-topic override when one
  // exists (topicDefaultSpecies.js), otherwise the MOD's primary taxon.
  const speciesForTopic = useCallback((topicCurie) => {
    const curie = topicDefaultTaxonCurie(accessLevel, topicCurie)
      || defaultSpeciesCurieForMod(modToTaxon, accessLevel);
    return curie
      ? { curie, name: speciesName(curieToNameTaxon, curie) }
      : null;
  }, [modToTaxon, curieToNameTaxon, accessLevel]);

  const fetchTopics = useCallback(async () => {
    if (!referenceCurie || !accessLevel) { return; }
    setLoading(true);
    const url =
      `/curation_status/aggregated_curation_status_and_tet_info/${referenceCurie}/${accessLevel}`;
    try {
      const result = await api.get(url);
      const rows = result.data
        .filter(info => info.topic_curie !== WHOLE_PAPER_TOPIC)
        .map(info => ({
          topic_name: info.topic_name,
          topic_curie: info.topic_curie,
          // Definition / synonyms are enriched below via /ontology/term_details.
          topic_definition: '',
          topic_synonyms: '',
          has_data: info.tet_info_has_data,
          new_data: info.tet_info_new_data,
          no_data: info.tet_info_no_data,
          topic_source: Array.isArray(info.tet_info_topic_source)
            ? info.tet_info_topic_source.join(', ')
            : info.tet_info_topic_source,
        }))
        .sort((a, b) => a.topic_name.localeCompare(b.topic_name));
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

  useEffect(() => {
    if (!accessLevel) { return; }
    let cancelled = false;
    getCuratorSourceId(accessLevel).then((id) => {
      if (!cancelled) { setSourceId(id ?? null); }
    });
    return () => { cancelled = true; };
  }, [accessLevel]);

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

  const openConfirm = (kind, rowData) => {
    setPending({
      kind,
      topicCurie: rowData.topic_curie,
      topicName: rowData.topic_name,
      novelty: DEFAULT_NEW_NOVELTY,
      note: '',
      species: speciesForTopic(rowData.topic_curie),
      status: 'editing',
    });
  };
  const closeConfirm = () => setPending(null);

  // Direct create (used when the curator opted out of the popup).
  const quickCreate = async (kind, rowData) => {
    try {
      await createTag({
        kind,
        topicCurie: rowData.topic_curie,
        novelty: DEFAULT_NEW_NOVELTY,
        note: '',
        species: speciesForTopic(rowData.topic_curie),
      });
      setNotification({ variant: 'success', message: `Added "${rowData.topic_name}" (${kind === 'no' ? 'no data' : kind === 'new' ? 'new data' : 'has data'}).` });
      fetchTopics();
    } catch (e) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail || e?.message || 'unknown error';
      setNotification({ variant: 'danger', message: `Could not add "${rowData.topic_name}": HTTP ${status || '?'} ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` });
    }
  };

  // Ref so the AG Grid cell renderers always call the current handler.
  const onAssessRef = useRef();
  onAssessRef.current = (kind, rowData) => {
    if (!sourceId) {
      setNotification({ variant: 'danger', message: 'Curator source not resolved yet — please retry in a moment.' });
      return;
    }
    if (confirmEach) { openConfirm(kind, rowData); }
    else { quickCreate(kind, rowData); }
  };

  const handleConfirm = async () => {
    if (!pending) { return; }
    setPending((s) => ({ ...s, status: 'submitting' }));
    try {
      await createTag(pending);
      setPending((s) => ({ ...s, status: 'success' }));
      fetchTopics();
    } catch (e) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail || e?.message || 'unknown error';
      setPending((s) => ({
        ...s,
        status: 'error',
        errorMessage: `HTTP ${status || '?'}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`,
      }));
    }
  };

  const openBatch = () => {
    if (!sourceId) {
      setNotification({ variant: 'danger', message: 'Curator source not resolved yet — please retry in a moment.' });
      return;
    }
    const rows = gridApiRef.current?.getSelectedRows() || [];
    if (rows.length === 0) {
      setNotification({ variant: 'warning', message: 'No topics selected. Tick the topics you want to add first.' });
      return;
    }
    setBatchPending({
      kind: batchKind,
      novelty: DEFAULT_NEW_NOVELTY,
      note: '',
      // Left blank so each topic gets its own per-topic default in runBatch;
      // setting it in the modal overrides the species for every selected topic.
      species: null,
      rows,
      status: 'editing',
      progress: { done: 0, total: rows.length },
      errors: [],
    });
  };

  const runBatch = async () => {
    if (!batchPending) { return; }
    const { rows, kind, novelty, note, species } = batchPending;
    setBatchPending((s) => ({ ...s, status: 'submitting', progress: { done: 0, total: rows.length }, errors: [] }));
    const errors = [];
    for (let i = 0; i < rows.length; i++) {
      try {
        // No shared species set → use this topic's own default.
        const rowSpecies = species || speciesForTopic(rows[i].topic_curie);
        await createTag({ kind, topicCurie: rows[i].topic_curie, novelty, note, species: rowSpecies });
      } catch (e) {
        const status = e?.response?.status;
        const detail = e?.response?.data?.detail || e?.message || 'unknown error';
        errors.push({ topic: rows[i].topic_name, msg: `HTTP ${status || '?'} ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` });
      }
      setBatchPending((s) => (s ? { ...s, progress: { done: i + 1, total: rows.length } } : s));
    }
    setBatchPending((s) => (s ? { ...s, status: 'done', errors } : s));
    gridApiRef.current?.deselectAll();
    fetchTopics();
  };

  const closeBatch = () => setBatchPending(null);

  const isSubmitting = pending?.status === 'submitting';
  const isBatchSubmitting = batchPending?.status === 'submitting';

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
        cellStyle: { textAlign: 'left' },
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
        cellStyle: { textAlign: 'left', whiteSpace: 'normal', lineHeight: '1.3em' },
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
        cellStyle: { textAlign: 'left', whiteSpace: 'normal', lineHeight: '1.3em' },
      });
    }
    cols.push({
      headerName: 'Assessment by biocurator',
      headerClass: 'wft-bold-header',
      children: ASSESSMENTS.map(({ kind, header, computed }) => ({
        headerName: header,
        field: computed,
        width: 120,
        sortable: false,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (params) => {
          const conflict = params.data.has_data && params.data.no_data;
          let icon = faPlus;
          let color = '#98a2b3';
          if (kind !== 'new' && conflict) { icon = faExclamation; color = 'red'; }
          else if (params.data[computed]) { icon = faCheck; color = 'green'; }
          return (
            <button
              type="button"
              className="qta-assess-btn"
              title={`Assert "${header}" for ${params.data.topic_name}`}
              onClick={() => onAssessRef.current(kind, params.data)}
              style={{
                border: 'none', background: 'transparent', cursor: 'pointer',
                color, fontWeight: 'bold', width: '100%', height: '100%',
              }}
            >
              <FontAwesomeIcon icon={icon} />
            </button>
          );
        },
      })),
    });
    cols.push({
      headerName: 'Sources',
      field: 'topic_source',
      flex: 2,
      minWidth: 160,
      sortable: true,
      filter: true,
      cellStyle: { textAlign: 'left' },
    });
    return cols;
  }, [showDefinition, showSynonyms]);

  if (!referenceCurie) {
    return (<div style={{ padding: '20px' }}>No AGR Reference Curie found.</div>);
  }

  const kindLabel = (kind) => (kind === 'no' ? 'no data' : kind === 'new' ? 'new data' : 'has data');

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
        <Form.Check
          type="checkbox"
          id="quick-topic-confirm-each"
          label="Confirm each assessment (show popup)"
          checked={confirmEach}
          onChange={(e) => setConfirmEach(e.target.checked)}
        />
      </div>

      <div style={{ display: 'flex', gap: '12px', margin: '10px 0', alignItems: 'center', flexWrap: 'wrap' }}>
        <span>Ticked topics get assessed as:</span>
        <Form.Control
          as="select"
          style={{ width: 'auto' }}
          value={batchKind}
          onChange={(e) => setBatchKind(e.target.value)}
        >
          {ASSESSMENTS.map((a) => (
            <option key={a.kind} value={a.kind}>{a.header}</option>
          ))}
        </Form.Control>
        <Button variant="success" onClick={openBatch} disabled={selectedCount === 0}>
          Add topics{selectedCount > 0 ? ` (${selectedCount})` : ''}
        </Button>
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
            suppressRowClickSelection={true}
            onGridReady={onGridReady}
            onSelectionChanged={onSelectionChanged}
            enableCellTextSelection={true}
            ensureDomOrder={true}
            suppressColumnVirtualisation={true}
            domLayout="normal"
            getRowClass={() => 'ag-row-striped-light'}
            popupParent={document.body}
          />
        </div>
      )}

      <Modal
        show={!!pending}
        onHide={isSubmitting ? undefined : closeConfirm}
        centered
        backdrop={isSubmitting ? 'static' : true}
        size="lg"
      >
        <Modal.Header closeButton={!isSubmitting}>
          <Modal.Title>Topic assessment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pending && (pending.status === 'editing' || pending.status === 'submitting') && (
            <>
              <p style={{ marginBottom: 12 }}>
                This will create a new <strong>{kindLabel(pending.kind)}</strong> topic tag
                for <strong>{pending.topicName}</strong>, attributed to{' '}
                <strong>{userEmail || uid || '(unknown user)'}</strong>.
              </p>

              {pending.kind === 'new' && (
                <Form.Group className="mb-3">
                  <Form.Label>Novelty</Form.Label>
                  <Form.Control
                    as="select"
                    value={pending.novelty}
                    onChange={(e) => setPending((s) => ({ ...s, novelty: e.target.value }))}
                    disabled={isSubmitting}
                  >
                    {NEW_NOVELTY_OPTIONS.map((o) => (
                      <option key={o.curie} value={o.curie}>{o.label} ({o.curie})</option>
                    ))}
                  </Form.Control>
                </Form.Group>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Species (optional)</Form.Label>
                <SpeciesPicker
                  id="quick-topic-species"
                  value={pending.species?.curie || null}
                  valueName={pending.species?.name || ''}
                  disabled={isSubmitting}
                  onChange={(next) => setPending((s) => ({ ...s, species: next }))}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Note (optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Optional note for this tag…"
                  value={pending.note}
                  onChange={(e) => setPending((s) => ({ ...s, note: e.target.value }))}
                  disabled={isSubmitting}
                />
              </Form.Group>

              <Form.Check
                type="checkbox"
                id="quick-topic-dont-show-again"
                label="Don't show this again (add topics without confirming)"
                checked={!confirmEach}
                onChange={(e) => setConfirmEach(!e.target.checked)}
                disabled={isSubmitting}
              />

              {isSubmitting && (
                <p style={{ marginTop: 12, color: '#555' }}>
                  <Spinner animation="border" size="sm" /> Submitting…
                </p>
              )}
            </>
          )}
          {pending?.status === 'success' && (
            <p style={{ color: '#1e7d3a', textAlign: 'center', margin: 0, fontWeight: 600 }}>
              <FontAwesomeIcon icon={faCheck} /> Tag created successfully
            </p>
          )}
          {pending?.status === 'error' && (
            <>
              <p style={{ color: '#b03a2e' }}>Could not create the assessment tag.</p>
              <pre style={{ background: '#fdecea', border: '1px solid #f5b7b1', padding: 8, borderRadius: 4, fontSize: 12, whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                {pending.errorMessage}
              </pre>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          {pending?.status === 'editing' && (
            <>
              <Button variant="secondary" onClick={closeConfirm}>Cancel</Button>
              <Button variant={pending.kind === 'no' ? 'danger' : 'success'} onClick={handleConfirm}>
                Confirm {kindLabel(pending.kind)}
              </Button>
            </>
          )}
          {pending?.status === 'submitting' && (
            <Button variant="secondary" disabled>Submitting…</Button>
          )}
          {pending?.status === 'success' && (
            <Button variant="success" onClick={closeConfirm}>Close</Button>
          )}
          {pending?.status === 'error' && (
            <>
              <Button variant="secondary" onClick={closeConfirm}>Close</Button>
              <Button variant={pending.kind === 'no' ? 'danger' : 'success'} onClick={handleConfirm}>Retry</Button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      <Modal
        show={!!batchPending}
        onHide={isBatchSubmitting ? undefined : closeBatch}
        centered
        backdrop={isBatchSubmitting ? 'static' : true}
        size="lg"
      >
        <Modal.Header closeButton={!isBatchSubmitting}>
          <Modal.Title>Add {batchPending?.rows.length} topic{batchPending?.rows.length === 1 ? '' : 's'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {batchPending && (batchPending.status === 'editing' || batchPending.status === 'submitting') && (
            <>
              <p style={{ marginBottom: 12 }}>
                This will create a <strong>{kindLabel(batchPending.kind)}</strong> topic tag for
                the <strong>{batchPending.rows.length}</strong> selected topic{batchPending.rows.length === 1 ? '' : 's'},
                attributed to <strong>{userEmail || uid || '(unknown user)'}</strong>.
              </p>

              {batchPending.kind === 'new' && (
                <Form.Group className="mb-3">
                  <Form.Label>Novelty</Form.Label>
                  <Form.Control
                    as="select"
                    value={batchPending.novelty}
                    onChange={(e) => setBatchPending((s) => ({ ...s, novelty: e.target.value }))}
                    disabled={isBatchSubmitting}
                  >
                    {NEW_NOVELTY_OPTIONS.map((o) => (
                      <option key={o.curie} value={o.curie}>{o.label} ({o.curie})</option>
                    ))}
                  </Form.Control>
                </Form.Group>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Species (optional — leave blank to use each topic's default; set to override all)</Form.Label>
                <SpeciesPicker
                  id="quick-topic-batch-species"
                  value={batchPending.species?.curie || null}
                  valueName={batchPending.species?.name || ''}
                  disabled={isBatchSubmitting}
                  onChange={(next) => setBatchPending((s) => ({ ...s, species: next }))}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Note (optional, applied to all)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Optional note for these tags…"
                  value={batchPending.note}
                  onChange={(e) => setBatchPending((s) => ({ ...s, note: e.target.value }))}
                  disabled={isBatchSubmitting}
                />
              </Form.Group>

              <ul style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 0 }}>
                {batchPending.rows.map((r) => (<li key={r.topic_curie}>{r.topic_name}</li>))}
              </ul>

              {isBatchSubmitting && (
                <p style={{ marginTop: 12, color: '#555' }}>
                  <Spinner animation="border" size="sm" /> Adding {batchPending.progress.done} / {batchPending.progress.total}…
                </p>
              )}
            </>
          )}
          {batchPending?.status === 'done' && (
            <>
              <p style={{ color: batchPending.errors.length ? '#b03a2e' : '#1e7d3a', fontWeight: 600 }}>
                Added {batchPending.progress.total - batchPending.errors.length} of {batchPending.progress.total} topic tag{batchPending.progress.total === 1 ? '' : 's'}.
              </p>
              {batchPending.errors.length > 0 && (
                <ul style={{ color: '#b03a2e', maxHeight: 200, overflowY: 'auto' }}>
                  {batchPending.errors.map((er, i) => (<li key={i}>{er.topic}: {er.msg}</li>))}
                </ul>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          {batchPending?.status === 'editing' && (
            <>
              <Button variant="secondary" onClick={closeBatch}>Cancel</Button>
              <Button variant="success" onClick={runBatch}>
                Add {batchPending.rows.length} topic{batchPending.rows.length === 1 ? '' : 's'}
              </Button>
            </>
          )}
          {batchPending?.status === 'submitting' && (<Button variant="secondary" disabled>Adding…</Button>)}
          {batchPending?.status === 'done' && (<Button variant="success" onClick={closeBatch}>Close</Button>)}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default QuickTopicAddition;
