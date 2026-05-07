import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleQuestion } from '@fortawesome/free-regular-svg-icons';

/**
 * Custom AgGrid header that appends a small ? icon next to the header text.
 * The icon's title attribute carries the explanation; hovering it shows the
 * native browser tooltip. Clicking the icon does nothing — sort/filter still
 * works on the rest of the header label.
 *
 * Use as `headerComponent` on column defs that have `headerTooltip` set.
 */
export default function HeaderWithHelp(params) {
  const { displayName, column } = params;
  const help = column?.getColDef?.()?.headerTooltip;
  return (
    <span className="tetv-header-with-help">
      <span className="tetv-header-label">{displayName}</span>
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
    </span>
  );
}
