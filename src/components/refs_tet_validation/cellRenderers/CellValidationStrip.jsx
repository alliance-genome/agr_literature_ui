import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import { api } from '../../../api';

export default function CellValidationStrip({
  referenceCurie,
  topicCurie,
  topicName,
  cellTets,
  onValidated,
}) {
  const uid = useSelector((s) => s.isLogged.uid);
  const topicEntitySourceId = useSelector((s) => s.biblio.topicEntitySourceId);
  // pending = null | { kind, note, status: 'editing'|'submitting'|'success'|'error', errorMessage? }
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
    setPending({ kind, note: '', status: 'editing' });
  };
  const closeConfirm = () => setPending(null);

  const handleConfirm = async () => {
    if (!pending) return;
    setPending((s) => ({ ...s, status: 'submitting' }));
    const negated = pending.kind === 'negative';
    const note = pending.note?.trim() || null;
    const payload = {
      reference_curie: referenceCurie,
      topic: topicCurie,
      negated,
      topic_entity_tag_source_id: topicEntitySourceId,
      force_insertion: true,
      entity: null,
      entity_type: null,
      species: null,
      // Generic "unspecified" data-novelty parent term in the ATP ontology.
      // The existing TopicEntityCreate form uses the same default when no
      // specific novelty is selected (TopicEntityCreate.js:553).
      data_novelty: 'ATP:0000335',
      confidence_score: null,
      confidence_level: null,
      note,
    };
    try {
      // eslint-disable-next-line no-console
      console.debug('[CellValidationStrip] submit', payload);
      const res = await api.post('/topic_entity_tag/', payload);
      // eslint-disable-next-line no-console
      console.debug('[CellValidationStrip] submit OK', res?.status, res?.data);
      if (onValidated) await onValidated(referenceCurie);
      setPending((s) => ({ ...s, status: 'success' }));
      // Auto-close success state after a short pause so curators can move on.
      setTimeout(closeConfirm, 1500);
    } catch (e) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail || e?.message || 'unknown error';
      // eslint-disable-next-line no-console
      console.error('[CellValidationStrip] submit failed', status, detail, e);
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
      >
        <Modal.Header closeButton={!isSubmitting}>
          <Modal.Title>
            {pending?.kind === 'negative'
              ? 'Mark topic as not present'
              : 'Mark topic as present'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pending &&
            (pending.status === 'editing' || pending.status === 'submitting') && (
              <>
                <p style={{ marginBottom: 8 }}>
                  <strong>Topic:</strong> {topicName || topicCurie}
                  <br />
                  <strong>Reference:</strong> <code>{referenceCurie}</code>
                </p>
                <Form.Group>
                  <Form.Label>Optional note</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Optional context for this validation…"
                    value={pending.note}
                    onChange={(e) =>
                      setPending((s) => ({ ...s, note: e.target.value }))
                    }
                    disabled={isSubmitting}
                  />
                </Form.Group>
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
                Confirm {pending.kind === 'negative' ? 'not present' : 'present'}
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
