import React, { useCallback, useEffect, useState } from 'react';
import { useGridFilter } from 'ag-grid-react';

/** Set of curie prefixes (uppercase) found on a row: the canonical AGRKB
 *  curie plus every cross-reference. */
export function rowPrefixes(data) {
  const out = new Set();
  if (data?.curie) {
    const p = String(data.curie).split(':')[0];
    if (p) out.add(p.toUpperCase());
  }
  const xrefs = data?.biblio?.cross_references || [];
  for (const x of xrefs) {
    if (x?.curie) {
      const p = String(x.curie).split(':')[0];
      if (p) out.add(p.toUpperCase());
    }
  }
  return out;
}

/** AgGrid filter that keeps rows whose curie/xref set intersects the
 *  user-selected prefix list. Multi-select; empty model passes everything. */
const IdPrefixFilter = ({
  model: rawModel,
  onModelChange,
  availablePrefixes = [],
}) => {
  const model = Array.isArray(rawModel) ? rawModel : null;
  const [closeFilter, setCloseFilter] = useState();
  const [unappliedModel, setUnappliedModel] = useState(model);

  const doesFilterPass = useCallback(
    (params) => {
      if (!model || model.length === 0) return true;
      const prefixes = rowPrefixes(params.data);
      return model.some((p) => prefixes.has(p));
    },
    [model]
  );

  const afterGuiAttached = useCallback(
    ({ hidePopup }) => setCloseFilter(() => hidePopup),
    []
  );
  useGridFilter({ doesFilterPass, afterGuiAttached });

  useEffect(() => setUnappliedModel(model), [model]);

  const onChange = (key, checked) => {
    const next = checked
      ? [...(unappliedModel || []), key]
      : (unappliedModel || []).filter((k) => k !== key);
    setUnappliedModel(next.length === 0 ? null : next);
  };

  const setAll = () =>
    setUnappliedModel(availablePrefixes.length === 0 ? null : [...availablePrefixes]);
  const setNone = () => setUnappliedModel(null);

  const apply = () => {
    onModelChange(unappliedModel);
    if (closeFilter) closeFilter();
  };

  return (
    <div className="custom-filter">
      <div>ID prefix</div>
      <hr />
      <div style={{ marginBottom: 4 }}>
        <button
          type="button"
          className="tetv-quick-link"
          onClick={setAll}
        >
          All
        </button>
        <button
          type="button"
          className="tetv-quick-link"
          onClick={setNone}
        >
          None
        </button>
      </div>
      <div style={{ maxHeight: 220, overflowY: 'auto', minWidth: 160 }}>
        {availablePrefixes.length === 0 && (
          <div style={{ color: '#888', fontSize: 12 }}>(no IDs loaded)</div>
        )}
        {availablePrefixes.map((p) => (
          <div key={p}>
            <input
              type="checkbox"
              id={`ipf-${p}`}
              checked={!!(unappliedModel && unappliedModel.includes(p))}
              onChange={(e) => onChange(p, e.target.checked)}
            />
            <label htmlFor={`ipf-${p}`}> {p}</label>
          </div>
        ))}
      </div>
      <hr />
      <button onClick={apply}>Apply</button>
    </div>
  );
};

export default IdPrefixFilter;
