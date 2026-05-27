import React, { useMemo } from 'react';
import { buildEntries } from '../helpers/buildEntries';
import EvidencePanels from './EvidencePanels';

export default function SourcesCell(params) {
  const tets = params.value;
  const { sourceFilterModel } = params.colDef.cellRendererParams || {};
  const entries = useMemo(
    () => buildEntries(tets || [], sourceFilterModel),
    [tets, sourceFilterModel]
  );

  return (
    <div className="tetv-sources-cell">
      <EvidencePanels
        entries={entries}
        showTitles
        renderEntry={(e) => {
          const description =
            e.tets?.[0]?.topic_entity_tag_source?.description || null;
          return (
            <div className="tetv-mini-row" key={e.key}>
              <span
                className="tetv-source-label"
                title={
                  description ||
                  `${e.sourceLabel} — no description provided for this source`
                }
              >
                {e.sourceLabel}
              </span>
            </div>
          );
        }}
      />
    </div>
  );
}
