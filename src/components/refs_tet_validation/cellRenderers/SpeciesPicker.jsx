import React, { useEffect, useRef, useState } from 'react';
import { AsyncTypeahead } from 'react-bootstrap-typeahead';
import 'react-bootstrap-typeahead/css/Typeahead.css';
import { api } from '../../../api';
import { debug } from '../helpers/debug';

/** Single-select species autocomplete used by the validation modals.
 *
 *  `value` is the selected taxon curie (string) or null.
 *  `valueName` is the resolved display name for that curie (so the typeahead
 *  can show "Caenorhabditis elegans NCBITaxon:6239" as the current pill even
 *  before the user types anything). When `valueName` is missing we still show
 *  the curie alone — better than rendering an empty pill.
 *
 *  We follow the existing convention from TopicEntityCreate / Sort: store
 *  options as "<name> <curie>" strings and parse out the curie on selection.
 *  This keeps look-and-feel consistent with the other species fields in the
 *  app and avoids a custom labelKey renderer. */
export default function SpeciesPicker({
  value,
  valueName,
  onChange,
  disabled,
  id = 'tetv-species-typeahead',
  placeholder = 'Species name (optional)',
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const typeaheadRef = useRef(null);

  const selectedString = value
    ? `${valueName || value} ${value}`
    : null;

  // Keep the typeahead's internal text in sync with the controlled value —
  // important when the modal pre-fills a default species or the user clears
  // it via the × button on the pill.
  useEffect(() => {
    const inst = typeaheadRef.current;
    if (!inst) return;
    if (value) {
      // selected pill is driven via `selected`; nothing to do.
    } else {
      inst.clear?.();
    }
  }, [value]);

  return (
    <AsyncTypeahead
      id={id}
      ref={typeaheadRef}
      isLoading={loading}
      placeholder={placeholder}
      disabled={disabled}
      useCache={false}
      minLength={1}
      onSearch={async (query) => {
        setLoading(true);
        try {
          const res = await api.get(
            `/ontology/search_species/${encodeURIComponent(query)}`
          );
          if (Array.isArray(res.data)) {
            setOptions(
              res.data
                .filter((it) => it?.curie && it?.name)
                .map((it) => `${it.name} ${it.curie}`)
            );
          } else {
            setOptions([]);
          }
        } catch (e) {
          // Network / 5xx — clear suggestions, leave the field as is.
          debug.warn('[SpeciesPicker] search failed', e?.message);
          setOptions([]);
        } finally {
          setLoading(false);
        }
      }}
      onChange={(selected) => {
        if (!selected || selected.length === 0) {
          onChange?.(null);
          return;
        }
        const text = selected[selected.length - 1];
        const match = String(text).match(/(.+)\s+(NCBITaxon:\d+)$/);
        if (match) {
          onChange?.({ curie: match[2], name: match[1] });
        } else {
          onChange?.(null);
        }
      }}
      options={options}
      selected={selectedString ? [selectedString] : []}
    />
  );
}
