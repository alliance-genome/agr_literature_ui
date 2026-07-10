import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { Modal, Button, Form, ProgressBar, Spinner } from 'react-bootstrap';
import { api } from '../../../api';
import SpeciesPicker from './SpeciesPicker';
import {
  defaultSpeciesCurieForMod,
  speciesName,
} from '../helpers/speciesUtils';

const BULK_CONCURRENCY = 8;

async function runWithPool(items, worker, concurrency) {
  let cursor = 0;
  async function pump() {
    while (cursor < items.length) {
      const i = cursor++;
      await worker(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, pump)
  );
}

/**
 * Modal that fans out a validation TET tag to multiple references for the
 * same topic. Mirrors CellValidationStrip's modal (same fields, same data
 * novelty + source wiring) but parameterised for N refs with concurrency,
 * skip-already-validated, progress bar, and per-ref retry on partial fail.
 */
export default function BulkValidationModal({
  show,
  onHide,
  kind,
  topicCurie,
  topicName,
  references,
  onRowUpdated,
  curationStatusOptions = [],
  curationTagOptions = [],
}) {
  const uid = useSelector((s) => s.isLogged.uid);
  const userEmail = useSelector((s) => s.isLogged.email);
  const cognitoMod = useSelector((s) => s.isLogged.cognitoMod);
  const testerMod = useSelector((s) => s.isLogged.testerMod);
  const accessLevelMod =
    testerMod && testerMod !== 'No' ? testerMod : cognitoMod;
  const topicEntitySourceId = useSelector((s) => s.biblio.topicEntitySourceId);
  const modToTaxon = useSelector((s) => s.biblio.modToTaxon);
  const curieToNameTaxon = useSelector((s) => s.biblio.curieToNameTaxon);

  const eligible = useMemo(
    () => (references || []).filter((r) => !r.alreadyValidated),
    [references]
  );
  const skipped = useMemo(
    () => (references || []).filter((r) => r.alreadyValidated),
    [references]
  );

  const [note, setNote] = useState('');
  const [includeCuration, setIncludeCuration] = useState(false);
  const [curStatus, setCurStatus] = useState('');
  const [curTag, setCurTag] = useState('');
  const [curNote, setCurNote] = useState('');
  // { curie, name } | null — the species that will be applied to every TET
  // tag in this batch. Defaults to the MOD's single taxon (when there is
  // one); curators can still clear or override.
  const [species, setSpecies] = useState(null);
  // status: 'editing' | 'submitting' | 'done' | 'partial' | 'error'
  const [status, setStatus] = useState('editing');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState([]); // [{ curie, ok, error? }]
  const [retryQueue, setRetryQueue] = useState(null); // refs to retry

  useEffect(() => {
    if (show) {
      setNote('');
      setIncludeCuration(false);
      setCurStatus('');
      setCurTag('');
      setCurNote('');
      setStatus('editing');
      setProgress({ done: 0, total: 0 });
      setResults([]);
      setRetryQueue(null);
      const defCurie = defaultSpeciesCurieForMod(modToTaxon, accessLevelMod);
      setSpecies(
        defCurie
          ? {
              curie: defCurie,
              name: speciesName(curieToNameTaxon, defCurie),
            }
          : null
      );
    }
  }, [show, modToTaxon, accessLevelMod, curieToNameTaxon]);

  const noSource = !topicEntitySourceId;
  const noEligible = eligible.length === 0;

  const submitOne = async (ref) => {
    const negated = kind === 'negative';
    const tetPayload = {
      reference_curie: ref.curie,
      topic: topicCurie,
      negated,
      topic_entity_tag_source_id: topicEntitySourceId,
      force_insertion: true,
      entity: null,
      entity_type: null,
      species: species?.curie || null,
      data_novelty: 'ATP:0000335',
      confidence_score: null,
      confidence_level: null,
      note: note.trim() || null,
    };
    await api.post('/topic_entity_tag/', tetPayload);
    if (
      includeCuration &&
      accessLevelMod &&
      (curStatus || curTag || curNote.trim())
    ) {
      const curPayload = {
        mod_abbreviation: accessLevelMod,
        reference_curie: ref.curie,
        topic: topicCurie,
        curation_status: curStatus || null,
        curation_tag: curTag || null,
        note: curNote.trim() || null,
      };
      await api.post('/curation_status/', curPayload);
    }
  };

  const runSubmission = async (refsToRun) => {
    setStatus('submitting');
    setProgress({ done: 0, total: refsToRun.length });
    const out = [];
    let done = 0;
    await runWithPool(
      refsToRun,
      async (ref) => {
        try {
          await submitOne(ref);
          out.push({ curie: ref.curie, ok: true });
          if (onRowUpdated) {
            try {
              await onRowUpdated(ref.curie);
            } catch {
              /* row refresh is best-effort */
            }
          }
        } catch (e) {
          const httpStatus = e?.response?.status;
          const detail =
            e?.response?.data?.detail || e?.message || 'unknown error';
          out.push({
            curie: ref.curie,
            ok: false,
            error: `HTTP ${httpStatus || '?'}: ${
              typeof detail === 'string' ? detail : JSON.stringify(detail)
            }`,
          });
        } finally {
          done += 1;
          setProgress({ done, total: refsToRun.length });
        }
      },
      BULK_CONCURRENCY
    );
    setResults((prev) => [
      ...prev.filter((p) => !out.find((o) => o.curie === p.curie)),
      ...out,
    ]);
    const failures = out.filter((r) => !r.ok);
    setRetryQueue(failures.length > 0 ? failures.map((f) => ({ curie: f.curie })) : null);
    setStatus(failures.length === 0 ? 'done' : 'partial');
  };

  const handleConfirm = () => runSubmission(eligible);
  const handleRetryFailures = () => runSubmission(retryQueue || []);

  const isSubmitting = status === 'submitting';
  const noneStyle = { color: '#98a2b3' };
  const failures = results.filter((r) => !r.ok);
  const successes = results.filter((r) => r.ok);

  const disabledReason = noSource
    ? 'Curator source not yet loaded — the grid is still resolving your MOD-specific TET source.'
    : noEligible
    ? 'All selected references already have a professional-biocurator assessment for this topic.'
    : null;

  return (
    <Modal
      show={show}
      onHide={isSubmitting ? undefined : onHide}
      centered
      backdrop={isSubmitting ? 'static' : true}
      size="lg"
    >
      <Modal.Header closeButton={!isSubmitting}>
        <Modal.Title>
          Bulk topic assessment —{' '}
          <span
            className={`tetv-validation-status ${
              kind === 'negative' ? 'tetv-validated-neg' : 'tetv-validated-pos'
            }`}
            style={{ fontSize: '0.85em', padding: '3px 10px' }}
          >
            {kind}
          </span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {status === 'editing' && (
          <>
            <p style={{ marginBottom: 10 }}>
              This will create one <strong>assessment TET tag</strong>{' '}
              per selected reference attributed to{' '}
              <strong>{userEmail || uid || '(unknown user)'}</strong>.
            </p>
            <p style={{ marginBottom: 12, color: '#475467' }}>
              Topic: <strong>{topicName || topicCurie}</strong>{' '}
              <small style={{ color: '#667085' }}>({topicCurie})</small>
            </p>

            <div className="tetv-validation-fields mb-3">
              <div className="tetv-validation-fields-title">Scope</div>
              <dl className="tetv-validation-fields-list">
                <dt>Selected references</dt>
                <dd>{references.length}</dd>
                <dt>To be assessed</dt>
                <dd>{eligible.length}</dd>
                <dt>Already assessed (will be skipped)</dt>
                <dd style={skipped.length === 0 ? noneStyle : undefined}>
                  {skipped.length === 0 ? 'none' : skipped.length}
                </dd>
              </dl>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Species (optional)</Form.Label>
              <SpeciesPicker
                id="tetv-bulk-species"
                value={species?.curie || null}
                valueName={species?.name || ''}
                disabled={isSubmitting}
                onChange={setSpecies}
              />
              <Form.Text muted>
                Applied to every TET tag created in this batch.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Note (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Optional note applied to every assessment in this batch…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isSubmitting}
              />
            </Form.Group>

            <div className="tetv-curation-toggle mb-3">
              <Form.Check
                type="checkbox"
                id="tetv-bulk-include-curation"
                label="Also update the curation status for this topic on every selected reference"
                checked={includeCuration}
                onChange={(e) => setIncludeCuration(e.target.checked)}
                disabled={isSubmitting}
              />
            </div>

            {includeCuration && (
              <div className="tetv-curation-section mb-3">
                <Form.Group className="mb-2">
                  <Form.Label>Curation status</Form.Label>
                  <Form.Control
                    as="select"
                    value={curStatus}
                    onChange={(e) => setCurStatus(e.target.value)}
                    disabled={isSubmitting}
                  >
                    <option value="">— none —</option>
                    {curationStatusOptions.map((o) => (
                      <option key={o.curie} value={o.curie}>
                        {o.name} ({o.curie})
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Curation tag (controlled)</Form.Label>
                  <Form.Control
                    as="select"
                    value={curTag}
                    onChange={(e) => setCurTag(e.target.value)}
                    disabled={isSubmitting}
                  >
                    <option value="">— none —</option>
                    {curationTagOptions.map((o) => (
                      <option key={o.curie} value={o.curie}>
                        {o.name} ({o.curie})
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
                <Form.Group>
                  <Form.Label>Curation note (free text)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="Optional free-text note applied to every curation status in this batch…"
                    value={curNote}
                    onChange={(e) => setCurNote(e.target.value)}
                    disabled={isSubmitting}
                  />
                </Form.Group>
              </div>
            )}

            {disabledReason && (
              <p style={{ color: '#b03a2e', marginTop: 8 }}>
                {disabledReason}
              </p>
            )}
          </>
        )}

        {(status === 'submitting' ||
          status === 'done' ||
          status === 'partial') && (
          <>
            <p style={{ marginBottom: 8 }}>
              {status === 'submitting' && (
                <>
                  <Spinner animation="border" size="sm" /> Submitting{' '}
                  assessments…
                </>
              )}
              {status === 'done' && (
                <span style={{ color: '#1e7d3a', fontWeight: 600 }}>
                  <FontAwesomeIcon icon={faCheckCircle} /> All{' '}
                  {successes.length} assessment tag(s) created.
                </span>
              )}
              {status === 'partial' && (
                <span style={{ color: '#8a4a00', fontWeight: 600 }}>
                  Completed with {successes.length} success(es) and{' '}
                  {failures.length} failure(s).
                </span>
              )}
            </p>
            <ProgressBar
              now={
                progress.total === 0
                  ? 0
                  : (progress.done / progress.total) * 100
              }
              label={`${progress.done} / ${progress.total}`}
              variant={
                status === 'partial'
                  ? 'warning'
                  : status === 'done'
                  ? 'success'
                  : undefined
              }
            />

            {failures.length > 0 && (
              <div className="mt-3">
                <div style={{ fontWeight: 700, color: '#8f2435' }}>
                  Failed references:
                </div>
                <ul
                  style={{
                    maxHeight: 180,
                    overflow: 'auto',
                    padding: '4px 12px',
                    margin: 0,
                  }}
                >
                  {failures.map((f) => (
                    <li key={f.curie} style={{ fontSize: 12 }}>
                      <code>{f.curie}</code> — {f.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        {status === 'editing' && (
          <>
            <Button variant="secondary" onClick={onHide}>
              Cancel
            </Button>
            <Button
              variant={kind === 'negative' ? 'danger' : 'success'}
              onClick={handleConfirm}
              disabled={noSource || noEligible}
            >
              <FontAwesomeIcon
                icon={kind === 'negative' ? faTimesCircle : faCheckCircle}
              />{' '}
              Assess {eligible.length} reference
              {eligible.length === 1 ? '' : 's'} {kind}
            </Button>
          </>
        )}
        {status === 'submitting' && (
          <Button variant="secondary" disabled>
            Submitting…
          </Button>
        )}
        {status === 'done' && (
          <Button variant="success" onClick={onHide}>
            Close
          </Button>
        )}
        {status === 'partial' && (
          <>
            <Button variant="secondary" onClick={onHide}>
              Close
            </Button>
            <Button
              variant={kind === 'negative' ? 'danger' : 'success'}
              onClick={handleRetryFailures}
              disabled={!retryQueue || retryQueue.length === 0}
            >
              Retry {failures.length} failure
              {failures.length === 1 ? '' : 's'}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
}
