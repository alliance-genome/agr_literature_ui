import React, { useMemo } from 'react';
import { cellEntries } from '../helpers/buildEntries';
import EvidencePanels from './EvidencePanels';

export default function SourcesCell(params) {
  const { sourceFilterModel } = params.colDef.cellRendererParams || {};
  const entries = useMemo(
    () => cellEntries(params.value, sourceFilterModel),
    [params.value, sourceFilterModel]
  );

  return (
    <div className="tetv-sources-cell">
      <EvidencePanels
        entries={entries}
        showTitles
        renderEntry={(e) => {
          const description =
            e.source_description ||
            e.tets?.[0]?.topic_entity_tag_source?.description ||
            null;
          const label = e.sourceLabel || e.source_label;
          return (
            <div className="tetv-mini-row" key={e.key}>
              <span
                className="tetv-source-label"
                title={
                  description ||
                  `${label} — no description provided for this source`
                }
              >
                {label}
              </span>
            </div>
          );
        }}
      />
    </div>
  );
}
