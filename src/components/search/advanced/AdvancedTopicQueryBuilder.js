import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Button, Form, InputGroup, OverlayTrigger, Popover } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faPlus } from '@fortawesome/free-solid-svg-icons';
import { api } from '../../../api';
import {
  setAdvancedTopicQuery,
  setSearchResultsPage,
  searchReferences,
  fetchAdvancedFacetsVocab,
} from '../../../actions/searchActions';
import { changeFieldEntityEntityList, fetchTaxonData } from '../../../actions/biblioActions';
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
  entityTypeNameForCurie,
} from './advancedQueryModel';

// Validation sentinels returned by changeFieldEntityEntityList when a typed name
// does not resolve to a real curie for the chosen species/entity type (mirrors
// TopicEntityCreate's warnTypesEntityValidation). Treated as "not found".
const ENTITY_WARN_CURIES = [
  'no Alliance curie', 'obsolete entity', 'not found at WB',
  'no WB curie', 'no SGD curie', 'no mod curie', 'duplicate',
];

// Species options for the Species field's dropdown: the Alliance MOD taxa (plus
// human), matching the TET create form's species list. Read from the shared
// biblio taxon data (loaded once by the builder via fetchTaxonData). Value is the
// NCBITaxon curie (what tags store, and what the entity lookup needs); label is the
// species name. Returns null until the data has loaded.
const useSpeciesOptions = () => {
  const modToTaxon = useSelector((s) => s.biblio.modToTaxon);
  const curieToNameTaxon = useSelector((s) => s.biblio.curieToNameTaxon);
  return useMemo(() => {
    if (!modToTaxon || !curieToNameTaxon) return null;
    const curies = [...new Set(Object.values(modToTaxon).flat().concat('NCBITaxon:9606'))];
    return curies
      .filter((c) => c && curieToNameTaxon[c])
      .map((c) => ({ value: c, label: curieToNameTaxon[c] }))
      .sort((a, b) => (a.label > b.label ? 1 : -1));
  }, [modToTaxon, curieToNameTaxon]);
};

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

// Entity adder: a specific entity (e.g. gene "ACT1"). The validation endpoint
// matches an EXACT name for a given entity type + taxon, so this is a
// type-the-name-then-validate box (not a suggestion typeahead). It needs the
// Tag's Entity type (-> name) and Species (-> NCBITaxon curie); until both are
// set it prompts for them. On a hit it adds a chip { value: curie, label: name }.
const EntityValueAdder = ({ hasValues, entityTypeCurie, taxon, onAdd }) => {
  const dispatch = useDispatch();
  const [text, setText] = useState('');
  const [status, setStatus] = useState(null); // null | 'pending' | 'notfound'
  const typeName = entityTypeNameForCurie(entityTypeCurie);
  const taxonReady = !!(taxon && String(taxon).trim());
  if (!typeName || !taxonReady) {
    return (
      <span style={{ fontSize: '0.75rem', color: '#b02a37' }}>
        Choose an <b>Entity type</b> and a <b>Species</b> for this tag first, then enter an entity name.
      </span>
    );
  }
  const validate = () => {
    const name = text.trim();
    if (!name) return;
    setStatus('pending');
    dispatch(changeFieldEntityEntityList(name, null, 'alliance', taxon, typeName, (result) => {
      const list = Array.isArray(result) ? result : [];
      const hit = list.find((r) => r && r.curie && !ENTITY_WARN_CURIES.includes(r.curie));
      if (hit) {
        onAdd(hit.curie, `${name} (${hit.curie})`);
        setText('');
        setStatus(null);
      } else {
        setStatus('notfound');
      }
    }));
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '0 0 auto' }}>
      <Form.Control
        type="text"
        size="sm"
        style={{ width: '16rem', maxWidth: '100%' }}
        placeholder={hasValues ? 'add entity, Enter' : 'entity name, e.g. ACT1 — Enter to validate'}
        aria-label="add entity"
        value={text}
        onChange={(e) => { setText(e.target.value); if (status) setStatus(null); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); validate(); } }}
        onBlur={validate}
      />
      {status === 'pending' && (
        <span style={{ fontSize: '0.7rem', color: '#6c757d' }}>validating…</span>
      )}
      {status === 'notfound' && (
        <span style={{ fontSize: '0.7rem', color: '#b02a37' }}>
          “{text.trim()}” not found for that species / entity type
        </span>
      )}
    </div>
  );
};

