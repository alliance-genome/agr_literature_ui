# Tag Validation Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working demo of `TetValidationGrid` — a multi-reference per-source TET grid with topic columns, integrated as a togglable "TET grid view" on the existing search results page.

**Architecture:** Pure client-side React component reusing existing API endpoints (`/reference/by_cross_reference`, `/reference/{curie}`, `/topic_entity_tag/by_reference`, `/atp/search_topic`, `POST /topic_entity_tag/`). Built modularly so a future multi-ID paste box and standalone page can plug in via the same `referenceIds: string[]` + optional `topics` prop.

**Tech Stack:** React 18, Redux (existing biblio/isLogged slices), AgGrid Community 32.3.8 (`ag-grid-react`), `react-bootstrap`, `react-bootstrap-typeahead` AsyncTypeahead, FontAwesome icons. Tests: Jest via `react-app-rewired test` for pure functions; Playwright MCP for component-level smoke tests (per CLAUDE.md project convention).

**Spec:** `docs/superpowers/specs/2026-04-30-tag-validation-grid-design.md`.

---

## File structure

New files (under `src/components/refs_tet_validation/`):

- `TetValidationGrid.jsx` — the modular grid container (props `referenceIds`, `topics?`, `mod?`).
- `TetValidationGrid.css` — cell layout, mini-row, badges, validation strip styles.
- `hooks/useReferenceTets.js` — resolve mixed IDs, fetch TETs per reference, expose `{ rows, unresolved, loading, refetchRow }`.
- `helpers/groupTets.js` — pure helpers: `groupTetsByTopicAndSource(tets)`, `cellPredicate(tets, currentUid, filterModel)`, `cellSortRank(tets)`. Easy to unit-test.
- `cellRenderers/ReferenceCell.jsx` — sticky-left compact biblio cell.
- `cellRenderers/TopicCell.jsx` — composes `SourceMiniRow` stack + `CellValidationStrip`; receives a `displayOptions` context.
- `cellRenderers/SourceMiniRow.jsx` — one mini-row per TET (label + Y/N pill or inline-note + note icon + optional confidence badges).
- `cellRenderers/NoteModal.jsx` — Bootstrap modal showing the full note text.
- `cellRenderers/CellValidationStrip.jsx` — positive/negative buttons that POST a new TET.
- `filters/TopicCellFilter.jsx` — per-column AgGrid filter component.
- `filters/SourceFilter.jsx` — toolbar `MultiFilter` for cross-column source filtering.
- `toolbar/TetGridToolbar.jsx` — cell-display toggles + topic visibility filter + + Add topic typeahead + source filter.

Modified files:

- `src/components/search/SearchLayout.js` — add the **List view** / **TET grid view** toggle and the `<TetValidationGrid …/>` integration block.
- `src/components/search/SearchResults.js` — accept and respect a `view` prop (or a sibling component renders one or the other based on the toggle in `SearchLayout`).

Tests:

- `src/components/refs_tet_validation/helpers/__tests__/groupTets.test.js` — unit tests for the pure helpers.
- `src/components/refs_tet_validation/hooks/__tests__/useReferenceTets.test.js` — hook test using `@testing-library/react` `renderHook` + mocked `api`.

No new backend code. No new routes.

---

## Conventions & shared snippets

Used throughout the plan:

```js
// MOD detection (existing pattern in TopicEntityCreate.js, ValidationByCurator.jsx, etc.)
import { useSelector } from 'react-redux';
const cognitoMod = useSelector(s => s.isLogged.cognitoMod);
const testerMod = useSelector(s => s.isLogged.testerMod);
const accessLevel = testerMod !== 'No' ? testerMod : cognitoMod;
```

```js
// API axios instance with auth headers (existing convention)
import { api } from '../../../api';
```

```js
// Topic name resolution (existing pattern: TopicEntityTable.js calls /ontology/map_curie_to_name/atpterm/{curie})
const resp = await api.get(`/ontology/map_curie_to_name/atpterm/${encodeURIComponent(topicCurie)}`);
const topicName = resp.data; // string
```

Source label format used by `groupTets.js` and consumed by `SourceMiniRow.jsx`:

```js
function sourceLabel(source) {
  const method = source?.source_method || 'unknown';
  const sec = source?.secondary_data_provider_abbreviation;
  const dp = source?.data_provider;
  return sec ? `${method} / ${sec}` : (dp ? `${method} / ${dp}` : method);
}
```

---

## Task 1: Helpers — `groupTets.js` with unit tests

**Files:**
- Create: `src/components/refs_tet_validation/helpers/groupTets.js`
- Test: `src/components/refs_tet_validation/helpers/__tests__/groupTets.test.js`

- [ ] **Step 1.1: Create test file with the first failing test**

```js
// src/components/refs_tet_validation/helpers/__tests__/groupTets.test.js
import { sourceLabel, groupTetsByTopicAndSource, cellSortRank, cellPredicate } from '../groupTets';

describe('sourceLabel', () => {
  test('uses secondary_data_provider when present', () => {
    expect(sourceLabel({ source_method: 'textpresso', secondary_data_provider_abbreviation: 'WB' }))
      .toBe('textpresso / WB');
  });
  test('falls back to data_provider when secondary missing', () => {
    expect(sourceLabel({ source_method: 'manual', data_provider: 'Alliance' })).toBe('manual / Alliance');
  });
  test('handles missing fields', () => {
    expect(sourceLabel({})).toBe('unknown');
  });
});
```

- [ ] **Step 1.2: Run the test, expect it to fail with module-not-found**

Run: `npx --no-install react-app-rewired test --watchAll=false src/components/refs_tet_validation/helpers/__tests__/groupTets.test.js`
Expected: FAIL — Cannot find module '../groupTets'.

- [ ] **Step 1.3: Implement `sourceLabel`**

```js
// src/components/refs_tet_validation/helpers/groupTets.js
export function sourceLabel(source) {
  const method = source?.source_method || 'unknown';
  const sec = source?.secondary_data_provider_abbreviation;
  const dp = source?.data_provider;
  if (sec) return `${method} / ${sec}`;
  if (dp) return `${method} / ${dp}`;
  return method;
}

// Stubs filled in by later steps — keep exports for the test file to import.
export function groupTetsByTopicAndSource() { return new Map(); }
export function cellSortRank() { return 0; }
export function cellPredicate() { return true; }
```

- [ ] **Step 1.4: Run the test, expect PASS**

Run: same command. Expected: 3 passing tests.

- [ ] **Step 1.5: Add tests for `groupTetsByTopicAndSource`**

Append to test file:

