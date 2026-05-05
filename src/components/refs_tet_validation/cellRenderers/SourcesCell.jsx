import React, { useMemo } from 'react';
import { buildEntries } from '../helpers/buildEntries';

export default function SourcesCell(params) {
  const tets = params.value;
  const { sourceFilterModel } = params.colDef.cellRendererParams || {};
  const entries = useMemo(
    () => buildEntries(tets || [], sourceFilterModel),
    [tets, sourceFilterModel]
  );

  return (
    <div className="tetv-sources-cell">
      {entries.map((e) => (
        <div className="tetv-mini-row" key={e.key}>
          <span className="tetv-source-label" title={e.sourceLabel}>
            {e.sourceLabel}
          </span>
        </div>
      ))}
    </div>
  );
}
