import React, { useMemo } from 'react';
import { cellEntries } from '../helpers/buildEntries';
import EvidencePanels from './EvidencePanels';

function PillTopic({ tet }) {
  const negated = tet.negated === true;
  return (
    <span
      className={`tetv-pill ${negated ? 'tetv-pill-n' : 'tetv-pill-y'}`}
      aria-label={negated ? 'Negative topic tag' : 'Positive topic tag'}
    >
      {negated ? 'N' : 'Y'}
    </span>
  );
}

function PillEntityCount({ count, negated, entitiesText }) {
  const polarity = negated ? 'negative' : 'positive';
  return (
    <span
      className={`tetv-pill tetv-pill-entity${negated ? ' tetv-pill-entity-neg' : ''}`}
      title={`${count} ${polarity} entity tag${count === 1 ? '' : 's'}${entitiesText ? `: ${entitiesText}` : ''}`}
      aria-label={`${count} ${polarity} entity tag${count === 1 ? '' : 's'}`}
    >
      {count}E
    </span>
  );
}

function entityLabel(t) {
  return t.entity_name || t.entity || '';
}

export default function TagsCell(params) {
  const { sourceFilterModel } = params.colDef.cellRendererParams || {};
  const entries = useMemo(
    () => cellEntries(params.value, sourceFilterModel),
    [params.value, sourceFilterModel]
  );

  return (
    <div className="tetv-tag-cell">
      <EvidencePanels
        entries={entries}
        renderEntry={(e) => (
          <div className="tetv-mini-row tetv-tag-row" key={e.key}>
            {e.kind === 'topic' ? (
              <PillTopic tet={e.tets?.[0] || e} />
            ) : (
              <PillEntityCount
                count={e.count || (e.tets || []).length}
                negated={e.kind === 'entity-neg'}
                entitiesText={
                  e.entities_text ||
                  ((e.tets || [])
                    .slice(0, 20)
                    .map(entityLabel)
                    .filter(Boolean)
                    .join(', ') +
                    ((e.tets || []).length > 20
                      ? `, ... (+${(e.tets || []).length - 20} more)`
                      : ''))
                }
              />
            )}
          </div>
        )}
      />
    </div>
  );
}
