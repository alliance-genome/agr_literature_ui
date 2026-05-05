import React, { useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStickyNote } from '@fortawesome/free-solid-svg-icons';
import NoteModal from './NoteModal';
import { buildEntries } from '../helpers/buildEntries';

const truncate = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s);

export default function NoteCell(params) {
  const tets = params.value || [];
  const { displayOptions, sourceFilterModel } =
    params.colDef.cellRendererParams || {};
  const expand = !!displayOptions?.inlineNote;

  const entries = useMemo(
    () => buildEntries(tets, sourceFilterModel),
    [tets, sourceFilterModel]
  );

  const [modal, setModal] = useState(null); // { title, body } | null

  return (
    <div className="tetv-attr-cell">
      {entries.map((e) => {
        if (e.kind === 'topic') {
          const t = e.tets[0];
          const note = t.note;
          if (!note) {
            return (
              <div className="tetv-mini-row" key={e.key}>
                <span className="tetv-attr-value">–</span>
              </div>
            );
          }
          return (
            <div className="tetv-mini-row" key={e.key}>
              {expand && (
                <span className="tetv-inline-note" title={note}>
                  {truncate(note, 80)}
                </span>
              )}
              <button
                type="button"
                className="tetv-note-btn"
                onClick={() => setModal({ title: e.sourceLabel, body: note })}
                title="View full note"
              >
                <FontAwesomeIcon icon={faStickyNote} />
              </button>
            </div>
          );
        }
        // entity-collapsed: list notes (one per entity that has one)
        const noted = e.tets
          .map((t) => ({
            entity: t.entity_published_as || t.entity_name || t.entity,
            note: t.note,
          }))
          .filter((x) => x.note);
        if (noted.length === 0) {
          return (
            <div className="tetv-mini-row" key={e.key}>
              <span className="tetv-attr-value">–</span>
            </div>
          );
        }
        const body = noted
          .map((x) => `${x.entity || '(no entity)'}: ${x.note}`)
          .join('\n\n');
        return (
          <div className="tetv-mini-row" key={e.key}>
            {expand && (
              <span className="tetv-inline-note" title={body}>
                {truncate(noted[0].note, 60)}
              </span>
            )}
            <button
              type="button"
              className="tetv-note-btn"
              onClick={() =>
                setModal({
                  title: `${e.sourceLabel} — ${noted.length} note${noted.length === 1 ? '' : 's'}`,
                  body,
                })
              }
              title={`${noted.length} note${noted.length === 1 ? '' : 's'}`}
            >
              <FontAwesomeIcon icon={faStickyNote} />
              {noted.length > 1 && (
                <span className="tetv-note-count"> {noted.length}</span>
              )}
            </button>
          </div>
        );
      })}
      <NoteModal
        show={!!modal}
        onHide={() => setModal(null)}
        sourceLabel={modal?.title}
        note={modal?.body}
      />
    </div>
  );
}
