import React from 'react';
import { Alert } from 'react-bootstrap';

/**
 * Full-width system-status banner shown at the top of the app, above the
 * navigation header. Content and color are controlled externally via the
 * banner file consumed by useSystemBanner (message + severity). Not dismissable.
 */
const SystemBanner = ({ message, severity }) => {
    return (
        <Alert
            variant={severity}
            className="text-center mb-0"
            style={{ borderRadius: 0, zIndex: 1050 }}
        >
            {message}
        </Alert>
    );
};

export default SystemBanner;
