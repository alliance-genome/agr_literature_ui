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
  const { topicCurie, refetchRow } = params.colDef.cellRendererParams || {};
  const referenceCurie = params.data?.curie;

  const validations = professionalBiocuratorTopicTets(tets);
  if (validations.length > 0) {
    const positives = validations.filter((t) => !t.negated).length;
    const negatives = validations.filter((t) => t.negated).length;
    let label, cls, tooltip;
    if (positives > 0 && negatives > 0) {
      label = 'validation conflict';
      cls = 'tetv-validation-status tetv-validated-conflict';
      tooltip =
        `${positives} positive + ${negatives} negative professional ` +
        `biocurator topic tag(s) on this cell`;
    } else if (positives > 0) {
      label = 'validated positive';
      cls = 'tetv-validation-status tetv-validated-pos';
      tooltip = `${positives} positive professional biocurator topic tag(s)`;
    } else {
      label = 'validated negative';
      cls = 'tetv-validation-status tetv-validated-neg';
      tooltip = `${negatives} negative professional biocurator topic tag(s)`;
    }
    return (
      <div className="tetv-validation-cell">
        <span className={cls} title={tooltip}>{label}</span>
      </div>
    );
  }

  return (
    <div className="tetv-validation-cell">
      <CellValidationStrip
        referenceCurie={referenceCurie}
        topicCurie={topicCurie}
        cellTets={tets}
        onValidated={refetchRow}
      />
    </div>
  );
}

export { professionalBiocuratorTopicTets };