// The value editor for one field row: a chip list (OR) plus an adder. Range fields
// (confidence score) use a min/max pair instead of chips. Species uses the fixed
// MOD species dropdown; Entity uses a validate-on-type box (tagContext carries the
// sibling entity type + taxon it resolves against).
const ValueEditor = ({ row, onChange, tagContext }) => {
  const dispatch = useDispatch();
  const fieldOptions = useFieldOptions(row.field);
  const speciesOptions = useSpeciesOptions();
  // Species is a controlled dropdown of the MOD taxa; [] while the list loads so it
  // still renders as a (temporarily empty) select rather than a free-text box.
  const options = row.field === 'species' ? (speciesOptions || []) : fieldOptions;
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
            <span style={{
              fontSize: '0.62rem', fontWeight: 600, color: '#6c757d',
              backgroundColor: '#e9ecef', borderRadius: '10px', padding: '1px 7px',
              letterSpacing: '0.02em',
            }}>or</span>
          )}
          <ValueChip chip={chip} onRemove={() => removeChip(idx)} />
        </React.Fragment>
      ))}
      {row.field === 'entity' ? (
        <EntityValueAdder
          hasValues={values.length > 0}
          entityTypeCurie={tagContext?.entityTypeCurie}
          taxon={tagContext?.taxon}
          onAdd={addChip}
        />
      ) : options ? (
        <Form.Control
          as="select"
          size="sm"
          aria-label="add value"
          style={{
            width: 'auto', maxWidth: '12rem', flex: '0 0 auto',
            border: '1px dashed #cbd5e1', borderRadius: '14px',
            color: '#64748b', backgroundColor: 'transparent', fontSize: '0.8rem',
            height: 'auto', paddingTop: '2px', paddingBottom: '2px',
          }}
          value=""
          onChange={(e) => {
            const opt = options.find((o) => o.value === e.target.value);
            if (opt) addChip(opt.value, opt.label);
          }}
        >
          <option value="">{values.length ? 'add value…' : '— select —'}</option>
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
          style={{
            width: '12rem', maxWidth: '100%', flex: '0 0 auto',
            border: '1px dashed #cbd5e1', borderRadius: '14px', fontSize: '0.8rem',
          }}
          placeholder={values.length ? 'add value…' : 'type value, Enter'}
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

const FieldRow = ({ row, onChange, onRemove, canRemove, tagContext }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
    <Form.Control
      as="select"
      size="sm"
      aria-label="sub-facet field"
      style={{ maxWidth: '11rem', minWidth: '9rem', flex: '0 0 auto' }}
      value={row.field}
      onChange={(e) => onChange(createFieldRow(e.target.value))}
    >
      {TET_FIELD_DEFS.map((def) => (
        <option key={def.key} value={def.key}>{def.label}</option>
      ))}
    </Form.Control>
    <span style={{ color: '#94a3b8', fontWeight: 600, flex: '0 0 auto' }}>=</span>
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px',
      border: '1px solid #e3e8ef', borderRadius: '8px', backgroundColor: '#fbfcfe',
      padding: '4px 8px', minHeight: '36px',
    }}>
      <ValueEditor row={row} onChange={onChange} tagContext={tagContext} />
    </div>
    <Button
      variant="link" size="sm"
      onClick={onRemove} disabled={!canRemove}
      title="Remove field"
      aria-label="remove field"
      style={{
        flex: '0 0 auto', color: '#adb5bd', textDecoration: 'none',
        fontSize: '1.15rem', lineHeight: 1, padding: '0 4px',
      }}
    >×</Button>
  </div>
);

