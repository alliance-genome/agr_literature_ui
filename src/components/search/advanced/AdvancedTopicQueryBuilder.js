import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Button, ButtonGroup, Form, InputGroup } from 'react-bootstrap';
import { api } from '../../../api';
import {
  setAdvancedTopicQuery,
  setSearchResultsPage,
  searchReferences,
} from '../../../actions/searchActions';
import {
  TET_FIELD_DEFS,
  FIELD_DEF_BY_KEY,
  isRangeField,
  isLeaf,
  createFieldRow,
  createLeaf,
  createGroup,
  createEmptyTree,
  isAdvancedQueryEmpty,
} from './advancedQueryModel';

// Deepest group nesting the UI exposes. The backend query builder is unbounded,
// but curators rarely need more than a few levels and deep trees get unreadable.
const MAX_GROUP_DEPTH = 3;

// Process-wide cache of resolved ATP/ECO curie -> display name, so switching
// fields or re-rendering doesn't refetch names already seen. Best-effort: a
// missing/failed lookup just falls back to showing the raw curie.
const curieNameCache = new Map();
// Guard against pathological option lists (e.g. hundreds of topics) firing a
// storm of per-curie lookups.
const MAX_NAME_LOOKUPS = 300;

// Value options for a sub-facet field come from the same aggregation buckets the
// facet panel uses (already in Redux), so the builder stays consistent with the
// facet path. Fields without an aggregation (entity_type, entity, species) fall
// back to a free-text input. ATP/ECO curie options are labelled with their
// resolved ontology name (looked up once, cached) so the dropdown reads like the
// facet panel instead of showing bare curies.
const useFieldOptions = (fieldKey) => {
  const def = FIELD_DEF_BY_KEY[fieldKey];
  const buckets = useSelector((s) =>
    def && def.facetKey ? s.search.searchFacets?.[def.facetKey]?.buckets : null
  );
  const [, bumpNames] = useState(0);

  useEffect(() => {
    if (!Array.isArray(buckets)) return undefined;
    const missing = [];
    for (const b of buckets) {
      const upper = String(b.key || '').toUpperCase();
      const isOntology = upper.startsWith('ATP:') || upper.startsWith('ECO:');
      if (isOntology && !b.name && !curieNameCache.has(upper)) missing.push(upper);
      if (missing.length >= MAX_NAME_LOOKUPS) break;
    }
    if (missing.length === 0) return undefined;
    let cancelled = false;
    (async () => {
      await Promise.all(missing.map(async (upper) => {
        const category = upper.startsWith('ATP:') ? 'atpterm' : 'ecoterm';
        try {
          const r = await api.get(`/ontology/map_curie_to_name/${category}/${upper}`);
          if (typeof r.data === 'string' && r.data) curieNameCache.set(upper, r.data);
        } catch (e) {
          // leave uncached -> falls back to the raw curie
        }
      }));
      if (!cancelled) bumpNames((n) => n + 1);
    })();
    return () => { cancelled = true; };
  }, [buckets]);

  if (!Array.isArray(buckets)) return null;
  return buckets.map((b) => {
    const name = b.name || curieNameCache.get(String(b.key || '').toUpperCase());
    return { value: b.key, label: name ? `${name} (${b.key})` : b.key };
  });
};

const cellStyle = { marginBottom: '4px' };

const FieldRow = ({ row, onChange, onRemove, canRemove }) => {
  const options = useFieldOptions(row.field);
  return (
    <InputGroup size="sm" style={cellStyle}>
      <Form.Control
        as="select"
        aria-label="sub-facet field"
        style={{ maxWidth: '11rem' }}
        value={row.field}
        onChange={(e) => onChange({ ...createFieldRow(e.target.value) })}
      >
        {TET_FIELD_DEFS.map((def) => (
          <option key={def.key} value={def.key}>{def.label}</option>
        ))}
      </Form.Control>
      {isRangeField(row.field) ? (
        <>
          <Form.Control
            type="number" step="0.01" min={0} max={1}
            aria-label="confidence score min"
            value={row.min}
            onChange={(e) => onChange({ ...row, min: e.target.value })}
          />
          <InputGroup.Text>to</InputGroup.Text>
          <Form.Control
            type="number" step="0.01" min={0} max={1}
            aria-label="confidence score max"
            value={row.max}
            onChange={(e) => onChange({ ...row, max: e.target.value })}
          />
        </>
      ) : options ? (
        <Form.Control
          as="select"
          aria-label="value"
          value={row.value}
          onChange={(e) => onChange({ ...row, value: e.target.value })}
        >
          <option value="">— select —</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Form.Control>
      ) : (
        <Form.Control
          type="text"
          placeholder="value(s), comma-separated"
          aria-label="value"
          value={row.value}
          onChange={(e) => onChange({ ...row, value: e.target.value })}
        />
      )}
      <Button
        variant="outline-danger"
        onClick={onRemove}
        disabled={!canRemove}
        title="Remove field"
      >×</Button>
    </InputGroup>
  );
};

