import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Badge, Button, ButtonGroup, Form, InputGroup } from 'react-bootstrap';
import { api } from '../../../api';
import {
  setAdvancedTopicQuery,
  setSearchResultsPage,
  searchReferences,
  fetchAdvancedFacetsVocab,
} from '../../../actions/searchActions';
import {
  TET_FIELD_DEFS,
  FIELD_DEF_BY_KEY,
  isRangeField,
  createFieldRow,
  createLeaf,
  createEmptyTree,
  normalizeToFlatTree,
  isLeaf,
  isAdvancedQueryEmpty,
  compileAdvancedQuery,
  describeCompiledQuery,
  buildValueLabeler,
} from './advancedQueryModel';

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
  // Prefer the MOD-scoped vocab fetched for the builder; fall back to the facet panel's
  // searchFacets buckets only until that vocab loads. searchFacets is paginated (top-N)
  // and overwritten by each search's result-scoped aggregation, so relying on it
  // truncates or empties the dropdowns (SCRUM-6228).
  const buckets = useSelector((s) => {
    if (!def || !def.facetKey) return null;
    const vocab = s.search.advancedFacetsVocab?.[def.facetKey]?.buckets;
    if (Array.isArray(vocab) && vocab.length > 0) return vocab;
    return s.search.searchFacets?.[def.facetKey]?.buckets ?? null;
  });
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

  // Static controlled vocab (e.g. entity_type) wins over aggregation buckets.
  if (def && Array.isArray(def.options)) return def.options;
  if (!Array.isArray(buckets)) return null;
  return buckets.map((b) => {
    const name = b.name || curieNameCache.get(String(b.key || '').toUpperCase());
    return { value: b.key, label: name ? `${name} (${b.key})` : b.key };
  });
};

// One value on a field, shown as a removable chip. Multiple chips on one field
// are combined with OR (a tag matches any of the values), so an OR pill sits
// between them.
const ValueChip = ({ chip, onRemove }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    border: '1px solid #b6d4fe', backgroundColor: '#e7f1ff', color: '#084298',
    borderRadius: '12px', padding: '1px 8px', fontSize: '0.8rem', whiteSpace: 'nowrap',
  }}>
    {chip.label}
    <span
      role="button"
      aria-label="remove value"
      onClick={onRemove}
      style={{ cursor: 'pointer', fontWeight: 700, lineHeight: 1 }}
    >×</span>
  </span>
);

// The value editor for one field row: a chip list (OR) plus an adder. Range fields
// (confidence score) use a min/max pair instead of chips.
const ValueEditor = ({ row, onChange }) => {
  const dispatch = useDispatch();
  const options = useFieldOptions(row.field);
  const [text, setText] = useState('');
  const values = Array.isArray(row.values) ? row.values : [];

  if (isRangeField(row.field)) {
    return (
      <InputGroup size="sm" style={{ maxWidth: '16rem' }}>
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
      </InputGroup>
    );
  }

  const addChip = (value, label) => {
    const v = String(value || '').trim();
    if (!v || values.some((c) => c.value === v)) return;
    onChange({ ...row, values: [...values, { value: v, label: label || v }] });
  };
  const removeChip = (idx) => {
    onChange({ ...row, values: values.filter((_c, i) => i !== idx) });
    // Re-pull the complete vocabulary so the removed value returns to a full,
    // fresh dropdown on reselection (guards against a stale/partial earlier fetch).
    dispatch(fetchAdvancedFacetsVocab());
  };

  // The adder sits inline immediately after the chips (a leading "or" pill when the
  // field already has a value) so it reads as "add another value to THIS field"
  // rather than a stray box between field rows. flex:'0 0 auto' keeps it compact.
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px', flex: 1 }}>
      {values.map((chip, idx) => (
        <React.Fragment key={chip.value}>
          {idx > 0 && (
            <Badge variant="secondary" style={{ fontSize: '0.65rem' }}>OR</Badge>
          )}
          <ValueChip chip={chip} onRemove={() => removeChip(idx)} />
        </React.Fragment>
      ))}
      {values.length > 0 && (
        <span style={{ fontSize: '0.7rem', color: '#6c757d', whiteSpace: 'nowrap' }}>or</span>
      )}
      {options ? (
        <Form.Control
          as="select"
          size="sm"
          aria-label="add value"
          style={{ width: 'auto', maxWidth: '12rem', flex: '0 0 auto' }}
          value=""
          onChange={(e) => {
            const opt = options.find((o) => o.value === e.target.value);
            if (opt) addChip(opt.value, opt.label);
          }}
        >
          <option value="">{values.length ? 'add value (same field)…' : '— select —'}</option>
          {options
            .filter((o) => !values.some((c) => c.value === o.value))
            .map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
        </Form.Control>
      ) : (
        <Form.Control
          type="text"
          size="sm"
          style={{ width: '12rem', maxWidth: '100%', flex: '0 0 auto' }}
          placeholder={values.length ? 'add value (same field)…' : 'type value, Enter'}
          aria-label="add value"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addChip(text);
              setText('');
            }
          }}
          onBlur={() => { if (text.trim()) { addChip(text); setText(''); } }}
        />
      )}
    </div>
  );
};

