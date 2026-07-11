import React, { useCallback, useEffect, useState } from 'react';
import { useGridFilter } from 'ag-grid-react';
import {
  VALIDATION_FILTER_KEYS,
  validationState,
} from '../helpers/groupTets';

// Display labels for the (persisted) filter-model keys — the keys themselves
// stay unchanged so saved filter models keep working (SCRUM-6291).
const FILTER_KEY_LABELS = {
  unvalidated: 'unassessed',
};

const ValidationFilter = ({ model: rawModel, onModelChange }) => {
  const model = Array.isArray(rawModel) ? rawModel : null;
  const [closeFilter, setCloseFilter] = useState();
  const [unappliedModel, setUnappliedModel] = useState(model);

  const doesFilterPass = useCallback(
    (params) => {
      if (!model || model.length === 0) return true;
      const state = validationState(params.value);
      return model.includes(state);
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

  const apply = () => {
    onModelChange(unappliedModel);
    if (closeFilter) closeFilter();
  };

  return (
    <div className="custom-filter">
      <div>Assessment status</div>
      <hr />
      {VALIDATION_FILTER_KEYS.map((k) => (
        <div key={k}>
          <input
            type="checkbox"
            id={`vf-${k}`}
            checked={!!(unappliedModel && unappliedModel.includes(k))}
            onChange={(e) => onChange(k, e.target.checked)}
          />
          <label htmlFor={`vf-${k}`}> {FILTER_KEY_LABELS[k] || k}</label>
        </div>
      ))}
      <hr />
      <button onClick={apply}>Apply</button>
    </div>
  );
};

export default ValidationFilter;