// One leaf = conditions that must all hold on the SAME topic entity tag.
const QueryCondition = ({ leaf, onChange, onRemove, canRemove }) => {
  const setField = (idx, newRow) => {
    const fields = leaf.fields.map((f, i) => (i === idx ? newRow : f));
    onChange({ ...leaf, fields });
  };
  const addField = () => onChange({ ...leaf, fields: [...leaf.fields, createFieldRow()] });
  const removeField = (idx) =>
    onChange({ ...leaf, fields: leaf.fields.filter((_f, i) => i !== idx) });

  // A non-range sub-facet repeated within one condition compiles to a single
  // any-of (OR) match on that field, NOT an AND across separate tags (a tag has
  // one value per sub-facet). Warn so a curator who means "must have both" uses a
  // second condition combined with AND instead.
  const duplicateLabels = (() => {
    const seen = new Set();
    const dups = new Set();
    (leaf.fields || []).forEach((f) => {
      if (!f || !f.field || isRangeField(f.field)) return;
      if (seen.has(f.field)) dups.add(f.field);
      else seen.add(f.field);
    });
    return [...dups].map((k) => (FIELD_DEF_BY_KEY[k] ? FIELD_DEF_BY_KEY[k].label : k));
  })();

  return (
    <div style={{
      border: '1px solid #dee2e6', borderRadius: '4px',
      padding: '6px', margin: '4px 0', backgroundColor: '#fff',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <Form.Check
          type="checkbox"
          label="exclude (NOT)"
          checked={!!leaf.negate}
          style={{ fontSize: '0.8rem' }}
          onChange={(e) => onChange({ ...leaf, negate: e.target.checked })}
        />
        <Button
          variant="outline-danger" size="sm"
          onClick={onRemove} disabled={!canRemove}
          title="Remove condition"
        >Remove condition</Button>
      </div>
      {leaf.fields.map((row, idx) => (
        <FieldRow
          key={idx}
          row={row}
          onChange={(newRow) => setField(idx, newRow)}
          onRemove={() => removeField(idx)}
          canRemove={leaf.fields.length > 1}
        />
      ))}
      {duplicateLabels.length > 0 && (
        <div style={{ fontSize: '0.75rem', color: '#8a6d3b', backgroundColor: '#fcf8e3',
          border: '1px solid #faebcc', borderRadius: '4px', padding: '4px 6px', margin: '2px 0 4px' }}>
          ⚠ Repeated <b>{duplicateLabels.join(', ')}</b> rows match{' '}
          <b>any</b> of their values (OR) on one tag. To require different values on separate tags
          (e.g. one source AND another), add a second condition and combine with AND instead.
        </div>
      )}
      <Button variant="link" size="sm" style={{ padding: 0 }} onClick={addField}>+ add field (same tag)</Button>
    </div>
  );
};

// A group combines its children (conditions and/or nested sub-groups) with AND or
// OR. Rendered recursively so a curator can nest groups up to MAX_GROUP_DEPTH,
// matching the backend's arbitrary AND/OR tree.
const QueryGroup = ({ group, onChange, onRemove, canRemove, depth = 0 }) => {
  const setChild = (idx, newChild) => {
    const children = group.children.map((c, i) => (i === idx ? newChild : c));
    onChange({ ...group, children });
  };
  const addCondition = () => onChange({ ...group, children: [...group.children, createLeaf()] });
  const addSubGroup = () => onChange({ ...group, children: [...group.children, createGroup()] });
  const removeChild = (idx) =>
    onChange({ ...group, children: group.children.filter((_c, i) => i !== idx) });

  return (
    <div style={{
      border: '1px solid #ced4da', borderRadius: '6px',
      padding: '8px', margin: '6px 0', backgroundColor: depth % 2 === 0 ? '#f8f9fa' : '#eef1f4',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* The operator only has an effect with 2+ children; hide it otherwise so
            an inert dropdown doesn't read as broken. */}
        {group.children.length >= 2 ? (
          <InputGroup size="sm" style={{ width: 'auto' }}>
            <InputGroup.Text>combine with</InputGroup.Text>
            <Form.Control
              as="select"
              aria-label="group operator"
              style={{ maxWidth: '6rem' }}
              value={group.operator}
              onChange={(e) => onChange({ ...group, operator: e.target.value })}
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
            </Form.Control>
          </InputGroup>
        ) : <span />}
        <Button
          variant="outline-danger" size="sm"
          onClick={onRemove} disabled={!canRemove}
          title="Remove group"
        >Remove group</Button>
      </div>
      {group.children.map((child, idx) => (
        isLeaf(child) ? (
          <QueryCondition
            key={idx}
            leaf={child}
            onChange={(newChild) => setChild(idx, newChild)}
            onRemove={() => removeChild(idx)}
            canRemove={group.children.length > 1}
          />
        ) : (
          <QueryGroup
            key={idx}
            group={child}
            depth={depth + 1}
            onChange={(newChild) => setChild(idx, newChild)}
            onRemove={() => removeChild(idx)}
            canRemove /* a nested group can always be removed */
          />
        )
      ))}
      <Button variant="link" size="sm" style={{ padding: 0, marginRight: '12px' }} onClick={addCondition}>+ add condition</Button>
      {depth < MAX_GROUP_DEPTH && (
        <Button variant="link" size="sm" style={{ padding: 0 }} onClick={addSubGroup}>+ add sub-group</Button>
      )}
    </div>
  );
};

const AdvancedTopicQueryBuilder = () => {
  const dispatch = useDispatch();
  const tree = useSelector((s) => s.search.advancedTopicQuery);

  // Seed a default tree the first time the builder is shown.
  useEffect(() => {
    if (!tree) dispatch(setAdvancedTopicQuery(createEmptyTree()));
  }, [tree, dispatch]);

  if (!tree) return null;

  const update = (newTree) => dispatch(setAdvancedTopicQuery(newTree));
  const setGroup = (idx, newGroup) =>
    update({ ...tree, children: tree.children.map((g, i) => (i === idx ? newGroup : g)) });
  const addGroup = () => update({ ...tree, children: [...tree.children, createGroup()] });
  const removeGroup = (idx) =>
    update({ ...tree, children: tree.children.filter((_g, i) => i !== idx) });
  const reset = () => update(createEmptyTree());

  const runSearch = () => {
    dispatch(setSearchResultsPage(1));
    dispatch(searchReferences());
  };

  const empty = isAdvancedQueryEmpty(tree);

  return (
    <div style={{ padding: '4px 10px 10px' }}>
      <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px' }}>
        Build a query across Topic sub-facets. Conditions in a group share one tag;
        groups are combined below. Facet counts are not shown in advanced mode.
      </div>
      {/* Top-level operator only matters with 2+ groups; hide it otherwise. */}
      {tree.children.length >= 2 && (
        <InputGroup size="sm" style={{ width: 'auto', marginBottom: '4px' }}>
          <InputGroup.Text>combine groups with</InputGroup.Text>
          <Form.Control
            as="select"
            aria-label="top-level operator"
            style={{ maxWidth: '6rem' }}
            value={tree.operator}
            onChange={(e) => update({ ...tree, operator: e.target.value })}
          >
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </Form.Control>
        </InputGroup>
      )}
      {tree.children.map((group, idx) => (
        <QueryGroup
          key={idx}
          group={group}
          onChange={(newGroup) => setGroup(idx, newGroup)}
          onRemove={() => removeGroup(idx)}
          canRemove={tree.children.length > 1}
        />
      ))}
      <div style={{ marginTop: '6px' }}>
        <Button variant="link" size="sm" style={{ padding: 0, marginRight: '12px' }} onClick={addGroup}>+ add group</Button>
        <ButtonGroup size="sm">
          <Button variant="primary" onClick={runSearch} disabled={empty}>Search</Button>
          <Button variant="outline-secondary" onClick={reset}>Reset</Button>
        </ButtonGroup>
      </div>
    </div>
  );
};

export default AdvancedTopicQueryBuilder;
