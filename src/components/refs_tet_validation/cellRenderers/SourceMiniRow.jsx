import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStickyNote } from '@fortawesome/free-solid-svg-icons';

const truncate = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s);

export default function SourceMiniRow({ tet, sourceLabel, displayOptions, onShowNote }) {
  const negated = tet.negated === true;
  const hasNote = tet.note != null && tet.note !== '';
  const inlineNoteOn = displayOptions?.inlineNote && hasNote;

  const pillClass = negated ? 'tetv-pill tetv-pill-n' : 'tetv-pill tetv-pill-y';
  const dotClass = negated ? 'tetv-dot-n' : 'tetv-dot-y';

  return (
    <div className="tetv-mini-row">
      <span className="tetv-source-label" title={sourceLabel}>
        {sourceLabel}
      </span>
      {inlineNoteOn ? (
        <>
          <span className="tetv-inline-note" title={tet.note}>
            {truncate(tet.note, 60)}
          </span>
          <span className={dotClass} aria-label={negated ? 'N' : 'Y'} />
        </>
      ) : (
        <span className={pillClass}>{negated ? 'N' : 'Y'}</span>
      )}
      {hasNote && (
        <button
          type="button"
          className="tetv-note-btn"
          onClick={() => onShowNote(tet)}
          title="View full note"
        >
          <FontAwesomeIcon icon={faStickyNote} />
        </button>
      )}
      {displayOptions?.showLevel && tet.confidence_level && (
        <span className="tetv-badge tetv-badge-level">
          {tet.confidence_level}
        </span>
      )}
      {displayOptions?.showScore && tet.confidence_score != null && (
        <span className="tetv-badge tetv-badge-score">
          {Number(tet.confidence_score).toFixed(2)}
        </span>
      )}
    </div>
  );
}