```js
describe('groupTetsByTopicAndSource', () => {
  const tets = [
    { topic_entity_tag_id: 1, topic: 'ATP:001', negated: false,
      topic_entity_tag_source: { source_method: 'textpresso', secondary_data_provider_abbreviation: 'WB' } },
    { topic_entity_tag_id: 2, topic: 'ATP:001', negated: true,
      topic_entity_tag_source: { source_method: 'manual', secondary_data_provider_abbreviation: 'WB' } },
    { topic_entity_tag_id: 3, topic: 'ATP:002', negated: false,
      topic_entity_tag_source: { source_method: 'textpresso', secondary_data_provider_abbreviation: 'WB' } },
  ];
  test('groups by topic curie then by source label', () => {
    const grouped = groupTetsByTopicAndSource(tets);
    expect([...grouped.keys()].sort()).toEqual(['ATP:001', 'ATP:002']);
    const t1 = grouped.get('ATP:001');
    expect([...t1.keys()].sort()).toEqual(['manual / WB', 'textpresso / WB']);
    expect(t1.get('textpresso / WB')).toHaveLength(1);
    expect(t1.get('textpresso / WB')[0].topic_entity_tag_id).toBe(1);
  });
  test('preserves duplicate TETs within the same source group', () => {
    const dup = [
      { topic_entity_tag_id: 10, topic: 'ATP:001', negated: false,
        topic_entity_tag_source: { source_method: 'textpresso', secondary_data_provider_abbreviation: 'WB' } },
      { topic_entity_tag_id: 11, topic: 'ATP:001', negated: false,
        topic_entity_tag_source: { source_method: 'textpresso', secondary_data_provider_abbreviation: 'WB' } },
    ];
    const grouped = groupTetsByTopicAndSource(dup);
    expect(grouped.get('ATP:001').get('textpresso / WB')).toHaveLength(2);
  });
});
```

- [ ] **Step 1.6: Run and expect failure**

Same command. Expected: 2 failures (returns empty Map).

- [ ] **Step 1.7: Implement `groupTetsByTopicAndSource`**

Replace the stub:

```js
export function groupTetsByTopicAndSource(tets) {
  const byTopic = new Map();
  for (const tet of tets || []) {
    const topicKey = tet.topic;
    const label = sourceLabel(tet.topic_entity_tag_source);
    if (!byTopic.has(topicKey)) byTopic.set(topicKey, new Map());
    const bySource = byTopic.get(topicKey);
    if (!bySource.has(label)) bySource.set(label, []);
    bySource.get(label).push(tet);
  }
  return byTopic;
}
```

- [ ] **Step 1.8: Run and expect PASS**

- [ ] **Step 1.9: Add tests + implementation for `cellSortRank` and `cellPredicate`**

Append tests:

```js
describe('cellSortRank', () => {
  test('returns 2 when any TET is positive', () => {
    expect(cellSortRank([{ negated: false }, { negated: true }])).toBe(2);
  });
  test('returns 1 when only negated TETs', () => {
    expect(cellSortRank([{ negated: true }])).toBe(1);
  });
  test('returns 0 for empty cell', () => {
    expect(cellSortRank([])).toBe(0);
    expect(cellSortRank(undefined)).toBe(0);
  });
});

describe('cellPredicate', () => {
  const uid = 'curator-uid';
  const tets = [
    { negated: false, note: null, created_by: 'pipeline-uid' },
    { negated: true, note: 'looks wrong', created_by: 'pipeline-uid' },
  ];
  test('empty model passes everything', () => {
    expect(cellPredicate(tets, uid, [])).toBe(true);
    expect(cellPredicate([], uid, [])).toBe(true);
  });
  test('"empty" matches only empty cells', () => {
    expect(cellPredicate([], uid, ['empty'])).toBe(true);
    expect(cellPredicate(tets, uid, ['empty'])).toBe(false);
  });
  test('"has any tag" matches non-empty', () => {
    expect(cellPredicate(tets, uid, ['has any tag'])).toBe(true);
    expect(cellPredicate([], uid, ['has any tag'])).toBe(false);
  });
  test('"has Y" matches when any negated=false', () => {
    expect(cellPredicate(tets, uid, ['has Y'])).toBe(true);
    expect(cellPredicate([{ negated: true }], uid, ['has Y'])).toBe(false);
  });
  test('"has N" matches when any negated=true', () => {
    expect(cellPredicate(tets, uid, ['has N'])).toBe(true);
    expect(cellPredicate([{ negated: false }], uid, ['has N'])).toBe(false);
  });
  test('"has note" matches when any non-null note', () => {
    expect(cellPredicate(tets, uid, ['has note'])).toBe(true);
    expect(cellPredicate([{ note: null }], uid, ['has note'])).toBe(false);
  });
  test('"my validation present" matches when any TET created_by current uid', () => {
    expect(cellPredicate(tets, uid, ['my validation present'])).toBe(false);
    expect(cellPredicate([...tets, { created_by: uid }], uid, ['my validation present'])).toBe(true);
  });
  test('multiple selections combine with OR', () => {
    expect(cellPredicate([{ negated: false }], uid, ['has N', 'has Y'])).toBe(true);
    expect(cellPredicate([{ negated: true }], uid, ['has N', 'has Y'])).toBe(true);
    expect(cellPredicate([], uid, ['has N', 'has Y'])).toBe(false);
  });
});
```

Replace stubs:

```js
const TET_FILTER_KEYS = ['has any tag', 'has Y', 'has N', 'has note', 'my validation present', 'empty'];

export function cellSortRank(tets) {
  const arr = tets || [];
  if (arr.length === 0) return 0;
  if (arr.some(t => t.negated === false)) return 2;
  return 1;
}

export function cellPredicate(tets, currentUid, model) {
  if (!Array.isArray(model) || model.length === 0) return true;
  const arr = tets || [];
  return model.some(key => {
    switch (key) {
      case 'empty':                 return arr.length === 0;
      case 'has any tag':           return arr.length > 0;
      case 'has Y':                 return arr.some(t => t.negated === false);
      case 'has N':                 return arr.some(t => t.negated === true);
      case 'has note':              return arr.some(t => t.note != null && t.note !== '');
      case 'my validation present': return arr.some(t => t.created_by === currentUid);
      default:                      return false;
    }
  });
}

export const TOPIC_CELL_FILTER_KEYS = TET_FILTER_KEYS;
```

Run tests, expect PASS for all.

- [ ] **Step 1.10: Commit**

```bash
git add src/components/refs_tet_validation/helpers/groupTets.js \
        src/components/refs_tet_validation/helpers/__tests__/groupTets.test.js
git commit -m "feat(scrum-6018): add TET grouping/predicate helpers with unit tests"
```

