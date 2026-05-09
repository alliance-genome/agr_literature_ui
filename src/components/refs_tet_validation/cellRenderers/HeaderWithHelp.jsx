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
    displayName,
    column,
    enableSorting,
    enableMenu,
    showColumnMenu,
    progressSort,
  } = params;
  const help = column?.getColDef?.()?.headerTooltip;
  const menuButtonRef = useRef(null);
  const [sortDir, setSortDir] = useState(column?.getSort?.() || null);

  useEffect(() => {
    if (!column) return undefined;
    const onSortChanged = () => setSortDir(column.getSort?.() || null);
    column.addEventListener?.('sortChanged', onSortChanged);
    return () => column.removeEventListener?.('sortChanged', onSortChanged);
  }, [column]);

  const onLabelClick = (e) => {
    if (!enableSorting) return;
    progressSort?.(e.shiftKey);
  };

  const onMenuClick = (e) => {
    e.stopPropagation();
    showColumnMenu?.(menuButtonRef.current);
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
