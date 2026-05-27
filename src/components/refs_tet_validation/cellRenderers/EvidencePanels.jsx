import React, { useMemo } from 'react';
import {
  evidenceAssertionName,
  groupEntriesByEvidence,
} from '../helpers/buildEntries';

/**
 * Group a per-(ref, topic) cell's entries by source_evidence_assertion and
 * render one panel per group. `renderEntry` is called once per entry.
 *
 * When `showTitles` is true the evidence assertion name is shown as a panel
 * title (used by SourcesCell). For all other per-source cells (Tag, conf sc,
 * conf lvl, note) it must be `false` — they instead render an invisible
 * spacer of the same height so mini-rows still line up across columns inside
 * the same AgGrid row.
 */
export default function EvidencePanels({
  entries,
  renderEntry,
  showTitles = false,
  emptyText = null,
}) {
  const groups = useMemo(
    () => groupEntriesByEvidence(entries),
    [entries]
  );

  if (groups.size === 0) {
    return emptyText !== null ? (
      <div className="tetv-evidence-empty">{emptyText}</div>
    ) : null;
  }

  return (
    <>
      {[...groups.entries()].map(([evidence, panelEntries], idx) => (
        <div
          className={`tetv-evidence-panel${idx > 0 ? ' tetv-evidence-panel-sep' : ''}`}
          key={evidence || `_${idx}`}
        >
          {showTitles ? (
            <div
              className="tetv-evidence-title"
              title={evidence ? `evidence: ${evidence}` : 'no evidence assertion'}
            >
              {evidenceAssertionName(evidence)}
            </div>
          ) : (
            <div className="tetv-evidence-title-spacer" aria-hidden="true">
              &nbsp;
            </div>
          )}
          {panelEntries.map((e) => renderEntry(e))}
        </div>
      ))}
    </>
  );
}