---

## Task 2: Data hook — `useReferenceTets`

**Files:**
- Create: `src/components/refs_tet_validation/hooks/useReferenceTets.js`
- Test: `src/components/refs_tet_validation/hooks/__tests__/useReferenceTets.test.js`

The hook resolves a mixed-id list to canonical references with biblio + TETs. Returns `{ rows, unresolved, loading, refetchRow }`.

- [ ] **Step 2.1: Write the failing hook test**

```js
// src/components/refs_tet_validation/hooks/__tests__/useReferenceTets.test.js
import { renderHook, waitFor } from '@testing-library/react';
import { api } from '../../../../api';
import { useReferenceTets } from '../useReferenceTets';

jest.mock('../../../../api', () => ({
  api: { get: jest.fn() }
}));

beforeEach(() => api.get.mockReset());

function mockResolve(id, payload) {
  api.get.mockImplementation((url) => {
    if (url.startsWith('/reference/by_cross_reference/')) {
      return Promise.resolve({ data: payload });
    }
    if (url === `/reference/${payload.curie}`) {
      return Promise.resolve({ data: payload });
    }
    if (url.startsWith('/topic_entity_tag/by_reference/')) {
      return Promise.resolve({ data: { topic_entity_tags: [] } });
    }
    return Promise.reject(new Error('unmocked: ' + url));
  });
}

test('resolves a single PMID and fetches TETs', async () => {
  mockResolve('PMID:1', { curie: 'AGRKB:1', title: 'X', authors: [], date_published: '2024' });
  const { result } = renderHook(() => useReferenceTets(['PMID:1']));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.rows).toHaveLength(1);
  expect(result.current.rows[0].curie).toBe('AGRKB:1');
  expect(result.current.unresolved).toEqual([]);
});

test('reports unresolved IDs', async () => {
  api.get.mockImplementation(() => Promise.reject({ response: { status: 404 } }));
  const { result } = renderHook(() => useReferenceTets(['PMID:DOES_NOT_EXIST']));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.rows).toHaveLength(0);
  expect(result.current.unresolved).toEqual(['PMID:DOES_NOT_EXIST']);
});
```

- [ ] **Step 2.2: Run, expect FAIL** (module not found).

Run: `npx --no-install react-app-rewired test --watchAll=false src/components/refs_tet_validation/hooks/__tests__/useReferenceTets.test.js`

- [ ] **Step 2.3: Implement the hook**

```js
// src/components/refs_tet_validation/hooks/useReferenceTets.js
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../api';

async function resolveOne(id) {
  // AGRKB curies go to /reference/{curie}; everything else through /reference/by_cross_reference/{id}
  try {
    if (id.startsWith('AGRKB:')) {
      const r = await api.get(`/reference/${encodeURIComponent(id)}`);
      return r.data;
    }
    const r = await api.get(`/reference/by_cross_reference/${encodeURIComponent(id)}`);
    return r.data;
  } catch {
    return null;
  }
}

async function fetchTets(curie) {
  try {
    const r = await api.get(`/topic_entity_tag/by_reference/${encodeURIComponent(curie)}?page=1&page_size=8000`);
    // backend returns { topic_entity_tags: [...] } per existing TopicEntityTable usage
    return r.data?.topic_entity_tags || r.data || [];
  } catch {
    return [];
  }
}

export function useReferenceTets(referenceIds) {
  const [rows, setRows] = useState([]);
  const [unresolved, setUnresolved] = useState([]);
  const [loading, setLoading] = useState(true);
  const reqIdRef = useRef(0);

  const loadRow = useCallback(async (input) => {
    const ref = await resolveOne(input);
    if (!ref?.curie) return { input, ref: null };
    const tets = await fetchTets(ref.curie);
    return { input, ref, tets };
  }, []);

  useEffect(() => {
    const reqId = ++reqIdRef.current;
    let cancelled = false;
    setLoading(true);
    setRows([]); setUnresolved([]);

    (async () => {
      const ids = Array.from(new Set((referenceIds || []).map(s => s.trim()).filter(Boolean)));
      const newRows = [];
      const newUnresolved = [];
      // Run with limited concurrency (8) to avoid melting the server
      const concurrency = 8;
      let cursor = 0;
      async function worker() {
        while (cursor < ids.length) {
          const i = cursor++;
          const out = await loadRow(ids[i]);
          if (cancelled || reqId !== reqIdRef.current) return;
          if (!out.ref) newUnresolved.push(out.input);
          else newRows.push({ input: out.input, curie: out.ref.curie, biblio: out.ref, tets: out.tets });
        }
      }
      await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker));
      if (cancelled || reqId !== reqIdRef.current) return;
      setRows(newRows);
      setUnresolved(newUnresolved);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [JSON.stringify(referenceIds || [])]); // eslint-disable-line react-hooks/exhaustive-deps

  const refetchRow = useCallback(async (curie) => {
    const tets = await fetchTets(curie);
    setRows(prev => prev.map(r => r.curie === curie ? { ...r, tets } : r));
  }, []);

  return { rows, unresolved, loading, refetchRow };
}
```

- [ ] **Step 2.4: Run and expect PASS**

If `@testing-library/react` is missing, add it as a dev dep first:

```bash
npm i -D @testing-library/react
```

Then re-run.

- [ ] **Step 2.5: Commit**

```bash
git add src/components/refs_tet_validation/hooks/useReferenceTets.js \
        src/components/refs_tet_validation/hooks/__tests__/useReferenceTets.test.js \
        package.json package-lock.json
git commit -m "feat(scrum-6018): add useReferenceTets data hook"
```

---

## Task 3: `NoteModal` component

**Files:** Create: `src/components/refs_tet_validation/cellRenderers/NoteModal.jsx`

- [ ] **Step 3.1: Create the component**

```jsx
// src/components/refs_tet_validation/cellRenderers/NoteModal.jsx
import React from 'react';
import { Modal, Button } from 'react-bootstrap';

export default function NoteModal({ show, onHide, sourceLabel, note }) {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Note — {sourceLabel}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ whiteSpace: 'pre-wrap' }}>{note || '(empty)'}</Modal.Body>
      <Modal.Footer><Button variant="secondary" onClick={onHide}>Close</Button></Modal.Footer>
    </Modal>
  );
}
```

- [ ] **Step 3.2: Commit**

```bash
git add src/components/refs_tet_validation/cellRenderers/NoteModal.jsx
git commit -m "feat(scrum-6018): add NoteModal for full TET note text"
```