// One Tag card = one topic_entity_tag the paper must (or must not) have. All fields
// inside AND on the SAME tag; multiple values on a field OR. A second Tag card is a
// DIFFERENT tag on the same paper.
const TagCard = ({ leaf, index, onChange, onRemove, canRemove }) => {
  const dispatch = useDispatch();
  const setField = (idx, newRow) => {
    let fields = leaf.fields.map((f, i) => (i === idx ? newRow : f));
    // Picking "Entity" needs an entity type and a species to resolve the name
    // against (a gene is species-specific), so surface those fields automatically
    // if the Tag doesn't already have them — inserted just above the Entity row so
    // the curator fills them top-down.
    if (newRow.field === 'entity') {
      const missing = ['entity_type', 'species']
        .filter((k) => !fields.some((f) => f.field === k))
        .map((k) => createFieldRow(k));
      if (missing.length > 0) {
        fields = [...fields.slice(0, idx), ...missing, ...fields.slice(idx)];
      }
    }
    onChange({ ...leaf, fields });
  };
  const addField = () => onChange({ ...leaf, fields: [...leaf.fields, createFieldRow()] });
  const removeField = (idx) => {
    onChange({ ...leaf, fields: leaf.fields.filter((_f, i) => i !== idx) });
    // Re-pull the vocabulary so the dropdowns are full and fresh when a replacement
    // field is added after this removal.
    dispatch(fetchAdvancedFacetsVocab());
  };

  // Sibling context for the Entity resolver: the specific-entity lookup needs the
  // Tag's entity type (-> name) and species (-> NCBITaxon curie), both taken from
  // the first value of the matching field in this same Tag.
  const firstValue = (fieldKey) => {
    const f = leaf.fields.find((row) => row.field === fieldKey);
    return (f && Array.isArray(f.values) && f.values[0]) ? f.values[0].value : '';
  };
  const tagContext = { entityTypeCurie: firstValue('entity_type'), taxon: firstValue('species') };

  return (
    <div style={{
      border: '1px solid #e3e8ef', borderRadius: '12px',
      padding: '14px 16px', margin: '12px 0', backgroundColor: '#fff',
      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '8px', marginBottom: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#2563eb',
            color: '#fff', fontSize: '0.75rem', fontWeight: 700,
          }}>{index + 1}</span>
          <span style={{ fontWeight: 700 }}>Tag {index + 1}</span>
          <span style={{
            fontSize: '0.68rem', color: '#64748b', backgroundColor: '#f1f5f9',
            border: '1px solid #e2e8f0', borderRadius: '10px', padding: '2px 8px',
          }}>fields are AND inside Tag</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Form.Check
            type="checkbox"
            id={`tetv-tag-exclude-${index}`}
            label={<span style={{ fontSize: '0.8rem' }} title="paper must NOT have this tag">exclude</span>}
            checked={!!leaf.negate}
            style={{ marginBottom: 0 }}
            onChange={(e) => onChange({ ...leaf, negate: e.target.checked })}
          />
          <Button
            variant="link" size="sm"
            onClick={onRemove} disabled={!canRemove}
            title="Remove tag"
            style={{ color: '#94a3b8', textDecoration: 'none', padding: 0, fontSize: '0.8rem' }}
          ><FontAwesomeIcon icon={faTrashAlt} style={{ marginRight: '5px' }} />Remove tag</Button>
        </div>
      </div>
      {leaf.fields.map((row, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '11rem', margin: '3px 0' }}>
              <span style={{ flex: 1, height: '1px', backgroundColor: '#e3e8ef' }} />
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em' }}>AND</span>
              <span style={{ flex: 1, height: '1px', backgroundColor: '#e3e8ef' }} />
            </div>
          )}
          <FieldRow
            row={row}
            onChange={(newRow) => setField(idx, newRow)}
            onRemove={() => removeField(idx)}
            canRemove={leaf.fields.length > 1}
            tagContext={tagContext}
          />
        </React.Fragment>
      ))}
      <Button
        variant="outline-secondary" size="sm"
        onClick={addField}
        style={{ marginTop: '10px', borderRadius: '16px', fontSize: '0.8rem' }}
      ><FontAwesomeIcon icon={faPlus} style={{ marginRight: '6px' }} />Add field to Tag {index + 1}</Button>
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

  // Load the MOD species list once so the Species field's dropdown is populated
  // (shared biblio taxon data; the thunk caches and de-dupes fetches).
  useEffect(() => {
    dispatch(fetchTaxonData());
  }, [dispatch]);

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

  // The full "how to use" content, moved out of a page-consuming <details> block
  // into a click-to-open help popover so it no longer pushes Tag 1 off-screen (#3).
  const helpPopover = (
    <Popover id="tetv-adv-help" style={{ maxWidth: '540px' }}>
      <Popover.Title as="h3" style={{ fontSize: '0.9rem' }}>
        How to use — AND/OR, tags, and examples
      </Popover.Title>
      <Popover.Content style={{
        fontSize: '0.8rem', color: '#333', lineHeight: 1.5,
        maxHeight: '65vh', overflowY: 'auto',
      }}>
        <p style={{ marginBottom: '8px' }}>
          Build a query over Topic sub-facets. Each <b>Tag</b> is one topic-entity tag the
          paper must have; fields inside a Tag apply to that <b>same</b> tag. Add another Tag
          for a requirement on a <b>different</b> tag of the same paper. Corpus, date and
          workflow facets still apply. Facet counts are not shown in advanced mode.
        </p>
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
            <b>Entity</b> matches a specific entity (e.g. the gene <i>ACT1</i>) by
            name and stores its curie. Picking it adds <b>Entity type</b> and{' '}
            <b>Species</b> fields for you (an entity is species-specific); choose
            those, then type the exact name and press Enter to validate it.
          </li>
          <li>
            <b>Has data</b> distinguishes positive tags (has data) from negated tags
            (no data). The tree-wide <b>Exclude no-data tags</b> toggle (off by
            default) adds has-data=yes to every tag condition — the facet search’s
            “exclude negative”. Turn it on for positive-only results, or add an
            explicit <b>Has data</b> field to a Tag (set to <b>no</b>) to control a
            single tag.
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
      </Popover.Content>
    </Popover>
  );

  return (
    <div style={{ textAlign: 'left' }}>
      {/* Header: title + global options (Exclude no-data) + help icon (#3). The long
          intro/help text now lives in the help popover instead of stacked above Tag 1. */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
        padding: '10px 16px', borderBottom: '1px solid #cfe2ff', backgroundColor: '#eef5ff',
        borderTopLeftRadius: '9px', borderTopRightRadius: '9px', flexWrap: 'wrap',
      }}>
        <span style={{ fontWeight: 600, letterSpacing: '0.01em' }}>Advanced Topic query</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Form.Check
            type="checkbox"
            id="tetv-adv-exclude-no-data"
            checked={tree.excludeNoData === true}
            onChange={(e) => update({ ...tree, excludeNoData: e.target.checked })}
            label={
              <span
                style={{ fontSize: '0.8rem' }}
                title="Match only positive (has-data) tags — adds has-data=yes to every tag condition. See help for details."
              >Exclude no-data tags</span>
            }
            style={{ marginBottom: 0 }}
          />
          <OverlayTrigger trigger="click" placement="bottom-end" rootClose overlay={helpPopover}>
            <span
              role="button"
              tabIndex={0}
              aria-label="How to use the advanced query builder"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '20px', height: '20px', borderRadius: '50%',
                border: '1px solid #0d6efd', color: '#0d6efd',
                fontSize: '0.72rem', fontWeight: 700, lineHeight: 1, cursor: 'pointer',
              }}
            >?</span>
          </OverlayTrigger>
        </div>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {tags.length >= 2 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
            marginBottom: '4px',
          }}>
            <span style={{
              fontSize: '0.72rem', fontWeight: 700, color: '#475569', letterSpacing: '0.06em',
            }}>PAPER MUST MATCH</span>
            <Form.Control
              as="select"
              size="sm"
              aria-label="top-level operator"
              style={{ maxWidth: '11rem', width: 'auto', borderRadius: '16px' }}
              value={tree.operator}
              onChange={(e) => update({ ...tree, operator: e.target.value })}
            >
              <option value="AND">ALL Tags (AND)</option>
              <option value="OR">ANY Tag (OR)</option>
            </Form.Control>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {tree.operator === 'AND'
                ? 'Paper must contain every Tag below'
                : 'Paper must contain at least one Tag below'}
            </span>
          </div>
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

        <Button
          variant="outline-primary"
          onClick={addTag}
          style={{
            width: '100%', marginTop: '4px', borderStyle: 'dashed',
            borderRadius: '10px', fontSize: '0.85rem',
          }}
        ><FontAwesomeIcon icon={faPlus} style={{ marginRight: '6px' }} />Add another Tag (different tag on same paper)</Button>
      </div>

      {/* Sticky footer: query preview + Run/Reset, kept in view while editing (#4). */}
      <div style={{
        position: 'sticky', bottom: 0, zIndex: 5,
        display: 'flex', alignItems: 'stretch', gap: '12px', flexWrap: 'wrap',
        padding: '10px 16px', backgroundColor: '#fff',
        borderTop: '1px solid #e3e8ef',
        borderBottomLeftRadius: '9px', borderBottomRightRadius: '9px',
        boxShadow: '0 -2px 6px rgba(15, 23, 42, 0.05)',
      }}>
        <div style={{
          flex: 1, minWidth: '240px', backgroundColor: '#0d1b2a',
          borderRadius: '8px', padding: '8px 12px', overflowX: 'auto',
        }}>
          <div style={{
            fontSize: '0.62rem', color: '#7c96b3', marginBottom: '3px',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>Query preview</div>
          <code style={{
            fontSize: '0.75rem', color: '#a9d5ff', wordBreak: 'break-word',
            whiteSpace: 'pre-wrap', fontFamily: 'monospace',
          }}>
            PAPER WHERE {tetPart}{corpusPart}
          </code>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center' }}>
          <Button variant="primary" size="sm" onClick={runSearch} disabled={empty}>Run query</Button>
          <Button variant="outline-secondary" size="sm" onClick={reset}>Reset</Button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedTopicQueryBuilder;
