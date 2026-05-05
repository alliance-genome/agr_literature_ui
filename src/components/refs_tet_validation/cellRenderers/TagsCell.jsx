import React, { useMemo } from 'react';
import { buildEntries } from '../helpers/buildEntries';

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
  return t.entity_published_as || t.entity_name || t.entity || '';
}

export default function TagsCell(params) {
  const tets = params.value;
  const { sourceFilterModel } = params.colDef.cellRendererParams || {};
  const entries = useMemo(
    () => buildEntries(tets || [], sourceFilterModel),
    [tets, sourceFilterModel]
  );

  return (
    <div className="tetv-tag-cell">
      {entries.map((e) => (
        <div className="tetv-mini-row tetv-tag-row" key={e.key}>
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
                (e.tets.length > 20 ? `, ... (+${e.tets.length - 20} more)` : '')
              }
            />
          )}
        </div>
      ))}
    </div>
  );
}
