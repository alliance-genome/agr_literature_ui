import React from 'react';
import HeaderHelpIcon from './HeaderHelpIcon';

/**
 * Custom AgGrid header for column groups: appends a small ? icon next to the
 * group's display name. Pulls the explanation from
 * `headerGroupComponentParams.help` — see HeaderWithHelp for why the text does
 * not live on the group's `headerTooltip` field.
 *
 * Use as `headerGroupComponent` on column-group defs that set that param.
 */
export default function HeaderGroupWithHelp(params) {
  const { displayName, help } = params;
  return (
    <span className="tetv-header-with-help">
      <span className="tetv-header-label">{displayName}</span>
      <HeaderHelpIcon help={help} label={displayName} />
    </span>
  );
}
