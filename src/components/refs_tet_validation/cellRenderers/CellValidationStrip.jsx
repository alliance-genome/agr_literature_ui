import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { api } from '../../../api';

export default function CellValidationStrip({
  referenceCurie,
  topicCurie,
  cellTets,
  onValidated,
}) {
  const uid = useSelector((s) => s.isLogged.uid);
  const topicEntitySourceId = useSelector((s) => s.biblio.topicEntitySourceId);
  const [busy, setBusy] = useState(false);

  const myExisting = (cellTets || []).find((t) => t.created_by === uid);
  const greyPositive = myExisting && myExisting.negated === false;
  const greyNegative = myExisting && myExisting.negated === true;

  async function submit(kind) {
    if (busy || !topicEntitySourceId) return;
    setBusy(true);
    const negated = kind === 'negative';
    const payload = {
      reference_curie: referenceCurie,
      topic: topicCurie,
      negated,
      topic_entity_tag_source_id: topicEntitySourceId,
      force_insertion: true,
      entity: null,
      entity_type: null,
      species: null,
      data_novelty: null,
      confidence_score: null,
      confidence_level: null,
      note: null,
    };
    try {
      await api.post('/topic_entity_tag/', payload);
      if (onValidated) await onValidated(referenceCurie);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('TET validation submit failed', e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tetv-strip">
      <button
        type="button"
        className={`tetv-strip-btn tetv-strip-pos ${greyPositive ? 'tetv-strip-active' : ''}`}
        onClick={() => submit('positive')}
        disabled={busy || !topicEntitySourceId}
        title="positive (topic present)"
        aria-label="positive (topic present)"
      >
        <FontAwesomeIcon icon={faCheckCircle} />
      </button>
      <button
        type="button"
        className={`tetv-strip-btn tetv-strip-neg ${greyNegative ? 'tetv-strip-active' : ''}`}
        onClick={() => submit('negative')}
        disabled={busy || !topicEntitySourceId}
        title="negative (topic not present)"
        aria-label="negative (topic not present)"
      >
        <FontAwesomeIcon icon={faTimesCircle} />
      </button>
    </div>
  );
}
