import React, { useEffect } from 'react';
import { Form, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

/**
 * Sticky action bar shown above the grid whenever the curator has at least
 * one row checkbox-selected. Lets them pick a target topic (auto-selected
 * when only one is visible) and fire a bulk positive / negative validation.
 */
export default function BulkActionBar({
  selectedCount,
  visibleTopics,
  bulkTopicCurie,
  setBulkTopicCurie,
  onValidate,
  onClearSelection,
}) {
  const onlyOneTopic = visibleTopics.length === 1;
  const effectiveTopicCurie = onlyOneTopic
    ? visibleTopics[0].curie
    : bulkTopicCurie;

  // Auto-pick the topic when there's only one visible; clear the choice if
  // the previously selected topic is no longer visible (e.g. curator
  // toggled it off in the Topics select).
  useEffect(() => {
    if (onlyOneTopic) {
      if (bulkTopicCurie !== visibleTopics[0].curie) {
        setBulkTopicCurie(visibleTopics[0].curie);
      }
      return;
    }
    if (
      bulkTopicCurie &&
      !visibleTopics.some((t) => t.curie === bulkTopicCurie)
    ) {
      setBulkTopicCurie(null);
    }
  }, [onlyOneTopic, visibleTopics, bulkTopicCurie, setBulkTopicCurie]);

  if (selectedCount === 0) return null;

  const noTopics = visibleTopics.length === 0;
  const needsTopicPick = !onlyOneTopic && !effectiveTopicCurie;
  const disabled = noTopics || needsTopicPick;

  return (
    <div className="tetv-bulk-bar" role="region" aria-label="Bulk validation">
      <span className="tetv-bulk-count">
        <strong>{selectedCount}</strong> reference
        {selectedCount === 1 ? '' : 's'} selected
      </span>

      {noTopics ? (
        <span className="tetv-bulk-msg">
          Enable at least one topic column to validate.
        </span>
      ) : onlyOneTopic ? (
        <span className="tetv-bulk-msg">
          Topic:{' '}
          <strong>
            {visibleTopics[0].name || visibleTopics[0].curie}
          </strong>
        </span>
      ) : (
        <span className="tetv-bulk-topic">
          <Form.Label
            htmlFor="tetv-bulk-topic-select"
            className="tetv-bulk-label mb-0 me-2"
          >
            Topic:
          </Form.Label>
          <Form.Control
            id="tetv-bulk-topic-select"
            as="select"
            size="sm"
            value={bulkTopicCurie || ''}
            onChange={(e) => setBulkTopicCurie(e.target.value || null)}
            style={{ width: 'auto', display: 'inline-block' }}
          >
            <option value="">— pick a topic —</option>
            {visibleTopics.map((t) => (
              <option key={t.curie} value={t.curie}>
                {t.name || t.curie}
              </option>
            ))}
          </Form.Control>
        </span>
      )}

      <span className="tetv-bulk-actions">
        <Button
          size="sm"
          variant="success"
          onClick={() => onValidate('positive', effectiveTopicCurie)}
          disabled={disabled}
          title={
            disabled
              ? 'Pick a topic to validate first'
              : `Validate ${selectedCount} reference(s) positive`
          }
        >
          <FontAwesomeIcon icon={faCheckCircle} /> Validate positive
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => onValidate('negative', effectiveTopicCurie)}
          disabled={disabled}
          title={
            disabled
              ? 'Pick a topic to validate first'
              : `Validate ${selectedCount} reference(s) negative`
          }
        >
          <FontAwesomeIcon icon={faTimesCircle} /> Validate negative
        </Button>
        <Button
          size="sm"
          variant="link"
          onClick={onClearSelection}
          className="tetv-bulk-clear"
        >
          Clear selection
        </Button>
      </span>
    </div>
  );
}