---

## Task 4: `SourceMiniRow` component

**Files:** Create: `src/components/refs_tet_validation/cellRenderers/SourceMiniRow.jsx`

Renders one TET as a single mini-row. Receives `displayOptions` (`{ inlineNote, showLevel, showScore }`) and an `onShowNote(tet)` callback.

- [ ] **Step 4.1: Create the component**

```jsx
// src/components/refs_tet_validation/cellRenderers/SourceMiniRow.jsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStickyNote } from '@fortawesome/free-solid-svg-icons';

const truncate = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s);

export default function SourceMiniRow({ tet, sourceLabel, displayOptions, onShowNote }) {
  const negated = tet.negated === true;
  const hasNote = tet.note != null && tet.note !== '';
  const inlineNoteOn = displayOptions?.inlineNote && hasNote;

  const pillClass = negated ? 'tetv-pill tetv-pill-n' : 'tetv-pill tetv-pill-y';
  const dotClass = negated ? 'tetv-dot-n' : 'tetv-dot-y';

  return (
    <div className="tetv-mini-row">
      <span className="tetv-source-label" title={sourceLabel}>{sourceLabel}</span>
      {inlineNoteOn ? (
        <>
          <span className="tetv-inline-note" title={tet.note}>{truncate(tet.note, 60)}</span>
          <span className={dotClass} aria-label={negated ? 'N' : 'Y'} />
        </>
      ) : (
        <span className={pillClass}>{negated ? 'N' : 'Y'}</span>
      )}
      {hasNote && (
        <button type="button" className="tetv-note-btn" onClick={() => onShowNote(tet)} title="View full note">
          <FontAwesomeIcon icon={faStickyNote} />
        </button>
      )}
      {displayOptions?.showLevel && tet.confidence_level && (
        <span className="tetv-badge tetv-badge-level">{tet.confidence_level}</span>
      )}
      {displayOptions?.showScore && tet.confidence_score != null && (
        <span className="tetv-badge tetv-badge-score">{Number(tet.confidence_score).toFixed(2)}</span>
      )}
    </div>
  );
}
```

- [ ] **Step 4.2: Commit**

```bash
git add src/components/refs_tet_validation/cellRenderers/SourceMiniRow.jsx
git commit -m "feat(scrum-6018): add SourceMiniRow renderer with display-option toggles"
```

---

## Task 5: `CellValidationStrip`

**Files:** Create: `src/components/refs_tet_validation/cellRenderers/CellValidationStrip.jsx`

Two icon buttons (positive/negative). On click, POST a new TET, then call `onValidated(curie)` so the row reloads.

- [ ] **Step 5.1: Create the component**

```jsx
// src/components/refs_tet_validation/cellRenderers/CellValidationStrip.jsx
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { api } from '../../../api';

export default function CellValidationStrip({
  referenceCurie,
  topicCurie,
  cellTets,
  onValidated,
}) {
  const uid = useSelector(s => s.isLogged.uid);
  const topicEntitySourceId = useSelector(s => s.biblio.topicEntitySourceId);
  const [busy, setBusy] = useState(false);

  const myExisting = (cellTets || []).find(t => t.created_by === uid);
  const greyPositive = myExisting && myExisting.negated === false;
  const greyNegative = myExisting && myExisting.negated === true;

  async function submit(kind) {
    if (busy || !topicEntitySourceId) return;
    setBusy(true);
    const negated = kind === 'negative';
    const payload = {
      reference_curie: referenceCurie,
      topic: topicCurie,
      negated,
      topic_entity_tag_source_id: topicEntitySourceId,
      force_insertion: true,
      entity: null,
      entity_type: null,
      species: null,
      data_novelty: null,
      confidence_score: null,
      confidence_level: null,
      note: null,
    };
    try {
      await api.post('/topic_entity_tag/', payload);
      await onValidated?.(referenceCurie);
    } catch (e) {
      // surface a tiny inline error; not modal — keeps grid lightweight
      console.error('TET validation submit failed', e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tetv-strip">
      <button
        type="button"
        className={`tetv-strip-btn tetv-strip-pos ${greyPositive ? 'tetv-strip-active' : ''}`}
        onClick={() => submit('positive')}
        disabled={busy || !topicEntitySourceId}
        title="positive (topic present)"
      >
        <FontAwesomeIcon icon={faCheckCircle} />
        <span>positive</span>
      </button>
      <button
        type="button"
        className={`tetv-strip-btn tetv-strip-neg ${greyNegative ? 'tetv-strip-active' : ''}`}
        onClick={() => submit('negative')}
        disabled={busy || !topicEntitySourceId}
        title="negative (topic not present)"
      >
        <FontAwesomeIcon icon={faTimesCircle} />
        <span>negative</span>
      </button>
    </div>
  );
}
```

- [ ] **Step 5.2: Commit**

```bash
git add src/components/refs_tet_validation/cellRenderers/CellValidationStrip.jsx
git commit -m "feat(scrum-6018): add CellValidationStrip (positive/negative TET submit)"
```

---

## Task 6: `TopicCell` — composes mini-row stack + strip + note modal

**Files:** Create: `src/components/refs_tet_validation/cellRenderers/TopicCell.jsx`

This is an AgGrid `cellRenderer` (function component receiving `params`). The `params.value` is the array of TETs for `(row, topic)` (set up by a `valueGetter` in TetValidationGrid). `params.colDef.cellRendererParams` carries `{ topicCurie, displayOptions, refetchRow, sourceFilterModel }`.

- [ ] **Step 6.1: Create the component**

```jsx
// src/components/refs_tet_validation/cellRenderers/TopicCell.jsx
import React, { useMemo, useState } from 'react';
import SourceMiniRow from './SourceMiniRow';
import CellValidationStrip from './CellValidationStrip';
import NoteModal from './NoteModal';
import { sourceLabel } from '../helpers/groupTets';

export default function TopicCell(params) {
  const tets = params.value || [];
  const { topicCurie, displayOptions, refetchRow, sourceFilterModel } = params.colDef.cellRendererParams || {};
  const referenceCurie = params.data?.curie;

  const [noteOpen, setNoteOpen] = useState(null); // { tet, label } or null

  // Group by source label, in stable insertion order
  const grouped = useMemo(() => {
    const m = new Map();
    for (const t of tets) {
      const lab = sourceLabel(t.topic_entity_tag_source);
      if (sourceFilterModel && Array.isArray(sourceFilterModel) && !sourceFilterModel.includes(lab)) continue;
      if (!m.has(lab)) m.set(lab, []);
      m.get(lab).push(t);
    }
    return m;
  }, [tets, sourceFilterModel]);

  return (
    <div className="tetv-cell">
      {[...grouped.entries()].map(([label, items], idx) => (
        <div key={label} className={`tetv-source-group ${idx > 0 ? 'tetv-source-group-sep' : ''}`}>
          {items.map((t) => (
            <SourceMiniRow
              key={t.topic_entity_tag_id}
              tet={t}
              sourceLabel={label}
              displayOptions={displayOptions}
              onShowNote={(tet) => setNoteOpen({ tet, label })}
            />
          ))}
        </div>
      ))}
      <CellValidationStrip
        referenceCurie={referenceCurie}
        topicCurie={topicCurie}
        cellTets={tets}
        onValidated={refetchRow}
      />
      <NoteModal
        show={!!noteOpen}
        onHide={() => setNoteOpen(null)}
        sourceLabel={noteOpen?.label}
        note={noteOpen?.tet?.note}
      />
    </div>
  );
}
```

