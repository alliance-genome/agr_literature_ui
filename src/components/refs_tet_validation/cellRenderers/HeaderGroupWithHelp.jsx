import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleQuestion } from '@fortawesome/free-regular-svg-icons';

/**
 * Custom AgGrid header for column groups: appends a small ? icon next to the
 * group's display name. Pulls the explanation from the group's
 * `headerTooltip` colGroupDef field.
 *
 * Use as `headerGroupComponent` on column-group defs that have
 * `headerTooltip` set.
 */
export default function HeaderGroupWithHelp(params) {
  const { displayName, columnGroup } = params;
  const help =
    columnGroup?.getColGroupDef?.()?.headerTooltip ||
    columnGroup?.getProvidedColumnGroup?.()?.getColGroupDef?.()?.headerTooltip;
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
