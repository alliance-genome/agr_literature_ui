import React, { useCallback, useEffect, useState } from 'react';
import { useGridFilter } from 'ag-grid-react';
import { useSelector } from 'react-redux';
import { TOPIC_CELL_FILTER_KEYS, cellPredicate } from '../helpers/groupTets';

const TopicCellFilter = ({ model: rawModel, onModelChange }) => {
  const model = Array.isArray(rawModel) ? rawModel : null;
  const uid = useSelector((s) => s.isLogged.uid);
  const [closeFilter, setCloseFilter] = useState();
  const [unappliedModel, setUnappliedModel] = useState(model);

  const doesFilterPass = useCallback(
    (params) => {
      const tets = params.value;
      return cellPredicate(tets, uid, model);
    },
    [model, uid]
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
      <div>Topic cell filter</div>
      <hr />
      {TOPIC_CELL_FILTER_KEYS.map((k) => (
        <div key={k}>
          <input
            type="checkbox"
            id={`tcf-${k}`}
            checked={!!(unappliedModel && unappliedModel.includes(k))}
            onChange={(e) => onChange(k, e.target.checked)}
          />
          <label htmlFor={`tcf-${k}`}> {k}</label>
        </div>
      ))}
      <hr />
      <button onClick={apply}>Apply</button>
    </div>
  );
};

export default TopicCellFilter;
