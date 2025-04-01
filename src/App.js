// import logo from './logo.svg';
import React from 'react';
import CacheBuster from 'react-cache-buster';
import { BrowserRouter as Router } from 'react-router-dom';
import AppWithRouterAccess from './components/AppWithRouterAccess';

const App = () => (
    <CacheBuster
        currentVersion={Math.random().toString(36).substring(2, 8)}
        isEnabled={process.env.REACT_APP_DEV_OR_STAGE_OR_PROD === "prod" || process.env.REACT_APP_DEV_OR_STAGE_OR_PROD === "stage"} //If false, the library is disabled.
        isVerboseMode={false} //If true, the library writes verbose logs to console.
        loadingComponent={null} //If not pass, nothing appears at the time of new version check.
        metaFileDirectory={'.'} //If public assets are hosted somewhere other than root on your server.
        onCacheClear={() => window.location.reload()}
    >
        <Router>
          <AppWithRouterAccess/>
        </Router>
    </CacheBuster>
);
export default App;
