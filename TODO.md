# TODO

Open follow-up work for the literature UI. Items here are not yet ticketed
or are scoped tightly enough that the description below is the spec.

For larger design questions and already-tracked follow-ups for the TET
validation grid, see also `docs/superpowers/specs/2026-04-30-tag-validation-grid-design.md`
("Out of scope, follow-up tickets") and the matching plan in
`docs/superpowers/plans/`.

## Topic validation grid

- [ ] **Per-reference TET-editor + main-PDF icons in the IDs cell.** Mirror
      the two action icons rendered next to each row in the list view
      (`src/components/search/SearchResults.js`, components `TETRedirect`
      and `FileDownloadIcon`) so the grid view exposes the same shortcuts.

      **Behaviour**
      - **TET editor (`faPenSquare`)**: visible only when the user is
        signed in (`state.isLogged.isSignedIn`). Clicking navigates to
        `/Biblio/?action=entity&referenceCurie={curie}` — opens the
        per-paper TET editor for that reference. Match the list view's
        `redirect-TET-button` styling so the two views feel
        consistent.
      - **Main PDF (`faFilePdf`)**: visible only when
        `state.search.curiePDFIDsMap[curie]` resolves to a referencefile
        id. Clicking fetches `/reference/referencefile/download_file/{id}`
        as a blob and opens it in a new tab (same flow as
        `FileDownloadIcon.downloadPDFfile`). If no main PDF is
        available the icon is omitted.

      **Placement**
      - Render both icons inside `IdsCell.jsx`, anchored to the
        right edge of the cell content (or as a small icon strip below
        the AGRKB / PMID lines — pick whichever keeps the cell compact
        when many xref lines are visible).
      - Make sure the icon strip doesn't grow the pinned IDs column
        width unexpectedly: include the strip's width in
        `estimateIdsColumnWidth` so autosize stays correct.

      **Notes**
      - `curiePDFIDsMap` is populated by the existing search flow.
        Subscribe to it via the same `useSelector` pattern the list
        view uses.
      - No backend changes needed.

- [ ] **Bulk validation of selected papers.** Let a curator validate many
      references in one action instead of clicking the ✓/✗ buttons row by
      row.

      **UX**
      - Add a checkbox column (pinned left, before IDs) plus a
        "Select all visible / none" header checkbox that respects the
        current filter state (IDs filter, topic filter, etc.).
      - When at least one row is selected, surface a sticky action bar
        (or extend the existing toolbar) with:
        - A topic selector (defaults to the only visible topic if there
          is exactly one; otherwise requires an explicit pick).
        - `Validate positive` / `Validate negative` buttons.
        - A live count of selected rows.
      - Clicking a validate button opens the existing validation
        confirmation modal, but parameterised for N references. The
        modal preview lists the chosen topic, the chosen polarity, the
        reference count, and (optionally) the curation status / tag
        fields the curator has filled in — same controls as the
        per-row modal.

      **Submission**
      - Reuse `POST /topic_entity_tag/` once per (reference, topic)
        pair, fanned out with a small concurrency pool (8–10) so a
        50-row submit doesn't hammer the backend in a single burst.
      - Skip references that already carry a professional-biocurator
        topic-level tag for that topic (avoid duplicate validations) —
        show how many were skipped in the result toast.
      - On partial failure, keep the modal open with a list of the rows
        that failed (curie + error) so the curator can retry. Successes
        update their cells immediately via the existing
        `refetchRow(curie)` so the grid colours / status pills stay in
        sync.

      **Edge cases**
      - Honour the "Also update curation status" optional section that
        the per-row modal already exposes — apply the same status to
        every selected row.
      - Disable the action bar when zero rows are selected or no topic
        column is visible.
      - Selection state is grid-local (no URL persistence); changing
        the reference set or reloading clears it.
