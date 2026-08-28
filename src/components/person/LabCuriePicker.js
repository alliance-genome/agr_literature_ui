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
 * merging the two by curie (strain hits ranked first, see below), and shows each
 * option as "strain — name — curie" (empty parts dropped) so curators can pick by
 * name or strain designation. `value` is the selected lab curie; `valueLabel` is a
 * display label for the current pill. `onChange` is called with `{ curie, label }`
 * or null.
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

  // A lab normally carries either a strain designation or a name, not both, so
  // build the label from whichever parts exist rather than always bracketing the
  // strain onto a name. Strain leads when both are somehow present: it's the short
  // code curators scan the dropdown for.
  const labelKey = (o) => {
    if (typeof o === 'string') return o;
    const parts = [o.strain_designation, o.name, o.curie]
      .map((part) => (part == null ? '' : String(part).trim()))
      .filter(Boolean);
    return parts.length ? parts.join(' — ') : '(lab)';
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
          // Strain designations are short codes, so an exact strain hit is nearly
          // always what the curator typed: rank it above the remaining strain hits,
          // which in turn outrank the by_name substring hits. Otherwise a two-letter
          // code like "PS" sits below every lab whose name merely contains "ps", and
          // can fall past the typeahead's result cap entirely.
          const strainHits = Array.isArray(byStrain?.data) ? byStrain.data : [];
          const needle = (query || '').trim().toLowerCase();
          const isExactStrain = (lab) =>
            (lab?.strain_designation || '').trim().toLowerCase() === needle;
          [
            ...strainHits.filter(isExactStrain),
            ...strainHits.filter((lab) => !isExactStrain(lab)),
            ...(Array.isArray(byName?.data) ? byName.data : []),
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
