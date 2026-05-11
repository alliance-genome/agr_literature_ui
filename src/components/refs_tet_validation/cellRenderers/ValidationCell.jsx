import React from 'react';
import CellValidationStrip from './CellValidationStrip';
import { isCuratorValidationTet } from '../helpers/groupTets';

/** TETs from this cell that are *topic-level* and authored by a professional
 *  biocurator (i.e. count as a curator validation). */
function professionalBiocuratorTopicTets(tets) {
  return (tets || []).filter(isCuratorValidationTet);
}

export default function ValidationCell(params) {
  const tets = params.value || [];
  const {
    topicCurie,
    topicName,
    refetchRow,
    curationStatusOptions,
    curationTagOptions,
  } = params.colDef.cellRendererParams || {};
  const referenceCurie = params.data?.curie;

  const validations = professionalBiocuratorTopicTets(tets);
  if (validations.length > 0) {
    const positives = validations.filter((t) => !t.negated).length;
    const negatives = validations.filter((t) => t.negated).length;

    // Group validations by (curator, polarity) and collect the source methods
    // each (curator, polarity) combination used. If Curator A submitted both
    // a positive and a negative tag they appear on both rows; multiple
    // positives from the same curator collapse into one row but the source
    // icons accumulate. We never drop a name even if created_by is missing —
    // render as "(unknown curator)" instead, so every validation TET is
    // accounted for.
    const uniquePairs = (() => {
      const groups = new Map();
      for (const t of validations) {
        const name = t.created_by || '(unknown curator)';
        const negated = !!t.negated;
        const key = `${name}|${negated ? 'N' : 'Y'}`;
        if (!groups.has(key)) {
          groups.set(key, { name, negated, sources: new Map() });
        }
        const src = t.topic_entity_tag_source?.source_method;
        if (src) {
          // Keep a Map source_method → label so the tooltip shows the full
          // source label (method / data-provider) while the icon shows just
          // the first letter.
          const lab = `${src}${
            t.topic_entity_tag_source?.secondary_data_provider_abbreviation
              ? ` / ${t.topic_entity_tag_source.secondary_data_provider_abbreviation}`
              : ''
          }`;
          groups.get(key).sources.set(src, lab);
        }
      }
      return [...groups.values()].map((g) => ({
        ...g,
        sources: [...g.sources.entries()].map(([method, label]) => ({
          method,
          label,
        })),
      }));
    })();
    const uniqueNames = (() => {
      const seen = new Set();
      const out = [];
      for (const p of uniquePairs) {
        if (!seen.has(p.name)) {
          seen.add(p.name);
          out.push(p.name);
        }
      }
      return out;
    })();

    const firstWord = (s) => String(s || '').split(/[_\s/]/)[0];
    const SourceIcons = ({ sources }) => (
      <>
        {sources.map((s) => (
          <span
            className="tetv-source-icon"
            key={s.method}
            title={`source: ${s.label}`}
            aria-label={`source: ${s.label}`}
          >
            {firstWord(s.method) || '?'}
          </span>
        ))}
      </>
    );

    let label, cls, tooltip, attribution;
    if (positives > 0 && negatives > 0) {
      label = 'validation conflict';
      cls = 'tetv-validation-status tetv-validated-conflict';
      tooltip =
        `${positives} positive + ${negatives} negative professional ` +
        `biocurator topic tag(s) on this cell`;
      attribution = (
        <div className="tetv-validation-by-list">
          {uniquePairs.map((p) => (
            <div className="tetv-validation-by" key={`${p.name}|${p.negated}`}>
              <span
                className={`tetv-validation-by-mark ${
                  p.negated
                    ? 'tetv-validation-by-neg'
                    : 'tetv-validation-by-pos'
                }`}
                title={p.negated ? 'voted negative' : 'voted positive'}
              >
                {p.negated ? 'N' : 'Y'}
              </span>{' '}
              {p.name}
              {p.sources.length > 0 && (
                <>{' '}<SourceIcons sources={p.sources} /></>
              )}
            </div>
          ))}
        </div>
      );
    } else if (positives > 0 || negatives > 0) {
      const isPositive = positives > 0;
      label = isPositive ? 'validated positive' : 'validated negative';
      cls = isPositive
        ? 'tetv-validation-status tetv-validated-pos'
        : 'tetv-validation-status tetv-validated-neg';
      tooltip = isPositive
        ? `${positives} positive professional biocurator topic tag(s)`
        : `${negatives} negative professional biocurator topic tag(s)`;
      attribution =
        uniquePairs.length > 0 ? (
          <div className="tetv-validation-by-list">
            {uniquePairs.map((p) => (
              <div
                className="tetv-validation-by"
                key={`${p.name}|${p.negated}`}
              >
                {p.name}
                {p.sources.length > 0 && (
                  <>{' '}<SourceIcons sources={p.sources} /></>
                )}
              </div>
            ))}
          </div>
        ) : null;
    }
    return (
      <div className="tetv-validation-cell">
        <span className={cls} title={tooltip}>{label}</span>
        {attribution}
      </div>
    );
  }

  return (
    <div className="tetv-validation-cell">
      <CellValidationStrip
        referenceCurie={referenceCurie}
        topicCurie={topicCurie}
        topicName={topicName}
        cellTets={tets}
        onValidated={refetchRow}
        curationStatusOptions={curationStatusOptions}
        curationTagOptions={curationTagOptions}
      />
    </div>
  );
}

export { professionalBiocuratorTopicTets };
