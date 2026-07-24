import React, { useState } from 'react';
import { AsyncTypeahead } from 'react-bootstrap-typeahead';
import 'react-bootstrap-typeahead/css/Typeahead.css';

import { api } from '../../api';
import useAbortableSearch from '../../hooks/useAbortableSearch';

/**
 * Laboratory typeahead for the Person editor's Laboratories section.
 *
 * Searches labs by name (substring) and strain designation (exact) via the split
 * `GET /laboratory/by_name` and `GET /laboratory/by_strain_designation` endpoints,
 * merging the two by curie, and shows each option as "Name [strain] — curie" so
 * curators can pick by name or strain designation. `value` is the selected lab
 * curie; `valueLabel` is a display label for the current pill. `onChange` is
 * called with `{ curie, label }` or null.
 */
export default function LabCuriePicker({
  value,
  valueLabel,
  onChange,
  disabled,
  id = 'lab-curie-typeahead',
  placeholder = 'lab curie by strain designation or lab name',
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const runSearch = useAbortableSearch();

  const labelKey = (o) => {
    if (typeof o === 'string') return o;
    const name = o.name || o.strain_designation || '(lab)';
    const strain = o.strain_designation ? ` [${o.strain_designation}]` : '';
    return o.curie ? `${name}${strain} — ${o.curie}` : `${name}${strain}`;
  };

  const selected = value ? [{ name: valueLabel || '', curie: value }] : [];

  return (
    <AsyncTypeahead
      id={id}
      isLoading={loading}
      placeholder={placeholder}
      disabled={disabled}
      useCache={false}
      minLength={2}
      delay={300}
      labelKey={labelKey}
      filterBy={() => true}
      onSearch={(query) => runSearch(
        (signal) => Promise.all([
          api.get('/laboratory/by_name?query=' + encodeURIComponent(query), { signal }),
          api.get('/laboratory/by_strain_designation?query=' + encodeURIComponent(query), { signal }),
        ]),
        (results, err) => {
          if (err) { setOptions([]); return; }
          const [byName, byStrain] = results;
          const seen = new Set();
          const merged = [];
          [
            ...(Array.isArray(byName?.data) ? byName.data : []),
            ...(Array.isArray(byStrain?.data) ? byStrain.data : []),
          ].forEach((lab) => {
            if (lab && lab.curie && !seen.has(lab.curie)) {
              seen.add(lab.curie);
              merged.push(lab);
            }
          });
          setOptions(merged);
        },
        setLoading,
      )}
      onChange={(sel) => {
        const o = sel && sel[sel.length - 1];
        onChange?.(o && o.curie
          ? { curie: o.curie, name: o.name || '', strain_designation: o.strain_designation || '' }
          : null);
      }}
      options={options}
      selected={selected}
    />
  );
}
