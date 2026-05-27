import React from 'react';

export default function TitleCell(params) {
  const r = params.data?.biblio || {};
  const curie = params.data?.curie;
  const showAuthors =
    params.colDef?.cellRendererParams?.showAuthors === true;
  const authorList = r.authors || [];
  const authors =
    authorList
      .slice(0, 3)
      .map((a) => a.name)
      .join(', ') + (authorList.length > 3 ? ', et al.' : '');
  return (
    <div className="tetv-title-cell">
      <div className="tetv-ref-title">
        <a
          href={`/Biblio?action=display&referenceCurie=${encodeURIComponent(curie)}`}
          target="_blank"
          rel="noreferrer noopener"
          dangerouslySetInnerHTML={{ __html: r.title || curie }}
        />
      </div>
      {showAuthors && r.journal && (
        <div className="tetv-ref-journal">{r.journal}</div>
      )}
      {showAuthors && authors && (
        <div className="tetv-ref-authors">{authors}</div>
      )}
    </div>
  );
}
