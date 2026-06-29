import React, { useMemo } from 'react';
import { cellEntries } from '../helpers/buildEntries';
import EvidencePanels from './EvidencePanels';

function renderConfLevelEntry(e) {
  if (e.kind === 'topic') {
    return (
      <div className="tetv-mini-row" key={e.key}>
        <span className="tetv-attr-value">
          {e.tets?.[0]?.confidence_level || e.confidence_level || '–'}
        </span>
      </div>
    );
  }
  if (e.aggregated) {
    const levels = e.confidence_levels || [];
    if (levels.length === 0) {
      return (
        <div className="tetv-mini-row" key={e.key}>
          <span className="tetv-attr-value">–</span>
        </div>
      );
    }
    return (
      <div className="tetv-mini-row" key={e.key}>
        <span className="tetv-attr-value" title={levels.join(', ')}>
          {levels.length === 1 ? levels[0] : `(${levels.length} levels)`}
        </span>
      </div>
    );
  }
  // entity-collapsed: show distinct levels (or count of unique)
  const levels = Array.from(
    new Set(
      e.tets
        .map((t) => t.confidence_level)
        .filter((v) => v !== null && v !== undefined && v !== '')
    )
  );
  if (levels.length === 0) {
    return (
      <div className="tetv-mini-row" key={e.key}>
        <span className="tetv-attr-value">–</span>
      </div>
    );
  }
  return (
    <div className="tetv-mini-row" key={e.key}>
      <span className="tetv-attr-value" title={levels.join(', ')}>
        {levels.length === 1 ? levels[0] : `(${levels.length} levels)`}
      </span>
    </div>
  );
}

export default function ConfLevelCell(params) {
  const { sourceFilterModel } = params.colDef.cellRendererParams || {};
  const entries = useMemo(
    () => cellEntries(params.value, sourceFilterModel),
    [params.value, sourceFilterModel]
  );
  return (
    <div className="tetv-attr-cell">
      <EvidencePanels entries={entries} renderEntry={renderConfLevelEntry} />
    </div>
  );
}
