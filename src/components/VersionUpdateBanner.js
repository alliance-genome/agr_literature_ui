import React from 'react';
import { Alert, Button } from 'react-bootstrap';

const VersionUpdateBanner = () => {
    return (
        <Alert
            variant="info"
            className="text-center mb-0"
            style={{ borderRadius: 0, zIndex: 1050 }}
        >
            A new version of the application is available.{' '}
            <Button
                variant="outline-primary"
                size="sm"
                onClick={() => window.location.reload()}
                style={{ marginLeft: '8px' }}
            >
                Refresh now
            </Button>
        </Alert>
    );
};

export default VersionUpdateBanner;