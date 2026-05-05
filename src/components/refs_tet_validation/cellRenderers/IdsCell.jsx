import React from 'react';

export default function IdsCell(params) {
  const r = params.data?.biblio || {};
  const curie = params.data?.curie;
  const pmid = (r.cross_references || []).find((x) =>
    x.curie?.startsWith('PMID:')
  )?.curie;
  const year = r.date_published
    ? String(r.date_published).slice(0, 4)
    : '';
  const otherXrefs = (r.cross_references || [])
    .map((x) => x.curie)
    .filter((c) => c && !c.startsWith('PMID:'));
  return (
    <div className="tetv-ids-cell">
      <div className="tetv-ref-curie">{curie}</div>
      {pmid && <div className="tetv-ref-pmid">{pmid}</div>}
      {otherXrefs.map((c) => (
        <div key={c} className="tetv-ref-xref">{c}</div>
      ))}
      {year && <div className="tetv-ref-year">{year}</div>}
    </div>
  );
}
