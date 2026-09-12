import React from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import './LightTip.css';

// Shared light-styled tooltip with a short, consistent show delay (SCRUM-6538).
// Used instead of native title attributes where the browser's fixed ~1s hover
// delay feels sluggish, or where the tooltip must open on a specific side to
// avoid clipping at the window edge. Renders into document.body so it is not
// clipped by overflow containers (e.g. AG Grid cells).
const LightTip = ({ tip, placement = 'top', children }) => {
  return (
    <OverlayTrigger placement={placement} delay={{ show: 250, hide: 0 }}
                    container={typeof document !== 'undefined' ? document.body : undefined}
                    overlay={<Tooltip id="light-tooltip" className="light-tooltip">{tip}</Tooltip>}>
      {children}
    </OverlayTrigger>
  );
};

export default LightTip;