- [ ] **Step 6.2: Commit**

```bash
git add src/components/refs_tet_validation/cellRenderers/TopicCell.jsx
git commit -m "feat(scrum-6018): add TopicCell composer (mini-rows + strip + modal)"
```

---

## Task 7: `ReferenceCell` — sticky-left compact biblio cell

**Files:** Create: `src/components/refs_tet_validation/cellRenderers/ReferenceCell.jsx`

- [ ] **Step 7.1: Create the component**

```jsx
// src/components/refs_tet_validation/cellRenderers/ReferenceCell.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function ReferenceCell(params) {
  const r = params.data?.biblio || {};
  const curie = params.data?.curie;
  const pmid = (r.cross_references || []).find(x => x.curie?.startsWith('PMID:'))?.curie;
  const year = r.date_published ? String(r.date_published).slice(0, 4) : '';
  const authors = (r.authors || []).slice(0, 3).map(a => a.name).join(', ')
    + ((r.authors || []).length > 3 ? ', et al.' : '');
  return (
    <div className="tetv-ref-cell">
      <div className="tetv-ref-title">
        <Link to={`/Biblio?action=display&referenceCurie=${encodeURIComponent(curie)}`}
              dangerouslySetInnerHTML={{ __html: r.title || curie }} />
      </div>
      <div className="tetv-ref-meta">
        <span className="tetv-ref-curie">{curie}</span>
        {pmid && <span className="tetv-ref-pmid"> · {pmid}</span>}
        {year && <span className="tetv-ref-year"> · {year}</span>}
        {r.journal && <span className="tetv-ref-journal"> · {r.journal}</span>}
      </div>
      <div className="tetv-ref-authors">{authors}</div>
    </div>
  );
}
```

- [ ] **Step 7.2: Commit**

```bash
git add src/components/refs_tet_validation/cellRenderers/ReferenceCell.jsx
git commit -m "feat(scrum-6018): add ReferenceCell sticky-left biblio renderer"
```

---

## Task 8: `TopicCellFilter` — per-topic-column filter

**Files:** Create: `src/components/refs_tet_validation/filters/TopicCellFilter.jsx`

Mirrors `MultiFilter.jsx` but uses our predicate keys.

- [ ] **Step 8.1: Create the component**

```jsx
// src/components/refs_tet_validation/filters/TopicCellFilter.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { useGridFilter } from 'ag-grid-react';
import { useSelector } from 'react-redux';
import { TOPIC_CELL_FILTER_KEYS, cellPredicate } from '../helpers/groupTets';

const TopicCellFilter = ({ model: rawModel, onModelChange }) => {
  const model = Array.isArray(rawModel) ? rawModel : null;
  const uid = useSelector(s => s.isLogged.uid);
  const [closeFilter, setCloseFilter] = useState();
  const [unappliedModel, setUnappliedModel] = useState(model);

  const doesFilterPass = useCallback((params) => {
    const tets = params.data?.[`__topic_${params.colDef.cellRendererParams?.topicCurie}`]
      ?? params.value;
    return cellPredicate(tets, uid, model);
  }, [model, uid]);

  const afterGuiAttached = useCallback(({ hidePopup }) => setCloseFilter(() => hidePopup), []);
  useGridFilter({ doesFilterPass, afterGuiAttached });

  useEffect(() => setUnappliedModel(model), [model]);

  const onChange = (key, checked) => {
    const next = checked
      ? [...(unappliedModel || []), key]
      : (unappliedModel || []).filter(k => k !== key);
    setUnappliedModel(next.length === 0 ? null : next);
  };

  const apply = () => {
    onModelChange(unappliedModel);
    if (closeFilter) closeFilter();
  };

  return (
    <div className="custom-filter">
      <div>Topic cell filter</div><hr/>
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
      <hr/><button onClick={apply}>Apply</button>
    </div>
  );
};

export default TopicCellFilter;
```

- [ ] **Step 8.2: Commit**

```bash
git add src/components/refs_tet_validation/filters/TopicCellFilter.jsx
git commit -m "feat(scrum-6018): add TopicCellFilter (per-column AgGrid filter)"
```

---

## Task 9: `TetGridToolbar`

**Files:** Create: `src/components/refs_tet_validation/toolbar/TetGridToolbar.jsx`

Cell-display toggles, topic visibility filter (reuses `MultiFilter`), source filter (reuses `MultiFilter`), `+ Add topic` AsyncTypeahead.

- [ ] **Step 9.1: Create the component**

