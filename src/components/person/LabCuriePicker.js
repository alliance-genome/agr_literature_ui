import React, { useState } from 'react';
import { AsyncTypeahead } from 'react-bootstrap-typeahead';
import 'react-bootstrap-typeahead/css/Typeahead.css';

import { api } from '../../api';

/**
 * Laboratory typeahead for the Person editor's Laboratories section.
 *
 * Searches labs via `GET /laboratory/by_name_or_strain_designation?query=` and
 * shows each option as "Name [strain] — curie" so curators can pick by name or
 * strain designation. `value` is the selected lab curie; `valueLabel` is a display
 * label for the current pill. `onChange` is called with `{ curie, label }` or null.
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
      labelKey={labelKey}
      filterBy={() => true}
      onSearch={async (query) => {
        setLoading(true);
        try {
          const res = await api.get('/laboratory/by_name_or_strain_designation?query=' + encodeURIComponent(query));
          const list = Array.isArray(res.data) ? res.data : [];
          setOptions(list.filter((lab) => lab && lab.curie));
        } catch {
          setOptions([]);
        } finally {
          setLoading(false);
        }
      }}
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
