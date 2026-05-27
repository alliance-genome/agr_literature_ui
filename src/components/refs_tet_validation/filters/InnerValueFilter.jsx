import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useGridFilter } from 'ag-grid-react';
import { innerColumnPassesFilter } from '../helpers/innerColumnUtils';

const InnerValueFilter = ({
  model: rawModel,
  onModelChange,
  availableValues = [],
  filterLabel = 'Filter',
  innerFieldType,
  sourceFilterModel,
  colDef,
  column,
}) => {
  const model = Array.isArray(rawModel) ? rawModel : null;
  const [closeFilter, setCloseFilter] = useState();
  const [unappliedModel, setUnappliedModel] = useState(model);
  const field = colDef?.field || column?.getColDef?.()?.field;

  const optionValues = useMemo(() => {
    const merged = [
      ...availableValues,
      ...(Array.isArray(unappliedModel) ? unappliedModel : []),
    ];
    return Array.from(new Set(merged));
  }, [availableValues, unappliedModel]);

  const effectiveSelected = useMemo(() => {
    if (unappliedModel === null) return new Set(optionValues);
    return new Set(unappliedModel);
  }, [optionValues, unappliedModel]);

  const doesFilterPass = useCallback(
    (params) => {
      const cellValue =
        field && params.data
          ? params.data[field]
          : params.value;
      return innerColumnPassesFilter(
        innerFieldType,
        cellValue,
        model,
        sourceFilterModel
      );
    },
    [field, innerFieldType, model, sourceFilterModel]
  );

  const afterGuiAttached = useCallback(
    ({ hidePopup }) => setCloseFilter(() => hidePopup),
    []
  );
  useGridFilter({ doesFilterPass, afterGuiAttached });

  useEffect(() => setUnappliedModel(model), [model]);

  const onChange = (value, checked) => {
    const next = new Set(effectiveSelected);
    if (checked) next.add(value);
    else next.delete(value);

    if (optionValues.length > 0 && next.size === optionValues.length) {
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
      <div>{filterLabel}</div>
      <hr />
      <div style={{ marginBottom: 4 }}>
        <button type="button" className="tetv-quick-link" onClick={setAll}>
          All
        </button>
        <button type="button" className="tetv-quick-link" onClick={setNone}>
          None
        </button>
      </div>
      <div style={{ maxHeight: 220, overflowY: 'auto', minWidth: 180 }}>
        {optionValues.length === 0 && (
          <div style={{ color: '#888', fontSize: 12 }}>(no values loaded)</div>
        )}
        {optionValues.map((value) => (
          <div key={value}>
            <input
              type="checkbox"
              id={`ivf-${innerFieldType}-${value}`}
              checked={effectiveSelected.has(value)}
              onChange={(e) => onChange(value, e.target.checked)}
            />
            <label htmlFor={`ivf-${innerFieldType}-${value}`}> {value}</label>
          </div>
        ))}
      </div>
      <hr />
      <button onClick={apply}>Apply</button>
    </div>
  );
};

export default InnerValueFilter;
