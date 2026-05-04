import React from 'react';
import { Link } from 'react-router-dom';

export default function ReferenceCell(params) {
  const r = params.data?.biblio || {};
  const curie = params.data?.curie;
  const pmid = (r.cross_references || []).find((x) =>
    x.curie?.startsWith('PMID:')
  )?.curie;
  const year = r.date_published ? String(r.date_published).slice(0, 4) : '';
  const authorList = r.authors || [];
  const authors =
    authorList
      .slice(0, 3)
      .map((a) => a.name)
      .join(', ') + (authorList.length > 3 ? ', et al.' : '');
  return (
    <div className="tetv-ref-cell">
      <div className="tetv-ref-title">
        <Link
          to={`/Biblio?action=display&referenceCurie=${encodeURIComponent(curie)}`}
          dangerouslySetInnerHTML={{ __html: r.title || curie }}
        />
      </div>
      <div className="tetv-ref-meta">
        <span className="tetv-ref-curie">{curie}</span>
        {pmid && <span className="tetv-ref-pmid"> · {pmid}</span>}
        {year && <span className="tetv-ref-year"> · {year}</span>}
        {r.journal && <span className="tetv-ref-journal"> · {r.journal}</span>}
      </div>
      <div className="tetv-ref-authors">{authors}</div>
    </div>
  );
}
