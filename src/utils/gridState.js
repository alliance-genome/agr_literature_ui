// AG Grid state helpers (front-end only)

/** Capture column order/visibility, filters, sort */
export function extractGridState(gridRef) {
  const api = gridRef.current?.api;
  const columnApi = gridRef.current?.columnApi;
  if (!api || !columnApi) return null;

  const columnState = columnApi.getColumnState();
  const filterModel = api.getFilterModel();
  const sortModel = api.getSortModel();

  return { columnState, filterModel, sortModel };
}

/** Apply saved state back to grid */
export function applyGridState(gridRef, { columnState, filterModel, sortModel } = {}) {
  const api = gridRef.current?.api;
  const columnApi = gridRef.current?.columnApi;
  if (!api || !columnApi) return;

  if (columnState && columnState.length) {
    columnApi.applyColumnState({ state: columnState, applyOrder: true });
  }
  if (sortModel) api.setSortModel(sortModel);
  if (filterModel) api.setFilterModel(filterModel);

  api.onFilterChanged();
  api.refreshClientSideRowModel("filter");
  api.refreshCells({ force: true });
}

/** Convert columnState -> your checkbox items (checked = visible) */
export function itemsFromColumnState(itemsTemplate, columnState = []) {
  const byId = new Map(columnState.map((c) => [c.colId, c]));
  return itemsTemplate.map((it) => ({
    ...it,
    checked: byId.has(it.field) ? !byId.get(it.field).hide : it.checked,
  }));
}

/** Build a columnState from current colDefs (.hide flags, order by index) */
export function columnStateFromColDefs(colDefs) {
  return colDefs.map((c) => ({
    colId: c.field,
    hide: !!c.hide,
    sort: c.sort || null,
    sortIndex: Number.isFinite(c.sortIndex) ? c.sortIndex : null,
    width: Number.isFinite(c.width) ? c.width : null,
    rowGroup: !!c.rowGroup,
    pivot: !!c.pivot,
    aggFunc: c.aggFunc || null,
  }));
}

/**
 * Apply a flexible payload to the grid.
 * Primary path: { columnState, filterModel, sortModel } -> applyGridState
 * Fallbacks supported:
 *  - payload.items: [{ field, checked }]  -> visibility only
 *  - payload.columnOrder: [colId, ...]    -> order-only (best effort)
 */
export function applyGridStateFromPayload(gridRef, payload = {}, options = {}) {
  const api = gridRef.current?.api;
  const columnApi = gridRef.current?.columnApi;
  if (!api || !columnApi || !payload) return;

  const { columnState, filterModel, sortModel, items, columnOrder } = payload;

  // If we have a full, modern payload—use the canonical applier.
  if ((columnState && columnState.length) || filterModel || sortModel) {
    applyGridState(gridRef, { columnState, filterModel, sortModel });
    return;
  }

  const currentState = columnApi.getColumnState() || [];

  // Fallback A: apply visibility from `items`
  if (Array.isArray(items) && items.length) {
    const visState = items.map((i) => ({
      colId: i.field,
      hide: i.checked === false, // checked = visible
    }));

    columnApi.applyColumnState({ state: visState, applyOrder: false });
  }

  // Fallback B: apply order from `columnOrder`
  if (Array.isArray(columnOrder) && columnOrder.length) {
    // Build a best-effort ordered state based on current state + desired order
    const stateById = new Map(currentState.map((s) => [s.colId, s]));
    const ordered = [];

    // First, push any known columns in the requested order
    for (const id of columnOrder) {
      if (stateById.has(id)) ordered.push(stateById.get(id));
    }
    // Then append any remaining columns that weren't in columnOrder
    for (const s of currentState) {
      if (!columnOrder.includes(s.colId)) ordered.push(s);
    }

    columnApi.applyColumnState({ state: ordered, applyOrder: true });
  }

  // Final refresh to keep UI consistent
  api.onFilterChanged();
  api.refreshClientSideRowModel("filter");
  api.refreshCells({ force: true });
}
