import React, { useMemo } from 'react';
import { buildEntries } from '../helpers/buildEntries';

function PillTopic({ tet }) {
  const negated = tet.negated === true;
  return (
    <span className={`tetv-pill ${negated ? 'tetv-pill-n' : 'tetv-pill-y'}`}>
      {negated ? 'N' : 'Y'}
    </span>
  );
}

function PillEntityCount({ count, negated, entitiesText }) {
  return (
    <span
      className={`tetv-pill tetv-pill-entity${negated ? ' tetv-pill-entity-neg' : ''}`}
      title={entitiesText}
    >
      {count}E{negated ? ' (neg)' : ''}
    </span>
  );
}

function entityLabel(t) {
  return t.entity_published_as || t.entity_name || t.entity || '';
}

export default function SourcesCell(params) {
  const tets = params.value || [];
  const { sourceFilterModel } = params.colDef.cellRendererParams || {};
  const entries = useMemo(
    () => buildEntries(tets, sourceFilterModel),
    [tets, sourceFilterModel]
  );

  return (
    <div className="tetv-sources-cell">
      {entries.map((e) => (
        <div className="tetv-mini-row" key={e.key}>
          <span className="tetv-source-label" title={e.sourceLabel}>
            {e.sourceLabel}
          </span>
          {e.kind === 'topic' ? (
            <PillTopic tet={e.tets[0]} />
          ) : (
            <PillEntityCount
              count={e.tets.length}
              negated={e.kind === 'entity-neg'}
              entitiesText={
                e.tets
                  .slice(0, 20)
                  .map(entityLabel)
                  .filter(Boolean)
                  .join(', ') +
                (e.tets.length > 20 ? `, … (+${e.tets.length - 20} more)` : '')
              }
            />
          )}
        </div>
      ))}
    </div>
  );
}
