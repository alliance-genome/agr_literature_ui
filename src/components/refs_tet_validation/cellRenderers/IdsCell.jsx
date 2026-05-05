import React from 'react';

const prefixOf = (curie) =>
  curie ? String(curie).split(':')[0].toUpperCase() : null;

export default function IdsCell(params) {
  const r = params.data?.biblio || {};
  const curie = params.data?.curie;
  const year = r.date_published
    ? String(r.date_published).slice(0, 4)
    : '';
  // selectedPrefixes: null = no filter (show everything),
  // [] = nothing selected, [subset] = only those prefixes are shown.
  const selected = params.colDef?.cellRendererParams?.selectedPrefixes;
  const allowed = (p) => {
    if (selected === null || selected === undefined) return true;
    if (!Array.isArray(selected)) return true;
    return selected.includes(p);
  };

  const showCurie = curie && allowed(prefixOf(curie));
  const xrefs = (r.cross_references || [])
    .map((x) => x.curie)
    .filter((c) => c && allowed(prefixOf(c)));
  // Stable display order: PMID first, then everything else in original order.
  const pmid = xrefs.find((c) => c.startsWith('PMID:'));
  const otherXrefs = xrefs.filter((c) => !c.startsWith('PMID:'));

  return (
    <div className="tetv-ids-cell">
      {showCurie && <div className="tetv-ref-curie">{curie}</div>}
      {pmid && <div className="tetv-ref-pmid">{pmid}</div>}
      {otherXrefs.map((c) => (
        <div key={c} className="tetv-ref-xref">
          {c}
        </div>
      ))}
      {year && <div className="tetv-ref-year">{year}</div>}
    </div>
  );
}
