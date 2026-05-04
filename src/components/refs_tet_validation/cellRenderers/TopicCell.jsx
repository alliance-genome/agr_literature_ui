import React, { useMemo, useState } from 'react';
import SourceMiniRow from './SourceMiniRow';
import CellValidationStrip from './CellValidationStrip';
import NoteModal from './NoteModal';
import { sourceLabel } from '../helpers/groupTets';

export default function TopicCell(params) {
  const tets = params.value || [];
  const { topicCurie, displayOptions, refetchRow, sourceFilterModel } =
    params.colDef.cellRendererParams || {};
  const referenceCurie = params.data?.curie;

  const [noteOpen, setNoteOpen] = useState(null); // { tet, label } | null

  const grouped = useMemo(() => {
    const m = new Map();
    for (const t of tets) {
      const lab = sourceLabel(t.topic_entity_tag_source);
      if (
        sourceFilterModel &&
        Array.isArray(sourceFilterModel) &&
        !sourceFilterModel.includes(lab)
      ) {
        continue;
      }
      if (!m.has(lab)) m.set(lab, []);
      m.get(lab).push(t);
    }
    return m;
  }, [tets, sourceFilterModel]);

  return (
    <div className="tetv-cell">
      {[...grouped.entries()].map(([label, items], idx) => (
        <div
          key={label}
          className={`tetv-source-group ${idx > 0 ? 'tetv-source-group-sep' : ''}`}
        >
          {items.map((t) => (
            <SourceMiniRow
              key={t.topic_entity_tag_id}
              tet={t}
              sourceLabel={label}
              displayOptions={displayOptions}
              onShowNote={(tet) => setNoteOpen({ tet, label })}
            />
          ))}
        </div>
      ))}
      <CellValidationStrip
        referenceCurie={referenceCurie}
        topicCurie={topicCurie}
        cellTets={tets}
        onValidated={refetchRow}
      />
      <NoteModal
        show={!!noteOpen}
        onHide={() => setNoteOpen(null)}
        sourceLabel={noteOpen?.label}
        note={noteOpen?.tet?.note}
      />
    </div>
  );
}
