import React, { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleQuestion } from '@fortawesome/free-regular-svg-icons';

/**
 * Custom AgGrid `headerComponent` that adds a small ? icon next to the column
 * label. Re-implements the sort indicator + filter-menu button that the
 * default header provides (we lose those if we don't render them ourselves).
 *
 * Use this instead of `innerHeaderComponent` — that property name is not
 * valid in AgGrid Community 32.x.
 */
export default function HeaderWithHelp(params) {
  const {
    api,
    displayName,
    column,
    enableSorting,
    enableMenu,
    showColumnMenu,
    progressSort,
  } = params;
  const help = column?.getColDef?.()?.headerTooltip;
  const menuButtonRef = useRef(null);
  const filterButtonRef = useRef(null);
  const [sortDir, setSortDir] = useState(column?.getSort?.() || null);
  const [filterActive, setFilterActive] = useState(
    column?.isFilterActive?.() || false
  );
  // Only render the filter icon when the column opts in via
  // headerComponentParams.showFilterIcon — keeps the other column headers
  // clean (the IDs column is currently the only one that exposes a popup
  // filter directly from the header).
  const filterAllowed =
    Boolean(params?.showFilterIcon) &&
    (column?.isFilterAllowed?.() ?? Boolean(column?.getColDef?.()?.filter));

  useEffect(() => {
    if (!column) return undefined;
    const onSortChanged = () => setSortDir(column.getSort?.() || null);
    const onFilterChanged = () =>
      setFilterActive(column.isFilterActive?.() || false);
    column.addEventListener?.('sortChanged', onSortChanged);
    column.addEventListener?.('filterChanged', onFilterChanged);
    return () => {
      column.removeEventListener?.('sortChanged', onSortChanged);
      column.removeEventListener?.('filterChanged', onFilterChanged);
    };
  }, [column]);

  const onLabelClick = (e) => {
    if (!enableSorting) return;
    progressSort?.(e.shiftKey);
  };

  const onMenuClick = (e) => {
    e.stopPropagation();
    showColumnMenu?.(menuButtonRef.current);
  };

  const onFilterClick = (e) => {
    e.stopPropagation();
    // v32 community exposes showColumnFilter(colKey) on the grid api; fall
    // back to opening the column menu (where the filter tab lives) if not
    // available so we never silently no-op.
    const colKey = column?.getColId?.();
    if (api?.showColumnFilter && colKey) {
      api.showColumnFilter(colKey);
    } else if (showColumnMenu) {
      showColumnMenu(filterButtonRef.current);
    }
  };

  return (
    <span className="tetv-header-with-help">
      <span
        className="tetv-header-label"
        onClick={onLabelClick}
        role={enableSorting ? 'button' : undefined}
        style={{ cursor: enableSorting ? 'pointer' : 'default' }}
      >
        {displayName}
      </span>
      {sortDir === 'asc' && (
        <span className="ag-icon ag-icon-asc" aria-label="ascending" />
      )}
      {sortDir === 'desc' && (
        <span className="ag-icon ag-icon-desc" aria-label="descending" />
      )}
      {help && (
        <span
          className="tetv-header-help"
          title={help}
          aria-label={help}
          onClick={(e) => e.stopPropagation()}
        >
          <FontAwesomeIcon icon={faCircleQuestion} />
        </span>
      )}
      {filterAllowed && (
        <span
          ref={filterButtonRef}
          className={`ag-header-icon tetv-header-filter${
            filterActive ? ' tetv-header-filter-active' : ''
          }`}
          onClick={onFilterClick}
          role="button"
          aria-label={filterActive ? 'Filter (active)' : 'Filter'}
          title={filterActive ? 'Filter (active)' : 'Filter'}
        >
          <span className="ag-icon ag-icon-filter" aria-hidden="true" />
        </span>
      )}
      {enableMenu && (
        <span
          ref={menuButtonRef}
          className="ag-header-icon ag-header-cell-menu-button"
          onClick={onMenuClick}
          role="button"
          aria-label="Open menu"
        >
          <span className="ag-icon ag-icon-menu" />
        </span>
      )}
    </span>
  );
}