const FieldRow = ({ row, onChange, onRemove, canRemove }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '6px' }}>
    <Form.Control
      as="select"
      size="sm"
      aria-label="sub-facet field"
      style={{ maxWidth: '11rem', flex: '0 0 auto' }}
      value={row.field}
      onChange={(e) => onChange(createFieldRow(e.target.value))}
    >
      {TET_FIELD_DEFS.map((def) => (
        <option key={def.key} value={def.key}>{def.label}</option>
      ))}
    </Form.Control>
    <span style={{ padding: '4px 2px', color: '#6c757d' }}>=</span>
    <ValueEditor row={row} onChange={onChange} />
    <Button
      variant="outline-danger" size="sm"
      onClick={onRemove} disabled={!canRemove}
      title="Remove field"
      style={{ flex: '0 0 auto' }}
    >×</Button>
  </div>
);

// One Tag card = one topic_entity_tag the paper must (or must not) have. All fields
// inside AND on the SAME tag; multiple values on a field OR. A second Tag card is a
// DIFFERENT tag on the same paper.
const TagCard = ({ leaf, index, onChange, onRemove, canRemove }) => {
  const dispatch = useDispatch();
  const setField = (idx, newRow) =>
    onChange({ ...leaf, fields: leaf.fields.map((f, i) => (i === idx ? newRow : f)) });
  const addField = () => onChange({ ...leaf, fields: [...leaf.fields, createFieldRow()] });
  const removeField = (idx) => {
    onChange({ ...leaf, fields: leaf.fields.filter((_f, i) => i !== idx) });
    // Re-pull the vocabulary so the dropdowns are full and fresh when a replacement
    // field is added after this removal.
    dispatch(fetchAdvancedFacetsVocab());
  };

  const scope = index === 0
    ? 'one tag must match all of these (same tag)'
    : 'a different tag on the same paper must match all of these';

  return (
    <div style={{
      border: '1px solid #cfe2ff', borderRadius: '8px',
      padding: '8px 10px', margin: '8px 0', backgroundColor: '#f6faff',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge variant="primary">{index + 1}</Badge>
          <span style={{ fontWeight: 600 }}>Tag {index + 1}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Form.Check
            type="checkbox"
            label="exclude (paper must NOT have this tag)"
            checked={!!leaf.negate}
            style={{ fontSize: '0.8rem' }}
            onChange={(e) => onChange({ ...leaf, negate: e.target.checked })}
          />
          <Button
            variant="outline-danger" size="sm"
            onClick={onRemove} disabled={!canRemove}
            title="Remove tag"
          >Remove tag</Button>
        </div>
      </div>
      <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '6px' }}>
        {scope}. Fields are combined with AND; multiple values on one field match any (OR).
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
      <Button variant="link" size="sm" style={{ padding: 0 }} onClick={addField}>+ add field (same tag)</Button>
    </div>
  );
};

