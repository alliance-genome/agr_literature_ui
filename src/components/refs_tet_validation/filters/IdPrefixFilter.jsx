import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
 *  user-selected prefix list. UX:
 *   - Default state (model === null): all checkboxes checked, filter inactive.
 *   - Uncheck a prefix → only rows with the remaining prefixes are shown.
 *   - "None" button → empty model → no rows shown.
 *   - "All"  button → null model  → filter cleared.  */
const IdPrefixFilter = ({
  model: rawModel,
  onModelChange,
  availablePrefixes = [],
}) => {
  const model = Array.isArray(rawModel) ? rawModel : null;
  const [closeFilter, setCloseFilter] = useState();
  const [unappliedModel, setUnappliedModel] = useState(model);

  // null model means "all selected / no filter". Anything else is the
  // explicit allowed subset (possibly empty = "show nothing").
  const effectiveSelected = useMemo(() => {
    if (unappliedModel === null) return new Set(availablePrefixes);
    return new Set(unappliedModel);
  }, [unappliedModel, availablePrefixes]);

  const doesFilterPass = useCallback(
    (params) => {
      if (model === null) return true;
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
    const next = new Set(effectiveSelected);
    if (checked) next.add(key);
    else next.delete(key);
    // If everything is selected, normalise back to null (= no filter).
    if (
      availablePrefixes.length > 0 &&
      next.size === availablePrefixes.length
    ) {
      setUnappliedModel(null);
    } else {
      setUnappliedModel([...next]);
    }
  };

  const setAll = () => setUnappliedModel(null);
  const setNone = () => setUnappliedModel([]);

  const apply = () => {
    onModelChange(unappliedModel);
    if (closeFilter) closeFilter();
  };

  return (
    <div className="custom-filter">
      <div>ID prefix</div>
      <hr />
      <div style={{ marginBottom: 4 }}>
        <button type="button" className="tetv-quick-link" onClick={setAll}>
          All
        </button>
        <button type="button" className="tetv-quick-link" onClick={setNone}>
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
              checked={effectiveSelected.has(p)}
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