```jsx
// src/components/refs_tet_validation/toolbar/TetGridToolbar.jsx
import React, { useState } from 'react';
import { Form, Button } from 'react-bootstrap';
import { AsyncTypeahead } from 'react-bootstrap-typeahead';
import { api } from '../../../api';

export default function TetGridToolbar({
  displayOptions, setDisplayOptions,
  allTopics, hiddenTopicCuries, setHiddenTopicCuries,
  allSources, sourceFilterModel, setSourceFilterModel,
  mod, onAddTopic,
}) {
  const [topicSuggestions, setTopicSuggestions] = useState([]);
  const [topicQueryLoading, setTopicQueryLoading] = useState(false);

  async function searchTopics(q) {
    if (!q) return;
    setTopicQueryLoading(true);
    try {
      const r = await api.get(`/atp/search_topic/${encodeURIComponent(q)}`, {
        params: mod ? { mod_abbr: mod } : {},
      });
      setTopicSuggestions((r.data || []).map(t => ({ curie: t.curie, name: t.name })));
    } finally {
      setTopicQueryLoading(false);
    }
  }

  return (
    <div className="tetv-toolbar">
      <span className="tetv-toolbar-group">
        <Form.Check inline type="checkbox" id="tetv-inline"
          label="Inline note"
          checked={!!displayOptions.inlineNote}
          onChange={(e) => setDisplayOptions({ ...displayOptions, inlineNote: e.target.checked })}/>
        <Form.Check inline type="checkbox" id="tetv-level"
          label="Confidence level"
          checked={!!displayOptions.showLevel}
          onChange={(e) => setDisplayOptions({ ...displayOptions, showLevel: e.target.checked })}/>
        <Form.Check inline type="checkbox" id="tetv-score"
          label="Confidence score"
          checked={!!displayOptions.showScore}
          onChange={(e) => setDisplayOptions({ ...displayOptions, showScore: e.target.checked })}/>
      </span>

      <span className="tetv-toolbar-group">
        <details>
          <summary>Topics ({allTopics.length - hiddenTopicCuries.size}/{allTopics.length})</summary>
          <div className="tetv-toolbar-multi">
            {allTopics.map(t => (
              <div key={t.curie}>
                <input
                  type="checkbox"
                  id={`tv-${t.curie}`}
                  checked={!hiddenTopicCuries.has(t.curie)}
                  onChange={(e) => {
                    const next = new Set(hiddenTopicCuries);
                    if (e.target.checked) next.delete(t.curie); else next.add(t.curie);
                    setHiddenTopicCuries(next);
                  }}/>
                <label htmlFor={`tv-${t.curie}`}> {t.name || t.curie}</label>
              </div>
            ))}
          </div>
        </details>
      </span>

      <span className="tetv-toolbar-group">
        <details>
          <summary>Sources ({sourceFilterModel ? sourceFilterModel.length : allSources.length}/{allSources.length})</summary>
          <div className="tetv-toolbar-multi">
            {allSources.map(s => {
              const active = !sourceFilterModel || sourceFilterModel.includes(s);
              return (
                <div key={s}>
                  <input
                    type="checkbox"
                    id={`sf-${s}`}
                    checked={active}
                    onChange={(e) => {
                      const base = sourceFilterModel || [...allSources];
                      const next = e.target.checked ? [...new Set([...base, s])] : base.filter(x => x !== s);
                      setSourceFilterModel(next.length === allSources.length ? null : next);
                    }}/>
                  <label htmlFor={`sf-${s}`}> {s}</label>
                </div>
              );
            })}
          </div>
        </details>
      </span>

      <span className="tetv-toolbar-group">
        <AsyncTypeahead
          id="tetv-add-topic"
          isLoading={topicQueryLoading}
          minLength={1}
          options={topicSuggestions}
          labelKey="name"
          placeholder="+ Add topic"
          onSearch={searchTopics}
          onChange={(selected) => {
            if (selected[0]) {
              onAddTopic({ curie: selected[0].curie, name: selected[0].name });
            }
          }}
        />
      </span>
    </div>
  );
}
```

- [ ] **Step 9.2: Commit**

```bash
git add src/components/refs_tet_validation/toolbar/TetGridToolbar.jsx
git commit -m "feat(scrum-6018): add TetGridToolbar (display toggles + topic/source filters + add-topic typeahead)"
```

---

## Task 10: `TetValidationGrid` container + CSS

**Files:**
- Create: `src/components/refs_tet_validation/TetValidationGrid.jsx`
- Create: `src/components/refs_tet_validation/TetValidationGrid.css`

- [ ] **Step 10.1: Create the CSS**

```css
/* src/components/refs_tet_validation/TetValidationGrid.css */
.tetv-banner-unresolved { background: #fff3cd; padding: 6px 10px; margin-bottom: 6px; border: 1px solid #ffe69c; border-radius: 4px; font-size: 12px; }

.tetv-toolbar { display: flex; flex-wrap: wrap; gap: 12px; padding: 6px 8px; align-items: center; }
.tetv-toolbar-group { display: inline-flex; align-items: center; gap: 6px; }
.tetv-toolbar-multi { max-height: 200px; overflow-y: auto; padding: 4px 8px; min-width: 200px; }

.tetv-cell { display: flex; flex-direction: column; gap: 4px; padding: 4px; }
.tetv-source-group { display: flex; flex-direction: column; gap: 2px; }
.tetv-source-group-sep { border-top: 1px dotted #ddd; padding-top: 2px; }
.tetv-mini-row { display: flex; align-items: center; gap: 6px; font-size: 12px; line-height: 1.3; }
.tetv-source-label { color: #555; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tetv-pill { display: inline-block; min-width: 18px; padding: 0 6px; border-radius: 9px; color: #fff; font-weight: 600; text-align: center; }
.tetv-pill-y { background: #28a745; }
.tetv-pill-n { background: #dc3545; }
.tetv-dot-y, .tetv-dot-n { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.tetv-dot-y { background: #28a745; }
.tetv-dot-n { background: #dc3545; }
.tetv-inline-note { color: #333; font-style: italic; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tetv-note-btn { background: none; border: 0; color: #6c757d; cursor: pointer; padding: 0; }
.tetv-badge { font-size: 10px; padding: 1px 5px; border-radius: 3px; background: #eef; color: #335; }
.tetv-badge-score { background: #efe; color: #353; }

.tetv-strip { display: flex; gap: 6px; padding-top: 4px; border-top: 1px solid #eee; }
.tetv-strip-btn { background: none; border: 1px solid #ddd; border-radius: 4px; padding: 2px 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; font-size: 11px; }
.tetv-strip-pos { color: #28a745; }
.tetv-strip-neg { color: #dc3545; }
.tetv-strip-active { background: #f5f5f5; }

.tetv-ref-cell { display: flex; flex-direction: column; padding: 4px; line-height: 1.3; }
.tetv-ref-title { font-weight: 600; }
.tetv-ref-meta, .tetv-ref-authors { font-size: 11px; color: #666; }
```

- [ ] **Step 10.2: Create the container**