const AdvancedTopicQueryBuilder = () => {
  const dispatch = useDispatch();
  const tree = useSelector((s) => s.search.advancedTopicQuery);

  // Corpus/MOD scope is a non-TET facet that still applies in advanced mode; show
  // it read-only so the preview reflects the full search without duplicating the
  // corpus facet's state here.
  const corpusMods = useSelector((s) => {
    const fv = s.search.searchFacetsValues || {};
    return Array.from(new Set([
      ...(fv['mods_in_corpus.keyword'] || []),
      ...(fv['mods_needs_review.keyword'] || []),
      ...(fv['mods_in_corpus_or_needs_review.keyword'] || []),
    ]));
  });
  // Stable dependency key so the vocab refetch fires only when the MOD set changes.
  const corpusModsKey = corpusMods.slice().sort().join('|');

  // Load the TET sub-facet vocabulary so the value dropdowns show the full list (not
  // the facet panel's paginated top-N, and unaffected by result-scoped search
  // aggregations). Re-fetch when the selected MOD changes so topics/sources are scoped
  // to that MOD. Best-effort; the dropdowns fall back to searchFacets until it arrives
  // (SCRUM-6228).
  useEffect(() => {
    dispatch(fetchAdvancedFacetsVocab());
  }, [corpusModsKey, dispatch]);

  // Seed a default flat tree the first time the builder is shown; normalize a
  // legacy/nested saved tree into flat Tag cards so it renders without crashing.
  // Also normalize excludeNoData for a tree that predates the flag (e.g. persisted
  // from an earlier session) so it reads as the current default (off) rather than
  // an undefined flag (SCRUM-6228).
  useEffect(() => {
    if (!tree) { dispatch(setAdvancedTopicQuery(createEmptyTree())); return; }
    if ((tree.children || []).some((c) => !isLeaf(c)) || tree.excludeNoData === undefined) {
      dispatch(setAdvancedTopicQuery(normalizeToFlatTree(tree)));
    }
  }, [tree, dispatch]);

  // Display-name lookup for chip values, so the preview reads like the mockup
  // (topic = "disease model") rather than showing raw curies.
  const labelFor = useMemo(() => buildValueLabeler(tree), [tree]);

  if (!tree || (tree.children || []).some((c) => !isLeaf(c))) return null;

  const tags = tree.children;
  const update = (newTree) => dispatch(setAdvancedTopicQuery(newTree));
  const setTag = (idx, newLeaf) =>
    update({ ...tree, children: tags.map((t, i) => (i === idx ? newLeaf : t)) });
  const addTag = () => update({ ...tree, children: [...tags, createLeaf()] });
  const removeTag = (idx) =>
    update({ ...tree, children: tags.filter((_t, i) => i !== idx) });
  const reset = () => update(createEmptyTree());

  const runSearch = () => {
    dispatch(setSearchResultsPage(1));
    dispatch(searchReferences());
  };

  const compiled = compileAdvancedQuery(tree);
  const empty = isAdvancedQueryEmpty(tree);
  const tetPart = compiled ? describeCompiledQuery(compiled, labelFor) : '(no Topic conditions yet)';
  const corpusPart = corpusMods.length > 0
    ? ` AND corpus in (${corpusMods.map((m) => `"${m}"`).join(', ')})`
    : '';

  return (
    <div style={{ padding: '4px 10px 10px', textAlign: 'left' }}>
      <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '6px' }}>
        Build a query over Topic sub-facets. Each <b>Tag</b> is one topic-entity tag the
        paper must have; fields inside a Tag apply to that <b>same</b> tag. Add another Tag
        for a requirement on a <b>different</b> tag of the same paper. Corpus, date and
        workflow facets still apply. Facet counts are not shown in advanced mode.
      </div>

      <div style={{ marginBottom: '8px' }}>
        <Form.Check
          type="checkbox"
          id="tetv-adv-exclude-no-data"
          checked={tree.excludeNoData === true}
          onChange={(e) => update({ ...tree, excludeNoData: e.target.checked })}
          label={
            <span style={{ fontSize: '0.8rem' }}>
              <b>Exclude no-data tags</b> — match only positive (has-data) tags, the
              same default as the facet search’s “exclude negative”. It appears in the
              query preview; uncheck to include no-data tags, or add an explicit
              “Has data” field to a Tag to override it there.
            </span>
          }
        />
      </div>

      <details style={{
        fontSize: '0.8rem', color: '#333', marginBottom: '8px',
        border: '1px solid #cfe2ff', borderRadius: '6px', backgroundColor: '#f6faff',
        padding: '4px 8px',
      }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#0d6efd' }}>
          How to use — AND/OR, tags, and examples
        </summary>
        <div style={{ marginTop: '6px', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600, marginTop: '2px' }}>The building blocks</div>
          <ul style={{ margin: '2px 0 6px', paddingLeft: '18px' }}>
            <li>
              A <b>Tag</b> is one topic-entity tag on a paper. Everything inside a Tag
              card must be true of that <b>same</b> tag.
            </li>
            <li>
              <b>Fields within a Tag</b> (Topic, Source method, Confidence level, Has
              data, …) are combined with <b>AND</b> — the same tag must satisfy all of them.
            </li>
            <li>
              <b>Multiple values on one field</b> are combined with <b>OR</b> — e.g. a
              Topic field with two values matches a tag whose topic is <i>either</i> one.
            </li>
            <li>
              <b>Multiple Tags</b> put requirements on <b>different</b> tags of the same
              paper. The <b>“paper must match”</b> selector (shown once you add a second
              Tag) sets how tags combine: <b>ALL Tags (AND)</b> = the paper must have
              every tag; <b>ANY Tag (OR)</b> = the paper must have at least one.
            </li>
            <li>
              <b>Exclude (paper must NOT have this tag)</b> — check this on a Tag to
              require the paper has <b>no</b> tag matching that card.
            </li>
            <li>
              <b>Has data</b> distinguishes positive tags (has data) from negated tags
              (no data). By default <b>Exclude no-data tags</b> is on, so every tag
              condition requires a positive tag — the facet search’s “exclude negative”.
              Uncheck it to include no-data tags, or add an explicit <b>Has data</b>{' '}
              field to a Tag (set to <b>no</b>) to override the default for that tag.
            </li>
            <li>
              <b>Validation (biocurator)</b> filters predicted tags by professional
              biocurator review: <b>validated right</b>, <b>validated wrong</b>,{' '}
              <b>not validated</b> (and <i>validation conflict</i> /{' '}
              <i>validated right (self)</i>). Use it to keep only confirmed predictions
              or to exclude ones a biocurator marked wrong.
            </li>
            <li>
              <b>Confidence score</b> is a min/max range. Value lists are scoped to the
              selected corpus/MOD; corpus, date and workflow facets still apply.
            </li>
            <li>The <b>Query preview</b> shows exactly what will be searched.</li>
          </ul>
          <div style={{ fontWeight: 600 }}>Examples</div>
          <ol style={{ margin: '2px 0 0', paddingLeft: '18px' }}>
            <li>
              <b>Disease-model tag from the ACKnowledge form that has data</b> — one Tag:
              Topic = disease model, Source method = acknowledge_form, Has data = yes.
            </li>
            <li>
              <b>Papers with BOTH a disease-model tag AND a separate gene tag</b> — Tag 1:
              Topic = disease model; Tag 2: Topic = gene expression; paper must match =
              ALL Tags (AND).
            </li>
            <li>
              <b>Disease-model tag from EITHER the ACKnowledge form OR the ABC classifier</b>
              {' '}— one Tag: Topic = disease model, and add two values to Source method
              (acknowledge_form OR abc classifier).
            </li>
            <li>
              <b>Exclude papers that have a no-data disease-model tag</b> — one Tag with
              “exclude” checked: Topic = disease model, Has data = no.
            </li>
            <li>
              <b>New-to-field transgene predictions, minus the ones a biocurator
              rejected</b> — one Tag: Topic = transgene, Data novelty = new to field,
              and add two values to Validation (biocurator): validated right OR not
              validated (this keeps confirmed and un-reviewed predictions while dropping
              “validated wrong”).
            </li>
          </ol>
        </div>
      </details>

      {tags.length >= 2 && (
        <InputGroup size="sm" style={{ width: 'auto', marginBottom: '4px' }}>
          <InputGroup.Text>paper must match</InputGroup.Text>
          <Form.Control
            as="select"
            aria-label="top-level operator"
            style={{ maxWidth: '11rem' }}
            value={tree.operator}
            onChange={(e) => update({ ...tree, operator: e.target.value })}
          >
            <option value="AND">ALL Tags (AND)</option>
            <option value="OR">ANY Tag (OR)</option>
          </Form.Control>
        </InputGroup>
      )}

      {tags.map((leaf, idx) => (
        <TagCard
          key={idx}
          leaf={leaf}
          index={idx}
          onChange={(newLeaf) => setTag(idx, newLeaf)}
          onRemove={() => removeTag(idx)}
          canRemove={tags.length > 1}
        />
      ))}

      <Button variant="link" size="sm" style={{ padding: 0 }} onClick={addTag}>+ add Tag (different tag on same paper)</Button>

      <div style={{
        marginTop: '8px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6',
        borderRadius: '6px', padding: '6px 8px',
      }}>
        <div style={{ fontSize: '0.7rem', color: '#6c757d', marginBottom: '2px' }}>Query preview</div>
        <code style={{ fontSize: '0.75rem', color: '#212529', wordBreak: 'break-word' }}>
          PAPER WHERE {tetPart}{corpusPart}
        </code>
      </div>

      <div style={{ marginTop: '8px' }}>
        <ButtonGroup size="sm">
          <Button variant="primary" onClick={runSearch} disabled={empty}>Run query</Button>
          <Button variant="outline-secondary" onClick={reset}>Reset</Button>
        </ButtonGroup>
      </div>
    </div>
  );
};

export default AdvancedTopicQueryBuilder;
