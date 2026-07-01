import React, { useState } from 'react';
import { AsyncTypeahead } from 'react-bootstrap-typeahead';
import 'react-bootstrap-typeahead/css/Typeahead.css';

import { api } from '../../api';

/**
 * Name -> person single-select autocomplete for the Lineage section.
 *
 * Searches people by name via `GET /person/by_name?name=` and shows each option
 * as "Display Name (AGRKB:...)" so curators can disambiguate same-named people by
 * curie. `value` is the selected person curie (string); `valueName` is its display
 * name (so the current pill reads nicely before any search). `onChange` is called
 * with `{ curie, name }` on select, or `null` when cleared.
 */
export default function PersonCuriePicker({
  value,
  valueName,
  onChange,
  disabled,
  id = 'person-curie-typeahead',
  placeholder = 'Search person by name',
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const labelKey = (o) => {
    if (typeof o === 'string') return o;
    const name = o.display_name || '(no name)';
    return o.curie ? `${name} (${o.curie})` : name;
  };

  const selected = value ? [{ display_name: valueName || '', curie: value }] : [];

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
          const res = await api.get('/person/by_name?name=' + encodeURIComponent(query));
          const list = Array.isArray(res.data)
            ? res.data
            : res.data && res.data.curie
            ? [res.data]
            : [];
          setOptions(list.filter((person) => person && person.curie));
        } catch {
          setOptions([]);
        } finally {
          setLoading(false);
        }
      }}
      onChange={(sel) => {
        const o = sel && sel[sel.length - 1];
        onChange?.(o && o.curie ? { curie: o.curie, name: o.display_name || '' } : null);
      }}
      options={options}
      selected={selected}
    />
  );
}