```jsx
// src/components/refs_tet_validation/TetValidationGrid.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { Spinner } from 'react-bootstrap';

import { useReferenceTets } from './hooks/useReferenceTets';
import { groupTetsByTopicAndSource, sourceLabel, cellSortRank } from './helpers/groupTets';
import ReferenceCell from './cellRenderers/ReferenceCell';
import TopicCell from './cellRenderers/TopicCell';
import TopicCellFilter from './filters/TopicCellFilter';
import TetGridToolbar from './toolbar/TetGridToolbar';
import { api } from '../../api';
import { getCuratorSourceId, setTopicEntitySourceId } from '../../actions/biblioActions';
import './TetValidationGrid.css';

export default function TetValidationGrid({ referenceIds, topics, mod }) {
  const dispatch = useDispatch();
  const cognitoMod = useSelector(s => s.isLogged.cognitoMod);
  const testerMod = useSelector(s => s.isLogged.testerMod);
  const accessLevel = testerMod !== 'No' ? testerMod : cognitoMod;
  const accessToken = useSelector(s => s.isLogged.accessToken);
  const topicEntitySourceId = useSelector(s => s.biblio.topicEntitySourceId);
  const effectiveMod = mod || accessLevel;

  const { rows, unresolved, loading, refetchRow } = useReferenceTets(referenceIds);

  // Ensure curator source id is loaded so the validation strip can submit
  useEffect(() => {
    if (effectiveMod && accessToken && !topicEntitySourceId) {
      (async () => {
        const id = await getCuratorSourceId(effectiveMod, accessToken);
        dispatch(setTopicEntitySourceId(id));
      })();
    }
  }, [effectiveMod, accessToken, topicEntitySourceId, dispatch]);

  // Discover topics actually present, plus union with topics prop, plus user-added (via toolbar)
  const [addedTopics, setAddedTopics] = useState([]);
  const [topicNameMap, setTopicNameMap] = useState({}); // curie -> name

  // Resolve topic names for any unknown curie
  useEffect(() => {
    const seen = new Set([
      ...(topics || []).map(t => t.curie),
      ...addedTopics.map(t => t.curie),
      ...rows.flatMap(r => (r.tets || []).map(t => t.topic)),
    ]);
    const missing = [...seen].filter(c => c && !topicNameMap[c]);
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(missing.map(async (curie) => {
      try {
        const r = await api.get(`/ontology/map_curie_to_name/atpterm/${encodeURIComponent(curie)}`);
        return [curie, r.data || curie];
      } catch { return [curie, curie]; }
    })).then((entries) => {
      if (cancelled) return;
      setTopicNameMap(prev => ({ ...prev, ...Object.fromEntries(entries) }));
    });
    return () => { cancelled = true; };
  }, [topics, addedTopics, rows]); // eslint-disable-line react-hooks/exhaustive-deps

  // Final topic column list
  const topicColumns = useMemo(() => {
    let baseList;
    if (topics && topics.length > 0) {
      baseList = topics.map(t => ({ curie: t.curie, name: t.name || topicNameMap[t.curie] || t.curie }));
    } else {
      const present = new Set();
      for (const r of rows) for (const t of r.tets || []) present.add(t.topic);
      baseList = [...present].map(curie => ({ curie, name: topicNameMap[curie] || curie }));
    }
    const added = addedTopics.map(t => ({ curie: t.curie, name: t.name || topicNameMap[t.curie] || t.curie }));
    const seen = new Set();
    return [...baseList, ...added].filter(t => {
      if (seen.has(t.curie)) return false;
      seen.add(t.curie);
      return true;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [topics, rows, addedTopics, topicNameMap]);

  // All sources observed in data, used by toolbar source filter
  const allSources = useMemo(() => {
    const s = new Set();
    for (const r of rows) for (const t of r.tets || []) s.add(sourceLabel(t.topic_entity_tag_source));
    return [...s].sort();
  }, [rows]);

  // Toolbar state
  const [displayOptions, setDisplayOptions] = useState({ inlineNote: false, showLevel: false, showScore: false });
  const [hiddenTopicCuries, setHiddenTopicCuries] = useState(new Set());
  const [sourceFilterModel, setSourceFilterModel] = useState(null);

  // Row data with per-topic prebucketed arrays for fast cell access + sorting
  const rowData = useMemo(() => rows.map(r => {
    const grouped = groupTetsByTopicAndSource(r.tets || []);
    const cells = {};
    for (const t of topicColumns) {
      const flat = [];
      const bySrc = grouped.get(t.curie);
      if (bySrc) for (const arr of bySrc.values()) flat.push(...arr);
      cells[`__topic_${t.curie}`] = flat;
    }
    return { input: r.input, curie: r.curie, biblio: r.biblio, ...cells };
  }), [rows, topicColumns]);

  // AgGrid column defs
  const columnDefs = useMemo(() => {
    const refCol = {
      headerName: 'Reference',
      field: '__ref',
      pinned: 'left',
      width: 320,
      cellRenderer: ReferenceCell,
      filter: 'agTextColumnFilter',
      filterParams: { buttons: ['apply', 'clear'] },
      valueGetter: (p) => {
        const r = p.data?.biblio || {};
        const pmid = (r.cross_references || []).find(x => x.curie?.startsWith('PMID:'))?.curie || '';
        const authors = (r.authors || []).map(a => a.name).join(' ');
        return `${r.title || ''} ${p.data?.curie || ''} ${pmid} ${r.journal || ''} ${authors} ${r.date_published || ''}`;
      },
      sortable: true,
      sort: 'desc',
      comparator: (_a, _b, na, nb) => {
        const da = na.data?.biblio?.date_published || '';
        const db = nb.data?.biblio?.date_published || '';
        return da.localeCompare(db);
      },
    };

    const topicCols = topicColumns
      .filter(t => !hiddenTopicCuries.has(t.curie))
      .map(t => ({
        headerName: t.name || t.curie,
        colId: t.curie,
        field: `__topic_${t.curie}`,
        width: 280,
        sortable: true,
        cellRenderer: TopicCell,
        cellRendererParams: { topicCurie: t.curie, displayOptions, refetchRow, sourceFilterModel },
        filter: TopicCellFilter,
        comparator: (a, b) => cellSortRank(a) - cellSortRank(b),
      }));

    return [refCol, ...topicCols];
  }, [topicColumns, hiddenTopicCuries, displayOptions, refetchRow, sourceFilterModel]);

  return (
    <div className="ag-theme-quartz tetv-grid-wrapper" style={{ width: '100%' }}>
      {unresolved.length > 0 && (
        <div className="tetv-banner-unresolved">
          Could not resolve {unresolved.length} ID(s): {unresolved.join(', ')}
        </div>
      )}
      <TetGridToolbar
        displayOptions={displayOptions} setDisplayOptions={setDisplayOptions}
        allTopics={topicColumns}
        hiddenTopicCuries={hiddenTopicCuries} setHiddenTopicCuries={setHiddenTopicCuries}
        allSources={allSources}
        sourceFilterModel={sourceFilterModel} setSourceFilterModel={setSourceFilterModel}
        mod={effectiveMod}
        onAddTopic={(t) => setAddedTopics(prev => prev.find(x => x.curie === t.curie) ? prev : [...prev, t])}
      />
      {loading ? (
        <div style={{ padding: 16 }}><Spinner animation="border" size="sm" /> Loading…</div>
      ) : (
        <div style={{ height: 'calc(100vh - 320px)', minHeight: 400 }}>
          <AgGridReact
            rowData={rowData}
            columnDefs={columnDefs}
            getRowHeight={() => null /* let AgGrid auto-size */}
            domLayout="normal"
            animateRows={false}
            suppressRowClickSelection
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 10.3: Commit**

```bash
git add src/components/refs_tet_validation/TetValidationGrid.jsx \
        src/components/refs_tet_validation/TetValidationGrid.css
