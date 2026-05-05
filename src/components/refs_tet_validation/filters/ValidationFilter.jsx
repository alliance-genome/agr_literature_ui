import React, { useCallback, useEffect, useState } from 'react';
import { useGridFilter } from 'ag-grid-react';
import {
  VALIDATION_FILTER_KEYS,
  validationState,
} from '../helpers/groupTets';

const ValidationFilter = ({ model: rawModel, onModelChange }) => {
  const model = Array.isArray(rawModel) ? rawModel : null;
  const [closeFilter, setCloseFilter] = useState();
  const [unappliedModel, setUnappliedModel] = useState(model);

  const doesFilterPass = useCallback(
    (params) => {
      const state = validationState(params.value);
      const pass =
        !model || model.length === 0 ? true : model.includes(state);
      // eslint-disable-next-line no-console
      console.debug('[ValidationFilter] doesFilterPass', {
        model,
        valueLen: Array.isArray(params.value) ? params.value.length : null,
        state,
        pass,
      });
      return pass;
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
    // eslint-disable-next-line no-console
    console.debug('[ValidationFilter] apply', { unappliedModel });
    onModelChange(unappliedModel);
    if (closeFilter) closeFilter();
  };

  return (
    <div className="custom-filter">
      <div>Validation status</div>
      <hr />
      {VALIDATION_FILTER_KEYS.map((k) => (
        <div key={k}>
          <input
            type="checkbox"
            id={`vf-${k}`}
            checked={!!(unappliedModel && unappliedModel.includes(k))}
            onChange={(e) => onChange(k, e.target.checked)}
          />
          <label htmlFor={`vf-${k}`}> {k}</label>
        </div>
      ))}
      <hr />
      <button onClick={apply}>Apply</button>
    </div>
  );
};

export default ValidationFilter;
