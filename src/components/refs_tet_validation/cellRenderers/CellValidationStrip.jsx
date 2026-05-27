import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import { api } from '../../../api';
import SpeciesPicker from './SpeciesPicker';
import {
  defaultSpeciesCurieForMod,
  speciesName,
} from '../helpers/speciesUtils';
import { debug } from '../helpers/debug';

// How long the success confirmation stays up before the modal auto-closes.
const SUCCESS_CLOSE_DELAY_MS = 1500;

export default function CellValidationStrip({
  referenceCurie,
  topicCurie,
  topicName,
  cellTets,
  onValidated,
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
  // pending = null | { kind, note, status, errorMessage?,
  //                    includeCuration, curStatus, curTag, curNote,
  //                    species: { curie, name } | null }
  const [pending, setPending] = useState(null);

  const myExisting = (cellTets || []).find((t) => t.created_by === uid);
  const greyPositive = myExisting && myExisting.negated === false;
  const greyNegative = myExisting && myExisting.negated === true;

  const noSource = !topicEntitySourceId;
  const disabledReason = noSource
    ? 'Curator source not yet loaded — the grid is still resolving your MOD-specific TET source.'
    : null;

  const openConfirm = (kind) => {
    if (noSource) return;
    // Pre-fill the species from the MOD-to-taxon mapping when the MOD has a
    // single taxon (WB → C. elegans, ZFIN → D. rerio, …). Multi-taxon MODs
    // (XB) start blank so the curator picks. The curator can still clear or
    // change the value in the picker.
    const defCurie = defaultSpeciesCurieForMod(modToTaxon, accessLevelMod);
    const defaultSpecies = defCurie
      ? { curie: defCurie, name: speciesName(curieToNameTaxon, defCurie) }
      : null;
    setPending({
      kind,
      note: '',
      status: 'editing',
      includeCuration: false,
      curStatus: '',
      curTag: '',
      curNote: '',
      species: defaultSpecies,
    });
  };
  const closeConfirm = () => setPending(null);

  const handleConfirm = async () => {
    if (!pending) return;
    setPending((s) => ({ ...s, status: 'submitting' }));
    const negated = pending.kind === 'negative';
    const note = pending.note?.trim() || null;
    const tetPayload = {
      reference_curie: referenceCurie,
      topic: topicCurie,
      negated,
      topic_entity_tag_source_id: topicEntitySourceId,
      force_insertion: true,
      entity: null,
      entity_type: null,
      species: pending.species?.curie || null,
      data_novelty: 'ATP:0000335',
      confidence_score: null,
      confidence_level: null,
      note,
    };
    try {
      // 1) always create the validation TET tag
      debug.log('[CellValidationStrip] submit TET', tetPayload);
      const res = await api.post('/topic_entity_tag/', tetPayload);
      debug.log('[CellValidationStrip] TET OK', res?.status, res?.data);

      // 2) optionally create / update a curation status entry for this
      //    (reference, mod, topic) — only if the user toggled the section on
      //    and provided at least one value.
      if (
        pending.includeCuration &&
        accessLevelMod &&
        (pending.curStatus || pending.curTag || pending.curNote.trim())
      ) {
        const curPayload = {
          mod_abbreviation: accessLevelMod,
          reference_curie: referenceCurie,
          topic: topicCurie,
          curation_status: pending.curStatus || null,
          curation_tag: pending.curTag || null,
          note: pending.curNote.trim() || null,
        };
        debug.log('[CellValidationStrip] submit curation_status', curPayload);
        const cur = await api.post('/curation_status/', curPayload);
        debug.log(
          '[CellValidationStrip] curation_status OK',
          cur?.status,
          cur?.data
        );
      }

      if (onValidated) await onValidated(referenceCurie);
      setPending((s) => ({ ...s, status: 'success' }));
      setTimeout(closeConfirm, SUCCESS_CLOSE_DELAY_MS);
    } catch (e) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail || e?.message || 'unknown error';
      debug.error('[CellValidationStrip] submit failed', status, detail, e);
      setPending((s) => ({
        ...s,
        status: 'error',
        errorMessage: `HTTP ${status || '?'}: ${
          typeof detail === 'string' ? detail : JSON.stringify(detail)
        }`,
      }));
    }
  };

  const isSubmitting = pending?.status === 'submitting';
  const noneStyle = { color: '#98a2b3' };

  return (
    <>
      <div className="tetv-strip" title={disabledReason || undefined}>
        <button
          type="button"
          className={`tetv-strip-btn tetv-strip-pos ${greyPositive ? 'tetv-strip-active' : ''}`}
          onClick={() => openConfirm('positive')}
          disabled={noSource}
          title={disabledReason || 'positive (topic present)'}
          aria-label="positive (topic present)"
        >
          <FontAwesomeIcon icon={faCheckCircle} />
        </button>
        <button
          type="button"
          className={`tetv-strip-btn tetv-strip-neg ${greyNegative ? 'tetv-strip-active' : ''}`}
          onClick={() => openConfirm('negative')}
          disabled={noSource}
          title={disabledReason || 'negative (topic not present)'}
          aria-label="negative (topic not present)"
        >
          <FontAwesomeIcon icon={faTimesCircle} />
        </button>
      </div>

      <Modal
        show={!!pending}
        onHide={isSubmitting ? undefined : closeConfirm}
        centered
        backdrop={isSubmitting ? 'static' : true}
        size="lg"
      >
        <Modal.Header closeButton={!isSubmitting}>
          <Modal.Title>Topic validation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pending &&
            (pending.status === 'editing' || pending.status === 'submitting') && (
              <>
                <p style={{ marginBottom: 12 }}>
                  This will create a new <strong>validation TET tag</strong>{' '}
                  attributed to{' '}
                  <strong>{userEmail || uid || '(unknown user)'}</strong>.
                </p>

                <Form.Group className="mb-3">
                  <Form.Label>Species (optional)</Form.Label>
                  <SpeciesPicker
                    id="tetv-strip-species"
                    value={pending.species?.curie || null}
                    valueName={pending.species?.name || ''}
                    disabled={isSubmitting}
                    onChange={(next) =>
                      setPending((s) => ({ ...s, species: next }))
                    }
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Note (optional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Optional note for this validation…"
                    value={pending.note}
                    onChange={(e) =>
                      setPending((s) => ({ ...s, note: e.target.value }))
                    }
                    disabled={isSubmitting}
                  />
                </Form.Group>

                <div className="tetv-curation-toggle mb-3">
                  <Form.Check
                    type="checkbox"
                    id="tetv-include-curation"
                    label="Also update the curation status for this topic on this reference"
                    checked={pending.includeCuration}
                    onChange={(e) =>
                      setPending((s) => ({
                        ...s,
                        includeCuration: e.target.checked,
                      }))
                    }
                    disabled={isSubmitting}
                  />
                </div>

                {pending.includeCuration && (
                  <div className="tetv-curation-section mb-3">
                    <Form.Group className="mb-2">
                      <Form.Label>Curation status</Form.Label>
                      <Form.Control
                        as="select"
                        value={pending.curStatus}
                        onChange={(e) =>
                          setPending((s) => ({
                            ...s,
                            curStatus: e.target.value,
                          }))
                        }
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
                        value={pending.curTag}
                        onChange={(e) =>
                          setPending((s) => ({
                            ...s,
                            curTag: e.target.value,
                          }))
                        }
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
                        placeholder="Optional free-text note for the curation status…"
                        value={pending.curNote}
                        onChange={(e) =>
                          setPending((s) => ({
                            ...s,
                            curNote: e.target.value,
                          }))
                        }
                        disabled={isSubmitting}
                      />
                    </Form.Group>
                  </div>
                )}

                <div className="tetv-validation-fields">
                  <div className="tetv-validation-fields-title">
                    New tag fields
                  </div>
                  <dl className="tetv-validation-fields-list">
                    <dt>Reference</dt>
                    <dd><code>{referenceCurie}</code></dd>

                    <dt>Topic</dt>
                    <dd>
                      {topicName || topicCurie}{' '}
                      <small style={{ color: '#667085' }}>
                        ({topicCurie})
                      </small>
                    </dd>

                    <dt>Negated</dt>
                    <dd>
                      {pending.kind === 'negative'
                        ? 'true (topic not present)'
                        : 'false (topic present)'}
                    </dd>

                    <dt>Source</dt>
                    <dd>
                      professional biocurator (
                      {accessLevelMod || 'your MOD'} via abc_literature_system
                      {topicEntitySourceId
                        ? `, source id #${topicEntitySourceId}`
                        : ''}
                      )
                    </dd>

                    <dt>Data novelty</dt>
                    <dd>
                      <code>ATP:0000335</code> (unspecified)
                    </dd>

                    <dt>Entity / entity type</dt>
                    <dd style={noneStyle}>none (topic-level tag)</dd>

                    <dt>Species</dt>
                    <dd
                      style={pending.species ? undefined : noneStyle}
                    >
                      {pending.species
                        ? `${pending.species.name} (${pending.species.curie})`
                        : 'none'}
                    </dd>

                    <dt>Confidence score / level</dt>
                    <dd style={noneStyle}>none</dd>

                    <dt>Created by</dt>
                    <dd>{userEmail || uid || '(unknown)'}</dd>

                    <dt>Note</dt>
                    <dd
                      style={
                        pending.note?.trim() ? undefined : noneStyle
                      }
                    >
                      {pending.note?.trim() || '(empty)'}
                    </dd>

                    {pending.includeCuration && (
                      <>
                        <dt>Curation status</dt>
                        <dd
                          style={
                            pending.curStatus ? undefined : noneStyle
                          }
                        >
                          {pending.curStatus || 'none'}
                        </dd>

                        <dt>Curation tag</dt>
                        <dd
                          style={pending.curTag ? undefined : noneStyle}
                        >
                          {pending.curTag || 'none'}
                        </dd>

                        <dt>Curation note</dt>
                        <dd
                          style={
                            pending.curNote.trim() ? undefined : noneStyle
                          }
                        >
                          {pending.curNote.trim() || '(empty)'}
                        </dd>
                      </>
                    )}
                  </dl>
                </div>

                {isSubmitting && (
                  <p style={{ marginTop: 12, color: '#555' }}>
                    <Spinner animation="border" size="sm" /> Submitting…
                  </p>
                )}
              </>
            )}
          {pending?.status === 'success' && (
            <p
              style={{
                color: '#1e7d3a',
                textAlign: 'center',
                margin: 0,
                fontWeight: 600,
              }}
            >
              <FontAwesomeIcon icon={faCheckCircle} /> Tag created successfully
            </p>
          )}
          {pending?.status === 'error' && (
            <>
              <p style={{ color: '#b03a2e' }}>
                Could not create the validation tag.
              </p>
              <pre
                style={{
                  background: '#fdecea',
                  border: '1px solid #f5b7b1',
                  padding: 8,
                  borderRadius: 4,
                  fontSize: 12,
                  whiteSpace: 'pre-wrap',
                  marginBottom: 0,
                }}
              >
                {pending.errorMessage}
              </pre>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          {pending?.status === 'editing' && (
            <>
              <Button variant="secondary" onClick={closeConfirm}>
                Cancel
              </Button>
              <Button
                variant={pending.kind === 'negative' ? 'danger' : 'success'}
                onClick={handleConfirm}
              >
                Confirm {pending.kind === 'negative' ? 'negative' : 'positive'}
              </Button>
            </>
          )}
          {pending?.status === 'submitting' && (
            <Button variant="secondary" disabled>
              Submitting…
            </Button>
          )}
          {pending?.status === 'success' && (
            <Button variant="success" onClick={closeConfirm}>
              Close
            </Button>
          )}
          {pending?.status === 'error' && (
            <>
              <Button variant="secondary" onClick={closeConfirm}>
                Close
              </Button>
              <Button
                variant={pending.kind === 'negative' ? 'danger' : 'success'}
                onClick={handleConfirm}
              >
                Retry
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
}
