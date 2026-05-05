import React from 'react';
import { Link } from 'react-router-dom';

export default function TitleCell(params) {
  const r = params.data?.biblio || {};
  const curie = params.data?.curie;
  const authorList = r.authors || [];
  const authors =
    authorList
      .slice(0, 3)
      .map((a) => a.name)
      .join(', ') + (authorList.length > 3 ? ', et al.' : '');
  return (
    <div className="tetv-title-cell">
      <div className="tetv-ref-title">
        <Link
          to={`/Biblio?action=display&referenceCurie=${encodeURIComponent(curie)}`}
          dangerouslySetInnerHTML={{ __html: r.title || curie }}
        />
      </div>
      {r.journal && <div className="tetv-ref-journal">{r.journal}</div>}
      {authors && <div className="tetv-ref-authors">{authors}</div>}
    </div>
  );
}
