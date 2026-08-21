import React, { useId } from 'react';
import { OverlayTrigger, Popover } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleQuestion } from '@fortawesome/free-regular-svg-icons';

/**
 * The small ? icon rendered next to a grid column (or column-group) label.
 *
 * Opens its explanation in a click-triggered popover — the same interaction as
 * the ? next to the search box and the advanced query builder — instead of a
 * native hover tooltip, so every ? in the app behaves the same way
 * (SCRUM-6330).
 *
 * The popover is portalled to <body> because AgGrid header cells clip their
 * overflow; `.tetv-header-help-popover` lifts its z-index above the fullscreen
 * grid wrapper (z-index 2000), which the Bootstrap default (1060) sits under.
 */
export default function HeaderHelpIcon({ help, label }) {
  // Popover needs a stable, unique DOM id: headers mount once per column and
  // several are on screen at a time.
  const generatedId = useId();
  if (!help) return null;

  const popover = (
    <Popover
      id={`tetv-header-help-${generatedId}`}
      className="tetv-header-help-popover"
    >
      {label ? (
        <Popover.Title as="h3">{label}</Popover.Title>
      ) : null}
      <Popover.Content>{help}</Popover.Content>
    </Popover>
  );

  return (
    // Both handlers stop the event before it reaches the AgGrid header cell,
    // which would otherwise sort the column (click) or start a column
    // drag/resize (mousedown) behind the popover.
    <span
      className="tetv-header-help"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <OverlayTrigger
        trigger="click"
        rootClose
        placement="bottom-start"
        container={document.body}
        overlay={popover}
      >
        {/* A native <button> (not a role="button" span) so it is keyboard
            operable: react-bootstrap v1's OverlayTrigger only binds onClick,
            and a button fires that on Enter/Space where a span would not. */}
        <button
          type="button"
          className="tetv-header-help-btn"
          aria-label={label ? `Help for ${label}` : 'Help'}
          aria-haspopup="dialog"
        >
          <FontAwesomeIcon icon={faCircleQuestion} />
        </button>
      </OverlayTrigger>
    </span>
  );
}