git commit -m "feat(scrum-6018): add TetValidationGrid container + grid styling"
```

---

## Task 11: Search-page integration

**Files:**
- Modify: `src/components/search/SearchLayout.js`

Add a List/TET-grid toggle and conditionally render the grid in place of `<SearchResults/>`. The toggle is hidden when there are no results. Pass `searchResults.map(r => r.curie)` as `referenceIds` and the topics-facet selections as the `topics` prop.

- [ ] **Step 11.1: Read the file and locate the render block**

Open `src/components/search/SearchLayout.js`, find the `<SearchResults/>` render site (~line 95+ in the current file).

- [ ] **Step 11.2: Add imports + selector hooks at the top of the component**

Insert near other imports:

```jsx
import { useSelector } from 'react-redux';
import TetValidationGrid from '../refs_tet_validation/TetValidationGrid';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';
import ToggleButton from 'react-bootstrap/ToggleButton';
```

Inside `SearchLayout`, near the existing `useState` hooks:

```jsx
const [view, setView] = useState('list'); // 'list' | 'grid'
const searchResults = useSelector(s => s.search.searchResults);
const searchFacetsValues = useSelector(s => s.search.searchFacetsValues);

const topicsForGrid = useMemo(() => {
  const arr = searchFacetsValues?.topics;
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  // Values may be curies or names; component handles both via topicNameMap fallback
  return arr.map(v => ({ curie: v, name: v }));
}, [searchFacetsValues]);
const referenceIds = useMemo(() =>
  (searchResults || []).map(r => r.curie).filter(Boolean),
  [searchResults]);
```

(Add `useMemo` to the React import line if not already present.)

- [ ] **Step 11.3: Replace `<SearchResults/>` site with toggle + conditional render**

Wherever `<SearchResults/>` currently renders, replace with:

```jsx
<>
  {referenceIds.length > 0 && (
    <div style={{ padding: '6px 0' }}>
      <ToggleButtonGroup type="radio" name="tetv-view" value={view} onChange={setView} size="sm">
        <ToggleButton id="tetv-view-list" value="list" variant="outline-secondary">List view</ToggleButton>
        <ToggleButton id="tetv-view-grid" value="grid" variant="outline-secondary">TET grid view</ToggleButton>
      </ToggleButtonGroup>
    </div>
  )}
  {view === 'list' ? (
    <SearchResults/>
  ) : (
    <TetValidationGrid referenceIds={referenceIds} topics={topicsForGrid}/>
  )}
</>
```

- [ ] **Step 11.4: Verify the app builds**

```bash
npm start
```

Wait until it compiles without errors. Open http://localhost:3001 (or whatever the configured port is), log in, run a search.

- [ ] **Step 11.5: Manual smoke check via browser**

- Run a search that returns several references with TETs.
- Confirm the **List view** / **TET grid view** toggle appears.
- Switch to grid view: rows should be the result curies; columns should be topics found in the data (or, if the search has topic facet selections, only those topics).
- For one cell: confirm Y/N pills, the source label, the note icon (if applicable), and the validation strip render.
- Click positive on an empty cell: a new TET should appear after the row reloads, with `Y` from the curator's source.
- Toggle Inline note / Confidence level / Confidence score and see the cell respond.
- Open the Topics popover in the toolbar and hide a column; reopen and show it.
- Open the column filter for a topic, choose `has Y`, apply, and see rows filter.

If any step breaks, fix in place before moving on.

- [ ] **Step 11.6: Commit**

```bash
git add src/components/search/SearchLayout.js
git commit -m "feat(scrum-6018): wire TetValidationGrid into SearchLayout via List/Grid toggle"
```

---

## Task 12: Final pass + push

- [ ] **Step 12.1: Run all tests**

```bash
npx --no-install react-app-rewired test --watchAll=false
```

Expected: all green; CRA's existing snapshot/`App.test.js` plus our two new test files pass.

- [ ] **Step 12.2: Run the linter**

```bash
npx eslint src/components/refs_tet_validation src/components/search/SearchLayout.js --ext .js,.jsx
```

Fix any complaints.

- [ ] **Step 12.3: Push**

```bash
git push
```

- [ ] **Step 12.4: Open a draft PR** (optional, only if maintainers want one before the meeting)

```bash
gh pr create --draft --title "SCRUM-6018: Tag validation grid (demo)" --body "$(cat <<'EOF'
## Summary
- Implements the Tag Validation Grid demo as specced in docs/superpowers/specs/2026-04-30-tag-validation-grid-design.md
- Search page gains a List view / TET grid view toggle
- Pure client-side; reuses existing endpoints; no backend changes

## Test plan
- [ ] Unit tests pass (helpers + hook)
- [ ] Search returns results, toggle appears
- [ ] Grid renders source mini-rows, validation strip, note modal
- [ ] positive/negative submit creates new TET (verified in DB)
- [ ] Display-option toggles take effect
- [ ] Topic / source toolbar filters work
- [ ] Per-column topic filter (has Y / has N / etc.) works
- [ ] No console errors in production build
EOF
)"
```

---

## Self-review checklist (already run)

- ✅ All spec sections have a corresponding task: data hook (T2), cell layout (T3-T7), toolbar (T9), filters (T8 + T9), sorting (T10 column defs), search-page integration (T11).
- ✅ No placeholders, no "TBD", every code block contains executable code.
- ✅ Type/name consistency: `referenceIds` (input ids) vs `curie` (canonical) vs `topicCurie`; `cellRendererParams.topicCurie`; `cells[`__topic_${curie}`]` all match across tasks.
- ✅ Out-of-scope items (standalone page, multi-ID paste box, bulk endpoint, saved presets) are not implemented per the latest spec scope.

## Deferred for follow-ups (matches spec)

- Multi-ID paste/search box on the search page.
- Standalone `/RefsTagsValidation` page.
- Bulk backend endpoint `POST /curation_status/per_source_tet_summary`.
- Saved/labelled display-option presets via `BiblioPreferenceControls`.
- Saved/named validation lists.
