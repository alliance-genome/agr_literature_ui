import React, { useMemo } from 'react';
import { buildEntries } from '../helpers/buildEntries';
import EvidencePanels from './EvidencePanels';

function fmt(v) {
  if (v === null || v === undefined) return '–';
  return Number(v).toFixed(2);
}

function renderConfScoreEntry(e) {
  if (e.kind === 'topic') {
    return (
      <div className="tetv-mini-row" key={e.key}>
        <span className="tetv-attr-value">
          {fmt(e.tets[0].confidence_score)}
        </span>
      </div>
    );
  }
  // entity-collapsed: show range or single value across the bucket
  const vals = e.tets
    .map((t) => t.confidence_score)
    .filter((v) => v !== null && v !== undefined)
    .map(Number);
  if (vals.length === 0) {
    return (
      <div className="tetv-mini-row" key={e.key}>
        <span className="tetv-attr-value">–</span>
      </div>
    );
  }
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  return (
    <div className="tetv-mini-row" key={e.key}>
      <span
        className="tetv-attr-value"
        title={`${vals.length} values, min ${fmt(min)} / max ${fmt(max)}`}
      >
        {min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`}
      </span>
    </div>
  );
}

export default function ConfScoreCell(params) {
  const tets = params.value || [];
  const { sourceFilterModel } = params.colDef.cellRendererParams || {};
  const entries = useMemo(
    () => buildEntries(tets, sourceFilterModel),
    [tets, sourceFilterModel]
  );
  return (
    <div className="tetv-attr-cell">
      <EvidencePanels entries={entries} renderEntry={renderConfScoreEntry} />
    </div>
  );
}
