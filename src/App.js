// import logo from './logo.svg';
import React from 'react';
import CacheBuster from 'react-cache-buster';
import { BrowserRouter as Router } from 'react-router-dom';
import AppWithRouterAccess from './components/AppWithRouterAccess';

const App = () => (
    <CacheBuster
        currentVersion={Math.random().toString(36).substring(2, 8)}
        isEnabled={process.env.NODE_ENV === "production"} //If false, the library is disabled.
        isVerboseMode={false} //If true, the library writes verbose logs to console.
        loadingComponent={null} //If not pass, nothing appears at the time of new version check.
        metaFileDirectory={'.'} //If public assets are hosted somewhere other than root on your server.
        onCacheClear={() => window.location.reload(true)}
    >
        <Router>
          <AppWithRouterAccess/>
        </Router>
    </CacheBuster>
);
export default App;
