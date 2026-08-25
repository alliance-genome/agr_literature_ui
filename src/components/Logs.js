import React from 'react';

import LogsBrowser from './logs/LogsBrowser';

// Standalone /logs route. Kept alongside the per-MOD tab on the Reports page
// because inner tabs are not routable, and the "report history" links there need
// somewhere to deep-link one report's history to.
const Logs = () => <LogsBrowser />;

export default Logs;
