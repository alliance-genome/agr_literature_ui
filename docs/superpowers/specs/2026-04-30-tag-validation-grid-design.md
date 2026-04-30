# Tag Validation Grid — Design Spec (SCRUM-6018)

**Status**: Draft for review
**Ticket**: [SCRUM-6018 — Working demo for Tag validation list](https://agr-jira.atlassian.net/browse/SCRUM-6018)
**Related**: SCRUM-5982, SCRUM-5983, SCRUM-5984, SCRUM-6028, SCRUM-6016
**Author**: Valerio Arnaboldi
**Date**: 2026-04-30

## Goal

A working demo (1–2 hour curator meeting) of a UI component that takes a list of reference IDs (mixed types) and renders a per-source aggregated view of Topic Entity Tag (TET) data per topic, so curators can validate tags across many references at once. The component must be **modular**: usable both as a togglable view on the search results page and as a standalone page with manual ID entry.

The validation action creates a new manual TET tag with `negated=False` ("topic present") or `negated=True` ("topic not present") for the (reference, topic) pair. The action is intentionally framed as a generic assertion about the topic in the reference, not as validating a specific existing tag — so it works whether the cell already has source rows or is empty. The TET-creation mechanics still mirror the existing per-paper `ValidationByCurator` flow.

## Non-goals (for the demo)

- Saved/named validation lists or switching between lists (covered by SCRUM-5982 follow-up).
- File upload for ID lists (textarea covers the demo need).
- Editing existing TET tags or curation_status fields.
- Pagination beyond what AgGrid row virtualization gives for free.

## Architecture

**Pure client-side**, no new backend endpoints. All data flows through existing routes:

| Purpose                          | Endpoint                                                                       |
|----------------------------------|--------------------------------------------------------------------------------|
| Resolve mixed ID → curie+biblio  | `GET /reference/by_cross_reference/{xref}` and `GET /reference/{curie}`        |
| All TETs for a reference         | `GET /topic_entity_tag/by_reference/{curie}?page=1&page_size=8000`             |
| Topic-name typeahead (MOD subset)| `GET /atp/search_topic/{query}?mod_abbr={mod}`                                 |
| Submit validation as new TET     | `POST /topic_entity_tag/`                                                      |

The user's MOD comes from the existing pattern: `accessLevel = testerMod !== 'No' ? testerMod : cognitoMod`.

### Why client-side

The user picked this option to keep the demo lightweight. Trade-offs vs. a bulk backend endpoint: 2N round trips per render (1 biblio + 1 TET-list per reference) instead of 1, and topic-set discovery is data-driven instead of subset-driven. Acceptable for ≤200 references and a demo. A bulk endpoint can be added later without changing the component's public API.

## Component model

### `TetValidationGrid` (modular core)

Path: `src/components/refs_tet_validation/TetValidationGrid.jsx`

Props:

| Prop            | Type                              | Required | Default                                    |
|-----------------|-----------------------------------|----------|--------------------------------------------|
| `referenceIds`  | `string[]` (mixed: curie/PMID/DOI/MOD xref) | yes      | —                                          |
| `topics`        | `{ curie: string; name: string }[]` | no       | `undefined` → data-driven columns          |
| `mod`           | `string`                          | no       | `accessLevel` from redux                   |

Behavior:

1. On mount / when `referenceIds` changes:
   - For each id, resolve to a canonical reference via `/reference/by_cross_reference/{id}` (falls back to `/reference/{id}` if the id starts with `AGRKB:`). Captures biblio fields needed by the grid: `curie`, `title`, `authors`, `date_published`, `journal`, `cross_references` (for PMID display).
   - For each resolved curie, fetch raw TETs via `/topic_entity_tag/by_reference/{curie}?page=1&page_size=8000`.
   - Track unresolved input ids for a banner.

2. Determine the column set:
   - If `topics` prop is provided → use it.
   - Else → union of topics that appear in the loaded TETs. Topic name resolved from each TET's nested `topic` curie via the same map already used by `TopicEntityTable`.

3. Build row data: one row per resolved reference. For each row × topic, group its TETs by source key:
   - source key = `${source_method} / ${secondary_data_provider_abbreviation}` (falls back to `data_provider` when secondary is absent).
   - Each source group keeps an array of TETs (usually one, but the schema allows duplicates with `force_insertion`).
   - Within a source group, render **one mini-row per TET** (so duplicates aren't collapsed). Mini-rows within the same source are separated by a thin divider so the grouping stays visible.

### Cell renderer

Custom AgGrid cell renderer per topic column. For each cell:

```
┌──────────────────────────────────────────────────────────────────┐
│ <source-label>   <Y/N pill OR inline-note>   [📝 modal icon]    │
│                  [conf-level badge?]   [conf-score badge?]       │
│ <source-label>   …                                               │
│ ⋯                                                                │
│ ─────────────────                                                │
│ [✓ topic present]  [✗ topic not present]   ← validation strip    │
└──────────────────────────────────────────────────────────────────┘
```

- **Y/N pill**: `Y` (green) when `negated=false`, `N` (red) when `negated=true`. The pill represents one TET tag.
- **Inline note** (toggle): when on AND `note` is present, the Y/N pill text is replaced with the truncated note (~60 chars). A small trailing color dot preserves the Y/N signal. The 📝 icon still opens the modal with the full note.
- **Note icon → modal**: shown whenever `note` is present, regardless of inline-note toggle. Clicking opens a Bootstrap `Modal` titled "Note — `<source-label>`" with the full note text.
- **Confidence-level badge** (toggle): shown when on AND `confidence_level` is non-null.
- **Confidence-score badge** (toggle): shown when on AND `confidence_score` is non-null. Rendered as `0.NN`.
- **Validation strip**: at the bottom of each non-empty cell (and at the top/center of empty cells). Two icons with hover labels: green check ("topic present" → new TET with `negated=false`) and red X ("topic not present" → new TET with `negated=true`). The labels are deliberately generic — the action is *the curator asserting whether the topic is present in the reference*, independent of any specific existing tag, so this works whether the cell already has source rows or is empty. Clicking POSTs `/topic_entity_tag/` with:
  ```json
  {
    "reference_curie": "<row's curie>",
    "topic": "<column's topic curie>",
    "negated": true|false,
    "topic_entity_tag_source_id": <curator's source id for accessLevel>,
    "force_insertion": true,
    "entity": null,
    "entity_type": null,
    "species": null,
    "data_novelty": null,
    "confidence_score": null,
    "confidence_level": null,
    "note": null
  }
  ```
  After success, the cell re-fetches its row's TETs to reflect the new validation. The corresponding icon is greyed-in if a TET created by the current uid already exists for that (ref, topic).

### Toolbar

A header bar above the grid, sharing space with the existing `BiblioPreferenceControls`-style component (or rendered as a small custom row for the demo):

- **Cell display** group (three checkboxes, persisted in component state):
  - `[ ] Inline note`
  - `[ ] Confidence level`
  - `[ ] Confidence score`
- **Topic filter** — a `MultiFilter` (the same `TopicFilter.jsx` pattern) listing all currently-loaded topic columns. Toggling hides/shows columns.
- **+ Add topic** button — opens a typeahead popover that searches `/atp/search_topic/{query}?mod_abbr={mod}` (mirroring the existing TET creation form's topic select). Selecting a topic adds it as a new column. Note: an added topic may be entirely empty across the loaded references; that's fine — curators can still validate via the strip.

### Loading + error states

- Initial load: full-grid `LoadingOverlay` with the existing spinner.
- Per-row TET reload after a validation: row-level overlay only.
- Unresolved IDs: yellow banner above the grid listing them.
- Network failure on TETs for a particular reference: that row shows a single error cell spanning all topic columns with a retry button.

## Standalone page

Path: `src/components/refs_tet_validation/RefsTagsValidationPage.jsx`
Route: `/RefsTagsValidation` (registered in `AppWithRouterAccess.js`)

Layout:

```
┌─────────────────────────────────────────────────────────────────┐
│ Tag Validation                                                  │
│                                                                 │
│ Reference IDs (one per line):                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ AGRKB:101000000123456                                       │ │
│ │ PMID:12345678                                               │ │
│ │ WB:WBPaper00012345                                          │ │
│ │ doi:10.1234/abc.5678                                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Topics (optional — empty = show topics found in data):          │
│ [ typeahead multi-select against /atp/search_topic ]            │
│                                                                 │
│ [ Submit ]                                                      │
│                                                                 │
│ ─────────────── grid renders below ───────────────              │
└─────────────────────────────────────────────────────────────────┘
```

- Textarea: split on `\n`, trim, drop empties. No client-side ID-shape validation — the backend is the source of truth, and unresolved IDs surface in the unresolved-banner above the grid (same path as any other resolution failure). This avoids false negatives on unfamiliar xref prefixes.
- Topic select: typeahead multi-select reusing the same `react-bootstrap-typeahead`-based component the TET creation form uses; queries `/atp/search_topic/{query}?mod_abbr={accessLevel}`.
- Submit hands off to `<TetValidationGrid referenceIds={ids} topics={selectedTopics} />`.
- The page is gated to logged-in users (per existing patterns).

## Search-page integration

In `SearchLayout.js` (or adjacent), add a small toggle group above the result list: **List view** / **TET grid view**. State lives in `SearchLayout` local state.

When **TET grid view** is selected:

```jsx
<TetValidationGrid
  referenceIds={searchResults.map(r => r.curie)}
  topics={topicsFromSearchFacets}
/>
```

`topicsFromSearchFacets` is derived from `state.search.searchFacetsValues.topics` (the existing topic facet stores a list of values; verify during implementation whether they are curies or names — the existing facet rendering code in `Facets.js` already does the mapping and we will reuse the same lookup). Each value is normalized to `{curie, name}` using the same curie→name map the search facets render with.

When the user has not selected any topic facets, `topicsFromSearchFacets` is `undefined` and the grid falls back to data-driven columns. This matches the user requirement that *when topics are selected in the search, only those should appear in the grid*.

## Code organization & touched files

New:

- `src/components/refs_tet_validation/TetValidationGrid.jsx`
- `src/components/refs_tet_validation/TetValidationGrid.css` (cell layout, badges)
- `src/components/refs_tet_validation/RefsTagsValidationPage.jsx`
- `src/components/refs_tet_validation/cellRenderers/SourceMiniRow.jsx`
- `src/components/refs_tet_validation/cellRenderers/CellValidationStrip.jsx`
- `src/components/refs_tet_validation/cellRenderers/NoteModal.jsx`
- `src/components/refs_tet_validation/hooks/useReferenceTets.js` (resolve + fetch + re-fetch one row)

Modified:

- `src/components/AppWithRouterAccess.js` — register `/RefsTagsValidation` route.
- `src/components/search/SearchLayout.js` — add the List/TET-grid toggle and integration block.
- `src/components/NavigationBar.js` — add a top-level link to the standalone page (gated to logged-in users).

The existing `ValidationByCurator.jsx` is **not** modified, but the new `CellValidationStrip` borrows its TET-creation pattern (with empty entity/species, `force_insertion: true`).

## Testing

- Manual: paste a known list of WB curies that have TETs across multiple sources; verify columns, mini-rows, note modal, confidence toggles, and validation submission. Use Playwright MCP to walk through the flows during development per the project conventions.
- Edge cases: an unresolved id; an id that resolves but has zero TETs; a topic column with no TETs; a TET with `negated=true` but no note; a TET with confidence_score=0.0 (must render, not be treated as null).
- The demo ships when the WB team can paste a list and validate at least a few topics live in the meeting.

## Risks & open questions

- **Throughput**: paste of 200+ refs triggers ~400 API calls. AgGrid renders incrementally, but the network is the bottleneck. Mitigation: batch with `Promise.all` chunks of 8; show progress in the loading overlay. If it's too slow we add a bulk backend endpoint as a follow-up.
- **Source label collision**: TETs from different `data_provider`s with the same `source_method` need disambiguation. Plan: include `secondary_data_provider_abbreviation` in the label.
- **MOD-subset enforcement on added topics**: `/atp/search_topic/{q}?mod_abbr={mod}` already filters to the subset, so the typeahead can't add an out-of-subset topic.
- **Topic name resolution for TETs whose topic is outside the subset**: we still show them in the data-driven case so curators can see "extra" tags. They'll be flagged with a small icon next to the column header.

## Out of scope, follow-up tickets

- Bulk backend endpoint (`POST /curation_status/per_source_tet_summary`) once the demo validates the UX.
- Saved/named validation lists (SCRUM-5982).
- File upload for ID list.
- Persisting cell-display toggles in user settings.
